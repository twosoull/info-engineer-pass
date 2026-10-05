import test from 'node:test';
import assert from 'node:assert/strict';
import { initQuiz } from '../dist/quiz.mjs';
import { createQuizChecks, QUIZ_CHECKS_KEY } from '../dist/quiz-checks.mjs';

// Minimal DOM for testing the production event handlers and session state.
// Native dialog focus, rendering and event timing remain browser checks.
class Element {
  constructor() {
    this.textContent = '';
    this.children = [];
    this.listeners = new Map();
    this.classList = { toggle() {} };
    this.open = false;
    this.hidden = false;
  }
  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) || [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }
  replaceChildren(...children) { this.children = children; }
  setAttribute() {}
  removeAttribute() {}
  focus() {}
  fire(type) { for (const handler of this.listeners.get(type) || []) handler(); }
  showModal() { this.open = true; }
  close() { this.open = false; this.fire('close'); }
}

const chapters = [
  { title: '1단원', blocks: [{ kind: 'topic', text: 'A: A 설명' }, { kind: 'topic', text: 'B: B 설명' }] },
  { title: '2단원', blocks: [{ kind: 'topic', text: 'C: C 설명' }, { kind: 'topic', text: 'D: D 설명' }] },
  { title: '3단원', blocks: [{ kind: 'topic', text: 'E: E 설명' }] }
];

function setup(t, { hash = '#quiz/checked', checked = ['q-1-1', 'q-1-2', 'q-2-1', 'q-2-2', 'q-3-1'] } = {}) {
  const descriptors = new Map(['document', 'window', 'location', 'localStorage']
    .map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const originalRandom = Math.random;
  t.after(() => {
    Math.random = originalRandom;
    for (const [name, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });

  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, new Element());
    return nodes.get(id);
  };
  const modeLinks = [new Element(), new Element()];
  const values = new Map([
    [QUIZ_CHECKS_KEY, JSON.stringify(checked)],
    ['info-engineer-daily-2026-10-25-v1', '{"keep":true}']
  ]);
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  const events = new Map();
  globalThis.document = {
    getElementById: node,
    createElement: () => new Element(),
    querySelectorAll: selector => selector === '.quiz-mode-links a' ? modeLinks
      : selector === '.quiz-checked-count' ? [node('readerCheckedCount'), node('quizScopeCheckedCount')] : []
  };
  globalThis.window = {
    scrollTo() {},
    addEventListener(type, handler) {
      const handlers = events.get(type) || [];
      handlers.push(handler);
      events.set(type, handlers);
    }
  };
  globalThis.location = { hash };
  globalThis.localStorage = storage;
  Math.random = () => 0.999; // Keep fixture order so skipped/repeated questions are observable.
  node('undoClearChecks').hidden = true;
  const quiz = initQuiz();
  quiz.setChapters(chapters);
  return {
    node, storage,
    click: id => node(id).fire('click'),
    currentPrompt: () => node('quizPrompt').children.map(item => item.textContent).join('\n'),
    uncheck() {
      node('checkQuizQuestion').checked = false;
      node('checkQuizQuestion').fire('change');
    },
    route(hash) {
      globalThis.location.hash = hash;
      for (const handler of events.get('hashchange') || []) handler();
      quiz.enter();
    }
  };
}

test('individual uncheck removes later questions bulk-cleared in another tab', t => {
  const ui = setup(t, { checked: ['q-1-1', 'q-2-1', 'q-3-1'] });
  const otherTab = createQuizChecks(ui.storage);
  assert.equal(ui.currentPrompt(), 'A 설명');
  otherTab.clear(['q-2-1']);
  ui.uncheck();
  assert.equal(ui.currentPrompt(), 'E 설명');
  assert.equal(ui.node('quizCounter').textContent, '1 / 1문제');
  assert.equal(ui.node('quizScopeCheckedCount').textContent, '1');
  assert.equal(ui.node('checkQuizQuestion').checked, true);
  assert.deepEqual(JSON.parse(ui.storage.getItem(QUIZ_CHECKS_KEY)), ['q-3-1']);
});

test('pruning earlier questions preserves the next unread position without skipping it', t => {
  const ui = setup(t);
  ui.click('nextQuizQuestion');
  ui.click('nextQuizQuestion');
  assert.equal(ui.currentPrompt(), 'C 설명');
  createQuizChecks(ui.storage).clear(['q-1-1', 'q-1-2']);
  ui.uncheck();
  assert.equal(ui.currentPrompt(), 'D 설명');
  assert.equal(ui.node('quizCounter').textContent, '1 / 2문제');
  ui.click('nextQuizQuestion');
  assert.equal(ui.currentPrompt(), 'E 설명');
  assert.equal(ui.node('quizCounter').textContent, '2 / 2문제');
});

test('ordinary uncheck retains completed entries in the count and advances once', t => {
  const ui = setup(t);
  ui.click('nextQuizQuestion');
  assert.equal(ui.currentPrompt(), 'B 설명');
  ui.uncheck();
  assert.equal(ui.currentPrompt(), 'C 설명');
  assert.equal(ui.node('quizCounter').textContent, '2 / 4문제');
  assert.equal(ui.node('checkQuizQuestion').checked, true);
});

test('chapter clear and undo preserve an all-mode question and its revealed answer', t => {
  const ui = setup(t, { hash: '#quiz/chapter/1' });
  ui.click('revealQuizAnswer');
  const answer = ui.node('quizAnswer').textContent;
  ui.click('clearChapterChecks');
  ui.click('confirmClearChecks');
  assert.deepEqual(JSON.parse(ui.storage.getItem(QUIZ_CHECKS_KEY)), ['q-2-1', 'q-2-2', 'q-3-1']);
  assert.equal(ui.currentPrompt(), 'A 설명');
  assert.equal(ui.node('quizAnswer').textContent, answer);
  assert.equal(ui.node('quizAnswerBox').hidden, false);
  ui.click('undoClearChecks');
  assert.equal(ui.node('quizAnswer').textContent, answer);
  assert.equal(ui.node('quizAnswerBox').hidden, false);
  assert.equal(JSON.parse(ui.storage.getItem(QUIZ_CHECKS_KEY)).length, 5);
  assert.equal(ui.storage.getItem('info-engineer-daily-2026-10-25-v1'), '{"keep":true}');
});

test('cancel and changing route close confirmation without applying its target', t => {
  const ui = setup(t, { hash: '#quiz/chapter/1' });
  const before = ui.storage.getItem(QUIZ_CHECKS_KEY);
  ui.click('clearChapterChecks');
  ui.click('cancelClearChecks');
  assert.equal(ui.node('clearChecksDialog').open, false);
  assert.equal(ui.storage.getItem(QUIZ_CHECKS_KEY), before);
  ui.click('clearAllChecks');
  ui.route('#quiz/chapter/2');
  assert.equal(ui.node('clearChecksDialog').open, false);
  ui.click('confirmClearChecks');
  assert.equal(ui.storage.getItem(QUIZ_CHECKS_KEY), before);
});
