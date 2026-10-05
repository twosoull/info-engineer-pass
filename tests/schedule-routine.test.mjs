import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { days, dayMinutes, weekMinutes, totalMinutes, START_DATE, EXAM_DATE } from '../dist/schedule.mjs';
import { lessonForDate, lessonHref } from '../dist/coding-curriculum.mjs';
import { parseChapters } from '../dist/notes.mjs';
import { buildQuestions } from '../dist/quiz.mjs';

const revised = days.filter(day => day.date >= '2026-10-01' && day.date < EXAM_DATE);
const newDays = revised.filter(day => !day.focus.review);
const reviewDays = revised.filter(day => day.focus.review);
const bank = buildQuestions(parseChapters(fs.readFileSync(new URL('../dist/assets/full-notes.txt', import.meta.url), 'utf8')));
const questions = new Map(bank.map(question => [question.id, question]));

test('the full date range remains continuous with 24 lighter days and the original exam date', () => {
  assert.equal(START_DATE, '2026-09-29');
  assert.equal(EXAM_DATE, '2026-10-25');
  assert.equal(days.length, 27);
  assert.equal(revised.length, 24);
  assert.equal(newDays.length, 20);
  assert.equal(reviewDays.length, 4);
  for (const [index, day] of days.entries()) {
    assert.equal(Date.parse(day.date) - Date.parse(START_DATE), index * 86400000);
    assert.equal(day.week, Math.floor(index / 7));
    assert.equal(typeof day.weekend, 'boolean');
  }
  assert.equal(totalMinutes, 1320);
  assert.equal(days.flatMap(day => day.tasks).filter(task => task.type !== 'exam').length, 77);
  assert.equal([0, 1, 2, 3].reduce((sum, week) => sum + weekMinutes(week), 0), totalMinutes);
});

test('September 29 and 30 retain their original theory content and numeric IDs', () => {
  assert.deepEqual(days[0].tasks.filter(task => task.type !== 'code'), [
    { title: '2024년 1회 기출 진단', detail: '30분 동안 풀 수 있는 만큼 시도하고, 모르는 문제는 표시합니다.', minutes: 30, type: 'practice', id: '2026-09-29-1' },
    { title: '채점하고 약점 3개 적기', detail: '틀린 답을 확인하고 이론·언어별로 부족한 점 3개를 적습니다.', minutes: 10, type: 'review', id: '2026-09-29-2' }
  ]);
  assert.deepEqual(days[1].tasks.filter(task => task.type !== 'code'), [
    { title: '정리본 1단원 + 키워드 10개', detail: '애자일·럼바우·SOLID·GoF·요구사항을 읽고 설명만 보고 정답 10개를 말합니다.', minutes: 40, type: 'theory', id: '2026-09-30-1' }
  ]);
  assert.equal(days[0].title, '기출로 출발점 확인');
  assert.equal(days[1].title, 'SOLID·GoF + C 기초');
  assert.deepEqual(days.slice(0, 2).map(dayMinutes), [60, 60]);
  assert.ok(days.slice(0, 2).every(day => day.focus === undefined));
});

test('each revised day has a 10-minute morning and 20-minute evening routine plus unchanged coding time', () => {
  for (const day of revised) {
    assert.equal(day.tasks.length, 3);
    assert.deepEqual(day.tasks.map(task => task.minutes), [10, 20, 20]);
    assert.deepEqual(day.tasks.map(task => task.session), ['morning', 'evening', 'evening']);
    assert.deepEqual(day.tasks.map(task => task.type), ['theory', 'review', 'code']);
    assert.equal(dayMinutes(day), 50);
    const [morning, evening] = day.tasks;
    assert.equal(morning.id, day.date + '-routine-morning');
    assert.equal(evening.id, day.date + '-routine-evening');
    assert.match(morning.detail, /표시하면 완료/);
    assert.match(evening.detail, /어제 용어 2개 3분/);
    assert.match(evening.detail, /12분/);
    assert.match(evening.detail, /최대 2개 5분 이내/);
    for (const term of day.focus.terms) assert.ok(morning.detail.includes(term));
  }
});

