/**
 * Loading a study section's code on demand.
 *
 * Sections download the first time they are opened. The site redeploys whenever main changes, and each
 * deploy replaces the hashed files, so a tab opened before a deploy can ask for a file that is gone. The
 * fix is to reload once and pick up the new version. The tab remembers which build it reloaded from: if
 * the reload brings back the same build, no deploy explains the failure (the learner may be offline), so
 * the failure is reported instead of reloading again.
 */

export const SECTION_RELOAD_KEY = 'watchguard-section-reload-build';

export interface SectionLoadEnv {
  /** Identifies the running build; it changes with every deploy. */
  build: () => string;
  /** The build this tab last reloaded from after a failed section, or null. */
  reloadedFrom: () => string | null;
  /** Records a reload; false when it cannot be recorded, in which case no reload happens. */
  markReload: (build: string) => boolean;
  reload: () => void;
}

export function browserSectionEnv(): SectionLoadEnv {
  return {
    // This module is bundled into the entry script, whose hashed file name is unique to the build.
    build: () => import.meta.url,
    reloadedFrom: () => {
      try { return window.sessionStorage.getItem(SECTION_RELOAD_KEY); } catch { return null; }
    },
    markReload: build => {
      try {
        window.sessionStorage.setItem(SECTION_RELOAD_KEY, build);
        return window.sessionStorage.getItem(SECTION_RELOAD_KEY) === build;
      } catch { return false; }
    },
    reload: () => window.location.reload(),
  };
}

export function loadSection<T>(load: () => Promise<T>, env: SectionLoadEnv = browserSectionEnv()): Promise<T> {
  return load().catch(error => {
    const build = env.build();
    if (env.reloadedFrom() !== build && env.markReload(build)) {
      env.reload();
      // The page is going away; never settle, so nothing flashes an error first.
      return new Promise<T>(() => {});
    }
    throw error;
  });
}
