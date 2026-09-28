// Keep source wording; add structure at existing headings and list markers only.
export function definitionColon(text) {
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '(') depth++;
    if (text[i] === ')') depth = Math.max(0, depth - 1);
    if ((text[i] === ':' || text[i] === '：') && depth === 0) return i;
  }
  return -1;
}

export function parseBlocks(text) {
  const blocks = [];
  let continuation = false;
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) { continuation = false; continue; }
    let kind;
    if (/^\d+\)/.test(line)) kind = 'topic';
    else if (/^\([\da-z]+\)/i.test(line)) kind = definitionColon(line.replace(/^\([\da-z]+\)\s*/i, '')) < 0 ? 'subheading' : 'subitem';
    else if (/^\[[^\]]+\]$/.test(line) || /^\*[^*]/.test(line)) kind = 'group';
    else if (/^[-•〮◌]/.test(line)) kind = 'bullet';
    else if (/^[àè→]/.test(line)) kind = 'hint';
    else kind = 'paragraph';
    const previous = blocks.at(-1);
    if (kind === 'paragraph' && continuation && previous && !['topic', 'subheading', 'group'].includes(previous.kind)) {
      previous.text += ` ${line}`;
    } else blocks.push({ kind, text: line });
    continuation = true;
  }
  return blocks;
}

export function parseChapters(raw) {
  return raw.replace(/\f/g, '\n').trim().split(/(?=^\d+단원\s)/m).filter(Boolean).map(text => {
    const firstBreak = text.indexOf('\n');
    return { title: text.slice(0, firstBreak).trim(), text, blocks: parseBlocks(text.slice(firstBreak + 1)) };
  });
}

