// Save system: autosaves the current run (shards, upgrades, relics, embers,
// difficulty) to localStorage so a run survives a reload, plus a run-history
// log of the last 12 finished runs with result, score and time.
const SAVE_KEY = 'emberfall.save.v1';
const HIST_KEY = 'emberfall.history.v1';

export function loadSaveData() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
export function saveRunData(data) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { /* storage full/blocked */ }
}
export function clearSaveData() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* noop */ }
}
export function loadHistory() {
  try {
    const raw = localStorage.getItem(HIST_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}
export function pushHistory(entry) {
  try {
    const arr = loadHistory();
    arr.unshift({ ...entry, at: new Date().toISOString().slice(0, 19).replace('T', ' ') });
    localStorage.setItem(HIST_KEY, JSON.stringify(arr.slice(0, 12)));
  } catch (e) { /* noop */ }
}
