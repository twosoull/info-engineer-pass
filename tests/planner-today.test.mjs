import test from 'node:test';
import assert from 'node:assert/strict';

const PROGRESS_KEY = 'info-engineer-daily-2026-10-25-v1';
let instance = 0;

// Model only the DOM surfaces used by planner.mjs. Parse its generated cards
// and checkboxes so assertions also cover re-rendering after midnight.
async function setup(t, { now = '2026-10-01T03:00:00Z', reducedMotion = false, saved = {} } = {}) {
  const descriptors = new Map(['document', 'window', 'localStorage', 'Date']
    .map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const NativeDate = globalThis.Date;
  let clock = NativeDate.parse(now);
  let reduced = reducedMotion;
  const nodes = new Map();
  const scrolls = [];
  const mediaQueries = [];
  const writes = [];
  const values = new Map([
    [PROGRESS_KEY, JSON.stringify(saved)],
    ['info-engineer-quiz-checks-v1', '["q-1-1"]'],
    ['info-engineer-game-records-v1', '{"30":12000}']
  ]);
  t.after(() => {
    for (const [name, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });

  const attr = (attributes, name) => new RegExp(name + '="([^"]*)"').exec(attributes)?.[1];
  class Element {
    constructor(id = '') {
      this.id = id;
      this.textContent = '';
      this.children = [];
      this.dataset = {};
      this.hidden = false;
      this.checked = false;
      this.attributes = new Map();
      this.listeners = new Map();
      this.inputs = new Map();
      this.classes = new Set();
      this.classList = {
        contains: name => this.classes.has(name),
        add: name => this.classes.add(name),
        remove: name => this.classes.delete(name),
        toggle: (name, force) => {
          const active = force ?? !this.classes.has(name);
          if (active) this.classes.add(name);
          else this.classes.delete(name);
          return active;
        }
      };
      this.style = { setProperty(name, value) { this[name] = value; } };
    }
    set innerHTML(html) {
      this.html = html;
      if (this.id === 'todoList') {
        this.children = [...html.matchAll(/<article\b([^>]*)>/g)].map(([, attributes]) => {
          const card = new Element(attr(attributes, 'id'));
          card.dataset.week = attr(attributes, 'data-week');
          card.hidden = /(?:^|\s)hidden(?:\s|$)/.test(attributes);
          card.classes = new Set((attr(attributes, 'class') || '').split(/\s+/));
          nodes.set(card.id, card);
          return card;
        });
        this.inputs = new Map([...html.matchAll(/<input\b([^>]*)>/g)].map(([, attributes]) => {
          const input = new Element();
          input.dataset.id = attr(attributes, 'data-id');
          input.checked = /(?:^|\s)checked(?:\s|$)/.test(attributes);
          return [input.dataset.id, input];
        }));
      } else if (this.id === 'weekTabs') {
        this.children = [...html.matchAll(/<button\b([^>]*)>/g)].map(([, attributes]) => {
          const button = new Element();
          button.dataset.week = attr(attributes, 'data-week');
          button.setAttribute('aria-pressed', attr(attributes, 'aria-pressed'));
          return button;
        });
      }
    }
    get innerHTML() { return this.html || ''; }
    addEventListener(type, handler) {
      const handlers = this.listeners.get(type) || [];
      handlers.push(handler);
      this.listeners.set(type, handlers);
    }
    fire(type, event = {}) { for (const handler of this.listeners.get(type) || []) handler(event); }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    querySelectorAll(selector) { return selector === 'button' ? this.children : []; }
    querySelector(selector) {
      const id = /^input\[data-id="([^"]+)"\]$/.exec(selector)?.[1];
      return this.inputs.get(id) || null;
    }
    scrollIntoView(options) { scrolls.push({ id: this.id, hidden: this.hidden, options }); }
  }
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, new Element(id));
    return nodes.get(id);
  };
  globalThis.Date = class extends NativeDate {
    constructor(...args) { super(...(args.length ? args : [clock])); }
    static now() { return clock; }
  };
  globalThis.document = {
    hidden: false,
    getElementById: node,
    addEventListener() {}
  };
  globalThis.window = {
    matchMedia(query) {
      mediaQueries.push(query);
      return { matches: reduced };
    }
  };
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem(key, value) { writes.push({ key, value }); values.set(key, value); }
  };

  // planner owns module-level UI state; a fresh URL gives each test a new
  // instance without touching the shared schedule or production files.
  const url = new URL('../dist/planner.mjs', import.meta.url);
  url.searchParams.set('today-test', String(++instance));
  const planner = await import(url.href);
  return {
    planner, node, scrolls, mediaQueries, writes, values,
    setNow: value => { clock = NativeDate.parse(value); },
    setReducedMotion: value => { reduced = value; }
  };
}

function assertSelectedWeek(ui, week) {
  const buttons = ui.node('weekTabs').querySelectorAll('button');
  assert.deepEqual(buttons.filter(button => button.getAttribute('aria-pressed') === 'true')
    .map(button => Number(button.dataset.week)), [week]);
  const visibleCards = ui.node('todoList').children.filter(card => !card.hidden);
  assert.ok(visibleCards.length > 0);
  assert.ok(visibleCards.every(card => Number(card.dataset.week) === week));
}

test('today navigation restores the Korean-date week and scrolls its visible card smoothly', async t => {
  const ui = await setup(t, { now: '2026-10-12T15:30:00Z' }); // 10/13 in Korea.
  ui.planner.showPlanDay('2026-09-30');
  assertSelectedWeek(ui, 0);
  ui.planner.showTodayPlan();
  assertSelectedWeek(ui, 2);
  assert.deepEqual(ui.scrolls, [{
    id: 'day-2026-10-13', hidden: false, options: { behavior: 'smooth', block: 'start' }
  }]);
  assert.equal(ui.node('day-2026-10-13').classList.contains('is-today'), true);
});

