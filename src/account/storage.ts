import { validStudyValue, STUDY_KEYS, type StudySnapshot } from './schema';
export const PROGRESS_EVENT='study-progress-changed';
export function writeStudyValue(key:string,value:string|null) {
  if (localStorage.getItem(key)===value) return;
  if(value===null) localStorage.removeItem(key); else localStorage.setItem(key,value);
  window.dispatchEvent(new Event(PROGRESS_EVENT));
}
export function snapshotBrowser(): StudySnapshot {
  return Object.fromEntries(STUDY_KEYS.map(key=>[key,localStorage.getItem(key)]).filter(([,value])=>value!==null));
}
export function restoreBrowser(snapshot:StudySnapshot) {
  for(const key of STUDY_KEYS) {
    if(snapshot[key]===undefined) localStorage.removeItem(key); else localStorage.setItem(key,snapshot[key]!);
  }
}
export function readJSON<T>(key:string,fallback:T):T {
  try { const raw=localStorage.getItem(key); return raw&&(!STUDY_KEYS.includes(key as any)||validStudyValue(key,raw))?JSON.parse(raw):fallback; } catch { return fallback; }
}
