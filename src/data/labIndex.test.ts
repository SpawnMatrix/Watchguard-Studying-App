import { describe, expect, it } from 'vitest';
import { watchguardLabs } from './labs';
import { LAB_COUNT, LAB_NAMES } from './labIndex';

describe('lab index', () => {
  it('names exactly the labs in labs.ts, by the same numbers', () => {
    expect(LAB_COUNT).toBe(watchguardLabs.length);
    expect(LAB_NAMES).toEqual(Object.fromEntries(watchguardLabs.map(lab => [lab.id, lab.name])));
  });
});
