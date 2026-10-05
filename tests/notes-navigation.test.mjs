import test from 'node:test';
import assert from 'node:assert/strict';
import { initNotes, parseNotesChapter } from '../dist/notes.mjs';

const rawNotes = Array.from({ length: 11 }, (_, index) => `${index + 1}단원 원문\n1) 정답${index + 1}: 설명${index + 1}\n`).join('\n');

function readerHarness(t, { hash = '#full-notes', hidden = false, reducedMotion = false } = {}) {
  const frames = [];
  const scrolls = [];
  class Node {
    constructor(tagName) {
      this.tagName = tagName;
      this.children = [];
      this.parentNode = null;
      this.className = '';
      this.id = '';
      this.value = '';
      this.open = false;
      this.hidden = false;
      this.attributes = new Map();
      this.events = new Map();
      this.ownText = '';
      this.classList = {
        toggle: (name, enabled) => {
          const classes = new Set(this.className.split(/\s+/).filter(Boolean));
          if (enabled) classes.add(name); else classes.delete(name);
          this.className = [...classes].join(' ');
        }
      };
    }
    append(...nodes) {
      for (const node of nodes) {
        if (node.tagName === '#fragment') { this.append(...node.children); continue; }
        node.parentNode = this;
        this.children.push(node);
      }
    }
    replaceChildren(...nodes) {
      this.children.forEach(node => { node.parentNode = null; });
      this.children = [];
      this.ownText = '';
      this.append(...nodes);
    }
    set textContent(value) { this.replaceChildren(); this.ownText = String(value); }
    get textContent() { return this.ownText + this.children.map(node => node.textContent).join(''); }
    setAttribute(name, value) { this.attributes.set(name, value); }
    removeAttribute(name) { this.attributes.delete(name); }
    addEventListener(name, handler) { this.events.set(name, handler); }
    fire(name) { this.events.get(name)?.(); }
    querySelectorAll(selector) {
      const found = [];
      const visit = node => {
        for (const child of node.children) {
          if (selector.startsWith('.') ? child.className.split(/\s+/).includes(selector.slice(1)) : child.tagName === selector) found.push(child);
          visit(child);
        }
      };
      visit(this);
      return found;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    get isConnected() { return this.tagName === '#document' || !!this.parentNode?.isConnected; }
    getClientRects() { return this.isConnected && !this.hidden ? [{}] : []; }
    scrollIntoView(options) { scrolls.push({ id: this.id, options }); }
  }
  const root = new Node('#document');
  const elements = new Map();
  for (const id of ['full-notes', 'chapters', 'noteSearch', 'searchResult', 'hideTitles', 'expandNotes', 'readerMode']) {
    const node = new Node(id === 'noteSearch' ? 'input' : 'div');
    node.id = id;
    elements.set(id, node);
    (id === 'full-notes' ? root : elements.get('full-notes')).append(node);
  }
  elements.get('full-notes').hidden = hidden;
  const findId = (node, id) => node.id === id ? node : node.children.map(child => findId(child, id)).find(Boolean);
  const document = {
    getElementById: id => findId(root, id) || null,
    createElement: tag => new Node(tag),
    createDocumentFragment: () => new Node('#fragment'),
    createTextNode: text => { const node = new Node('#text'); node.textContent = text; return node; }
  };
  const location = { hash };
  let resolveFetch;
  const fetching = new Promise(resolve => { resolveFetch = resolve; });
  const globals = {
    document,
    location,
    window: { matchMedia: () => ({ matches: reducedMotion }) },
    localStorage: { getItem: () => 'true', setItem() {} },
    fetch: () => fetching,
    requestAnimationFrame: callback => { frames.push(callback); return frames.length; }
  };
  for (const [name, value] of Object.entries(globals)) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    t.after(() => { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; });
  }
  return {
    elements, document, location, scrolls,
    flushFrames() { const queued = frames.splice(0); queued.forEach(callback => callback()); },
    async load() {
      resolveFetch({ ok: true, text: async () => rawNotes });
      await new Promise(resolve => setImmediate(resolve));
    }
  };
}

