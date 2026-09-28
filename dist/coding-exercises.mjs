// Original, runnable output-tracing exercises for the daily coding plan.
export const exercises = {
  'c-loop': {
    language: 'C',
    title: '반복문과 배열의 누적값',
    code: [
      '#include <stdio.h>',
      '',
      'int main(void) {',
      '    int a[] = {2, 5, 1, 4};',
      '    int total = 0;',
      '',
      '    for (int i = 0; i < 4; i++) {',
      '        if (a[i] % 2 == 0) total += a[i];',
      '        else total -= 1;',
      '    }',
      '',
      '    printf("%d\\n", total);',
      '    return 0;',
      '}'
    ].join('\n'),
    answer: '4',
    steps: [
      'a는 [2, 5, 1, 4], total은 0으로 시작합니다. 배열 인덱스와 for문의 실행 순서는 Java와 같습니다.',
      'i=0: a[0]은 2이고 짝수이므로 total에 2를 더해 total=2가 됩니다.',
      'i=1: a[1]은 5이고 홀수이므로 total에서 1을 빼 total=1이 됩니다.',
      'i=2: a[2]는 1이고 홀수이므로 다시 1을 빼 total=0이 됩니다.',
      'i=3: a[3]은 4이고 짝수이므로 4를 더해 total=4가 됩니다.',
      'i가 4가 되면 i < 4가 거짓이어서 반복을 마칩니다. printf의 %d 자리에 정수 4가 출력됩니다.'
    ],
    trap: '홀수일 때는 배열 원소의 값을 빼는 것이 아니라 1만 뺍니다. printf의 %d는 정수를 출력하는 자리입니다.'
  },
  'c-pointer': {
    language: 'C',
    title: '포인터가 가리키는 배열 원소',
    code: [
      '#include <stdio.h>',
      '',
      'int main(void) {',
      '    int a[] = {3, 6, 9};',
      '    int *p = a;',
      '',
      '    p++;',
      '    *p += 2;',
      '',
      '    printf("%d %d\\n", a[1], *(p + 1));',
      '    return 0;',
      '}'
    ].join('\n'),
    answer: '8 9',
    steps: [
      'a는 [3, 6, 9]로 시작합니다. int *p는 int 원소의 주소를 담는 포인터 변수 선언입니다.',
      'p = a로 초기화하면 p는 배열의 첫 원소 a[0]을 가리킵니다.',
      'p++는 다음 int 원소로 이동하므로 이제 p는 a[1]을 가리킵니다. 배열 값은 아직 바뀌지 않습니다.',
      '*p는 p가 가리키는 원소의 값입니다. *p += 2로 a[1]이 6에서 8이 됩니다.',
      'p + 1은 a[2]를 가리키며 *(p + 1)은 그 원소의 값인 9입니다. 이 표현만으로 p 자체가 이동하지는 않습니다.',
      'a[1]은 8, *(p + 1)은 9이므로 공백으로 구분해 8 9를 출력합니다.'
    ],
    trap: 'p++는 가리키는 위치를 바꾸고, *p += 2는 그 위치의 값을 바꿉니다. Java의 일반적인 객체 참조에는 이런 주소 산술을 사용할 수 없습니다.'
  },
  'python-loop': {
    language: 'Python',
    title: 'range와 정수 나눗셈',
    code: [
      'total = 0',
      'for n in range(1, 6):',
      '    if n % 2:',
      '        total += n',
      'print(total, 7 // 2)'
    ].join('\n'),
    answer: '9 3',
    steps: [
      'total은 0으로 시작합니다. Python은 변수 선언 때 int와 같은 타입을 앞에 쓰지 않습니다.',
      'range(1, 6)은 1, 2, 3, 4, 5를 순서대로 만듭니다. 끝값 6은 포함하지 않습니다.',
      'n % 2가 1인 홀수에서 if 조건이 참입니다. Python에서는 숫자 0은 거짓, 0이 아닌 숫자는 참으로 해석합니다.',
      '홀수 1, 3, 5를 더하므로 total은 1, 4, 9로 바뀝니다. 들여쓰기된 문장만 조건문의 본문입니다.',
      '7 // 2는 정수 나눗셈 결과 3입니다. 여기서는 양수끼리 계산하므로 Java의 정수 7 / 2와 결과가 같습니다.',
      '반복문 밖의 print가 두 값을 공백으로 구분해 9 3을 출력합니다.'
    ],
    trap: 'range의 끝값은 제외됩니다. Java와 달리 Python은 숫자를 if 조건에 사용할 수 있습니다. //는 음수에서도 단순한 0 방향 버림이 아니라 내림 나눗셈입니다.'
  },
  'python-slice': {
    language: 'Python',
    title: '슬라이싱으로 선택한 원소',
    code: [
      'values = [1, 2, 3, 4, 5]',
      'picked = values[1:5:2]',
      'picked.append(6)',
      'print(sum(picked), values[1])'
    ].join('\n'),
    answer: '12 2',
    steps: [
      'values는 [1, 2, 3, 4, 5]이며 인덱스는 Java 배열처럼 0부터 시작합니다.',
      '[1:5:2]는 인덱스 1부터 5 직전까지 2칸씩 이동하며 선택하라는 뜻입니다.',
      '선택한 인덱스는 1과 3이므로 picked는 별도의 리스트 [2, 4]가 됩니다.',
      'picked.append(6)은 picked의 끝에 6을 추가하므로 picked는 [2, 4, 6]입니다.',
      'sum(picked)는 2 + 4 + 6 = 12이고, 원래 values의 인덱스 1 값은 여전히 2입니다.',
      'print가 두 값을 공백으로 구분해 12 2를 출력합니다.'
    ],
    trap: '[시작:끝:간격]에서 끝 인덱스는 포함하지 않습니다. 이번 예제의 슬라이싱은 별도 리스트를 만들므로 picked에 원소를 추가해도 values는 변하지 않습니다.'
  },
  'python-alias': {
    language: 'Python',
    title: '같은 리스트와 복사한 리스트',
    code: [
      'a = [2, 4]',
      'b = a',
      'c = a[:]',
      '',
      'b.append(6)',
      'c[0] = 9',
      '',
      'print(a[0], len(a), sum(c))'
    ].join('\n'),
    answer: '2 3 13',
    steps: [
      'a는 리스트 [2, 4]를 가리킵니다.',
      'b = a는 리스트를 복사하지 않습니다. Java에서 같은 배열을 두 변수가 참조하는 것처럼 a와 b가 같은 리스트를 가리킵니다.',
      'c = a[:]는 원소를 담은 별도의 리스트 [2, 4]를 만듭니다.',
      'b.append(6)은 a와 b가 공유하는 리스트를 [2, 4, 6]으로 바꿉니다.',
      'c[0] = 9는 c만 [9, 4]로 바꿉니다. a의 첫 원소는 2 그대로입니다.',
      'a[0]은 2, len(a)는 원소 수 3, sum(c)는 9 + 4 = 13이므로 2 3 13을 출력합니다.'
    ],
    trap: '대입 b = a는 복사가 아닙니다. a[:]는 얕은 복사이므로 중첩 리스트의 내부 리스트까지 독립적으로 복사하는 것은 아닙니다.'
  },
  'java-recursion': {
    language: 'Java',
    title: '재귀 호출의 반환값',
    code: [
      'public class Main {',
      '    static int sum(int n) {',
      '        if (n <= 0) return 0;',
      '        return n + sum(n - 2);',
      '    }',
      '',
      '    public static void main(String[] args) {',
      '        System.out.println(sum(5));',
      '    }',
      '}'
    ].join('\n'),
    answer: '9',
    steps: [
      'main에서 sum(5)를 호출합니다.',
      'sum(5)는 5 + sum(3)을 계산하려고 sum(3)의 반환을 기다립니다.',
      '같은 방식으로 sum(3)은 3 + sum(1), sum(1)은 1 + sum(-1)을 기다립니다.',
      'sum(-1)은 n <= 0이 참이므로 0을 반환합니다.',
      '복귀하며 sum(1) = 1 + 0 = 1, sum(3) = 3 + 1 = 4, sum(5) = 5 + 4 = 9가 됩니다.',
      '최종 반환값 9를 출력합니다.'
    ],
    trap: '호출은 5 → 3 → 1 → -1 순서지만 반환값은 그 반대 순서로 계산합니다. 각 호출의 n은 별도 값입니다.'
  },
  'java-dispatch': {
    language: 'Java',
    title: '필드와 오버라이딩 메서드',
    code: [
      'class A {',
      '    int x = 3;',
      '',
      '    int value() {',
      '        return x;',
      '    }',
      '}',
      '',
      'class B extends A {',
      '    int x = 7;',
      '',
      '    @Override',
      '    int value() {',
      '        return x + super.x;',
      '    }',
      '}',
      '',
      'public class Main {',
      '    public static void main(String[] args) {',
      '        A item = new B();',
      '        System.out.println(item.x + " " + item.value());',
      '    }',
      '}'
    ].join('\n'),
    answer: '3 10',
    steps: [
      'new B()로 B 객체를 만들고 A 타입 변수 item이 참조합니다.',
      '객체에는 A에서 선언한 x = 3과 B에서 선언한 x = 7이 각각 존재합니다.',
      'item.x는 참조 변수 item의 타입 A에 따라 A의 필드를 읽으므로 3입니다.',
      'item.value()는 실제 객체 B의 오버라이딩 메서드를 실행합니다.',
      'B의 value에서 x는 B의 필드 7, super.x는 A의 필드 3이므로 10을 반환합니다.',
      '첫 값 3과 반환값 10 사이에 공백을 넣어 3 10을 출력합니다.'
    ],
    trap: '필드는 참조 변수의 타입에 따라 접근하지만, 오버라이딩된 인스턴스 메서드는 실제 객체의 타입에 따라 실행됩니다.'
  }
};