for (const [label, now, target, week] of [
  ['before the plan', '2026-09-20T03:00:00Z', '2026-09-29', 0],
  ['on exam day', '2026-10-25T03:00:00Z', '2026-10-25', 3],
  ['after the exam', '2026-11-01T03:00:00Z', '2026-10-25', 3]
]) {
  test('today navigation selects the correct boundary ' + label, async t => {
    const ui = await setup(t, { now });
    ui.planner.showTodayPlan();
    assertSelectedWeek(ui, week);
    assert.equal(ui.scrolls.at(-1).id, 'day-' + target);
    assert.equal(ui.scrolls.at(-1).hidden, false);
    if (label === 'on exam day') assert.equal(ui.node('examCountdown').textContent, 'D-DAY');
  });
}

test('crossing Korean midnight refreshes today styling, countdown and selected week', async t => {
  const ui = await setup(t, { now: '2026-10-05T14:59:00Z' }); // Monday, 23:59 KST.
  assert.equal(ui.node('day-2026-10-05').classList.contains('is-today'), true);
  ui.setNow('2026-10-05T15:01:00Z'); // Tuesday, 00:01 KST, second study week.
  ui.planner.showTodayPlan();
  assertSelectedWeek(ui, 1);
  assert.equal(ui.scrolls.at(-1).id, 'day-2026-10-06');
  assert.equal(ui.node('day-2026-10-05').classList.contains('is-today'), false);
  assert.equal(ui.node('day-2026-10-06').classList.contains('is-today'), true);
  assert.equal(ui.node('examCountdown').textContent, 'D-19');
});

test('reduced-motion preference is checked for each navigation', async t => {
  const ui = await setup(t);
  ui.planner.showTodayPlan();
  assert.equal(ui.scrolls.at(-1).options.behavior, 'smooth');
  ui.setReducedMotion(true);
  ui.planner.showTodayPlan();
  assert.deepEqual(ui.scrolls.at(-1).options, { behavior: 'instant', block: 'start' });
  assert.ok(ui.mediaQueries.every(query => query === '(prefers-reduced-motion: reduce)'));
  assert.ok(ui.mediaQueries.length >= 2);
});

test('the existing today button uses the same fresh-date and reduced-motion behavior', async t => {
  const ui = await setup(t, { now: '2026-10-05T14:59:00Z', reducedMotion: true });
  ui.planner.showPlanDay('2026-10-24');
  assertSelectedWeek(ui, 3);
  ui.setNow('2026-10-05T15:01:00Z');
  ui.node('todayBtn').fire('click');
  assertSelectedWeek(ui, 1);
  assert.deepEqual(ui.scrolls, [{
    id: 'day-2026-10-06', hidden: false, options: { behavior: 'instant', block: 'start' }
  }]);
});

test('today navigation and midnight re-render preserve progress and unrelated saved records', async t => {
  const saved = { '2026-09-30-1': true, '2026-10-05-3': true, '2026-10-06-2': true,
    '2026-10-06-routine-morning': true };
  const ui = await setup(t, { now: '2026-10-05T14:59:00Z', saved });
  const before = [...ui.values];
  const progressBefore = ui.node('progressCopy').textContent;
  ui.planner.showPlanDay('2026-10-24');
  ui.planner.showTodayPlan();
  ui.setNow('2026-10-05T15:01:00Z');
  ui.planner.showTodayPlan();
  for (const id of Object.keys(saved)) {
    assert.equal(ui.planner.getTaskCompletion(id), true);
    assert.equal(ui.node('todoList').querySelector('input[data-id="' + id + '"]').checked, true);
  }
  assert.equal(ui.node('progressCopy').textContent, progressBefore);
  assert.deepEqual([...ui.values], before);
  assert.deepEqual(ui.writes, []);
});

test('old theory checks never pre-complete the replacement morning and evening tasks', async t => {
  const ui = await setup(t, { saved: { '2026-10-01-1': true, '2026-10-01-2': true } });
  ui.planner.showTodayPlan();
  assert.equal(ui.node('todoList').querySelector('input[data-id="2026-10-01-2"]').checked, true);
  for (const session of ['morning', 'evening']) {
    const id = `2026-10-01-routine-${session}`;
    assert.equal(ui.node('todoList').querySelector(`input[data-id="${id}"]`).checked, false);
  }
  assert.equal(JSON.parse(ui.values.get(PROGRESS_KEY))['2026-10-01-1'], true);
  assert.deepEqual(ui.writes, []);
});

test('daily cards show separate commute and evening blocks, with weekend-specific labels', async t => {
  const ui = await setup(t);
  const html = ui.node('todoList').innerHTML;
  const card = date => html.split(`id="day-${date}"`)[1].split('</article>')[0];
  const weekday = card('2026-10-01');
  assert.match(weekday, /오늘 새 용어 5개/);
  assert.match(weekday, /아침 출근길<\/strong><small>10분/);
  assert.match(weekday, /퇴근 후<\/strong><small>40분/);
  assert.ok(weekday.indexOf('routine-morning') < weekday.indexOf('routine-evening'));
  assert.ok(weekday.indexOf('routine-evening') < weekday.indexOf('data-id="2026-10-01-2"'));
  assert.match(weekday, /#full-notes\/chapter\/1/);
  assert.match(weekday, /피곤한 날은 여기까지만/);
  const weekend = card('2026-10-03');
  assert.match(weekend, /아침 · 가볍게 읽기/);
  assert.match(weekend, /저녁 · 복습하고 코딩/);
  assert.doesNotMatch(weekend, /아침 출근길|퇴근 후/);
  assert.match(card('2026-10-21'), /새 암기 없이 복습/);
});
