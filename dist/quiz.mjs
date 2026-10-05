import { definitionColon } from './notes.mjs';
import { createQuizChecks } from './quiz-checks.mjs';
import { parseQuizScope, quizScopeHash, filterQuizChapter, buildQuizChapters } from './quiz-scope.mjs';

const stripMarker = text => text.replace(/^(?:\d+\)|\([\da-z]+\)|[-•〮◌]+)\s*/i, '').trim();

// Only turn existing term/description pairs into questions. Section labels and
// image-only entries have no standalone description, so they are not questions.
export function buildQuestions(chapters) {
  const questions = [];
  const seen = new Set();
  chapters.forEach((chapter, chapterIndex) => {
    chapter.blocks.forEach((block, blockIndex) => {
      if (!['topic', 'subheading', 'subitem', 'bullet'].includes(block.kind)) return;
      const text = stripMarker(block.text);
      const colon = definitionColon(text);
      if (colon < 0 && !['topic', 'subheading'].includes(block.kind)) return;
      const answer = (colon < 0 ? text : text.slice(0, colon)).trim();
      const explanation = colon < 0 ? [] : [text.slice(colon + 1).trim()];
      for (let index = blockIndex + 1; index < chapter.blocks.length; index++) {
        const next = chapter.blocks[index];
        if (!['paragraph', 'hint'].includes(next.kind)) break;
        explanation.push(next.text);
      }
      const paragraphs = explanation.filter(Boolean);
      if (!answer || !paragraphs.length) return;
      const key = `${answer}\n${paragraphs.join('\n')}`;
      if (seen.has(key)) return;
      seen.add(key);
      questions.push({ id: `q-${chapterIndex + 1}-${blockIndex + 1}`, answer, paragraphs, source: chapter.title });
    });
  });
  return questions;
}

export function shuffleQuestions(questions, random = Math.random) {
  const shuffled = [...questions];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }
  return shuffled;
}

