import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { STUDY_KEYS } from './schema';

/**
 * docs/privacy.md is the inventory of what the portal stores about a learner. Every study key is
 * uploaded to the server with the account snapshot, so a key the inventory does not name is data
 * the operator holds without having said so. This fails on the pull request that adds one.
 */
const inventory = readFileSync(path.resolve(__dirname, '../../docs/privacy.md'), 'utf8');

describe('privacy inventory', () => {
  it.each(STUDY_KEYS)('names the synced study key %s', key => {
    expect(inventory).toContain(`\`${key}\``);
  });
});