export function initNotes({ onLoad = () => {}, onError = () => {} } = {}) {
  const chaptersEl = document.getElementById('chapters');
  const search = document.getElementById('noteSearch');
  const result = document.getElementById('searchResult');
  const toggle = document.getElementById('hideTitles');
  const expand = document.getElementById('expandNotes');
  const mode = document.getElementById('readerMode');
  let chapters = [];
  let hidden = false;
  let allExpanded = false;
  try { hidden = localStorage.getItem('info-engineer-hide-answers-v1') === 'true'; } catch {}

  function addText(parent, text) {
    const query = search.value.trim();
    if (!query) { parent.append(document.createTextNode(text)); return; }
    let start = 0;
    let found;
    const lower = text.toLowerCase();
    const q = query.toLowerCase();
    while ((found = lower.indexOf(q, start)) !== -1) {
      parent.append(document.createTextNode(text.slice(start, found)));
      const mark = document.createElement('mark');
      mark.textContent = text.slice(found, found + query.length);
      parent.append(mark);
      start = found + query.length;
    }
    parent.append(document.createTextNode(text.slice(start)));
  }

  function addAnswer(parent, text) {
    const strong = document.createElement('strong');
    strong.className = 'answer';
    const span = document.createElement('span');
    span.className = 'answer-text';
    addText(span, text);
    strong.append(span);
    parent.append(strong);
  }

  function addDefinition(parent, text, hideWhole = false) {
    const prefix = text.match(/^(?:\d+\)|\([\da-z]+\))\s*/i)?.[0] || '';
    if (prefix) addText(parent, prefix);
    const rest = text.slice(prefix.length);
    const colon = definitionColon(rest);
    if (colon >= 0) {
      addAnswer(parent, rest.slice(0, colon));
      addText(parent, rest.slice(colon));
    } else if (hideWhole) addAnswer(parent, rest);
    else addText(parent, rest);
  }

  function bodyFor(chapter) {
    const body = document.createElement('div');
    body.className = 'chapter-body';
    let section = body;
    let list;
    for (const block of chapter.blocks) {
      if (block.kind !== 'bullet') list = null;
      if (block.kind === 'topic') {
        section = document.createElement('section');
        section.className = 'note-topic';
        const heading = document.createElement('h3');
        const prefix = block.text.match(/^\d+\)\s*/)?.[0] || '';
        const rest = block.text.slice(prefix.length);
        const colon = definitionColon(rest);
        addText(heading, prefix);
        addAnswer(heading, colon < 0 ? rest : rest.slice(0, colon));
        section.append(heading);
        if (colon >= 0) {
          const description = document.createElement('p');
          addText(description, rest.slice(colon));
          section.append(description);
        }
        body.append(section);
      } else if (block.kind === 'bullet') {
        if (!list) { list = document.createElement('ul'); section.append(list); }
        const item = document.createElement('li');
        // Retain the source marker in the accessible/copyable text.
        const marker = block.text.match(/^[-•〮◌]+\s*/)?.[0] || '';
        const markerSpan = document.createElement('span');
        markerSpan.className = 'sr-only';
        markerSpan.textContent = marker;
        item.append(markerSpan);
        addDefinition(item, block.text.slice(marker.length));
        list.append(item);
      } else {
        const element = document.createElement(block.kind === 'group' ? 'h4' : 'p');
        if (block.kind === 'subitem' || block.kind === 'subheading') {
          element.className = 'note-subitem';
          addDefinition(element, block.text, block.kind === 'subheading');
        } else {
          if (block.kind === 'group') element.className = 'note-subhead';
          if (block.kind === 'hint') element.className = 'note-hint';
          addText(element, block.text);
        }
        section.append(element);
      }
    }
    return body;
  }

  function applyMode() {
    for (const answer of chaptersEl.querySelectorAll('.answer')) {
      answer.classList.toggle('masked', hidden);
      answer.querySelector('.answer-text').setAttribute('aria-hidden', String(hidden));
      if (hidden) answer.setAttribute('aria-label', '정답 숨김');
      else answer.removeAttribute('aria-label');
    }
    toggle.textContent = hidden ? '제목 보이기' : '제목 숨기기';
    toggle.setAttribute('aria-pressed', String(hidden));
    mode.textContent = hidden ? '설명으로 정답 떠올리기' : '소제목·핵심 용어 가리기';
  }

  function updateExpandLabel() {
    const items = [...chaptersEl.querySelectorAll('details')];
    expand.textContent = items.length && items.every(item => item.open) ? '전체 접기' : '전체 펼치기';
  }

  function render() {
    const query = search.value.trim().toLowerCase();
    const matches = chapters.filter(chapter => !query || chapter.text.toLowerCase().includes(query));
    const fragment = document.createDocumentFragment();
    for (const chapter of matches) {
      const details = document.createElement('details');
      details.className = 'chapter';
      details.open = !!query || allExpanded;
      const summary = document.createElement('summary');
      addText(summary, chapter.title);
      details.append(summary, bodyFor(chapter));
      fragment.append(details);
    }
    chaptersEl.replaceChildren(fragment);
    result.textContent = query ? (matches.length ? `“${search.value.trim()}” 포함 단원 ${matches.length}개` : '일치하는 내용이 없어요. 다른 키워드로 찾아보세요.') : '단원을 펼쳐 읽고, 아래 버튼으로 제목을 가려보세요.';
    applyMode();
    updateExpandLabel();
  }

  toggle.addEventListener('click', () => {
    hidden = !hidden;
    applyMode();
    try { localStorage.setItem('info-engineer-hide-answers-v1', String(hidden)); } catch {}
  });
  expand.addEventListener('click', () => {
    allExpanded = ![...chaptersEl.querySelectorAll('details')].every(item => item.open);
    chaptersEl.querySelectorAll('details').forEach(item => item.open = allExpanded);
    expand.textContent = allExpanded ? '전체 접기' : '전체 펼치기';
  });
  search.addEventListener('input', render);
  chaptersEl.addEventListener('toggle', updateExpandLabel, true);
  applyMode();
  fetch('assets/full-notes.txt').then(response => {
    if (!response.ok) throw new Error('notes unavailable');
    return response.text();
  }).then(raw => { chapters = parseChapters(raw); render(); onLoad(chapters); }).catch(() => {
    chaptersEl.textContent = '정리본을 불러오지 못했어요. PDF 자료함에서 원문을 열어주세요.';
    onError();
  });
}
