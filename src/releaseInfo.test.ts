import { describe,expect,it } from 'vitest';
import { buildTimestamp } from './releaseInfo';
describe('immutable build timestamps',()=>{
  it('normalizes explicit timezone timestamps for API and HTML time elements',()=>{
    expect(buildTimestamp('2026-09-12T12:15:30-04:00')).toBe('2026-09-12T16:15:30.000Z');
    expect(buildTimestamp('2026-09-12T16:15:30Z')).toBe('2026-09-12T16:15:30.000Z');
  });
  it('does not turn missing, date-only, or invalid metadata into a fake last-built time',()=>{
    for(const value of [undefined,null,'unknown','ci','2026-09-12','2026-09-12T16:15:30','2026-99-99T16:15:30Z'])expect(buildTimestamp(value)).toBeNull();
  });
});
