import { days, weeks, dayMinutes, weekMinutes, totalMinutes, formatMinutes, koreaDate, weekForDate, EXAM_DATE } from './schedule.mjs';

const KEY = 'info-engineer-daily-2026-10-25-v1';
const tasks = days.flatMap(day => day.tasks);
const studyTasks = tasks.filter(task => task.type !== 'exam');
let saved = {};
try {
  const parsed = JSON.parse(localStorage.getItem(KEY) || '{}');
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) saved = parsed;
} catch { /* An unavailable or malformed storage entry must not break the plan. */ }
const isDone = task => saved[task.id] === true;
let today = koreaDate();
let selectedWeek = weekForDate(today);
const list = document.getElementById('todoList');
const weekTabs = document.getElementById('weekTabs');
const status = document.getElementById('plannerStatus');
const toast = document.getElementById('toast');
let toastTimer;
const typeNames = { theory: '암기', code: '문제 풀이', practice: '기출·실전', review: '복습', exam: '당일 확인' };
const weekday = date => new Intl.DateTimeFormat('ko-KR', { timeZone: 'UTC', weekday: 'short' }).format(new Date(`${date}T12:00:00Z`));
const shortDate = date => `${Number(date.slice(5, 7))}/${Number(date.slice(8))}`;

function flash(text) {
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(saved)); return true; }
  catch { flash('이 브라우저에서는 진도를 저장할 수 없어요.'); return false; }
}

function renderCards() {
  // All text comes from the local, authored schedule; never from user HTML.
  list.innerHTML = days.map(day => `
    <article class="day-card${day.date === today ? ' is-today' : ''}${day.date === EXAM_DATE ? ' exam-day' : ''}" id="day-${day.date}" data-week="${day.week}" ${day.week === selectedWeek ? '' : 'hidden'}>
      <header class="day-head">
        <div><div class="day-date"><time datetime="${day.date}">${shortDate(day.date)} (${weekday(day.date)})</time>${day.date === today ? '<span class="today-badge">오늘</span>' : ''}</div><h3>${day.title}</h3></div>
        <span class="day-time">${dayMinutes(day) ? formatMinutes(dayMinutes(day)) : '시험일'}</span>
      </header>
      <div class="day-tasks">${day.tasks.map(task => `
        <div class="task-block${task.type === 'code' ? ' coding-task' : ''}"><label class="todo daily-task"><input type="checkbox" data-id="${task.id}" ${isDone(task) ? 'checked' : ''}><span class="check" aria-hidden="true"></span><span class="todo-copy"><span class="task-meta">${typeNames[task.type]}${task.minutes ? ` · ${task.minutes}분` : ''}</span><span class="todo-title">${task.title}</span><span class="todo-desc">${task.detail}</span></span></label>${task.href ? `<a class="coding-link" href="${task.href}" ${task.internal ? '' : 'target="_blank" rel="noopener noreferrer"'}>${task.linkLabel} <span aria-hidden="true">${task.internal ? '→' : '↗'}</span>${task.internal ? '' : '<span class="sr-only"> (새 창)</span>'}</a>` : ''}</div>
      `).join('')}</div>
      <footer class="day-footer"><span class="day-progress" id="progress-${day.date}"></span>${day.resource ? `<a href="${day.resource.href}">${day.resource.label} <span aria-hidden="true">↗</span></a>` : '<span>차분하게, 아는 것부터.</span>'}</footer>
    </article>
  `).join('');
}

function renderWeeks() {
  weekTabs.innerHTML = weeks.map((week, index) => {
    const group = days.filter(day => day.week === index);
    return `<button type="button" class="week-tab" data-week="${index}" aria-pressed="${selectedWeek === index}" aria-controls="todoList"><strong>${index + 1}주차</strong><span>${shortDate(group[0].date)}–${shortDate(group.at(-1).date)}</span><small id="week-progress-${index}"></small></button>`;
  }).join('');
  document.getElementById('roadmap').innerHTML = weeks.map((week, index) => {
    const group = days.filter(day => day.week === index);
    return `<div class="week"><span class="week-num">${index + 1}주차<br>${formatMinutes(weekMinutes(index))}</span><div><strong>${week.title}</strong><p>${shortDate(group[0].date)}–${shortDate(group.at(-1).date)} · ${week.goal}</p></div></div>`;
  }).join('');
}

