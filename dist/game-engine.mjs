import { shuffleQuestions } from './quiz.mjs';

const normalize = text => text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
const escapePattern = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Titles sometimes explicitly provide aliases, such as "A = B" or "A (B)".
// Keep the source title intact; use these forms only to reject ambiguous choices.
function aliases(answer) {
  const forms = [answer, answer.replace(/\([^)]*\)/g, '')];
  for (const match of answer.matchAll(/\(([^)]*)\)/g)) forms.push(...match[1].split(/[:=,]|\s+[／/]\s+/));
  forms.push(...answer.replace(/\([^)]*\)/g, '').split(/[=,]|\s+[／/]\s+/));
  return [...new Set(forms.map(value => value.trim()).filter(Boolean))];
}

function sameAnswer(first, second) {
  const forms = new Set(aliases(first).map(normalize));
  return aliases(second).some(value => forms.has(normalize(value)));
}

function answerAppears(answer, prompt) {
  const compactPrompt = normalize(prompt);
  return aliases(answer).some(form => {
    const compact = normalize(form);
    // Operator titles disappear under word normalization, so inspect them as-is.
    if (!compact && /^[+*/%<>=!&|^~?:-]+$/.test(form)) return prompt.includes(form);
    if (/^[a-z\d ]+$/i.test(form) && compact.length >= 2) {
      const pattern = form.trim().split(/\s+/).map(escapePattern).join('\\s*');
      return new RegExp(`(?:^|[^a-z0-9])${pattern}(?:$|[^a-z0-9])`, 'i').test(prompt);
    }
    const longEnough = compact.length >= 3 || (compact.length === 2 && /[가-힣]/u.test(compact));
    return longEnough && compactPrompt.includes(compact);
  });
}

function suitable(question) {
  if (!question || typeof question.id !== 'string' || typeof question.answer !== 'string'
    || !Array.isArray(question.paragraphs) || !question.paragraphs.every(text => typeof text === 'string')) return false;
  const answer = question.answer.trim();
  const prompt = question.paragraphs.join(' ').trim();
  return answer.length > 0 && answer.length <= 70 && prompt.length > 0 && prompt.length <= 420
    && !answerAppears(answer, prompt);
}

export function createGameDeck(bank, { size = 10, random = Math.random, questions = bank } = {}) {
  const pool = [];
  const seen = new Set();
  for (const question of bank) {
    if (!suitable(question) || seen.has(question.id)) continue;
    seen.add(question.id);
    pool.push(question);
  }
  const allowed = new Set(questions.map(question => question.id));
  const limit = Number.isFinite(size) ? Math.max(0, Math.floor(size)) : 10;
  const deck = [];
  for (const question of shuffleQuestions(pool.filter(item => allowed.has(item.id)), random)) {
    if (deck.length >= limit) break;
    const choices = [question.answer];
    const prompt = question.paragraphs.join(' ');
    const candidates = [
      ...shuffleQuestions(pool.filter(item => item.source === question.source), random),
      ...shuffleQuestions(pool.filter(item => item.source !== question.source), random)
    ];
    for (const candidate of candidates) {
      if (choices.some(answer => sameAnswer(answer, candidate.answer))) continue;
      // A term named in the explanation may be another valid name for the answer.
      if (answerAppears(candidate.answer, prompt)) continue;
      choices.push(candidate.answer);
      if (choices.length === 4) break;
    }
    if (choices.length !== 4) continue;
    deck.push({ ...question, paragraphs: [...question.paragraphs], choices: shuffleQuestions(choices, random) });
  }
  return deck;
}

export function scoreAnswer({ correct, remainingMs, durationMs, streak }) {
  if (!correct) return { base: 0, speed: 0, combo: 0, total: 0 };
  const base = 1000;
  const speed = Number.isFinite(durationMs) && durationMs > 0 && Number.isFinite(remainingMs)
    ? Math.round(500 * Math.min(1, Math.max(0, remainingMs / durationMs))) : 0;
  const combo = Number.isFinite(streak) ? Math.min(400, Math.max(0, Math.floor(streak) - 1) * 100) : 0;
  return { base, speed, combo, total: base + speed + combo };
}

export function createRound(deck, { durationMs = 30000, now = () => performance.now() } = {}) {
  const questions = deck.map(question => Object.freeze({
    ...question,
    paragraphs: Object.freeze([...question.paragraphs]),
    choices: Object.freeze([...question.choices])
  }));
  const duration = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 0;
  let index = 0;
  let status = questions.length ? 'answering' : 'finished';
  let deadline = now() + duration;
  let frozenRemaining = duration;
  let score = 0;
  let streak = 0;
  let maxStreak = 0;
  let correctCount = 0;
  const results = [];

  const remaining = () => !duration || status === 'finished' ? 0
    : status === 'answering' ? Math.max(0, Math.min(duration, deadline - now())) : frozenRemaining;

  function record(selected, timedOut) {
    if (status !== 'answering') return null;
    const question = questions[index];
    const timeLeft = remaining();
    timedOut = timedOut || (!!duration && timeLeft <= 0);
    if (timedOut) selected = null;
    frozenRemaining = timedOut ? 0 : timeLeft;
    const correct = !timedOut && selected === question.answer;
    streak = correct ? streak + 1 : 0;
    maxStreak = Math.max(maxStreak, streak);
    if (correct) correctCount++;
    const points = Object.freeze(scoreAnswer({ correct, remainingMs: frozenRemaining, durationMs: duration, streak }));
    const result = Object.freeze({ question, selected, correct, timedOut, points });
    results.push(result);
    score += points.total;
    status = 'feedback';
    return result;
  }

  return {
    get question() { return questions[index]; },
    get index() { return index; },
    get total() { return questions.length; },
    get score() { return score; },
    get streak() { return streak; },
    get maxStreak() { return maxStreak; },
    get correctCount() { return correctCount; },
    get results() { return [...results]; },
    get remainingMs() { return remaining(); },
    get status() { return status; },
    answer(choiceString) {
      if (status !== 'answering') return null;
      if (duration && remaining() <= 0) return record(null, true);
      if (!questions[index].choices.includes(choiceString)) return null;
      return record(choiceString, false);
    },
    expire() {
      if (status !== 'answering' || !duration || remaining() > 0) return null;
      return record(null, true);
    },
    pause() {
      if (status !== 'answering') return false;
      const timeLeft = remaining();
      if (duration && timeLeft <= 0) { record(null, true); return false; }
      frozenRemaining = timeLeft;
      status = 'paused';
      return true;
    },
    resume() {
      if (status !== 'paused') return false;
      deadline = now() + frozenRemaining;
      status = 'answering';
      return true;
    },
    next() {
      if (status !== 'feedback') return false;
      index++;
      if (index >= questions.length) { status = 'finished'; frozenRemaining = 0; }
      else { status = 'answering'; frozenRemaining = duration; deadline = now() + duration; }
      return true;
    }
  };
}
