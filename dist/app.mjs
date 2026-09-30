import { showPlanDay } from './planner.mjs';
import { initNotes } from './notes.mjs';
import { initQuiz } from './quiz.mjs';
import { parseQuizScope } from './quiz-scope.mjs';
import { initCoding } from './coding.mjs';
import { initGame } from './game.mjs';

const quiz = initQuiz();
const coding = initCoding();
const game = initGame();
initNotes({
  onLoad(chapters) { quiz.setChapters(chapters); game.setChapters(chapters); },
  onError() { quiz.loadFailed(); game.loadFailed(); }
});
const dashboard = document.getElementById('studyDashboard');
const notesScreen = document.getElementById('full-notes');
const readerControls = document.getElementById('readerControls');
const quizScreen = document.getElementById('quiz');
const quizControls = document.getElementById('quizControls');
const codingScreen = document.getElementById('coding');
const gameScreen = document.getElementById('game');
const nav = [...document.querySelectorAll('.bottom-nav a')];

function route() {
  const hash = location.hash || '#todo';
  const reading = hash === '#full-notes';
  const testing = parseQuizScope(hash) !== null;
  const learningCode = hash === '#coding' || hash.startsWith('#coding/');
  const gaming = hash === '#game';
  if (!gaming) game.leave();
  dashboard.hidden = reading || testing || learningCode || gaming;
  notesScreen.hidden = !reading;
  readerControls.hidden = !reading;
  quizScreen.hidden = !testing;
  quizControls.hidden = !testing;
  codingScreen.hidden = !learningCode;
  gameScreen.hidden = !gaming;
  nav.forEach(link => {
    const active = link.hash === hash || (hash.startsWith('#day-') && link.hash === '#todo') || ((testing || gaming) && link.hash === '#full-notes') || (learningCode && link.hash === '#coding');
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  // The destination might have been hidden when the browser first handled the hash.
  if (testing) { quiz.enter(); window.scrollTo(0, 0); }
  else if (gaming) { game.enter(); window.scrollTo(0, 0); }
  else if (learningCode) { coding.enter(hash); window.scrollTo(0, 0); }
  else if (reading) window.scrollTo(0, 0);
  else if (location.hash) {
    if (hash.startsWith('#day-')) showPlanDay(hash.slice(5));
    requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }));
  }
}
window.addEventListener('hashchange', route);
route();

const viewer = document.getElementById('viewer');
const frame = document.getElementById('pdfFrame');
const title = document.getElementById('viewerTitle');
const external = document.getElementById('externalPdf');
let opener;
document.querySelectorAll('.open-pdf').forEach(button => button.addEventListener('click', () => {
  opener = button;
  title.textContent = button.dataset.title;
  frame.src = button.dataset.src;
  external.href = button.dataset.src;
  viewer.classList.add('open');
  viewer.inert = false;
  document.body.style.overflow = 'hidden';
  document.getElementById('closeViewer').focus();
}));
function close() {
  if (!viewer.classList.contains('open')) return;
  viewer.classList.remove('open');
  frame.src = '';
  document.body.style.overflow = '';
  opener?.focus();
}
document.getElementById('closeViewer').addEventListener('click', close);
document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
