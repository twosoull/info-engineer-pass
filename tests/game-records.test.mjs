import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameRecords, GAME_RECORDS_KEY } from '../dist/game-records.mjs';

test('personal bests persist independently for each timer and never decrease', () => {
  const values = new Map([['daily-progress', 'keep']]);
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const records = createGameRecords(storage);
  assert.equal(records.get(30), null);
  assert.deepEqual(records.save(30, 14000), { improved: true, persisted: true });
  assert.deepEqual(records.save(30, 12000), { improved: false, persisted: true });
  records.save(0, 6000);
  const restored = createGameRecords(storage);
  assert.equal(restored.get(30), 14000);
  assert.equal(restored.get(0), 6000);
  assert.equal(restored.get(60), null);
  assert.equal(values.get('daily-progress'), 'keep');
  assert.equal(JSON.parse(values.get(GAME_RECORDS_KEY))['30'], 14000);
});

test('blocked storage keeps the game usable and reports save failures', () => {
  const records = createGameRecords({ getItem() { throw new Error(); }, setItem() { throw new Error(); } });
  assert.equal(records.get(30), null);
  assert.deepEqual(records.save(30, 1000), { improved: true, persisted: false });
  assert.equal(records.get(30), 1000);
  assert.deepEqual(records.save(30, 900), { improved: false, persisted: false });
});

test('two tabs merge mode records without lowering or deleting existing bests', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const first = createGameRecords(storage);
  const second = createGameRecords(storage);
  first.save(30, 15000);
  second.save(60, 12000);
  second.save(30, 9000);
  assert.equal(first.get(60), 12000);
  assert.deepEqual(JSON.parse(values.get(GAME_RECORDS_KEY)), { '30': 15000, '60': 12000 });
});

test('corrupt or out-of-range saved scores are ignored', () => {
  for (const saved of ['bad', 'null', '[]', '"text"', '{"30":-10,"60":"2000","0":999999}']) {
    const records = createGameRecords({ getItem: () => saved });
    assert.equal(records.get(30), null);
    assert.equal(records.get(60), null);
    assert.equal(records.get(0), null);
  }
  const records = createGameRecords();
  for (const [mode, score] of [[20, 1000], [30, Infinity], [30, -1], [30, 1.1], [0, 19001]]) {
    assert.equal(records.save(mode, score).improved, false);
  }
});
