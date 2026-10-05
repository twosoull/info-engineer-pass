export const QUIZ_CHECKS_KEY = 'info-engineer-quiz-checks-v1';

const validId = id => typeof id === 'string' && /^q-\d+-\d+$/.test(id);

export function createQuizChecks(storage) {
  const pending = new Map();

  function readLatest() {
    try {
      const raw = storage.getItem(QUIZ_CHECKS_KEY);
      if (raw === null) return new Set();
      const saved = JSON.parse(raw);
      return Array.isArray(saved) ? new Set(saved.filter(validId)) : null;
    } catch {
      // Unavailable storage or a damaged saved value must not block studying.
      return null;
    }
  }

  let checkedIds = readLatest() || new Set();
  const has = id => validId(id) && checkedIds.has(id);
  const uniqueIds = ids => Array.isArray(ids) ? [...new Set(ids.filter(validId))] : [];

  function mergeLatest() {
    const latest = readLatest();
    if (latest === null) return;
    for (const [id, checked] of pending) {
      if (checked) latest.add(id);
      else latest.delete(id);
    }
    checkedIds = latest;
  }

  function update(id, checked) {
    if (checked) checkedIds.add(id);
    else checkedIds.delete(id);
    pending.set(id, checked);
  }

  function persist() {
    try {
      storage.setItem(QUIZ_CHECKS_KEY, JSON.stringify([...checkedIds]));
      pending.clear();
      return true;
    } catch {
      // Retry these local changes on the next write without losing other tabs' checks.
      return false;
    }
  }

  function changeMany(ids, checked) {
    const targets = uniqueIds(ids);
    if (!targets.length) return { changed: [], persisted: pending.size === 0 };
    // Best-effort cross-tab merging; localStorage does not offer transactions.
    mergeLatest();
    const changed = targets.filter(id => has(id) !== checked);
    if (!changed.length) return { changed, persisted: pending.size === 0 };
    changed.forEach(id => update(id, checked));
    return { changed, persisted: persist() };
  }

  return {
    has,
    set(id, checked) {
      if (!validId(id)) return { checked: false, persisted: false };
      const value = checked === true;
      mergeLatest();
      update(id, value);
      return { checked: value, persisted: persist() };
    },
    clear(ids) {
      const { changed, persisted } = changeMany(ids, false);
      return { removed: changed, persisted };
    },
    restore(ids) {
      const { changed, persisted } = changeMany(ids, true);
      return { restored: changed, persisted };
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