export function initQuiz() {
  const start = document.getElementById('startQuiz');
  const help = document.getElementById('quizStartHelp');
  const card = document.getElementById('quizCard');
  const message = document.getElementById('quizMessage');
  const heading = document.getElementById('quizQuestionHeading');
  const prompt = document.getElementById('quizPrompt');
  const answerBox = document.getElementById('quizAnswerBox');
  const answer = document.getElementById('quizAnswer');
  const source = document.getElementById('quizSource');
  const placeholder = document.getElementById('quizAnswerHidden');
  const reveal = document.getElementById('revealQuizAnswer');
  const next = document.getElementById('nextQuizQuestion');
  const restart = document.getElementById('restartQuiz');
  const counter = document.getElementById('quizCounter');
  const progress = document.getElementById('quizProgress');
  const check = document.getElementById('checkQuizQuestion');
  const checkStatus = document.getElementById('quizCheckStatus');
  const modeLabel = document.getElementById('quizMode');
  const intro = document.getElementById('quizIntro');
  const modeLinks = [...document.querySelectorAll('.quiz-mode-links a')];
  const startChapter = document.getElementById('quizStartChapter');
  const chapterSelect = document.getElementById('quizChapter');
  const scopeHelp = document.getElementById('quizScopeHelp');
  const scopeCheckedCount = document.getElementById('quizScopeCheckedCount');
  const clearChapter = document.getElementById('clearChapterChecks');
  const clearAll = document.getElementById('clearAllChecks');
  const clearCount = document.getElementById('quizClearCount');
  const clearHelp = document.getElementById('quizClearHelp');
  const clearStatus = document.getElementById('quizClearStatus');
  const undoClear = document.getElementById('undoClearChecks');
  const clearDialog = document.getElementById('clearChecksDialog');
  const clearTitle = document.getElementById('clearChecksTitle');
  const clearDescription = document.getElementById('clearChecksDescription');
  const cancelClear = document.getElementById('cancelClearChecks');
  const confirmClear = document.getElementById('confirmClearChecks');
  const clearSummary = document.getElementById('quizCheckToolsSummary');
  const checks = createQuizChecks({
    getItem: key => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value)
  });
  let bank = [];
  let chapters = [];
  const sessions = new Map();
  let scope = { mode: 'all', chapterId: null };
  let readerChapterId = null;
  let loaded = false;
  let failed = false;
  let pendingClear = null;
  let lastClear = null;
  let clearOpener = null;

  const selectedScope = () => parseQuizScope(location.hash) || { mode: 'all', chapterId: null };
  const onQuizPage = () => parseQuizScope(location.hash) !== null;
  const knownChapter = id => id === null || chapters.some(chapter => chapter.id === id);
  const chapterName = id => chapters.find(chapter => chapter.id === id)?.title || '전체 단원';
  const poolFor = current => filterQuizChapter(current.mode === 'checked' ? checks.filter(bank) : bank, current.chapterId);

  function sessionFor(current = scope) {
    const key = quizScopeHash(current);
    if (!sessions.has(key)) sessions.set(key, { deck: [], index: 0, started: false });
    return sessions.get(key);
  }

  function fillChapterSelect(select, selected, checkedOnly = false) {
    const available = checkedOnly ? checks.filter(bank) : bank;
    const options = [{ id: null, title: '전체 단원', count: available.length }, ...chapters.map(chapter => ({
      ...chapter, count: checkedOnly ? filterQuizChapter(available, chapter.id).length : chapter.count
    }))];
    if (selected !== null && !knownChapter(selected)) options.push({ id: selected, title: `알 수 없는 단원 (${selected})`, count: 0 });
    select.replaceChildren(...options.map(item => {
      const option = document.createElement('option');
      option.value = item.id === null ? 'all' : String(item.id);
      option.textContent = `${item.title} · ${item.count}문제`;
      return option;
    }));
    select.value = selected === null ? 'all' : String(selected);
    select.disabled = !loaded || failed;
  }

  function updateScopeControls() {
    fillChapterSelect(startChapter, readerChapterId);
    fillChapterSelect(chapterSelect, scope.chapterId, scope.mode === 'checked');
    const readerCount = filterQuizChapter(bank, readerChapterId).length;
    start.disabled = !loaded || failed || !readerCount;
    help.textContent = failed ? '정리본을 불러오지 못했어요. 새로고침 후 다시 시도해주세요.'
      : !loaded ? '정리본에서 문제를 준비하는 중입니다…'
      : readerCount ? `${chapterName(readerChapterId)} · ${readerCount}문제 · 중복 없이 무작위 출제`
      : '이 단원에는 출제할 설명이 없어요. 다른 단원을 선택해주세요.';
    scopeCheckedCount.textContent = String(filterQuizChapter(checks.filter(bank), scope.chapterId).length);
    scopeHelp.textContent = !loaded ? '정리본에서 문제를 준비하는 중입니다…'
      : failed ? '정리본을 불러오지 못했어요. 새로고침 후 다시 시도해주세요.'
      : !knownChapter(scope.chapterId) ? '존재하지 않는 단원이에요. 다른 단원을 선택해주세요.'
      : `${poolFor(scope).length}문제 · ${scope.mode === 'checked' ? '선택한 단원의 체크한 문제만' : '선택한 단원만'} 무작위로 출제됩니다.`;
    const totalChecked = checks.filter(bank).length;
    const chapterChecked = scope.chapterId === null ? 0 : filterQuizChapter(checks.filter(bank), scope.chapterId).length;
    clearChapter.disabled = !loaded || failed || scope.chapterId === null || !knownChapter(scope.chapterId) || !chapterChecked;
    clearAll.disabled = !loaded || failed || !totalChecked;
    clearChapter.textContent = scope.chapterId === null ? '이 단원 체크 해제' : `${scope.chapterId}단원 체크 해제 (${chapterChecked})`;
    clearAll.textContent = `전체 체크 해제 (${totalChecked})`;
    clearCount.textContent = scope.chapterId === null ? `전체 ${totalChecked}개` : `이 단원 ${chapterChecked}개 · 전체 ${totalChecked}개`;
    clearHelp.textContent = scope.chapterId === null
      ? '위에서 단원을 선택하면 해당 단원의 체크만 해제할 수 있어요. 날짜별 학습 진도는 유지됩니다.'
      : '이 단원만 해제하거나, 모든 단원의 체크를 한 번에 해제할 수 있어요. 날짜별 학습 진도는 유지됩니다.';
  }

  function updateChecks() {
    const count = checks.filter(bank).length;
    document.querySelectorAll('.quiz-checked-count').forEach(element => { element.textContent = String(count); });
    const session = sessionFor();
    const question = session.deck[session.index];
    check.disabled = !question;
    check.checked = !!question && checks.has(question.id);
    card.classList.toggle('is-checked', check.checked);
    updateScopeControls();
  }

  function updateMode() {
    modeLabel.textContent = scope.mode === 'checked' ? '체크한 문제 복습' : scope.chapterId === null ? '랜덤 시험' : '단원별 시험';
    intro.textContent = scope.mode === 'checked'
      ? '체크한 문제만 한 문제씩 봅니다. 정답은 가려지고, 체크를 해제하면 이 모음에서 빠집니다.'
      : '정답을 생각한 뒤 확인하세요. 다시 보고 싶은 문제는 체크해두세요.';
    modeLinks.forEach((link, index) => {
      const mode = index === 0 ? 'all' : 'checked';
      link.href = quizScopeHash({ mode, chapterId: scope.chapterId });
      const active = mode === scope.mode;
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function displayQuestion(focus = false) {
    const { deck, index } = sessionFor();
    const question = deck[index];
    answerBox.hidden = true;
    answer.textContent = '';
    source.textContent = '';
    placeholder.hidden = false;
    reveal.textContent = '정답 확인';
    reveal.disabled = !question;
    reveal.setAttribute('aria-expanded', 'false');
    next.disabled = !question;
    card.hidden = !question;
    message.hidden = !!question;
    restart.hidden = !!question || !loaded || failed || !knownChapter(scope.chapterId) || !filterQuizChapter(bank, scope.chapterId).length;
    restart.textContent = scope.mode === 'checked'
      ? poolFor(scope).length ? '체크한 문제 다시 섞어보기' : scope.chapterId === null ? '전체 시험 시작하기' : '이 단원 시험 시작하기'
      : scope.chapterId === null ? '다시 섞어서 시험보기' : '이 단원 다시 섞어서 시험보기';
    progress.max = Math.max(deck.length, 1);
    progress.value = question ? index + 1 : deck.length;
    counter.textContent = deck.length ? `${Math.min(index + 1, deck.length)} / ${deck.length}문제` : loaded ? '0문제' : '문제 준비 중';
    updateChecks();
    if (!question) {
      prompt.replaceChildren();
      message.textContent = failed ? '정리본을 불러오지 못했어요. 새로고침 후 다시 시도해주세요.'
        : !loaded ? '정리본에서 문제를 불러오는 중입니다…'
        : !knownChapter(scope.chapterId) ? '이 단원을 찾을 수 없어요. 위에서 다른 단원을 선택해주세요.'
        : scope.mode === 'checked' && !poolFor(scope).length ? scope.chapterId === null
          ? '체크한 문제가 아직 없어요. 시험에서 다시 보고 싶은 문제를 체크하면 이곳에 모입니다.'
          : '이 단원에는 체크한 문제가 아직 없어요. 다른 단원을 선택하거나 이 단원 시험에서 문제를 체크해보세요.'
        : deck.length ? `${chapterName(scope.chapterId)}의 ${deck.length}문제를 마지막까지 살펴봤어요. 다시 시작하면 순서가 새로 섞입니다.`
        : '이 단원에는 출제할 설명이 없어요. 다른 단원을 선택해주세요.';
      next.textContent = '다음 문제';
      if (focus) (restart.hidden ? message : restart).focus({ preventScroll: true });
      return;
    }
    heading.textContent = `문제 ${index + 1}`;
    prompt.replaceChildren(...question.paragraphs.map(text => {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      return paragraph;
    }));
    next.textContent = index === deck.length - 1 ? '시험 마치기' : '다음 문제 →';
    if (focus) heading.focus({ preventScroll: true });
  }

  function prepare(nextScope) {
    scope = { ...nextScope };
    sessions.set(quizScopeHash(scope), { deck: shuffleQuestions(poolFor(scope)), index: 0, started: true });
  }

  function begin(nextScope = scope) {
    if (!loaded || failed || !knownChapter(nextScope.chapterId) || !poolFor(nextScope).length) return;
    prepare(nextScope);
    updateMode();
    checkStatus.textContent = '';
    displayQuestion(true);
    location.hash = quizScopeHash(scope);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function forgetUndo() {
    lastClear = null;
    undoClear.hidden = true;
    clearStatus.textContent = '';
  }

  function requestClear(chapterOnly, opener) {
    if (!loaded || failed || (chapterOnly && (scope.chapterId === null || !knownChapter(scope.chapterId)))) return;
    const chapterId = chapterOnly ? scope.chapterId : null;
    const targets = filterQuizChapter(checks.filter(bank), chapterId);
    if (!targets.length) return;
    // Freeze explicit IDs at confirmation time; never use a changing dropdown
    // as the deletion target after the confirmation opens.
    pendingClear = { ids: targets.map(question => question.id), chapterId };
    clearOpener = opener;
    clearTitle.textContent = chapterOnly ? `${chapterId}단원 체크를 해제할까요?` : '전체 단원의 체크를 해제할까요?';
    clearDescription.textContent = chapterOnly
      ? `${chapterName(chapterId)}에 체크한 ${targets.length}개만 해제합니다. 다른 단원의 체크는 유지됩니다.`
      : `현재 선택한 단원과 관계없이, 전체 단원에 체크한 ${targets.length}개를 모두 해제합니다.`;
    confirmClear.textContent = `${targets.length}개 체크 해제`;
    clearDialog.showModal();
    cancelClear.focus();
  }

  function pruneCheckedSessions() {
    for (const [key, session] of sessions) {
      if (parseQuizScope(key)?.mode !== 'checked') continue;
      const beforeCurrent = session.deck.slice(0, session.index);
      session.deck = checks.filter(session.deck);
      session.index = checks.filter(beforeCurrent).length;
    }
  }

  clearChapter.addEventListener('click', () => requestClear(true, clearChapter));
  clearAll.addEventListener('click', () => requestClear(false, clearAll));
  cancelClear.addEventListener('click', () => clearDialog.close());
  clearDialog.addEventListener('close', () => {
    pendingClear = null;
    const target = clearOpener && !clearOpener.disabled ? clearOpener : clearSummary;
    if (onQuizPage()) target.focus({ preventScroll: true });
    clearOpener = null;
  });
  window.addEventListener('hashchange', () => { if (clearDialog.open) clearDialog.close(); });
  confirmClear.addEventListener('click', () => {
    if (!pendingClear || !clearDialog.open || !onQuizPage()) return;
    const target = pendingClear;
    pendingClear = null;
    const result = checks.clear(target.ids);
    lastClear = result.removed.length ? { ids: result.removed, chapterId: target.chapterId } : null;
    undoClear.hidden = !lastClear;
    pruneCheckedSessions();
    if (scope.mode === 'checked') displayQuestion();
    else updateChecks();
    checkStatus.textContent = '';
    const label = target.chapterId === null ? '전체 단원' : `${target.chapterId}단원`;
    clearStatus.textContent = result.removed.length
      ? `${label}의 체크 ${result.removed.length}개를 해제했어요.${result.persisted ? ' 다음 체크 변경이나 새로고침 전까지 되돌릴 수 있어요.' : ' 이 화면에는 반영했지만 저장하지 못했어요. 새로고침하면 체크가 다시 나타날 수 있어요.'}`
      : '해제할 체크가 없어요.';
    clearDialog.close();
  });
  undoClear.addEventListener('click', () => {
    if (!lastClear) return;
    const result = checks.restore(lastClear.ids);
    lastClear = null;
    undoClear.hidden = true;
    if (scope.mode === 'checked') { prepare(scope); displayQuestion(); }
    else updateChecks();
    clearStatus.textContent = `체크 ${result.restored.length}개를 되돌렸어요.${result.persisted ? '' : ' 이 화면에는 반영했지만 저장하지 못했어요. 새로고침하면 유지되지 않을 수 있어요.'}`;
    clearSummary.focus({ preventScroll: true });
  });

  startChapter.addEventListener('change', () => {
    readerChapterId = startChapter.value === 'all' ? null : Number(startChapter.value);
    updateScopeControls();
  });
  chapterSelect.addEventListener('change', () => {
    const chapterId = chapterSelect.value === 'all' ? null : Number(chapterSelect.value);
    location.hash = quizScopeHash({ mode: scope.mode, chapterId });
  });
  start.addEventListener('click', () => begin({ mode: 'all', chapterId: readerChapterId }));
  restart.addEventListener('click', () => begin(scope.mode === 'checked' && !poolFor(scope).length ? { ...scope, mode: 'all' } : scope));
  reveal.addEventListener('click', () => {
    const { deck, index } = sessionFor();
    const question = deck[index];
    if (!question) return;
    answer.textContent = question.answer;
    source.textContent = question.source;
    answerBox.hidden = false;
    placeholder.hidden = true;
    reveal.textContent = '정답 확인 완료';
    reveal.disabled = true;
    reveal.setAttribute('aria-expanded', 'true');
  });
  next.addEventListener('click', () => {
    const session = sessionFor();
    if (!session.deck[session.index]) return;
    session.index++;
    checkStatus.textContent = '';
    displayQuestion(true);
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  check.addEventListener('change', () => {
    const session = sessionFor();
    const question = session.deck[session.index];
    if (!question) return;
    forgetUndo();
    const result = checks.set(question.id, check.checked);
    // Writes merge other tabs' latest changes. Remove every unchecked entry,
    // not only this one, so a bulk-cleared question cannot linger in the deck.
    pruneCheckedSessions();
    if (scope.mode === 'checked') displayQuestion(true);
    else updateChecks();
    checkStatus.textContent = result.persisted
      ? result.checked ? '체크했어요. 체크 따로보기에서 다시 볼 수 있어요.' : '체크를 해제했어요.'
      : '이 화면에는 반영했지만 체크 기록을 저장하지 못했어요. 새로고침하면 유지되지 않을 수 있어요.';
  });
  updateMode();
  displayQuestion();

  return {
    setChapters(loadedChapters) {
      loaded = true;
      failed = false;
      bank = buildQuestions(loadedChapters);
      chapters = buildQuizChapters(loadedChapters, bank);
      updateChecks();
      if (onQuizPage()) {
        prepare(selectedScope());
        if (knownChapter(scope.chapterId)) readerChapterId = scope.chapterId;
        updateMode();
        displayQuestion();
      }
    },
    loadFailed() {
      loaded = true;
      failed = true;
      updateScopeControls();
      if (onQuizPage()) {
        displayQuestion();
        message.textContent = help.textContent;
      }
    },
    enter() {
      const nextScope = selectedScope();
      // Keep independent progress per chapter; checked lists refresh on entry.
      if (loaded && !failed && (nextScope.mode === 'checked' || !sessionFor(nextScope).started)) prepare(nextScope);
      else scope = nextScope;
      if (knownChapter(scope.chapterId)) readerChapterId = scope.chapterId;
      updateMode();
      checkStatus.textContent = '';
      displayQuestion(true);
    }
  };
}
