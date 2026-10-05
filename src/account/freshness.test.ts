import { describe, expect, it } from 'vitest';
import { canCheckRemote, freshness, REFRESH_INTERVAL_MS, type LocalSyncState } from './freshness';

const idle: LocalSyncState = { user: 'packet_pilot', revision: 4, pending: false, sending: false, conflicted: false, busy: false };

describe('taking a newer save when a tab comes back', () => {
  it('adopts a higher revision for the same account', () => {
    expect(freshness(idle, { username: 'packet_pilot', revision: 5 })).toBe('adopt');
  });

  it('leaves an up-to-date tab alone', () => {
    expect(freshness(idle, { username: 'packet_pilot', revision: 4 })).toBe('current');
    expect(freshness(idle, { username: 'packet_pilot', revision: 3 })).toBe('current');
    expect(freshness(idle, { username: 'packet_pilot' })).toBe('current');
  });

  it('never replaces unsent local work: the normal save and its conflict check run instead', () => {
    for (const flag of ['pending', 'sending', 'conflicted', 'busy'] as const)
      expect(freshness({ ...idle, [flag]: true }, { username: 'packet_pilot', revision: 9 })).toBe('current');
  });

  it('reports a session that ended elsewhere, such as Sign out everywhere', () => {
    expect(freshness(idle, { username: null })).toBe('signed-out');
  });

  it('ignores another account and device-only study', () => {
    expect(freshness(idle, { username: 'someone_else', revision: 9 })).toBe('current');
    expect(freshness({ ...idle, user: null }, { username: 'packet_pilot', revision: 9 })).toBe('current');
  });

  it('asks at most once per interval, and only when there is nothing to send', () => {
    const now = 1_000_000;
    expect(canCheckRemote(idle, 0, now)).toBe(true);
    expect(canCheckRemote(idle, now - REFRESH_INTERVAL_MS + 1, now)).toBe(false);
    expect(canCheckRemote({ ...idle, pending: true }, 0, now)).toBe(false);
    expect(canCheckRemote({ ...idle, user: null }, 0, now)).toBe(false);
  });
});
