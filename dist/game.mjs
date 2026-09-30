import { buildQuestions } from './quiz.mjs';
import { createGameDeck, createRound } from './game-engine.mjs';
import { createGameRecords } from './game-records.mjs';

export function initGame() {
  const el = id => document.getElementById(id);
  const ui = Object.fromEntries([
    'gameLobby', 'gamePlay', 'gameResult', 'gameTime', 'gameBest', 'startGame', 'gameLoadStatus',
    'gameCounter', 'gameScore', 'gameCombo', 'pauseGame', 'gameTimerLabel', 'gameTimer', 'gameTimerBar',
    'gameQuestionArea', 'gameRoundLabel', 'gameQuestionHeading', 'gamePrompt', 'gameChoices',
    'gameFeedback', 'gameFeedbackTitle', 'gameFeedbackAnswer', 'gamePoints', 'gameSource', 'nextGameQuestion',
    'gamePaused', 'gamePausedHeading', 'resumeGame', 'quitGame', 'gameAnnouncement',
    'gameResultMode', 'gameResultHeading', 'gameResultMessage', 'gameFinalScore', 'gameNewBest',
    'gameCorrectCount', 'gameMaxCombo', 'gameAccuracy', 'replayGame', 'retryGameMistakes',
    'gameToLobby', 'gameReviewSummary', 'gameReviewList'
  ].map(id => [id, el(id)]));
  const records = createGameRecords({ getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value) });
  let bank = [];
  let round = null;
  let seconds = 30;
  let reviewRound = false;
  let timer = null;
  let onPage = false;
  let resultRecorded = false;
  let warned = false;
  const format = value => value.toLocaleString('ko-KR');
  const modeName = () => seconds ? `${seconds}초 도전` : '시간 제한 없는 연습';
  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'instant' });

  function updateRecord() {
    const best = records.get(Number(ui.gameTime.value));
    ui.gameBest.textContent = best == null ? '이 모드의 첫 기록을 만들어보세요.' : `나의 최고 기록  ✦ ${format(best)}점`;
  }

  function stopTimer() {
    if (timer !== null) clearInterval(timer);
    timer = null;
  }

  function updateHud() {
    if (!round) return;
    ui.gameCounter.textContent = `${Math.min(round.index + 1, round.total)} / ${round.total}`;
    ui.gameScore.textContent = format(round.score);
    ui.gameCombo.textContent = round.streak ? `${round.streak}연속 정답!` : '콤보 준비';
    ui.pauseGame.disabled = round.status !== 'answering';
    const remaining = seconds ? Math.max(0, Math.ceil(round.remainingMs / 1000)) : 0;
    ui.gameTimer.textContent = seconds ? `${remaining}초` : '무제한';
    ui.gameTimerLabel.textContent = round.status === 'paused' ? '일시정지 · 남은 시간' : round.status === 'feedback' ? '채점 완료' : '남은 시간';
    ui.gameTimerBar.hidden = !seconds;
    ui.gameTimerBar.max = seconds || 1;
    ui.gameTimerBar.value = remaining;
    ui.gameTimerBar.closest('.game-hud').classList.toggle('is-urgent', !!seconds && remaining <= 5 && round.status === 'answering');
    if (seconds && remaining <= 5 && remaining > 0 && !warned && round.status === 'answering') {
      warned = true;
      ui.gameAnnouncement.textContent = '5초 이하 남았어요.';
    }
  }

  function tick() {
    if (!round || round.status !== 'answering') return;
    if (!onPage || document.hidden) { pause(false); return; }
    const expired = seconds && round.remainingMs <= 0 ? round.expire() : null;
    if (expired) showFeedback(expired);
    else updateHud();
  }

  function startTimer() {
    stopTimer();
    if (round?.status === 'answering' && seconds) timer = setInterval(tick, 100);
  }

  function paragraph(text, className) {
    const p = document.createElement('p');
    p.textContent = text;
    if (className) p.className = className;
    return p;
  }

  function showQuestion() {
    stopTimer();
    warned = false;
    ui.gameAnnouncement.textContent = '';
    ui.gameLobby.hidden = true;
    ui.gameResult.hidden = true;
    ui.gamePlay.hidden = false;
    ui.gamePaused.hidden = true;
    ui.gameQuestionArea.hidden = false;
    ui.gameFeedback.hidden = true;
    ui.gameFeedbackTitle.textContent = '';
    ui.gameFeedbackAnswer.textContent = '';
    ui.gamePoints.textContent = '';
    ui.gameSource.textContent = '';
    const question = round.question;
    ui.gameQuestionHeading.textContent = `문제 ${round.index + 1}. 이 설명의 정답은?`;
    ui.gameRoundLabel.textContent = reviewRound ? '틀린 문제 재도전 · 기록에는 포함되지 않아요' : '정리본 랜덤 도전';
    ui.gamePrompt.replaceChildren(...question.paragraphs.map(text => paragraph(text)));
    ui.gameChoices.replaceChildren(...question.choices.map((choice, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'game-choice';
      const key = document.createElement('span');
      key.className = 'game-choice-key';
      key.textContent = String(index + 1);
      key.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.textContent = choice;
      button.append(key, label);
      button.addEventListener('click', () => {
        if (!onPage || document.hidden) return;
        const result = round.answer(choice);
        if (result) showFeedback(result);
      });
      return button;
    }));
    updateHud();
    scrollTop();
    ui.gameQuestionHeading.focus({ preventScroll: true });
    if (!onPage || document.hidden) pause(false);
    else startTimer();
  }

  function showFeedback(result) {
    stopTimer();
    [...ui.gameChoices.children].forEach((button, index) => {
      const choice = result.question.choices[index];
      const correct = choice === result.question.answer;
      const selected = choice === result.selected;
      button.disabled = true;
      button.classList.toggle('is-correct', correct);
      button.classList.toggle('is-wrong', selected && !correct);
      button.classList.toggle('is-dimmed', !correct && !selected);
      if (correct || selected) {
        const badge = document.createElement('small');
        badge.textContent = correct ? selected ? '✓ 선택한 정답' : '✓ 정답' : '✕ 선택한 답';
        button.lastElementChild.append(badge);
      }
    });
    ui.gameFeedback.hidden = false;
    ui.gameFeedback.classList.toggle('is-correct', result.correct);
    ui.gameFeedbackTitle.textContent = result.correct ? round.streak > 1 ? `${round.streak}연속 정답! +${format(result.points.total)}점` : `정답! +${format(result.points.total)}점` : result.timedOut ? '시간 종료! 정답을 기억해두세요.' : '아쉽지만, 하나 더 배웠어요.';
    ui.gameFeedbackAnswer.textContent = `정답은 ‘${result.question.answer}’`;
    ui.gamePoints.textContent = result.correct ? `기본 ${format(result.points.base)} + 속도 ${format(result.points.speed)} + 콤보 ${format(result.points.combo)}` : '이번 문제는 0점 · 다음 문제부터 다시 콤보를 쌓아요.';
    ui.gameSource.textContent = `정리본 · ${result.question.source}`;
    ui.nextGameQuestion.textContent = round.index === round.total - 1 ? '이번 판 결과 보기 →' : '다음 문제 →';
    updateHud();
    // Keep the question and answer options in view. Feedback is announced once.
    ui.nextGameQuestion.focus({ preventScroll: true });
    ui.gameFeedback.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }

  function begin(questions = bank, retry = false) {
    if (!bank.length) return;
    const deck = createGameDeck(bank, { size: 10, questions });
    if (!deck.length) return;
    stopTimer();
    seconds = Number(ui.gameTime.value);
    reviewRound = retry;
    resultRecorded = false;
    round = createRound(deck, { durationMs: seconds * 1000 });
    showQuestion();
  }

  function pause(focus = true) {
    if (!round || round.status !== 'answering') return;
    const result = round.pause();
    // If the deadline already passed, pausing must not grant extra time.
    if (round.status === 'feedback') {
      showFeedback(result || round.results.at(-1));
      return;
    }
    stopTimer();
    ui.gameQuestionArea.hidden = true;
    ui.gamePaused.hidden = false;
    updateHud();
    if (focus) { scrollTop(); ui.gamePausedHeading.focus({ preventScroll: true }); }
  }

  function resume() {
    if (!onPage || document.hidden || round?.status !== 'paused') return;
    round.resume();
    ui.gameQuestionArea.hidden = false;
    ui.gamePaused.hidden = true;
    updateHud();
    startTimer();
    ui.gameQuestionHeading.focus({ preventScroll: true });
  }

  function showResult() {
    stopTimer();
    ui.gamePlay.hidden = true;
    ui.gameLobby.hidden = true;
    ui.gameResult.hidden = false;
    const accuracy = Math.round(round.correctCount / round.total * 100);
    ui.gameResultMode.textContent = `${modeName()} · ${reviewRound ? '오답 재도전' : `${round.total}문제 완료`}`;
    ui.gameResultHeading.textContent = accuracy === 100 ? '빈틈없는 퍼펙트 라운드!' : accuracy >= 70 ? '개념이 착착 연결돼요!' : '오늘의 경험치 획득!';
    ui.gameResultMessage.textContent = accuracy === 100 ? '이번엔 보기 없는 시험보기에도 도전해보세요.' : '틀린 문제를 한 번 더 풀면 기억에 더 오래 남아요.';
    ui.gameFinalScore.textContent = format(round.score);
    ui.gameCorrectCount.textContent = `${round.correctCount}/${round.total}`;
    ui.gameMaxCombo.textContent = `${round.maxStreak}연속`;
    ui.gameAccuracy.textContent = `${accuracy}%`;
    ui.retryGameMistakes.hidden = round.correctCount === round.total;
    ui.retryGameMistakes.textContent = `틀린 ${round.total - round.correctCount}문제 다시 풀기`;
    if (!resultRecorded) {
      resultRecorded = true;
      if (reviewRound || round.total !== 10) ui.gameNewBest.textContent = '복습 라운드 · 최고 기록에는 포함되지 않아요';
      else {
        const record = records.save(seconds, round.score);
        ui.gameNewBest.textContent = !record.persisted ? '기록을 저장하지 못했어요. 이 화면에서 점수를 확인해주세요.' : record.improved ? '✦ 나의 최고 기록 달성!' : `나의 최고 기록 ${format(records.get(seconds))}점`;
      }
      updateRecord();
    }
    ui.gameReviewSummary.textContent = `이번 판 ${round.total}문제 · 정답 다시 보기`;
    ui.gameReviewList.parentElement.open = false;
    ui.gameReviewList.replaceChildren(...round.results.map((result, index) => {
      const item = document.createElement('article');
      item.className = `game-review-item${result.correct ? '' : ' is-wrong'}`;
      const heading = document.createElement('h3');
      const badge = document.createElement('span');
      badge.textContent = result.correct ? '정답' : result.timedOut ? '시간 초과' : '오답';
      heading.append(badge, document.createTextNode(`문제 ${index + 1}`));
      item.append(heading, ...result.question.paragraphs.map(text => paragraph(text)), paragraph(`정답: ${result.question.answer}`, 'game-review-answer'));
      if (!result.correct && result.selected) item.append(paragraph(`선택한 답: ${result.selected}`));
      item.append(paragraph(result.question.source));
      return item;
    }));
    scrollTop();
    ui.gameResultHeading.focus({ preventScroll: true });
  }

  function lobby() {
    stopTimer();
    round = null;
    ui.gameLobby.hidden = false;
    ui.gamePlay.hidden = true;
    ui.gameResult.hidden = true;
    updateRecord();
    scrollTop();
    ui.startGame.focus({ preventScroll: true });
  }

  ui.startGame.addEventListener('click', () => begin());
  ui.gameTime.addEventListener('change', updateRecord);
  ui.pauseGame.addEventListener('click', () => pause());
  ui.resumeGame.addEventListener('click', resume);
  ui.quitGame.addEventListener('click', lobby);
  ui.nextGameQuestion.addEventListener('click', () => {
    if (round?.status !== 'feedback') return;
    round.next();
    if (round.status === 'finished') showResult();
    else showQuestion();
  });
  ui.replayGame.addEventListener('click', () => begin());
  ui.retryGameMistakes.addEventListener('click', () => {
    const wrong = round?.results.filter(result => !result.correct).map(result => result.question) || [];
    if (wrong.length) begin(wrong, true);
  });
  ui.gameToLobby.addEventListener('click', lobby);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(false); });
  window.addEventListener('pagehide', () => pause(false));
  updateRecord();

  return {
    setChapters(chapters) {
      bank = buildQuestions(chapters);
      const eligible = createGameDeck(bank, { size: bank.length });
      ui.startGame.disabled = !eligible.length;
      ui.gameLoadStatus.textContent = eligible.length ? `게임용 ${eligible.length}문제 준비 완료 · 한 판 최대 10문제` : '보기를 구성할 문제가 부족해요. 정리본에서 공부해주세요.';
    },
    loadFailed() {
      bank = [];
      ui.startGame.disabled = true;
      ui.gameLoadStatus.textContent = '정리본을 불러오지 못했어요. 새로고침 후 다시 시도해주세요.';
    },
    enter() { onPage = true; updateRecord(); },
    leave() { onPage = false; pause(false); }
  };
}