test('notes chapter parser accepts only exact routes for chapters 1 to 11', () => {
  for (let chapter = 1; chapter <= 11; chapter++) assert.equal(parseNotesChapter(`#full-notes/chapter/${chapter}`), chapter);
  for (const hash of ['#full-notes', '#full-notes/', '#full-notes/chapter/0', '#full-notes/chapter/01',
    '#full-notes/chapter/12', '#full-notes/chapter/-1', '#full-notes/chapter/1.5', '#full-notes/chapter/1/extra',
    '#full-notes/chapter/1\n', '#quiz/chapter/1', '', null, undefined, 1]) assert.equal(parseNotesChapter(hash), null);
});

test('chapter entry opens only its original stable ID, clears search, retains title masking and respects reduced motion', async t => {
  const harness = readerHarness(t, { reducedMotion: true });
  let loadedChapters;
  const notes = initNotes({ onLoad: chapters => { loadedChapters = chapters; } });
  await harness.load();
  assert.equal(loadedChapters.length, 11);
  const search = harness.elements.get('noteSearch');
  search.value = '정답10';
  search.fire('input');
  assert.equal(harness.elements.get('chapters').children.length, 1);
  assert.equal(harness.elements.get('chapters').children[0].id, 'note-chapter-10');
  notes.enter('#full-notes');
  assert.equal(search.value, '정답10');
  assert.equal(harness.document.getElementById('note-chapter-10').open, true);
  harness.location.hash = '#full-notes/chapter/3';
  notes.enter(harness.location.hash);
  harness.flushFrames();
  assert.equal(search.value, '');
  assert.deepEqual(harness.elements.get('chapters').children.filter(node => node.open).map(node => node.id), ['note-chapter-3']);
  assert.deepEqual(harness.scrolls, [{ id: 'note-chapter-3', options: { block: 'start', behavior: 'auto' } }]);
  assert.ok(harness.elements.get('chapters').querySelectorAll('.answer').every(node => node.className.includes('masked')));
  harness.location.hash = '#full-notes';
  notes.enter(harness.location.hash);
  assert.equal(harness.document.getElementById('note-chapter-3').open, true);
});

test('a pending initial chapter opens after fetch, while late fetches never scroll a different screen', async t => {
  const harness = readerHarness(t, { hash: '#full-notes/chapter/5' });
  const notes = initNotes();
  notes.enter(harness.location.hash);
  harness.location.hash = '#todo';
  harness.elements.get('full-notes').hidden = true;
  await harness.load();
  harness.flushFrames();
  assert.deepEqual(harness.scrolls, []);
  assert.ok(harness.elements.get('chapters').children.every(node => !node.open));
  harness.location.hash = '#full-notes/chapter/7';
  notes.enter(harness.location.hash);
  harness.flushFrames();
  assert.deepEqual(harness.scrolls, []);
  harness.elements.get('full-notes').hidden = false;
  notes.enter(harness.location.hash);
  harness.flushFrames();
  assert.deepEqual(harness.scrolls, [{ id: 'note-chapter-7', options: { block: 'start', behavior: 'smooth' } }]);
});

test('pending initial navigation and rapid route changes only scroll the most recent visible chapter', async t => {
  const harness = readerHarness(t, { hash: '#full-notes/chapter/2' });
  const notes = initNotes();
  notes.enter(harness.location.hash);
  await harness.load();
  harness.flushFrames();
  assert.equal(harness.scrolls.at(-1).id, 'note-chapter-2');
  harness.location.hash = '#full-notes/chapter/3';
  notes.enter(harness.location.hash);
  harness.location.hash = '#full-notes/chapter/4';
  notes.enter(harness.location.hash);
  harness.flushFrames();
  assert.deepEqual(harness.scrolls.map(item => item.id), ['note-chapter-2', 'note-chapter-4']);
  harness.location.hash = '#full-notes/chapter/6';
  notes.enter(harness.location.hash);
  harness.location.hash = '#full-notes';
  notes.enter(harness.location.hash);
  harness.flushFrames();
  assert.deepEqual(harness.scrolls.map(item => item.id), ['note-chapter-2', 'note-chapter-4']);
});
