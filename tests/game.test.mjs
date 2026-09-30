import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createGameDeck, createRound, scoreAnswer } from '../dist/game-engine.mjs';
import { parseChapters } from '../dist/notes.mjs';
import { buildQuestions } from '../dist/quiz.mjs';

const question = (id, answer, source = 'chapter 1', prompt = 'Read this explanation and identify the technical concept.') => ({
  id, answer, source, paragraphs: [prompt]
});
const sampleBank = [
  question('q-1-1', 'Alpha'), question('q-1-2', 'Beta'), question('q-1-3', 'Gamma'), question('q-1-4', 'Delta'),
  question('q-2-1', 'Epsilon', 'chapter 2'), question('q-2-2', 'Zeta', 'chapter 2')
];
const deck = sampleBank.slice(0, 3).map(item => ({ ...item, choices: ['Alpha', 'Beta', 'Gamma', 'Delta'] }));
const actualBank = buildQuestions(parseChapters(fs.readFileSync(new URL('../dist/assets/full-notes.txt', import.meta.url), 'utf8')));

test('deck has four unique choices, one exact answer and same-chapter distractors first', () => {
  const original = structuredClone(sampleBank);
  const output = createGameDeck(sampleBank, { questions: [sampleBank[0]], random: () => 0.3 });
  assert.equal(output.length, 1);
  assert.equal(output[0].id, 'q-1-1');
  assert.equal(output[0].choices.length, 4);
  assert.equal(new Set(output[0].choices).size, 4);
  assert.equal(output[0].choices.filter(answer => answer === output[0].answer).length, 1);
  assert.deepEqual([...output[0].choices].sort(), ['Alpha', 'Beta', 'Delta', 'Gamma']);
  output[0].paragraphs.push('Changed copy');
  assert.deepEqual(sampleBank, original);
});

test('retry question subset still draws distractors from the full bank and ignores unknown IDs', () => {
  const output = createGameDeck(sampleBank, { questions: [sampleBank[4], question('unknown', 'Unknown')], size: 10 });
  assert.equal(output.length, 1);
  assert.equal(output[0].id, 'q-2-1');
  assert.ok(output[0].choices.includes('Zeta'));
  assert.equal(output[0].choices.length, 4);
  assert.deepEqual(createGameDeck(sampleBank, { questions: [] }), []);
  assert.deepEqual(createGameDeck(sampleBank, { size: 0 }), []);
  assert.deepEqual(createGameDeck(sampleBank.slice(0, 3)), []);
});

test('explicit aliases and duplicate answers are never offered together', () => {
  const bank = [
    question('q-1-1', '객체 모델링(Object Modeling) = 정보 모델링'),
    question('q-1-2', '정보 모델링'), question('q-1-3', 'Object Modeling'),
    question('q-1-4', 'Object  Modeling'),
    question('q-1-5', 'Alpha'), question('q-1-6', 'Beta'), question('q-1-7', 'Gamma'),
    question('q-1-8', 'alpha'), question('q-1-9', 'Alpha')
  ];
  const output = createGameDeck(bank, { questions: [bank[0]] });
  assert.equal(output.length, 1);
  assert.equal(output[0].choices.length, 4);
  assert.ok(!output[0].choices.includes('정보 모델링'));
  assert.ok(!output[0].choices.includes('Object Modeling'));
  assert.equal(output[0].choices.filter(value => value.toLowerCase() === 'alpha').length, 1);
});

test('a synonym named in the prompt is not used as a distractor, while four choices remain', () => {
  const fcfs = question('fcfs', 'FCFS', 'chapter 1', '먼저 도착한 프로세스를 먼저 처리하는 방식이다. (FIFO 알고리즘이라고도 함)');
  const fifo = question('fifo', 'FIFO', 'chapter 1', '먼저 들어온 항목이 먼저 나가는 방식이다.');
  const output = createGameDeck([fcfs, fifo, ...sampleBank], { questions: [fcfs], random: () => 0.5 });
  assert.equal(output.length, 1);
  assert.equal(output[0].choices.length, 4);
  assert.equal(new Set(output[0].choices).size, 4);
  assert.ok(output[0].choices.includes('FCFS'));
  assert.ok(!output[0].choices.includes('FIFO'));
  assert.deepEqual(output[0].paragraphs, fcfs.paragraphs);
});

