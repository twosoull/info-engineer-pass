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

test('chapter-scoped clear deduplicates IDs, saves once and preserves other chapters and storage keys', () => {
  const base = memoryStorage({
    [QUIZ_CHECKS_KEY]: '["q-1-1","q-1-2","q-10-1","q-2-3"]',
    'info-engineer-daily-2026-10-25-v1': '{"2026-10-01-1":true}',
    'info-engineer-game-records-v1': '{"bestScore":12000}'
  });
  const writes = [];
  const storage = { getItem: base.getItem, setItem(key, value) { writes.push({ key, value }); base.setItem(key, value); } };
  const checks = createQuizChecks(storage);
  const ids = Object.freeze(['q-1-2', 'q-1-1', 'q-1-2', 'q-1-99', 'bad', null, 12]);
  assert.deepEqual(checks.clear(ids), { removed: ['q-1-2', 'q-1-1'], persisted: true });
  assert.equal(writes.length, 1);
  assert.equal(writes[0].key, QUIZ_CHECKS_KEY);
  assert.deepEqual(JSON.parse(base.getItem(QUIZ_CHECKS_KEY)), ['q-10-1', 'q-2-3']);
  const reloaded = createQuizChecks(base);
  assert.equal(reloaded.has('q-1-1'), false);
  assert.equal(reloaded.has('q-1-2'), false);
  assert.equal(reloaded.has('q-10-1'), true);
  assert.equal(reloaded.has('q-2-3'), true);
  assert.equal(base.getItem('info-engineer-daily-2026-10-25-v1'), '{"2026-10-01-1":true}');
  assert.equal(base.getItem('info-engineer-game-records-v1'), '{"bestScore":12000}');
});

test('clear can remove all explicitly supplied checked IDs and restore undoes only that operation', () => {
  const base = memoryStorage({ [QUIZ_CHECKS_KEY]: '["q-1-1","q-2-2","q-11-3"]' });
  let writes = 0;
  const storage = { getItem: base.getItem, setItem(key, value) { writes++; base.setItem(key, value); } };
  const checks = createQuizChecks(storage);
  const removed = checks.clear(['q-1-1', 'q-2-2', 'q-11-3']).removed;
  assert.equal(writes, 1);
  assert.deepEqual(JSON.parse(base.getItem(QUIZ_CHECKS_KEY)), []);
  checks.set('q-4-4', true);
  const beforeRestore = writes;
  assert.deepEqual(checks.restore([...removed, removed[0], 'invalid']), { restored: removed, persisted: true });
  assert.equal(writes, beforeRestore + 1);
  assert.deepEqual(JSON.parse(base.getItem(QUIZ_CHECKS_KEY)), ['q-4-4', ...removed]);
  for (const id of [...removed, 'q-4-4']) assert.equal(createQuizChecks(base).has(id), true);
});

test('empty, invalid and already-matching bulk operations are no-ops without writes', () => {
  let writes = 0;
  const checks = createQuizChecks({
    getItem: () => '["q-1-1"]',
    setItem() { writes++; }
  });
  for (const ids of [[], ['bad', null, 'q-1-a'], null, undefined, {}, 'q-1-1']) {
    assert.deepEqual(checks.clear(ids), { removed: [], persisted: true });
    assert.deepEqual(checks.restore(ids), { restored: [], persisted: true });
  }
  assert.deepEqual(checks.clear(['q-2-2']), { removed: [], persisted: true });
  assert.deepEqual(checks.restore(['q-1-1', 'q-1-1']), { restored: [], persisted: true });
  assert.equal(checks.has('q-1-1'), true);
  assert.equal(writes, 0);
});

test('failed bulk writes keep the cleared and restored state in memory', () => {
  let writes = 0;
  const checks = createQuizChecks({
    getItem: () => '["q-1-1","q-2-2"]',
    setItem() { writes++; throw new Error('blocked'); }
  });
  assert.deepEqual(checks.clear(['q-1-1']), { removed: ['q-1-1'], persisted: false });
  assert.equal(checks.has('q-1-1'), false);
  assert.equal(checks.has('q-2-2'), true);
  assert.deepEqual(checks.clear(['q-1-1']), { removed: [], persisted: false });
  assert.equal(writes, 1);
  assert.deepEqual(checks.restore(['q-1-1']), { restored: ['q-1-1'], persisted: false });
  assert.equal(checks.has('q-1-1'), true);
  assert.equal(writes, 2);
});

