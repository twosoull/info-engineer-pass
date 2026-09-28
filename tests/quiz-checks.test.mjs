import test from 'node:test';
import assert from 'node:assert/strict';
import { createQuizChecks, QUIZ_CHECKS_KEY } from '../dist/quiz-checks.mjs';

function memoryStorage(values = {}) {
  const items = new Map(Object.entries(values));
  return {
    getItem: key => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, value)
  };
}

test('checks persist across reloads and can be unchecked without touching other keys', () => {
  const storage = memoryStorage({ 'daily-todos': '{"keep":true}' });
  const checks = createQuizChecks(storage);
  assert.equal(checks.has('q-1-2'), false);
  assert.deepEqual(checks.set('q-1-2', true), { checked: true, persisted: true });
  assert.equal(checks.has('q-1-2'), true);
  assert.deepEqual(JSON.parse(storage.getItem(QUIZ_CHECKS_KEY)), ['q-1-2']);
  const reloaded = createQuizChecks(storage);
  assert.equal(reloaded.has('q-1-2'), true);
  assert.deepEqual(reloaded.set('q-1-2', false), { checked: false, persisted: true });
  assert.equal(reloaded.has('q-1-2'), false);
  assert.equal(createQuizChecks(storage).has('q-1-2'), false);
  assert.equal(storage.getItem('daily-todos'), '{"keep":true}');
});

test('malformed JSON and non-array saved values initialize an empty store', () => {
  for (const saved of ['{broken', '{}', 'null', 'true', '"q-1-2"', '42']) {
    const checks = createQuizChecks(memoryStorage({ [QUIZ_CHECKS_KEY]: saved }));
    assert.equal(checks.has('q-1-2'), false);
    assert.deepEqual(checks.filter([{ id: 'q-1-2' }]), []);
  }
});

test('saved IDs are validated and duplicates collapse', () => {
  const storage = memoryStorage({
    [QUIZ_CHECKS_KEY]: JSON.stringify(['q-1-2', 'q-1-2', 'q-2-3', 'bad', 'q-1-x', 12, null, {}, 'q-1-2\n'])
  });
  const checks = createQuizChecks(storage);
  assert.equal(checks.has('q-1-2'), true);
  assert.equal(checks.has('q-2-3'), true);
  assert.equal(checks.has('bad'), false);
  assert.equal(checks.has(null), false);
  checks.set('q-1-2', true);
  assert.deepEqual(JSON.parse(storage.getItem(QUIZ_CHECKS_KEY)), ['q-1-2', 'q-2-3']);
});

test('invalid set calls cannot store malformed IDs', () => {
  const storage = memoryStorage();
  const checks = createQuizChecks(storage);
  for (const id of ['q-1-a', ' q-1-2', '', null, undefined, 42, {}, 'q-1-2\n']) {
    assert.deepEqual(checks.set(id, true), { checked: false, persisted: false });
    assert.equal(checks.has(id), false);
  }
  assert.equal(storage.getItem(QUIZ_CHECKS_KEY), null);
});

test('filter follows the supplied bank order, excludes unknown IDs and never mutates questions', () => {
  const storage = memoryStorage({ [QUIZ_CHECKS_KEY]: '["q-8-9","q-2-2","q-1-1"]' });
  const checks = createQuizChecks(storage);
  const first = Object.freeze({ id: 'q-1-1', answer: 'first' });
  const second = Object.freeze({ id: 'q-2-2', answer: 'second' });
  const unmarked = Object.freeze({ id: 'q-3-3', answer: 'unmarked' });
  const bank = Object.freeze([first, unmarked, second, first]);
  assert.deepEqual(checks.filter(bank), [first, second]);
  assert.equal(checks.filter(bank)[0], first);
  assert.deepEqual(bank, [first, unmarked, second, first]);
  assert.deepEqual(checks.filter([]), []);
});

test('storage read failures are tolerated and write failures retain in-memory state', () => {
  const checks = createQuizChecks({
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('quota exceeded'); }
  });
  assert.equal(checks.has('q-1-2'), false);
  assert.deepEqual(checks.set('q-1-2', true), { checked: true, persisted: false });
  assert.equal(checks.has('q-1-2'), true);
  assert.deepEqual(checks.filter([{ id: 'q-1-2' }]), [{ id: 'q-1-2' }]);
  assert.deepEqual(checks.set('q-1-2', false), { checked: false, persisted: false });
  assert.equal(checks.has('q-1-2'), false);
});

test('missing storage still supports checks for the current session', () => {
  const checks = createQuizChecks(undefined);
  assert.deepEqual(checks.set('q-1-2', true), { checked: true, persisted: false });
  assert.equal(checks.has('q-1-2'), true);
});