function updateProgress() {
  const completed = studyTasks.filter(isDone).length;
  const completedDays = days.filter(day => day.date !== EXAM_DATE && day.tasks.every(isDone)).length;
  const pct = Math.round(completed / studyTasks.length * 100);
  document.getElementById('ring').style.setProperty('--p', `${pct}%`);
  document.getElementById('percent').textContent = `${pct}%`;
  document.getElementById('bar').style.width = `${pct}%`;
  document.getElementById('progressTitle').textContent = `학습 ${completedDays} / 26일 완료`;
  document.getElementById('progressCopy').textContent = `목표 ${completed} / ${studyTasks.length}개 · 시험 당일 체크 별도`;
  for (const day of days) {
    const done = day.tasks.filter(isDone).length;
    document.getElementById(`progress-${day.date}`).textContent = done === day.tasks.length ? '✓ 하루 목표 완료' : `${done} / ${day.tasks.length}개 완료`;
    document.getElementById(`day-${day.date}`).classList.toggle('is-complete', done === day.tasks.length);
  }
  weeks.forEach((week, index) => {
    const group = days.filter(day => day.week === index);
    const all = group.flatMap(day => day.tasks);
    document.getElementById(`week-progress-${index}`).textContent = `${all.filter(isDone).length}/${all.length} 체크`;
  });
  updateSummary();
}

function updateSummary() {
  const group = days.filter(day => day.week === selectedWeek);
  const all = group.flatMap(day => day.tasks);
  document.getElementById('weekTitle').textContent = weeks[selectedWeek].title;
  document.getElementById('weekGoal').textContent = weeks[selectedWeek].goal;
  document.getElementById('weekNote').textContent = weeks[selectedWeek].note;
  document.getElementById('weekBudget').textContent = `계획 ${formatMinutes(weekMinutes(selectedWeek))} · ${all.filter(isDone).length}/${all.length}개 체크`;
}

function selectWeek(index, announce = true) {
  selectedWeek = index;
  for (const button of weekTabs.querySelectorAll('button')) button.setAttribute('aria-pressed', Number(button.dataset.week) === index ? 'true' : 'false');
  for (const card of list.children) card.hidden = Number(card.dataset.week) !== index;
  updateSummary();
  if (announce) status.textContent = `${index + 1}주차 목표를 표시합니다.`;
}

export function showPlanDay(date) {
  const day = days.find(item => item.date === date);
  if (day) selectWeek(day.week, false);
}

export const getTaskCompletion = id => saved[id] === true;
export function setTaskCompletion(id, done) {
  if (!tasks.some(task => task.id === id)) return false;
  saved[id] = done;
  const input = list.querySelector(`input[data-id="${id}"]`);
  if (input) input.checked = done;
  updateProgress();
  const persisted = save();
  if (persisted) flash(done ? '오늘의 목표 하나 완료!' : '완료 표시를 해제했어요');
  return persisted;
}

function refreshDate() {
  today = koreaDate();
  const daysLeft = Math.round((Date.parse(EXAM_DATE) - Date.parse(today)) / 86400000);
  document.getElementById('examCountdown').textContent = daysLeft > 0 ? `D-${daysLeft}` : daysLeft === 0 ? 'D-DAY' : '시험 종료';
  document.getElementById('todayBtn').textContent = today < days[0].date ? '첫날 목표 ↓' : today > EXAM_DATE ? '마지막 주 ↓' : '오늘 목표 ↓';
  renderCards();
  updateProgress();
}

list.addEventListener('change', event => {
  const input = event.target.closest('input[data-id]');
  if (!input) return;
  setTaskCompletion(input.dataset.id, input.checked);
});

weekTabs.addEventListener('click', event => {
  const button = event.target.closest('button[data-week]');
  if (button) selectWeek(Number(button.dataset.week));
});

document.getElementById('todayBtn').addEventListener('click', () => {
  if (koreaDate() !== today) refreshDate();
  selectWeek(weekForDate(today));
  const target = today < days[0].date ? days[0].date : today > EXAM_DATE ? EXAM_DATE : today;
  document.getElementById(`day-${target}`).scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.getElementById('resetBtn').addEventListener('click', () => {
  if (!confirm('날짜별 목표의 완료 기록을 모두 초기화할까요?')) return;
  saved = {};
  const persisted = save();
  renderCards();
  updateProgress();
  if (persisted) flash('날짜별 진도를 초기화했어요');
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && koreaDate() !== today) refreshDate();
});

document.getElementById('totalBudget').textContent = `총 ${formatMinutes(totalMinutes)} 계획`;
renderWeeks();
refreshDate();