test('bulk operations continue safely when storage is entirely unavailable', () => {
  const checks = createQuizChecks(undefined);
  checks.set('q-1-1', true);
  checks.set('q-2-2', true);
  assert.deepEqual(checks.clear(['q-1-1']), { removed: ['q-1-1'], persisted: false });
  assert.equal(checks.has('q-2-2'), true);
  assert.deepEqual(checks.restore(['q-1-1']), { restored: ['q-1-1'], persisted: false });
  assert.equal(checks.has('q-1-1'), true);
});

test('writes merge other tabs additions and removals instead of overwriting their chapters', () => {
  const storage = memoryStorage({ [QUIZ_CHECKS_KEY]: '["q-1-1","q-2-2"]' });
  const first = createQuizChecks(storage);
  const second = createQuizChecks(storage);
  second.set('q-3-3', true);
  second.set('q-2-2', false);
  assert.deepEqual(first.clear(['q-1-1']), { removed: ['q-1-1'], persisted: true });
  assert.deepEqual(JSON.parse(storage.getItem(QUIZ_CHECKS_KEY)), ['q-3-3']);
  second.set('q-4-4', true);
  assert.deepEqual(first.restore(['q-1-1']), { restored: ['q-1-1'], persisted: true });
  assert.deepEqual(JSON.parse(storage.getItem(QUIZ_CHECKS_KEY)), ['q-3-3', 'q-4-4', 'q-1-1']);
  first.set('q-5-5', true);
  second.set('q-6-6', true);
  assert.deepEqual(JSON.parse(storage.getItem(QUIZ_CHECKS_KEY)), ['q-3-3', 'q-4-4', 'q-1-1', 'q-5-5', 'q-6-6']);
});

test('a failed local removal is merged with fresh other-tab additions on the next successful write', () => {
  const base = memoryStorage({ [QUIZ_CHECKS_KEY]: '["q-1-1","q-2-2"]' });
  let blocked = true;
  const first = createQuizChecks({
    getItem: base.getItem,
    setItem(key, value) { if (blocked) throw new Error('quota exceeded'); base.setItem(key, value); }
  });
  assert.deepEqual(first.clear(['q-1-1']), { removed: ['q-1-1'], persisted: false });
  const second = createQuizChecks(base);
  second.set('q-3-3', true);
  blocked = false;
  assert.deepEqual(first.restore(['q-4-4']), { restored: ['q-4-4'], persisted: true });
  assert.deepEqual(JSON.parse(base.getItem(QUIZ_CHECKS_KEY)), ['q-2-2', 'q-3-3', 'q-4-4']);
  assert.equal(first.has('q-1-1'), false);
});

test('a failed local addition survives latest-state merging and an undo does not resurrect other cleared IDs', () => {
  const base = memoryStorage({ [QUIZ_CHECKS_KEY]: '["q-1-1","q-2-2"]' });
  let blocked = true;
  const first = createQuizChecks({
    getItem: base.getItem,
    setItem(key, value) { if (blocked) throw new Error('quota exceeded'); base.setItem(key, value); }
  });
  first.set('q-3-3', true);
  const second = createQuizChecks(base);
  second.clear(['q-2-2']);
  second.set('q-4-4', true);
  blocked = false;
  assert.deepEqual(first.clear(['q-1-1']), { removed: ['q-1-1'], persisted: true });
  assert.deepEqual(JSON.parse(base.getItem(QUIZ_CHECKS_KEY)), ['q-4-4', 'q-3-3']);
  first.restore(['q-1-1']);
  assert.deepEqual(JSON.parse(base.getItem(QUIZ_CHECKS_KEY)), ['q-4-4', 'q-3-3', 'q-1-1']);
});

test('a damaged latest value does not discard the current session while applying a scoped operation', () => {
  const storage = memoryStorage({ [QUIZ_CHECKS_KEY]: '["q-1-1","q-2-2"]' });
  const checks = createQuizChecks(storage);
  storage.setItem(QUIZ_CHECKS_KEY, '{broken');
  assert.deepEqual(checks.clear(['q-1-1']), { removed: ['q-1-1'], persisted: true });
  assert.deepEqual(JSON.parse(storage.getItem(QUIZ_CHECKS_KEY)), ['q-2-2']);
});
