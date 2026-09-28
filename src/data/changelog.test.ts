import { describe, expect, it } from 'vitest';
import { readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { changelog, INTERNAL_ONLY, unseenEntries, latestChangelogVersion, releaseDate, type ChangeKind } from './changelog';
import { version as packageVersion } from '../../package.json';

/**
 * A curated changelog rots the moment nobody remembers to update it, and a
 * rotted changelog is worse than none: it tells people nothing has changed.
 * These tests are the forcing function — a release note with no learner-facing
 * entry and no internal marker fails the build, on the pull request that
 * introduced it.
 */

const releasesDir = path.join(__dirname, '..', '..', 'docs', 'releases');
const releasedVersions = readdirSync(releasesDir)
  .filter(name => /^v\d+\.\d+\.\d+\.md$/.test(name))
  .map(name => name.slice(1, -3));

const KINDS: ChangeKind[] = ['new', 'improved', 'fixed'];

describe('changelog covers every release', () => {
  it('finds the release notes it is checked against', () => {
    // Guards against the glob silently matching nothing and the suite passing.
    expect(releasedVersions.length).toBeGreaterThan(10);
    expect(releasedVersions).toContain(packageVersion);
  });

  it('gives every shipped release either an entry or an internal marker', () => {
    const covered = new Set([...changelog.map(e => e.version), ...Object.keys(INTERNAL_ONLY)]);
    const missing = releasedVersions.filter(v => !covered.has(v));
    expect(missing, `docs/releases/v${missing[0]}.md has no changelog entry. `
      + 'Add one to src/data/changelog.ts, or name it in INTERNAL_ONLY with a reason.').toEqual([]);
  });

  it('describes the version currently being shipped', () => {
    const covered = new Set([...changelog.map(e => e.version), ...Object.keys(INTERNAL_ONLY)]);
    expect(covered.has(packageVersion),
      `This release is ${packageVersion} and nothing in src/data/changelog.ts mentions it.`).toBe(true);
  });

  it('never claims a release that does not exist', () => {
    for (const entry of changelog) {
      expect(existsSync(path.join(releasesDir, `v${entry.version}.md`)), entry.version).toBe(true);
    }
    for (const version of Object.keys(INTERNAL_ONLY)) {
      expect(existsSync(path.join(releasesDir, `v${version}.md`)), version).toBe(true);
    }
  });

  it('does not list a version twice, in either place', () => {
    const versions = [...changelog.map(e => e.version), ...Object.keys(INTERNAL_ONLY)];
    expect(new Set(versions).size).toBe(versions.length);
  });
});

describe('the entries are readable', () => {
  /** Part-by-part, because comparing the arrays directly compares strings —
   *  which puts 1.10.0 before 1.9.0. */
  const compare = (a: string, b: string) => {
    const [x, y] = [a.split('.').map(Number), b.split('.').map(Number)];
    for (let i = 0; i < 3; i += 1) if (x[i] !== y[i]) return x[i] - y[i];
    return 0;
  };

  it('orders versions by number, not by text', () => {
    expect(compare('1.10.0', '1.9.0')).toBeGreaterThan(0);
    expect(compare('1.9.0', '1.10.0')).toBeLessThan(0);
    expect(compare('1.15.2', '1.15.10')).toBeLessThan(0);
    expect(compare('1.2.0', '1.2.0')).toBe(0);
  });

  it('runs newest first', () => {
    for (let i = 1; i < changelog.length; i += 1) {
      const [newer, older] = [changelog[i - 1], changelog[i]];
      expect(compare(newer.version, older.version), `${newer.version} listed before ${older.version}`)
        .toBeGreaterThan(0);
      expect(Date.parse(newer.date), `${newer.version} is dated before ${older.version}`)
        .toBeGreaterThanOrEqual(Date.parse(older.date));
    }
  });

  it('carries a real date and a headline that is not a version number', () => {
    for (const entry of changelog) {
      expect(entry.date, entry.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isFinite(Date.parse(entry.date)), entry.version).toBe(true);
      expect(entry.headline.length, entry.version).toBeGreaterThan(12);
      expect(entry.headline.length, entry.version).toBeLessThanOrEqual(80);
      // The version is rendered beside the headline; repeating it reads badly.
      expect(entry.headline, entry.version).not.toMatch(/\d+\.\d+\.\d+/);
      expect(entry.headline.endsWith('.'), entry.version).toBe(false);
    }
  });

  it('says something concrete under every heading', () => {
    for (const entry of changelog) {
      expect(entry.changes.length, entry.version).toBeGreaterThan(0);
      for (const change of entry.changes) {
        expect(KINDS, `${entry.version}: ${change.kind}`).toContain(change.kind);
        expect(change.text.length, entry.version).toBeGreaterThan(25);
        expect(change.text.endsWith('.'), `${entry.version}: ${change.text}`).toBe(true);
        // Unbalanced ** renders as literal asterisks in the panel.
        expect((change.text.match(/\*\*/g) ?? []).length % 2, change.text).toBe(0);
        expect((change.text.match(/`/g) ?? []).length % 2, change.text).toBe(0);
      }
    }
  });

  it('explains each internal release rather than leaving a hole in the list', () => {
    for (const [version, reason] of Object.entries(INTERNAL_ONLY)) {
      expect(reason.length, version).toBeGreaterThan(10);
      expect(reason.endsWith('.'), version).toBe(true);
    }
  });
});

describe('release dates', () => {
  it('reads a date as the day it says, not the day before', () => {
    // new Date('2026-09-28') is UTC midnight, which formats as the 27th
    // anywhere west of Greenwich. A release date has no time of day.
    for (const iso of ['2026-09-28', '2026-01-01', '2026-12-31']) {
      const parsed = releaseDate(iso);
      const [year, month, day] = iso.split('-').map(Number);
      expect(parsed.getFullYear(), iso).toBe(year);
      expect(parsed.getMonth() + 1, iso).toBe(month);
      expect(parsed.getDate(), iso).toBe(day);
    }
  });

  it('formats every real entry as its own date', () => {
    for (const entry of changelog) {
      const shown = new Intl.DateTimeFormat('en-CA').format(releaseDate(entry.date));
      expect(shown, entry.version).toBe(entry.date);
    }
  });
});

describe('marking entries as seen', () => {
  it('shows nothing to someone who has never opened it', () => {
    // Otherwise a first-time learner meets twenty unread badges.
    expect(unseenEntries(null)).toEqual([]);
  });

  it('counts only what arrived after the version last seen', () => {
    expect(unseenEntries(changelog[0].version)).toEqual([]);
    expect(unseenEntries(changelog[1].version)).toEqual([changelog[0]]);
    expect(unseenEntries(changelog[changelog.length - 1].version))
      .toHaveLength(changelog.length - 1);
  });

  it('stays quiet when the stored version is not in the list', () => {
    // A downgrade, or a version whose entry was removed.
    expect(unseenEntries('99.0.0')).toEqual([]);
    expect(unseenEntries('')).toEqual([]);
  });

  it('agrees with the top of the list', () => {
    expect(latestChangelogVersion).toBe(changelog[0].version);
  });
});
