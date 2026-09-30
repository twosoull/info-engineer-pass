export const GAME_RECORDS_KEY = 'info-engineer-game-records-v1';
const modes = new Set(['0', '30', '60']);

// Keep records separate from exam bookmarks and daily learning progress.
export function createGameRecords(storage) {
  let records = {};
  function refresh() {
    try {
      const saved = JSON.parse(storage?.getItem(GAME_RECORDS_KEY) || '{}');
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
        for (const [mode, score] of Object.entries(saved)) {
          if (modes.has(mode) && Number.isSafeInteger(score) && score >= 0 && score <= 19000) {
            records[mode] = Math.max(records[mode] ?? 0, score);
          }
        }
      }
    } catch { /* A blocked or corrupt store must not prevent play. */ }
  }
  refresh();
  return {
    get(seconds) { refresh(); return records[String(seconds)] ?? null; },
    save(seconds, score) {
      const mode = String(seconds);
      if (!modes.has(mode) || !Number.isSafeInteger(score) || score < 0 || score > 19000) return { improved: false, persisted: false };
      refresh();
      const previous = records[mode];
      const improved = previous == null || score > previous;
      records[mode] = Math.max(previous ?? 0, score);
      try {
        if (!storage?.setItem) throw new Error('Storage unavailable');
        storage.setItem(GAME_RECORDS_KEY, JSON.stringify(records));
        return { improved, persisted: true };
      } catch { return { improved, persisted: false }; }
    }
  };
}