test('unsuitable long titles, long prompts, leaked answers and repeated IDs are excluded', () => {
  const bad = [question('long-answer', '가'.repeat(71)), question('long-prompt', 'VeryLong', 'chapter 1', '설명'.repeat(211)),
    question('leak', 'alter', 'chapter 1', '오브젝트 변경 명령입니다. ALTER TABLE 문법을 사용합니다.'),
    question('alias-leak', '단일 책임 원칙(SRP)', 'chapter 1', '이 원칙은 SRP라고 부르며 클래스의 책임을 제한한다.')];
  const output = createGameDeck([...sampleBank, ...bad, sampleBank[0]], { size: 30 });
  assert.equal(output.length, sampleBank.length);
  assert.equal(new Set(output.map(item => item.id)).size, output.length);
});

test('short useful definitions remain eligible and compound slash terms are not mistaken for aliases', () => {
  const item = question('short', '1정규형(1NF)', 'chapter 1', '원자값으로 구성');
  const compound = question('compound', '변경 조건/결정 커버리지(Modified Condition/Decision Coverage)', 'chapter 1', '개별 조건식의 독립적인 영향을 확인하여 조건/결정 커버리지를 향상한다.');
  const output = createGameDeck([...sampleBank, item, compound], { questions: [item, compound] });
  assert.equal(output.length, 2);
});

test('two-character Korean answers or aliases and literal operators are excluded when exposed', () => {
  const exposed = [
    question('create-leak', '생성', 'chapter 1', '객체 인스턴스 생성에 관여하는 패턴이다.'),
    question('structure-leak', '구조(Structure)', 'chapter 1', '더 큰 구 조 형성을 목적으로 한다.'),
    question('alias-short-leak', 'Structure(구조)', 'chapter 1', '시스템의 구조를 표현한다.'),
    question('operator-leak', '>>', 'chapter 1', 'x >> 1처럼 값을 오른쪽으로 시프트한다.'),
    question('operator-not-equal-leak', '!=', 'chapter 1', 'a != b처럼 서로 다른지를 비교한다.')
  ];
  const eligible = question('operator-no-leak', '>>', 'chapter 1', '비트를 오른쪽으로 지정한 수만큼 이동한다.');
  const output = createGameDeck([...sampleBank, ...exposed, eligible], { size: 30 });
  assert.ok(exposed.every(item => !output.some(candidate => candidate.id === item.id)));
  assert.ok(output.some(item => item.id === eligible.id));
});

test('actual notes produce playable original-wording questions without exposed SQL answers', () => {
  const original = structuredClone(actualBank);
  const output = createGameDeck(actualBank, { size: actualBank.length, random: () => 0.45 });
  assert.ok(output.length >= 100 && output.length < actualBank.length);
  assert.ok(!output.some(item => ['alter', 'drop', 'truncate', 'insert', 'update', 'delete', '생성', '구조', '>>'].includes(item.answer)));
  for (const item of output) {
    assert.equal(item.choices.length, 4);
    assert.equal(new Set(item.choices).size, 4);
    assert.equal(item.choices.filter(answer => answer === item.answer).length, 1);
    assert.deepEqual(item.paragraphs, actualBank.find(question => question.id === item.id).paragraphs);
  }
  assert.deepEqual(actualBank, original);
});

test('scoring clamps time bonuses and awards combos from the second correct answer', () => {
  assert.deepEqual(scoreAnswer({ correct: false, remainingMs: 30000, durationMs: 30000, streak: 8 }), { base: 0, speed: 0, combo: 0, total: 0 });
  assert.deepEqual(scoreAnswer({ correct: true, remainingMs: 15000, durationMs: 30000, streak: 2 }), { base: 1000, speed: 250, combo: 100, total: 1350 });
  assert.equal(scoreAnswer({ correct: true, remainingMs: 90000, durationMs: 30000, streak: 8 }).total, 1900);
  assert.equal(scoreAnswer({ correct: true, remainingMs: -1, durationMs: 30000, streak: 1 }).total, 1000);
  assert.equal(scoreAnswer({ correct: true, remainingMs: 90000, durationMs: 0, streak: 3 }).total, 1200);
  assert.equal(scoreAnswer({ correct: true, remainingMs: NaN, durationMs: 30000, streak: NaN }).total, 1000);
});