test('new theory IDs never reuse old numeric IDs while all 26 coding tasks retain their content and IDs', () => {
  const suffixes = [3, 2, 2, 3, 3, 2, 3, 2, 2, 2, 2, 3, 2, 3, 2, 2, 2, 2, 3, 2, 2, 3, 2, 3, 3, 3];
  for (const [index, day] of days.slice(0, -1).entries()) {
    const coding = day.tasks.find(task => task.type === 'code');
    const lesson = lessonForDate(day.date);
    assert.equal(coding.id, day.date + '-' + suffixes[index]);
    assert.equal(coding.title, '코딩 20분 · ' + lesson.language);
    assert.equal(coding.detail, (lesson.stage + 1) + '단계 · ' + lesson.title + '. 목표: ' + lesson.goal + '.');
    assert.equal(coding.href, lessonHref(day.date));
    assert.equal(coding.internal, true);
    assert.equal(coding.linkLabel, '오늘 단계 학습하기');
  }
  for (const day of revised) {
    assert.ok(day.tasks.filter(task => task.type !== 'code').every(task => !/-\d+$/.test(task.id)));
  }
  const ids = days.flatMap(day => day.tasks.map(task => task.id));
  assert.equal(new Set(ids).size, ids.length);
});

test('the 20 new small groups contain 77 real source terms, 3 to 5 within one chapter per day', () => {
  const normalize = text => text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  for (const day of revised) {
    const focus = day.focus;
    assert.ok(focus.terms.length >= 3 && focus.terms.length <= 5);
    assert.equal(focus.questionIds.length, focus.terms.length);
    focus.questionIds.forEach((id, index) => {
      const question = questions.get(id);
      assert.ok(question, 'Missing source question: ' + id);
      assert.equal(Number(id.split('-')[1]), focus.chapter);
      assert.ok(normalize(question.answer).includes(normalize(focus.terms[index])), focus.terms[index] + ' does not match ' + question.answer);
    });
  }
  const newIds = newDays.flatMap(day => day.focus.questionIds);
  assert.equal(newIds.length, 77);
  assert.equal(new Set(newIds).size, 77);
  assert.deepEqual([...new Set(newDays.map(day => day.focus.chapter))].sort((a, b) => a - b), [1, 2, 3, 4, 5, 7, 8, 9, 10, 11]);
});

test('the final four days reuse the selected earlier groups with no additional terms', () => {
  const originals = ['2026-10-01', '2026-10-07', '2026-10-12', '2026-10-16'];
  assert.deepEqual(reviewDays.map(day => day.date), ['2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24']);
  reviewDays.forEach((day, index) => {
    const original = days.find(item => item.date === originals[index]);
    assert.deepEqual(day.focus.terms, original.focus.terms);
    assert.deepEqual(day.focus.questionIds, original.focus.questionIds);
    assert.equal(day.focus.chapter, original.focus.chapter);
    assert.match(day.tasks[0].detail, /새 용어는 추가하지/);
    assert.match(day.tasks[1].detail, /일찍 끝나면 같은 20분 안에서/);
    if (day.date === '2026-10-24') assert.match(day.tasks[1].detail, /수험표·신분증·필기구/);
    else assert.match(day.tasks[1].detail, /2025년 기출 최대 3문제/);
  });
});

test('weekends use morning and evening labels without extra workload, and links open the correct chapter', () => {
  const weekendDates = ['2026-10-03', '2026-10-04', '2026-10-10', '2026-10-11', '2026-10-17', '2026-10-18', '2026-10-24'];
  assert.deepEqual(revised.filter(day => day.weekend).map(day => day.date), weekendDates);
  for (const day of revised) {
    const [morning, evening] = day.tasks;
    assert.ok(morning.title.startsWith(day.weekend ? '아침' : '출근길'));
    assert.ok(evening.title.startsWith(day.weekend ? '저녁' : '퇴근 후'));
    for (const task of [morning, evening]) {
      assert.equal(task.href, '#full-notes/chapter/' + day.focus.chapter);
      assert.equal(task.internal, true);
    }
    assert.equal(morning.linkLabel, day.focus.chapter + '단원에서 오늘 용어 찾기');
    assert.equal(evening.linkLabel, '정리본 열고 제목 가리기');
  }
});

test('existing PDF references and exam-day checklist remain available', () => {
  assert.deepEqual(days.filter(day => day.resource?.href === '#resources').map(day => day.date),
    ['2026-10-03', '2026-10-10', '2026-10-17', '2026-10-20', '2026-10-22', '2026-10-23']);
  const exam = days.at(-1);
  assert.equal(exam.resource, null);
  assert.equal(exam.title, '시험 당일');
  assert.equal(dayMinutes(exam), 0);
  assert.equal(exam.focus, undefined);
  assert.deepEqual(exam.tasks, [
    { title: '준비물·입실 시간 확인', detail: '수험표 안내에 따라 신분증과 필기구를 챙기고 여유 있게 도착합니다.', minutes: 0, type: 'exam', id: '2026-10-25-1' },
    { title: '답안 작성 원칙 확인', detail: '요구한 범위·단위와 출력값을 재확인합니다. 확실한 문제부터 풉니다.', minutes: 0, type: 'exam', id: '2026-10-25-2' }
  ]);
});
