import { lessonForDate, lessonHref } from './coding-curriculum.mjs';

export const START_DATE = '2026-09-29';
export const EXAM_DATE = '2026-10-25';
export const CODING_HOME = 'https://complainrevolutionist.tistory.com/';
export const codingLinks = {
  C: 'https://complainrevolutionist.tistory.com/38',
  Java: 'https://complainrevolutionist.tistory.com/39',
  Python: 'https://complainrevolutionist.tistory.com/40',
  SQL: 'https://complainrevolutionist.tistory.com/51',
  '약한 언어': 'https://complainrevolutionist.tistory.com/210'
};
export const weeks = [
  { title: '기출 감 잡기 + 핵심 개념', goal: '2024년 기출 2회분 · 정리본 1~5·7단원 · C·Python 입문', note: '기출은 진단용으로 풀어요. 코딩은 Java와 비교하며 C·Python 기초를 하루 20분씩 배웁니다.' },
  { title: '정리본 1회독 마무리', goal: '2024년 기출 3회차 · 정리본 6·8~11단원 · 매일 코딩 20분', note: '설명을 읽고 답을 가린 채 말해보세요. 바로 답하지 못한 개념을 표시합니다.' },
  { title: '암기 2회독 + 약점 보완', goal: '필수 개념 재암기 · 모의고사 1회 · 매일 코딩 20분', note: '반복해서 틀리는 이유를 한 줄로 적고 다시 풉니다. 일요일은 밀린 암기를 보충합니다.' },
  { title: '2025년 기출 + 최종 점검', goal: '2025년 기출 3회분 · 매일 코딩 20분 · 10/25 시험', note: '풀이 시간은 학습 예산입니다. 못 푼 문항은 표시하고, 시험 전날에는 표시한 오답을 다시 봅니다.' }
];
const block = (title, detail, minutes, type = 'theory') => ({ title, detail, minutes, type });
const notes = { href: '#full-notes', label: '정리본 읽기' };
const pdf = { href: '#resources', label: 'PDF 자료함' };
const entry = (date, title, tasks, resource = notes) => {
  const lesson = lessonForDate(date);
  return { date, title, resource, tasks: [...tasks, {
    title: `코딩 20분 · ${lesson.language}`,
    detail: `${lesson.stage + 1}단계 · ${lesson.title}. 목표: ${lesson.goal}.`,
    minutes: 20, type: 'code', href: lessonHref(date), internal: true, linkLabel: '오늘 단계 학습하기'
  }] };
};
export const days = [
  entry('2026-09-29', '기출로 출발점 확인', [
    block('2024년 1회 기출 진단', '30분 동안 풀 수 있는 만큼 시도하고, 모르는 문제는 표시합니다.', 30, 'practice'),
    block('채점하고 약점 3개 적기', '틀린 답을 확인하고 이론·언어별로 부족한 점 3개를 적습니다.', 10, 'review')
  ]),
  entry('2026-09-30', 'SOLID·GoF + C 기초', [
    block('정리본 1단원 + 키워드 10개', '애자일·럼바우·SOLID·GoF·요구사항을 읽고 설명만 보고 정답 10개를 말합니다.', 40)
  ]),
  entry('2026-10-01', '화면·인터페이스 + Python', [
    block('정리본 2·4·5단원 + 키워드 10개', 'UI·UML·EAI/ESB·웹 서비스·JSON/XML/REST의 설명과 용어를 연결합니다.', 40)
  ]),
  entry('2026-10-02', '정규화·키 + SQL', [
    block('정리본 3단원 + 키워드 10개', '튜플·속성·카디널리티·차수·키·이상 현상·정규화 단계를 가리고 답합니다.', 25),
    block('SQL 기초 1문제', 'SELECT·WHERE·GROUP BY 중 하나를 골라 답을 직접 작성합니다.', 15, 'practice')
  ]),
  entry('2026-10-03', '토요일 기출 집중', [
    block('2024년 2회 기출 풀기', '60분 안에 가능한 문항을 풀고, 오래 막히는 문제는 표시하고 넘어갑니다.', 60, 'practice'),
    block('채점 + 오답 5개 정리', '모르는 이론은 정리본에서 찾고, 틀린 이유를 한 줄씩 적습니다.', 40, 'review')
  ], pdf),
  entry('2026-10-04', '일요일 가벼운 복습', [
    block('이번 주 암기 키워드 5개', 'SOLID·GoF·정규화 중 바로 답하지 못한 용어 5개만 다시 봅니다.', 10)
  ]),
  entry('2026-10-05', 'SQL 단원 정리', [
    block('정리본 7단원 + 용어 10개', 'ACID·TCL·회복·인덱스·DDL/DML/DCL·분석 함수·옵티마이저를 훑습니다.', 25),
    block('SQL 응용 1문제', '집계·서브쿼리·명령문 중 하나를 풀고 틀린 문장을 다시 작성합니다.', 15, 'practice')
  ]),
  entry('2026-10-06', '응집도·결합도 + C 포인터', [
    block('정리본 8단원 + 용어 10개', '형상 관리·응집도·결합도를 암기하고, 6단원 C 부분을 함께 읽습니다.', 40)
  ]),
  entry('2026-10-07', '보안 공격 + C 포인터', [
    block('정리본 9단원 1~8번 + 용어 10개', '보안 3요소·DoS/DDoS·세션 하이재킹·네트워크 공격을 읽고 가리고 답합니다.', 40)
  ]),
  entry('2026-10-08', '암호화·인증 + Python', [
    block('정리본 9단원 9~17번 + 용어 10개', '접근 통제·인증·대칭/비대칭 암호·보안 솔루션을 비교합니다.', 40)
  ]),
  entry('2026-10-09', '테스트 기법 + C 함수', [
    block('정리본 10단원 1~7번 + 용어 10개', '화이트/블랙박스·테스트 목적·성능 테스트·리뷰·오라클을 비교합니다.', 40)
  ]),
  entry('2026-10-10', '2024년 기출 마무리', [
    block('2024년 3회 기출 풀기', '60분 동안 풀고, 막힌 문제와 확신이 없는 답을 표시합니다.', 60, 'practice'),
    block('채점 + 반복 개념 10개', '기출 3회분에서 반복된 개념을 모아 답을 가리고 확인합니다.', 40, 'review')
  ], pdf),
  entry('2026-10-11', '테스트 나머지 + 짧은 복습', [
    block('정리본 10단원 8~13번 훑기', '테스트 레벨·케이스·하네스·성능 지표·리팩토링에서 핵심 용어 5개를 확인합니다.', 10)
  ]),
  entry('2026-10-12', '운영체제·네트워크 1회독', [
    block('정리본 11단원 + 용어 10개', '메모리·스케줄링·교착·디스크·OSI·프로토콜·라우팅을 한 번씩 읽습니다.', 30),
    block('계산 문제 1개', '기출에서 스케줄링 또는 서브넷 계산 1개를 골라 풉니다.', 10, 'practice')
  ]),
  entry('2026-10-13', 'SOLID·DB 다시 암기', [
    block('정리본 1·3단원 2회독', 'SOLID·GoF·키·정규화 중심으로 설명 → 답 15개를 확인합니다.', 40)
  ]),
  entry('2026-10-14', '보안 다시 암기', [
    block('정리본 9단원 2회독', '공격 이름·암호화·접근 통제의 설명을 보고 정답 15개를 답합니다.', 40)
  ]),
  entry('2026-10-15', '테스트 다시 암기', [
    block('정리본 10단원 2회독', '테스트 기법·스텁/드라이버·하네스·오라클에서 15개를 답합니다.', 40)
  ]),
  entry('2026-10-16', '짧은 단원 묶어서 복습', [
    block('정리본 2·4·5·7·8단원 재확인', '표시한 부분 위주로 읽고 UI/UML·연계·SQL·응집/결합 용어 15개를 답합니다.', 40)
  ]),
  entry('2026-10-17', '모의고사 + 약점 정리', [
    block('수제비 파이널 모의고사 1회', '70분 동안 풉니다. 책이 없다면 2024년 기출 한 회를 답을 가리고 재풀이합니다.', 70, 'practice'),
    block('채점 + 반복 오답 5개', '틀린 이유를 한 줄씩 적고 암기 용어 10개를 다시 확인합니다.', 30, 'review')
  ], pdf),
  entry('2026-10-18', '밀린 목표 보충', [
    block('미완료 암기 5개 보충', '밀린 분량이 없으면 표시한 용어 5개를 가리고 답합니다.', 10)
  ]),
  entry('2026-10-19', '최신 기출 전 마지막 보완', [
    block('정리본 11단원 2회독 + 6단원 복습', '운영체제·네트워크 용어 10개를 답하고, 프로그래밍 언어의 표시한 부분을 읽습니다.', 40)
  ]),
  entry('2026-10-20', '2025년 기출 1회', [
    block('2025년 1회 기출 풀기', '50분 동안 전 문항을 시도하고 애매한 답에는 표시합니다.', 50, 'practice'),
    block('채점 + 핵심 오답 3개', '점수를 기록하고 중요한 오답 3개를 해설 없이 다시 답합니다.', 20, 'review')
  ], pdf),
  entry('2026-10-21', '최신 기출 오답 보완', [
    block('어제 틀린 이론 + 암기 10개', '정리본에서 관련 개념을 찾아 설명과 답을 연결하고 틀린 기출을 다시 봅니다.', 40)
  ]),
  entry('2026-10-22', '2025년 기출 2회', [
    block('2025년 2회 기출 풀기', '50분 동안 풀고 각 답의 단위·표기·출력 형식을 확인합니다.', 50, 'practice'),
    block('채점 + 핵심 오답 3개', '틀린 키워드와 실행 순서를 확인한 뒤 답을 가리고 다시 풉니다.', 20, 'review')
  ], pdf),
  entry('2026-10-23', '2025년 기출 3회', [
    block('2025년 3회 기출 풀기', '50분을 정해 풉니다. 막힌 문제는 표시하고 마지막까지 시도합니다.', 50, 'practice'),
    block('채점 + 최종 오답 목록 10개', '이번 주 오답을 합쳐 전날 다시 볼 개념·실수 10개를 추립니다.', 20, 'review')
  ], pdf),
  entry('2026-10-24', '전날, 아는 것을 확실하게', [
    block('필수 개념 20개 최종 확인', 'SOLID·GoF·테스트·보안·정규화·튜플/필드 중심으로 가리고 답합니다.', 40),
    block('최종 오답 10개 + 준비물 확인', '추려둔 오답을 보고 수험표의 장소·입실 시간, 신분증, 필기구를 확인합니다.', 30, 'review')
  ]),
  { date: EXAM_DATE, title: '시험 당일', resource: null, tasks: [
    block('준비물·입실 시간 확인', '수험표 안내에 따라 신분증과 필기구를 챙기고 여유 있게 도착합니다.', 0, 'exam'),
    block('답안 작성 원칙 확인', '요구한 범위·단위와 출력값을 재확인합니다. 확실한 문제부터 풉니다.', 0, 'exam')
  ] }
].map((day, index) => ({
  ...day, week: Math.floor(index / 7),
  tasks: day.tasks.map((item, taskIndex) => ({ ...item, id: `${day.date}-${taskIndex + 1}` }))
}));

export const dayMinutes = day => day.tasks.reduce((sum, item) => sum + item.minutes, 0);
export const weekMinutes = index => days.filter(day => day.week === index).reduce((sum, day) => sum + dayMinutes(day), 0);
export const totalMinutes = days.reduce((sum, day) => sum + dayMinutes(day), 0);
export const formatMinutes = minutes => minutes < 60 ? `${minutes}분` : `${Math.floor(minutes / 60)}시간${minutes % 60 ? ` ${minutes % 60}분` : ''}`;
export const koreaDate = (now = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(now);
export const weekForDate = date => Math.max(0, Math.min(3, Math.floor((Date.parse(date) - Date.parse(START_DATE)) / 86400000 / 7)));
