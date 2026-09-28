import { definitionColon } from './notes.mjs';
import { createQuizChecks } from './quiz-checks.mjs';

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
  const checks = createQuizChecks({
    getItem: key => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value)
  });
  let bank = [];
  const sessions = {
    all: { deck: [], index: 0, started: false },
    checked: { deck: [], index: 0, started: false }
  };
  let mode = 'all';
  let loaded = false;
  let failed = false;

  const selectedMode = () => location.hash === '#quiz/checked' ? 'checked' : 'all';
  const onQuizPage = () => location.hash === '#quiz' || location.hash === '#quiz/checked';

  function updateChecks() {
    const count = checks.filter(bank).length;
    document.querySelectorAll('.quiz-checked-count').forEach(element => { element.textContent = String(count); });
    const question = sessions[mode].deck[sessions[mode].index];
    check.disabled = !question;
    check.checked = !!question && checks.has(question.id);
    card.classList.toggle('is-checked', check.checked);
  }

  function updateMode() {
    modeLabel.textContent = mode === 'checked' ? '체크한 문제 복습' : '랜덤 시험';
    intro.textContent = mode === 'checked'
      ? '체크한 문제만 한 문제씩 봅니다. 정답은 가려지고, 체크를 해제하면 이 모음에서 빠집니다.'
      : '정답을 생각한 뒤 확인하세요. 다시 보고 싶은 문제는 체크해두세요.';
    modeLinks.forEach(link => {
      const active = link.hash === (mode === 'checked' ? '#quiz/checked' : '#quiz');
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function displayQuestion(focus = false) {
    const { deck, index } = sessions[mode];
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
    restart.hidden = !!question || !loaded || !bank.length;
    restart.textContent = mode === 'checked'
      ? checks.filter(bank).length ? '체크한 문제 다시 섞어보기' : '전체 시험 시작하기'
      : '다시 섞어서 시험보기';
    progress.max = Math.max(deck.length, 1);
    progress.value = question ? index + 1 : deck.length;
    counter.textContent = deck.length ? `${Math.min(index + 1, deck.length)} / ${deck.length}문제` : loaded ? '0문제' : '문제 준비 중';
    updateChecks();
    if (!question) {
      prompt.replaceChildren();
      message.textContent = failed ? '정리본을 불러오지 못했어요. 새로고침 후 다시 시도해주세요.'
        : !loaded ? '정리본에서 문제를 불러오는 중입니다…'
        : mode === 'checked' && !checks.filter(bank).length ? '체크한 문제가 아직 없어요. 전체 시험에서 다시 보고 싶은 문제를 체크하면 이곳에 모입니다.'
        : deck.length ? `${deck.length}문제를 마지막까지 살펴봤어요. 다시 시작하면 순서가 새로 섞입니다.`
        : '출제할 설명을 찾지 못했어요. 정리본으로 돌아가 내용을 확인해주세요.';
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

  function prepare(nextMode) {
    mode = nextMode;
    sessions[mode] = { deck: shuffleQuestions(mode === 'checked' ? checks.filter(bank) : bank), index: 0, started: true };
  }

  function begin(nextMode = mode) {
    if (!loaded || !bank.length) return;
    prepare(nextMode);
    updateMode();
    checkStatus.textContent = '';
    displayQuestion(true);
    location.hash = mode === 'checked' ? '#quiz/checked' : '#quiz';
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  start.addEventListener('click', () => begin('all'));
  restart.addEventListener('click', () => begin(mode === 'checked' && !checks.filter(bank).length ? 'all' : mode));
  reveal.addEventListener('click', () => {
    const { deck, index } = sessions[mode];
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
    const session = sessions[mode];
    if (!session.deck[session.index]) return;
    session.index++;
    checkStatus.textContent = '';
    displayQuestion(true);
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  check.addEventListener('change', () => {
    const session = sessions[mode];
    const question = session.deck[session.index];
    if (!question) return;
    const result = checks.set(question.id, check.checked);
    if (mode === 'checked' && !result.checked) {
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
    setChapters(chapters) {
      loaded = true;
      bank = buildQuestions(chapters);
      start.disabled = !bank.length;
      help.textContent = bank.length ? `전체 정리본 ${bank.length}문제 · 중복 없이 무작위 출제` : '출제할 설명을 찾지 못했어요.';
      updateChecks();
      if (onQuizPage()) {
        prepare(selectedMode());
        updateMode();
        displayQuestion();
      }
    },
    loadFailed() {
      loaded = true;
      failed = true;
      help.textContent = '정리본을 불러오지 못했어요. 새로고침 후 다시 시도해주세요.';
      if (onQuizPage()) {
        displayQuestion();
        message.textContent = help.textContent;
      }
    },
    enter() {
      const nextMode = selectedMode();
      // Refresh the checked set on entry, but preserve an in-progress full exam.
      if (loaded && (nextMode === 'checked' || !sessions[nextMode].started)) prepare(nextMode);
      else mode = nextMode;
      updateMode();
      checkStatus.textContent = '';
      displayQuestion(true);
    }
  };
}
