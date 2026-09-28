import { codingLessons, codingStages, lessonHref } from './coding-curriculum.mjs';
import { exercises } from './coding-exercises.mjs';
import { codingLinks, days, koreaDate } from './schedule.mjs';
import { getTaskCompletion, setTaskCompletion } from './planner.mjs';

const shortDate = date => `${Number(date.slice(5, 7))}/${Number(date.slice(8))}`;
// These strings are locally authored, but escape both text and attributes consistently.
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export function initCoding() {
  const stageList = document.getElementById('codingStages');
  const picker = document.getElementById('codingDay');
  const content = document.getElementById('codingLesson');
  const doneButton = document.getElementById('codingDone');
  const status = document.getElementById('codingStatus');
  let current;
  let task;

  picker.innerHTML = codingStages.map((stage, index) => `<optgroup label="${index + 1}단계 · ${stage.title}">${codingLessons.filter(item => item.stage === index).map(item => `<option value="${item.date}">${shortDate(item.date)} · ${item.language} · ${item.title}</option>`).join('')}</optgroup>`).join('');
  picker.addEventListener('change', () => { location.hash = lessonHref(picker.value); });

  function completion() {
    const done = getTaskCompletion(task.id);
    doneButton.textContent = done ? '✓ 학습 완료 · 체크 해제' : '오늘 코딩 학습 완료';
    doneButton.setAttribute('aria-pressed', String(done));
    const count = days.flatMap(day => day.tasks).filter(item => item.type === 'code' && getTaskCompletion(item.id)).length;
    document.getElementById('codingProgress').textContent = `${count} / 26일 완료 · 할 일과 연동`;
  }

  doneButton.addEventListener('click', () => {
    if (!task) return;
    const done = !getTaskCompletion(task.id);
    const persisted = setTaskCompletion(task.id, done);
    completion();
    status.textContent = persisted ? (done ? `${shortDate(current.date)} 코딩 목표를 완료했어요. 날짜별 할 일에도 반영됩니다.` : '완료 표시를 해제했어요.') : '현재 화면에는 반영했지만 이 브라우저에 저장하지 못했어요.';
  });

  function enter(hash) {
    const requested = hash.split('/')[1];
    const today = koreaDate();
    current = codingLessons.find(item => item.date === requested)
      || codingLessons.find(item => item.date >= today)
      || codingLessons.at(-1);
    task = days.find(day => day.date === current.date).tasks.find(item => item.type === 'code');
    picker.value = current.date;
    status.textContent = '';
    const stage = codingStages[current.stage];
    stageList.innerHTML = codingStages.map((item, index) => `<a href="${lessonHref(codingLessons.find(lesson => lesson.stage === index).date)}" ${index === current.stage ? 'aria-current="step"' : ''}><span>${index + 1}단계 · ${item.period}</span><strong>${item.title}</strong></a>`).join('');
    const index = codingLessons.indexOf(current);
    const languageLinks = current.language.split('·').map(language => `<a href="${codingLinks[language]}" target="_blank" rel="noopener noreferrer">${language} 기출 목록 ↗<span class="sr-only"> (새 창)</span></a>`).join('');
    const routine = current.stage === 3
      ? [['2분', '규칙 떠올리기'], ['13분', '시간 정해 풀이'], ['5분', '오답 확인·재풀이']]
      : [['5분', '설명·확인 질문'], ['10분', '한 문제 직접 풀이'], ['5분', '해설 확인·재풀이']];
    const exercise = current.exercise ? exercises[current.exercise] : null;
    content.innerHTML = `
      <div class="coding-stage-goal"><strong>${current.stage + 1}단계 목표</strong><p>${stage.goal}</p><small>단계 점검: ${stage.pass}</small></div>
      <article class="coding-lesson-card">
        <header><p class="coding-kicker">${shortDate(current.date)} · ${current.language} · 하루 20분</p><h2 tabindex="-1">${escape(current.title)}</h2><p class="coding-goal">오늘 목표: ${escape(current.goal)}</p></header>
        <div class="coding-routine" aria-label="20분 공부 순서">${routine.map(([time, label]) => `<div><strong>${time}</strong><span>${label}</span></div>`).join('')}</div>
        <section class="coding-part"><h3>01. Java와 연결해서 이해하기</h3><p class="coding-compare">${escape(current.compare)}</p><ul>${current.points.map(point => `<li>${escape(point)}</li>`).join('')}</ul></section>
        <section class="coding-part"><h3>02. 먼저 떠올려보기</h3><p>${escape(current.check)}</p><details class="coding-answer"><summary>확인 질문 정답 보기</summary><p>${escape(current.answer)}</p></details></section>
        ${exercise ? `<section class="coding-part"><h3>03. 직접 추적하는 한 문제</h3><p class="coding-source">자체 제작 연습 · ${exercise.language} · 공식 기출 아님</p><p>${escape(exercise.title)} — 실행 결과를 먼저 적으세요.</p><pre tabindex="0" aria-label="${exercise.language} 연습 코드"><code>${escape(exercise.code)}</code></pre><p class="coding-source">긴 코드는 좌우로 밀어서 볼 수 있어요.</p><details class="coding-answer"><summary>출력과 풀이 확인</summary><h4>출력</h4><pre class="coding-output">${escape(exercise.answer)}</pre><ol>${exercise.steps.map(step => `<li>${escape(step)}</li>`).join('')}</ol><p class="coding-trap"><strong>기억할 규칙</strong> ${escape(exercise.trap)}</p></details></section>` : ''}
        <section class="coding-part"><h3>${exercise ? '04' : '03'}. 기출로 연결하기</h3><p>${escape(current.practice)}</p><div class="coding-external">${languageLinks}</div><p class="coding-source">잡코딩의 언어별 목록에서 오늘 키워드로 골라보세요. 1~3단계는 2024년까지의 문제를 풀고, 2025년 문제는 마지막 단계에 남겨둡니다. 처음 배우는 날은 확인 질문과 자체 문제만으로 20분을 써도 괜찮아요. 목록에 원하는 유형이 없다면 자료함의 프로그래밍 PDF를 활용하세요.</p><a class="coding-text-link" href="#resources">프로그래밍 PDF 자료함 →</a></section>
        <p class="coding-finish-tip">완료 기준: 정답만 확인하지 않고, 값이 바뀐 이유를 설명한 뒤 답을 가리고 다시 풀기. 하루 한 문제를 이해했다면 충분해요.</p>
      </article>
      <div class="coding-day-nav">${index > 0 ? `<a href="${lessonHref(codingLessons[index - 1].date)}">← 이전 학습일</a>` : '<span>첫 학습일</span>'}${index < codingLessons.length - 1 ? `<a href="${lessonHref(codingLessons[index + 1].date)}">다음 학습일 →</a>` : '<span>내일은 시험일이에요</span>'}</div>`;
    document.getElementById('codingBack').href = `#day-${current.date}`;
    completion();
  }
  return { enter };
}
