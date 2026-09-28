export const QUIZ_CHECKS_KEY = 'info-engineer-quiz-checks-v1';

const validId = id => typeof id === 'string' && /^q-\d+-\d+$/.test(id);

export function createQuizChecks(storage) {
  let checkedIds = new Set();
  try {
    const saved = JSON.parse(storage.getItem(QUIZ_CHECKS_KEY));
    if (Array.isArray(saved)) checkedIds = new Set(saved.filter(validId));
  } catch {
    // Unavailable storage or a damaged saved value must not block studying.
  }

  const has = id => validId(id) && checkedIds.has(id);

  return {
    has,
    set(id, checked) {
      if (!validId(id)) return { checked: false, persisted: false };
      const value = checked === true;
      if (value) checkedIds.add(id);
      else checkedIds.delete(id);
      try {
        storage.setItem(QUIZ_CHECKS_KEY, JSON.stringify([...checkedIds]));
        return { checked: value, persisted: true };
      } catch {
        // Retain the current session's checks when the browser cannot save.
        return { checked: value, persisted: false };
      }
    },
    filter(questions) {
      const seen = new Set();
      return questions.filter(question => {
        if (!has(question.id) || seen.has(question.id)) return false;
        seen.add(question.id);
        return true;
      });
    }
  };
}
