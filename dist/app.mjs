import { showPlanDay } from './planner.mjs';
import { initNotes } from './notes.mjs';
import { initQuiz } from './quiz.mjs';
import { initCoding } from './coding.mjs';

const quiz = initQuiz();
const coding = initCoding();
initNotes({ onLoad: quiz.setChapters, onError: quiz.loadFailed });
const dashboard = document.getElementById('studyDashboard');
const notesScreen = document.getElementById('full-notes');
const readerControls = document.getElementById('readerControls');
const quizScreen = document.getElementById('quiz');
const quizControls = document.getElementById('quizControls');
const codingScreen = document.getElementById('coding');
const nav = [...document.querySelectorAll('.bottom-nav a')];

function route() {
  const hash = location.hash || '#todo';
  const reading = hash === '#full-notes';
  const testing = hash === '#quiz' || hash === '#quiz/checked';
  const learningCode = hash === '#coding' || hash.startsWith('#coding/');
  dashboard.hidden = reading || testing || learningCode;
  notesScreen.hidden = !reading;
  readerControls.hidden = !reading;
  quizScreen.hidden = !testing;
  quizControls.hidden = !testing;
  codingScreen.hidden = !learningCode;
  nav.forEach(link => {
    const active = link.hash === hash || (hash.startsWith('#day-') && link.hash === '#todo') || (testing && link.hash === '#full-notes') || (learningCode && link.hash === '#coding');
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  // The destination might have been hidden when the browser first handled the hash.
  if (testing) { quiz.enter(); window.scrollTo(0, 0); }
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
