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
  { title: '하루 한 묶음, 천천히 시작', goal: '10/1부터 용어 4~5개씩 · 아침 10분 + 저녁 20분 + 코딩 20분', note: '9/29~30의 목표와 기록은 유지합니다. 10/1부터 오늘 정한 용어만 읽고, 저녁에 같은 용어를 가리고 말해보세요.' },
  { title: 'DB·SQL·테스트를 작게', goal: '키·정규형·SQL·테스트를 하루 3~5개씩 · 매일 총 50분', note: '출근길에는 읽고 표시하기, 퇴근 후에는 같은 설명에서 정답 떠올리기. 주말도 아침·저녁 같은 분량으로 진행합니다.' },
  { title: '보안·연계도 한 묶음씩', goal: '테스트·보안·모듈·연계 용어를 하루 3~4개씩 · 코딩 20분 유지', note: '오늘 묶음만 학습하면 완료입니다. 막히는 용어는 표시하고, 정해둔 20분 안에서 최대 2개만 다시 확인하세요.' },
  { title: '익숙한 용어로 시험 마무리', goal: '10/20 네트워크 3개 · 10/21~24는 배운 용어 복습 · 10/25 시험', note: '마지막 4일은 새 용어 없이 복습합니다. 시간이 남을 때만 저녁 20분 안에서 2025년 기출 최대 3문제를 확인하고, 전날에는 준비물을 챙기세요.' }
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
// Keep legacy task IDs so changing the workload does not reset coding progress.
const legacyDays = [
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

const focus = (title, chapter, terms, blocks) => ({
  title, chapter, terms, questionIds: blocks.map(block => 'q-' + chapter + '-' + block), review: false
});
const newFocuses = [
  focus('SOLID 다섯 원칙', 1, ['SRP', 'OCP', 'LSP', 'ISP', 'DIP'], [11, 13, 15, 17, 19]),
  focus('객체를 만드는 패턴', 1, ['Builder', 'Factory Method', 'Abstract Factory', 'Singleton'], [27, 29, 30, 32]),
  focus('구조를 연결하는 패턴', 1, ['Decorator', 'Facade', 'Proxy', 'Adapter'], [35, 36, 38, 40]),
  focus('UML 다이어그램 네 가지', 2, ['클래스 다이어그램', '유스케이스 다이어그램', '시퀀스 다이어그램', '상태 다이어그램'], [16, 23, 24, 26]),
  focus('테이블의 행과 열', 3, ['튜플', '속성', '카디널리티', '차수'], [10, 11, 12, 13]),
  focus('키의 역할 다섯 가지', 3, ['기본 키', '대체 키', '후보 키', '슈퍼 키', '외래 키'], [33, 34, 35, 36, 37]),
  focus('1정규형부터 BCNF까지', 3, ['1정규형', '2정규형', '3정규형', 'BCNF'], [24, 25, 26, 27]),
  focus('트랜잭션의 ACID', 7, ['원자성', '일관성', '격리성', '영속성'], [4, 5, 6, 7]),
  focus('SQL 명령의 세 분류', 7, ['DDL', 'DML', 'DCL'], [25, 48, 66]),
  focus('화이트박스와 커버리지', 10, ['화이트박스 테스트', '구문 커버리지', '결정 커버리지', '조건 커버리지'], [1, 2, 4, 6]),
  focus('블랙박스 테스트 기법', 10, ['블랙박스 테스트', '동등분할 테스트', '경곗값 분석 테스트', '결정 테이블 테스트'], [18, 20, 22, 24]),
  focus('테스트를 돕는 네 가지', 10, ['테스트 하네스', '테스트 드라이버', '테스트 스텁', '목 오브젝트'], [87, 89, 90, 95]),
  focus('테스트의 네 단계', 10, ['단위 테스트', '통합 테스트', '시스템 테스트', '인수 테스트'], [68, 69, 70, 71]),
  focus('보안의 세 요소', 9, ['기밀성', '무결성', '가용성'], [2, 3, 4]),
  focus('서비스 거부 공격 구분', 9, ['DoS', 'DDoS', 'DRDoS'], [10, 18, 21]),
  focus('웹 공격 세 가지', 9, ['XSS', 'CSRF', 'SQL 삽입'], [79, 80, 81]),
  focus('응집도와 결합도', 8, ['응집도', '기능적 응집도', '결합도', '자료 결합도'], [8, 15, 16, 22]),
  focus('시스템을 연결하는 방법', 4, ['EAI', '포인트 투 포인트', '허브 앤 스포크', 'ESB'], [1, 4, 5, 8]),
  focus('웹 인터페이스 용어', 5, ['JSON', 'XML', 'AJAX', 'REST'], [2, 3, 4, 5]),
  focus('네트워크 프로토콜 세 가지', 11, ['IP', 'ARP', 'ICMP'], [57, 58, 60])
];
const focusPlan = [
  ...newFocuses,
  ...[0, 6, 11, 15].map(index => ({
    ...newFocuses[index], title: '다시 떠올리기 · ' + newFocuses[index].title, review: true
  }))
];
const isWeekend = date => [0, 6].includes(new Date(date + 'T12:00:00Z').getUTCDay());

export const days = legacyDays.map((day, index) => {
  const weekend = isWeekend(day.date);
  if (day.date < '2026-10-01' || day.date === EXAM_DATE) return { ...day, weekend };
  const selected = focusPlan[index - 2];
  const terms = [...selected.terms];
  const morningLabel = weekend ? '아침' : '출근길';
  const eveningLabel = weekend ? '저녁' : '퇴근 후';
  const noteHref = '#full-notes/chapter/' + selected.chapter;
  const extra = !selected.review ? ''
    : day.date === '2026-10-24' ? ' 일찍 끝나면 같은 20분 안에서 수험표·신분증·필기구를 확인하세요.'
    : ' 일찍 끝나면 같은 20분 안에서 2025년 기출 최대 3문제만 확인하세요.';
  const coding = day.tasks.find(task => task.type === 'code');
  return {
    ...day, title: selected.title, weekend,
    focus: { chapter: selected.chapter, terms, questionIds: [...selected.questionIds], review: selected.review },
    tasks: [
      {
        id: day.date + '-routine-morning', session: 'morning', minutes: 10, type: 'theory',
        title: morningLabel + ' 10분 · ' + (selected.review ? '배운' : '오늘') + ' 용어 ' + terms.length + '개 읽기',
        detail: terms.join(' · ') + '만 한 번 읽고 뜻을 확인하세요. 모르는 용어에 표시하면 완료예요.' + (selected.review ? ' 새 용어는 추가하지 않아요.' : ''),
        href: noteHref, internal: true, linkLabel: selected.chapter + '단원에서 오늘 용어 찾기'
      },
      {
        id: day.date + '-routine-evening', session: 'evening', minutes: 20, type: 'review',
        title: eveningLabel + ' 20분 · 같은 용어 가리고 말하기',
        detail: '어제 용어 2개 3분 → 오늘 용어 ' + terms.length + '개 제목 가리고 12분 → 틀린 것 최대 2개 5분 이내. 한 번씩 답해보고 틀린 것에 표시하면 완료예요.' + extra,
        href: noteHref, internal: true, linkLabel: '정리본 열고 제목 가리기'
      },
      { ...coding, session: 'evening' }
    ]
  };
});

export const dayMinutes = day => day.tasks.reduce((sum, item) => sum + item.minutes, 0);
export const weekMinutes = index => days.filter(day => day.week === index).reduce((sum, day) => sum + dayMinutes(day), 0);
export const totalMinutes = days.reduce((sum, day) => sum + dayMinutes(day), 0);
export const formatMinutes = minutes => minutes < 60 ? `${minutes}분` : `${Math.floor(minutes / 60)}시간${minutes % 60 ? ` ${minutes % 60}분` : ''}`;
export const koreaDate = (now = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(now);
export const weekForDate = date => Math.max(0, Math.min(3, Math.floor((Date.parse(date) - Date.parse(START_DATE)) / 86400000 / 7)));