test('a round scores once per question, preserves best streak and ends after feedback', () => {
  let time = 100;
  const round = createRound(deck, { durationMs: 1000, now: () => time });
  assert.equal(round.status, 'answering');
  assert.equal(round.index, 0);
  assert.equal(round.total, 3);
  assert.equal(round.next(), false);
  assert.equal(round.answer('not a choice'), null);
  time = 600;
  const first = round.answer('Alpha');
  assert.equal(first.points.total, 1250);
  assert.equal(round.status, 'feedback');
  assert.equal(round.answer('Alpha'), null);
  assert.equal(round.expire(), null);
  assert.equal(round.pause(), false);
  assert.equal(round.results.length, 1);
  round.next();
  assert.equal(round.question.answer, 'Beta');
  assert.equal(round.remainingMs, 1000);
  assert.equal(round.answer('Beta').points.total, 1600);
  assert.equal(round.streak, 2);
  round.next();
  assert.equal(round.answer('Alpha').correct, false);
  assert.equal(round.streak, 0);
  assert.equal(round.maxStreak, 2);
  assert.equal(round.correctCount, 2);
  assert.equal(round.score, 2850);
  round.next();
  assert.equal(round.status, 'finished');
  assert.equal(round.question, undefined);
  assert.equal(round.remainingMs, 0);
  assert.equal(round.next(), false);
  const results = round.results;
  results.pop();
  assert.equal(round.results.length, 3);
  assert.ok(Object.isFrozen(first));
  assert.ok(Object.isFrozen(first.question.choices));
});

test('timer expiry cannot be bypassed by late answers or pauses, and cannot fire early', () => {
  let time = 0;
  const round = createRound(deck, { durationMs: 1000, now: () => time });
  assert.equal(round.expire(), null);
  time = 1000;
  const result = round.answer('Alpha');
  assert.equal(result.selected, null);
  assert.equal(result.timedOut, true);
  assert.equal(result.correct, false);
  assert.equal(round.expire(), null);
  round.next();
  time = 2500;
  assert.equal(round.pause(), false);
  assert.equal(round.status, 'feedback');
  assert.equal(round.results.at(-1).timedOut, true);
  round.next();
  time = 3600;
  assert.equal(round.expire().timedOut, true);
  assert.equal(round.expire(), null);
  assert.equal(round.score, 0);
});

test('pause freezes remaining time and resume cannot double extend a running timer', () => {
  let time = 0;
  const round = createRound(deck, { durationMs: 1000, now: () => time });
  time = 300;
  assert.equal(round.pause(), true);
  assert.equal(round.status, 'paused');
  assert.equal(round.remainingMs, 700);
  assert.equal(round.pause(), false);
  time = 5000;
  assert.equal(round.remainingMs, 700);
  assert.equal(round.answer('Alpha'), null);
  assert.equal(round.expire(), null);
  assert.equal(round.next(), false);
  assert.equal(round.resume(), true);
  assert.equal(round.resume(), false);
  time = 5200;
  assert.equal(round.remainingMs, 500);
  assert.equal(round.answer('Alpha').points.total, 1250);
  time = 9000;
  assert.equal(round.remainingMs, 500);
});

test('untimed rounds support pause but do not expire or award speed points; empty rounds finish immediately', () => {
  let time = 0;
  const round = createRound(deck, { durationMs: 0, now: () => time });
  time = 9999999;
  assert.equal(round.remainingMs, 0);
  assert.equal(round.expire(), null);
  assert.equal(round.pause(), true);
  assert.equal(round.resume(), true);
  assert.equal(round.answer('Alpha').points.total, 1000);
  const empty = createRound([]);
  assert.equal(empty.status, 'finished');
  assert.equal(empty.total, 0);
  assert.equal(empty.answer('Alpha'), null);
  assert.equal(empty.expire(), null);
});
