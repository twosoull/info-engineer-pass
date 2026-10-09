import { showPlanDay, showTodayPlan } from './planner.mjs?v=20261001-routine2';
import { initNotes, parseNotesChapter } from './notes.mjs?v=20261001-routine2';
import { initQuiz } from './quiz.mjs?v=20261009-multi';
import { parseQuizScope } from './quiz-scope.mjs?v=20261009-multi';
import { initCoding } from './coding.mjs?v=20261001-routine2';
import { initGame } from './game.mjs';

const quiz = initQuiz();
const coding = initCoding();
const game = initGame();
const notes = initNotes({
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
let routeScroll;

function route() {
  cancelAnimationFrame(routeScroll);
  const hash = location.hash || '#todo';
  const reading = hash === '#full-notes' || parseNotesChapter(hash) !== null;
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
    const active = link.hash === hash || (hash.startsWith('#day-') && link.hash === '#todo') || ((reading || testing || gaming) && link.hash === '#full-notes') || (learningCode && link.hash === '#coding');
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  // The destination might have been hidden when the browser first handled the hash.
  if (testing) { quiz.enter(); window.scrollTo(0, 0); }
  else if (gaming) { game.enter(); window.scrollTo(0, 0); }
  else if (learningCode) { coding.enter(hash); window.scrollTo(0, 0); }
  else if (reading) { window.scrollTo(0, 0); notes.enter(hash); }
  else if (hash === '#todo') {
    // Wait until the dashboard is visible before finding today's scroll position.
    routeScroll = requestAnimationFrame(showTodayPlan);
  }
  else if (location.hash) {
    if (hash.startsWith('#day-')) showPlanDay(hash.slice(5));
    routeScroll = requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }));
  }
}
nav.find(link => link.hash === '#todo').addEventListener('click', event => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  // Avoid the native #todo anchor jump; repeated taps should work on this route too.
  if (location.hash !== '#todo') history.pushState(null, '', '#todo');
  route();
});
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
