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
    const result = checks.set(question.id, check.checked);
    if (scope.mode === 'checked' && !result.checked) {
      // Keep the same index: the next remaining question shifts into this slot.
      session.deck.splice(session.index, 1);
      displayQuestion(true);
    } else updateChecks();
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
