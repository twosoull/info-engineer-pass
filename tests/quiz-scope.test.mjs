import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseQuizScope, quizScopeHash, questionChapterId, filterQuizChapter, buildQuizChapters } from '../dist/quiz-scope.mjs';
import { parseChapters } from '../dist/notes.mjs';
import { buildQuestions } from '../dist/quiz.mjs';

const chapterData = parseChapters(fs.readFileSync(new URL('../dist/assets/full-notes.txt', import.meta.url), 'utf8'));
const bank = buildQuestions(chapterData);

test('all and checked routes with an optional chapter round-trip without ambiguity', () => {
  const routes = [
    ['#quiz', { mode: 'all', chapterId: null }],
    ['#quiz/checked', { mode: 'checked', chapterId: null }],
    ['#quiz/chapter/1', { mode: 'all', chapterId: 1 }],
    ['#quiz/chapter/10', { mode: 'all', chapterId: 10 }],
    ['#quiz/checked/chapter/11', { mode: 'checked', chapterId: 11 }],
    ['#quiz/chapter/12', { mode: 'all', chapterId: 12 }]
  ];
  for (const [hash, scope] of routes) {
    assert.deepEqual(parseQuizScope(hash), scope);
    assert.equal(quizScopeHash(scope), hash);
  }
});

test('invalid routes, noncanonical chapter numbers and nonstrings return null', () => {
  const invalid = [
    '', '#todo', '#quiz/', '#quiz/checked/', '#quiz/chapter', '#quiz/chapter/',
    '#quiz/chapter/0', '#quiz/chapter/01', '#quiz/chapter/-1', '#quiz/chapter/1.5', '#quiz/chapter/1e2',
    '#quiz/chapter/+1', '#quiz/chapter/%31', '#quiz/chapter/１', '#quiz/chapter/9007199254740992',
    '#quiz/chapter/1/checked', '#quiz/chapter/1/extra', '#quiz/checked/checked', '#quiz/checked/chapter/01',
    '#quiz/chapter/1?x=1', '#quiz/chapter/1\n', '#quiz/chapter/1 ', ' #quiz', '#Quiz', null, undefined, 1, {}
  ];
  for (const hash of invalid) assert.equal(parseQuizScope(hash), null, `Unexpected valid route: ${String(hash)}`);
});

test('hash generation rejects invalid scope values rather than silently choosing a chapter', () => {
  for (const scope of [null, undefined, {}, { mode: 'wrong', chapterId: null }, { mode: 'all' },
    ...[0, -1, 1.5, '1', NaN, Infinity, Number.MAX_SAFE_INTEGER + 1].map(chapterId => ({ mode: 'all', chapterId }))]) {
    assert.equal(quizScopeHash(scope), null);
  }
});

test('question IDs identify chapters exactly and reject invalid IDs', () => {
  assert.equal(questionChapterId({ id: 'q-1-100' }), 1);
  assert.equal(questionChapterId({ id: 'q-10-1' }), 10);
  assert.equal(questionChapterId({ id: 'q-11-81' }), 11);
  for (const id of ['q-0-1', 'q-01-1', 'q-1-0', 'q-1-01', 'q-1-x', 'q-1-1-extra', 'q-1-1\n',
    'q-1-9007199254740992', 'q-9007199254740992-1', '', null, undefined, 1]) {
    assert.equal(questionChapterId({ id }), null);
  }
  assert.equal(questionChapterId(null), null);
  assert.equal(questionChapterId(undefined), null);
});

test('filter separates chapters 1 and 10 by ID, copies all questions and never changes input', () => {
  const first = Object.freeze({ id: 'q-1-2', source: '같은 제목' });
  const tenth = Object.freeze({ id: 'q-10-2', source: '같은 제목' });
  const other = Object.freeze({ id: 'q-11-2', source: '다른 제목' });
  const questions = Object.freeze([tenth, first, other]);
  const all = filterQuizChapter(questions, null);
  assert.notEqual(all, questions);
  assert.deepEqual(all, questions);
  assert.deepEqual(filterQuizChapter(questions, 1), [first]);
  assert.deepEqual(filterQuizChapter(questions, 10), [tenth]);
  assert.deepEqual(filterQuizChapter(questions, 2), []);
  assert.equal(filterQuizChapter(questions, 1)[0], first);
  all.pop();
  assert.equal(questions.length, 3);
  for (const chapterId of [0, -1, 1.2, '1', undefined, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.deepEqual(filterQuizChapter(questions, chapterId), []);
  }
});

test('chapter list preserves original indices, exact titles and zero-question chapters', () => {
  const chapters = Object.freeze([
    Object.freeze({ title: '첫 단원 원문' }), Object.freeze({ title: '빈 단원 원문' }), Object.freeze({ title: '마지막 단원 원문' })
  ]);
  const questions = Object.freeze([{ id: 'q-3-1' }, { id: 'q-1-1' }, { id: 'q-1-2' }, { id: 'q-9-1' }, { id: 'bad' }]);
  assert.deepEqual(buildQuizChapters(chapters, questions), [
    { id: 1, title: '첫 단원 원문', count: 2 },
    { id: 2, title: '빈 단원 원문', count: 0 },
    { id: 3, title: '마지막 단원 원문', count: 1 }
  ]);
  assert.deepEqual(buildQuizChapters([], questions), []);
  assert.deepEqual(buildQuizChapters(chapters, []), chapters.map((chapter, index) => ({ id: index + 1, title: chapter.title, count: 0 })));
});

test('actual 459-question bank partitions into the original 11 chapters without lost or changed questions', () => {
  const original = structuredClone(bank);
  const originalChapters = structuredClone(chapterData);
  const chapters = buildQuizChapters(chapterData, bank);
  assert.equal(bank.length, 459);
  assert.equal(chapters.length, 11);
  assert.equal(chapters.reduce((total, chapter) => total + chapter.count, 0), bank.length);
  assert.deepEqual(chapters.map(chapter => chapter.id), Array.from({ length: 11 }, (_, index) => index + 1));
  const selected = [];
  for (const chapter of chapters) {
    assert.equal(chapter.title, chapterData[chapter.id - 1].title);
    const questions = filterQuizChapter(bank, chapter.id);
    assert.equal(questions.length, chapter.count);
    assert.deepEqual(questions, bank.filter(question => question.id.startsWith(`q-${chapter.id}-`)));
    for (const question of questions) {
      assert.equal(questionChapterId(question), chapter.id);
      assert.equal(question.source, chapter.title);
    }
    selected.push(...questions);
  }
  assert.equal(new Set(selected.map(question => question.id)).size, 459);
  assert.deepEqual(filterQuizChapter(bank, 12), []);
  assert.deepEqual(bank, original);
  assert.deepEqual(chapterData, originalChapters);
});
