import test from 'node:test';
import assert from 'node:assert/strict';
import { codingLessons, codingStages, lessonForDate, lessonHref } from '../dist/coding-curriculum.mjs';
import { exercises } from '../dist/coding-exercises.mjs';
import { days, codingLinks, totalMinutes, EXAM_DATE } from '../dist/schedule.mjs';

test('26 consecutive daily lessons align with the existing four-week plan', () => {
  assert.equal(codingLessons.length, 26);
  assert.equal(new Set(codingLessons.map(item => item.date)).size, 26);
  assert.deepEqual(codingStages.map((_, stage) => codingLessons.filter(item => item.stage === stage).length), [7, 7, 7, 5]);
  for (const [index, lesson] of codingLessons.entries()) {
    assert.equal(lesson.date, days[index].date);
    assert.equal(lesson.stage, Math.floor(index / 7));
    assert.equal(lessonForDate(lesson.date), lesson);
    assert.equal(Date.parse(lesson.date) - Date.parse(codingLessons[0].date), index * 86400000);
    assert.ok(lesson.points.length >= 3 && lesson.check && lesson.answer && lesson.goal && lesson.practice);
    for (const language of lesson.language.split('·')) assert.ok(codingLinks[language]);
  }
});

test('every study day retains 20 minutes coding and stable checklist IDs', () => {
  assert.equal(days.length, 27);
  assert.equal(totalMinutes, 1320);
  assert.equal(days.flatMap(day => day.tasks).filter(task => task.type !== 'exam').length, 77);
  // The original numeric IDs do not follow the revised task positions.
  const originalCodingSuffixes = [3, 2, 2, 3, 3, 2, 3, 2, 2, 2, 2, 3, 2, 3, 2, 2, 2, 2, 3, 2, 2, 3, 2, 3, 3, 3];
  for (const [index, day] of days.slice(0, -1).entries()) {
    const coding = day.tasks.filter(task => task.type === 'code');
    assert.equal(coding.length, 1);
    assert.equal(coding[0].minutes, 20);
    assert.equal(coding[0].id, day.date + '-' + originalCodingSuffixes[index]);
    assert.equal(coding[0].href, lessonHref(day.date));
    assert.equal(coding[0].internal, true);
  }
  assert.equal(days.at(-1).date, EXAM_DATE);
  assert.ok(days.at(-1).tasks.every(task => task.type === 'exam'));
  assert.equal(lessonForDate(EXAM_DATE), undefined);
});

test('all seven authored exercises are reachable and have complete explanations', () => {
  const used = codingLessons.flatMap(lesson => lesson.exercise ? [lesson.exercise] : []);
  assert.deepEqual([...new Set(used)].sort(), Object.keys(exercises).sort());
  assert.equal(used.length, 7);
  for (const id of used) {
    const exercise = exercises[id];
    assert.ok(exercise.code && exercise.answer && exercise.title && exercise.trap);
    assert.ok(exercise.steps.length >= 3);
  }
});

test('Java fundamentals are skipped while SQL remains in the short theory routine', () => {
  assert.ok(codingLessons.filter(item => item.stage === 0).every(item => !item.language.includes('Java')));
  assert.ok(codingLessons.every(item => !item.language.includes('SQL')));
  const sqlDays = days.filter(day => day.focus?.chapter === 7);
  assert.deepEqual(sqlDays.map(day => day.date), ['2026-10-08', '2026-10-09']);
  assert.deepEqual(sqlDays[1].focus.terms, ['DDL', 'DML', 'DCL']);
  assert.ok(sqlDays.every(day => day.tasks.filter(task => task.type !== 'code').reduce((sum, task) => sum + task.minutes, 0) === 30));
});
