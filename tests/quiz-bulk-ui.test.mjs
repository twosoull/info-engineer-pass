import test from 'node:test';
import assert from 'node:assert/strict';
import { initQuiz } from '../dist/quiz.mjs';
import { createQuizChecks, QUIZ_CHECKS_KEY } from '../dist/quiz-checks.mjs';

// Minimal DOM for testing the production event handlers and session state.
// Native dialog focus, rendering and event timing remain browser checks.
class Element {
  constructor(tagName = 'div') {
    this.tagName = tagName;
    this.ownText = '';
    this.children = [];
    this.parentNode = null;
    this.id = '';
    this.className = '';
    this.value = '';
    this.checked = false;
    this.disabled = false;
    this.attributes = new Map();
    this.listeners = new Map();
    this.classList = {
      toggle: (name, enabled) => {
        const classes = new Set(this.className.split(/\s+/).filter(Boolean));
        if (enabled) classes.add(name); else classes.delete(name);
        this.className = [...classes].join(' ');
      }
    };
    this.open = false;
    this.hidden = false;
  }
  get textContent() { return this.ownText + this.children.map(child => child.textContent).join(''); }
  set textContent(value) { this.replaceChildren(); this.ownText = String(value); }
  get hash() { return typeof this.href === 'string' ? this.href.slice(this.href.indexOf('#')) : ''; }
  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) || [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }
  append(...children) {
    for (let child of children) {
      if (typeof child === 'string') { const text = new Element('#text'); text.ownText = child; child = text; }
      if (child.tagName === '#fragment') { this.append(...child.children); continue; }
      child.parentNode = this;
      this.children.push(child);
    }
  }
  replaceChildren(...children) {
    this.children.forEach(child => { child.parentNode = null; });
    this.children = [];
    this.ownText = '';
    this.append(...children);
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  querySelectorAll(selector) {
    const found = [];
    const visit = element => {
      for (const child of element.children) {
        const matches = selector === 'input:checked' ? child.tagName === 'input' && child.checked
          : selector.startsWith('.') ? child.className.split(/\s+/).includes(selector.slice(1))
          : selector.startsWith('#') ? child.id === selector.slice(1) : child.tagName === selector;
        if (matches) found.push(child);
        visit(child);
      }
    };
    visit(this);
    return found;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  focus() {}
  fire(type) {
    const event = { target: this, currentTarget: this, preventDefault() {} };
    for (const handler of this.listeners.get(type) || []) handler(event);
  }
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
  const descendantsWithId = (element, id) => element.id === id ? element : element.children.map(child => descendantsWithId(child, id)).find(Boolean);
  const node = id => {
    for (const root of nodes.values()) {
      const found = descendantsWithId(root, id);
      if (found) return found;
    }
    if (!nodes.has(id)) {
      const element = new Element(['quizStartChapter', 'quizChapter'].includes(id) ? 'fieldset' : 'div');
      element.id = id;
      nodes.set(id, element);
    }
    return nodes.get(id);
  };
  const modeLinks = [new Element('a'), new Element('a')];
  const values = new Map([
    [QUIZ_CHECKS_KEY, JSON.stringify(checked)],
    ['info-engineer-daily-2026-10-25-v1', '{"keep":true}'],
    ['info-engineer-game-records-v1', '{"bestScore":19000}']
  ]);
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  const events = new Map();
  globalThis.document = {
    getElementById: node,
    createElement: tagName => new Element(tagName),
    createTextNode: text => { const element = new Element('#text'); element.textContent = text; return element; },
    createDocumentFragment: () => new Element('#fragment'),
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
    node, storage, modeLinks,
    click: id => { if (!node(id).disabled) node(id).fire('click'); },
    choose(picker, chapterId, checked) {
      const input = node(`${picker}-${chapterId}`);
      assert.equal(input.tagName, 'input', `Missing checkbox ${picker}-${chapterId}`);
      assert.equal(input.value, String(chapterId));
      assert.equal(input.disabled, false);
      input.checked = checked;
      input.fire('change');
    },
    selected: picker => node(picker).querySelectorAll('input').filter(input => input.checked).map(input => Number(input.value)),
    currentPrompt: () => node('quizPrompt').children.map(item => item.textContent).join('\n'),
    uncheck() {
      node('checkQuizQuestion').checked = false;
      node('checkQuizQuestion').fire('change');
    },
    route(hash) {
      globalThis.location.hash = hash;
      for (const handler of events.get('hashchange') || []) handler();
      if (hash.startsWith('#quiz')) quiz.enter();
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

test('reader multi-selection updates counts immediately and starts only the selected chapter combination', t => {
  const ui = setup(t, { hash: '#full-notes', checked: ['q-1-1', 'q-2-1', 'q-3-1'] });
  assert.deepEqual(ui.selected('quizStartChapter'), [1, 2, 3]);
  ui.choose('quizStartChapter', 2, false);
  assert.deepEqual(ui.selected('quizStartChapter'), [1, 3]);
  assert.match(ui.node('quizStartHelp').textContent, /3문제/);
  assert.equal(ui.node('readerCheckedCount').textContent, '2');
  assert.equal(ui.node('viewCheckedQuiz').href, '#quiz/checked/chapters/1,3');
  assert.equal(ui.node('startQuiz').disabled, false);
  ui.click('startQuiz');
  assert.equal(location.hash, '#quiz/chapters/1,3');
  assert.equal(ui.currentPrompt(), 'A 설명');
  assert.equal(ui.node('quizCounter').textContent, '1 / 3문제');
  ui.click('nextQuizQuestion');
  assert.equal(ui.currentPrompt(), 'B 설명');
  ui.click('nextQuizQuestion');
  assert.equal(ui.currentPrompt(), 'E 설명');
  ui.click('nextQuizQuestion');
  assert.equal(ui.node('quizCard').hidden, true);
});

test('reader empty selection cannot silently start all chapters, and select-all restores the full bank', t => {
  const ui = setup(t, { hash: '#full-notes' });
  ui.click('quizStartNone');
  assert.deepEqual(ui.selected('quizStartChapter'), []);
  assert.equal(ui.node('readerCheckedCount').textContent, '0');
  assert.equal(ui.node('startQuiz').disabled, true);
  ui.click('startQuiz');
  assert.equal(location.hash, '#full-notes');
  ui.click('quizStartAll');
  assert.deepEqual(ui.selected('quizStartChapter'), [1, 2, 3]);
  assert.equal(ui.node('startQuiz').disabled, false);
  ui.click('startQuiz');
  assert.equal(location.hash, '#quiz');
  assert.equal(ui.node('quizCounter').textContent, '1 / 5문제');
});

test('quiz draft changes retain the current question and revealed answer until explicit apply', t => {
  const ui = setup(t, { hash: '#quiz/chapter/1' });
  ui.click('nextQuizQuestion');
  ui.click('revealQuizAnswer');
  assert.equal(ui.currentPrompt(), 'B 설명');
  assert.equal(ui.node('quizAnswer').textContent, 'B');
  ui.choose('quizChapter', 3, true);
  assert.deepEqual(ui.selected('quizChapter'), [1, 3]);
  assert.equal(location.hash, '#quiz/chapter/1');
  assert.equal(ui.currentPrompt(), 'B 설명');
  assert.equal(ui.node('quizAnswerBox').hidden, false);
  assert.equal(ui.node('quizAnswer').textContent, 'B');
  assert.equal(ui.node('quizCounter').textContent, '2 / 2문제');
  assert.equal(ui.node('clearChapterChecks').disabled, true);
  assert.equal(ui.modeLinks[1].href, '#quiz/checked/chapter/1');
  assert.equal(ui.node('applyQuizChapters').disabled, false);
  ui.click('applyQuizChapters');
  assert.equal(location.hash, '#quiz/chapters/1,3');
  assert.equal(ui.currentPrompt(), 'A 설명');
  assert.equal(ui.node('quizCounter').textContent, '1 / 3문제');
  assert.equal(ui.node('quizAnswerBox').hidden, true);
  assert.equal(ui.node('quizAnswer').textContent, '');
  assert.equal(ui.node('clearChapterChecks').disabled, false);
});

test('quiz empty draft disables apply without losing progress; select-all applies the complete bank', t => {
  const ui = setup(t, { hash: '#quiz/chapter/1' });
  ui.click('nextQuizQuestion');
  ui.click('quizNoChapters');
  assert.deepEqual(ui.selected('quizChapter'), []);
  assert.equal(ui.node('applyQuizChapters').disabled, true);
  assert.equal(ui.node('clearChapterChecks').disabled, true);
  ui.click('applyQuizChapters');
  assert.equal(location.hash, '#quiz/chapter/1');
  assert.equal(ui.currentPrompt(), 'B 설명');
  ui.click('quizAllChapters');
  assert.deepEqual(ui.selected('quizChapter'), [1, 2, 3]);
  assert.equal(ui.node('applyQuizChapters').disabled, false);
  ui.click('applyQuizChapters');
  assert.equal(location.hash, '#quiz');
  assert.equal(ui.currentPrompt(), 'A 설명');
  assert.equal(ui.node('quizCounter').textContent, '1 / 5문제');
});

test('checked mode links preserve the applied multi-chapter range and never include outside checks', t => {
  const ui = setup(t, { hash: '#quiz/chapters/1,3', checked: ['q-1-1', 'q-2-1', 'q-3-1'] });
  assert.equal(ui.modeLinks[0].href, '#quiz/chapters/1,3');
  assert.equal(ui.modeLinks[1].href, '#quiz/checked/chapters/1,3');
  assert.equal(ui.node('quizScopeCheckedCount').textContent, '2');
  ui.route(ui.modeLinks[1].href);
  assert.equal(ui.currentPrompt(), 'A 설명');
  assert.equal(ui.node('quizCounter').textContent, '1 / 2문제');
  ui.click('nextQuizQuestion');
  assert.equal(ui.currentPrompt(), 'E 설명');
  ui.click('nextQuizQuestion');
  assert.equal(ui.node('quizCard').hidden, true);
});

test('checked-mode draft can apply a valid chapter with zero checks and shows an empty result', t => {
  const ui = setup(t, { hash: '#quiz/checked/chapter/1', checked: ['q-1-1'] });
  ui.click('quizNoChapters');
  ui.choose('quizChapter', 3, true);
  assert.equal(ui.node('applyQuizChapters').disabled, false);
  assert.equal(ui.currentPrompt(), 'A 설명');
  ui.click('applyQuizChapters');
  assert.equal(location.hash, '#quiz/checked/chapter/3');
  assert.equal(ui.node('quizCard').hidden, true);
  assert.equal(ui.node('quizCounter').textContent, '0문제');
  assert.match(ui.node('quizMessage').textContent, /체크한 문제/);
  assert.equal(ui.node('nextQuizQuestion').disabled, true);
  assert.equal(ui.node('revealQuizAnswer').disabled, true);
});

test('multi-chapter clear freezes explicit targets and undo preserves outside and newly added checks', t => {
  const ui = setup(t, { hash: '#quiz/chapters/1,3', checked: ['q-1-1', 'q-2-1', 'q-3-1'] });
  ui.click('revealQuizAnswer');
  ui.click('clearChapterChecks');
  assert.equal(ui.node('clearChecksDialog').open, true);
  createQuizChecks(ui.storage).set('q-1-2', true);
  ui.click('confirmClearChecks');
  assert.deepEqual(JSON.parse(ui.storage.getItem(QUIZ_CHECKS_KEY)), ['q-2-1', 'q-1-2']);
  assert.equal(ui.currentPrompt(), 'A 설명');
  assert.equal(ui.node('quizAnswer').textContent, 'A');
  assert.equal(ui.node('quizAnswerBox').hidden, false);
  ui.click('undoClearChecks');
  assert.deepEqual(new Set(JSON.parse(ui.storage.getItem(QUIZ_CHECKS_KEY))), new Set(['q-2-1', 'q-1-2', 'q-1-1', 'q-3-1']));
  assert.equal(ui.node('quizAnswerBox').hidden, false);
  assert.equal(ui.storage.getItem('info-engineer-daily-2026-10-25-v1'), '{"keep":true}');
  assert.equal(ui.storage.getItem('info-engineer-game-records-v1'), '{"bestScore":19000}');
});

test('legacy single-chapter URLs initialize and re-enter with the same chapter checkboxes and question scope', t => {
  const ui = setup(t, { hash: '#quiz/chapter/2' });
  assert.deepEqual(ui.selected('quizChapter'), [2]);
  assert.deepEqual(ui.selected('quizStartChapter'), [2]);
  assert.equal(ui.currentPrompt(), 'C 설명');
  assert.equal(ui.node('quizCounter').textContent, '1 / 2문제');
  ui.click('nextQuizQuestion');
  ui.route('#quiz/chapter/1');
  ui.route('#quiz/chapter/2');
  assert.equal(ui.currentPrompt(), 'D 설명');
  ui.route('#quiz/checked/chapter/2');
  assert.deepEqual(ui.selected('quizChapter'), [2]);
  assert.equal(ui.currentPrompt(), 'C 설명');
  assert.equal(ui.node('quizCounter').textContent, '1 / 2문제');
});
