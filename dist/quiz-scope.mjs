const validChapterId = value => Number.isSafeInteger(value) && value > 0;

export function normalizeQuizChapterIds(ids) {
  if (ids === null) return null;
  if (!Array.isArray(ids)) return undefined;
  const normalized = [];
  for (const id of ids) {
    if (!validChapterId(id)) return undefined;
    normalized.push(id);
  }
  return [...new Set(normalized)].sort((a, b) => a - b);
}

export function parseQuizScope(hash) {
  if (typeof hash !== 'string') return null;
  const match = /^#quiz(?:\/(checked))?(?:\/(chapter|chapters)\/([1-9]\d*(?:,[1-9]\d*)*))?$/.exec(hash);
  if (!match || match[0] !== hash) return null;
  if (match[2] === 'chapter' && match[3].includes(',')) return null;
  const chapterIds = normalizeQuizChapterIds(match[3] === undefined ? null : match[3].split(',').map(Number));
  if (chapterIds === undefined) return null;
  return { mode: match[1] ? 'checked' : 'all', chapterIds };
}

export function quizScopeHash(scope) {
  if (!scope || !['all', 'checked'].includes(scope.mode)) return null;
  const chapterIds = normalizeQuizChapterIds(scope.chapterIds);
  if (chapterIds === undefined || chapterIds?.length === 0) return null;
  const base = scope.mode === 'checked' ? '#quiz/checked' : '#quiz';
  if (chapterIds === null) return base;
  return chapterIds.length === 1
    ? `${base}/chapter/${chapterIds[0]}`
    : `${base}/chapters/${chapterIds.join(',')}`;
}

export function questionChapterId(question) {
  if (!question || typeof question.id !== 'string') return null;
  const match = /^q-([1-9]\d*)-([1-9]\d*)$/.exec(question.id);
  if (!match || match[0] !== question.id) return null;
  const chapterId = Number(match[1]);
  return validChapterId(chapterId) && Number.isSafeInteger(Number(match[2])) ? chapterId : null;
}

export function filterQuizChapter(bank, chapterId) {
  return filterQuizChapters(bank, chapterId === null ? null : [chapterId]);
}

export function filterQuizChapters(bank, ids) {
  const chapterIds = normalizeQuizChapterIds(ids);
  if (chapterIds === null) return [...bank];
  if (chapterIds === undefined || chapterIds.length === 0) return [];
  const selected = new Set(chapterIds);
  const seen = new Set();
  return bank.filter(question => {
    if (!selected.has(questionChapterId(question)) || seen.has(question.id)) return false;
    seen.add(question.id);
    return true;
  });
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
