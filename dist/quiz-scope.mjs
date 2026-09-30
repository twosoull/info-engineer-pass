const validChapterId = value => Number.isSafeInteger(value) && value > 0;

export function parseQuizScope(hash) {
  if (typeof hash !== 'string') return null;
  const match = /^#quiz(?:\/(checked))?(?:\/chapter\/([1-9]\d*))?$/.exec(hash);
  if (!match || match[0] !== hash) return null;
  const chapterId = match[2] === undefined ? null : Number(match[2]);
  if (chapterId !== null && !validChapterId(chapterId)) return null;
  return { mode: match[1] ? 'checked' : 'all', chapterId };
}

export function quizScopeHash(scope) {
  if (!scope || !['all', 'checked'].includes(scope.mode)
    || (scope.chapterId !== null && !validChapterId(scope.chapterId))) return null;
  const base = scope.mode === 'checked' ? '#quiz/checked' : '#quiz';
  return scope.chapterId === null ? base : `${base}/chapter/${scope.chapterId}`;
}

export function questionChapterId(question) {
  if (!question || typeof question.id !== 'string') return null;
  const match = /^q-([1-9]\d*)-([1-9]\d*)$/.exec(question.id);
  if (!match || match[0] !== question.id) return null;
  const chapterId = Number(match[1]);
  return validChapterId(chapterId) && Number.isSafeInteger(Number(match[2])) ? chapterId : null;
}

export function filterQuizChapter(bank, chapterId) {
  if (chapterId === null) return [...bank];
  if (!validChapterId(chapterId)) return [];
  return bank.filter(question => questionChapterId(question) === chapterId);
}

export function buildQuizChapters(chapters, bank) {
  const counts = new Map();
  for (const question of bank) {
    const id = questionChapterId(question);
    if (id !== null) counts.set(id, (counts.get(id) || 0) + 1);
  }
  return chapters.map((chapter, index) => ({
    id: index + 1,
    title: chapter.title,
    count: counts.get(index + 1) || 0
  }));
}
