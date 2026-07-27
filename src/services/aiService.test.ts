import { test, describe, beforeEach, afterEach } from 'vitest';
import assert from 'node:assert';
import { isAIFeaturesEnabled, setGlobalAIEnabled } from './aiService';

describe('isAIFeaturesEnabled', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    setGlobalAIEnabled(false);
    delete process.env.ENABLE_AI_FEATURES;
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('returns true if customApiKey is provided and not empty', () => {
    assert.strictEqual(isAIFeaturesEnabled('custom-key'), true);
  });

  test('falls back to environment checks if customApiKey is empty or whitespace', () => {
    assert.strictEqual(isAIFeaturesEnabled(''), false);
    assert.strictEqual(isAIFeaturesEnabled('   '), false);
  });

  test('returns false if globalAIEnabled is false', () => {
    setGlobalAIEnabled(false);
    process.env.ENABLE_AI_FEATURES = 'true';
    process.env.GEMINI_API_KEY = 'valid-key';
    assert.strictEqual(isAIFeaturesEnabled(), false);
  });

  test('returns false if ENABLE_AI_FEATURES is explicitly "false"', () => {
    setGlobalAIEnabled(true);
    process.env.ENABLE_AI_FEATURES = 'false';
    process.env.GEMINI_API_KEY = 'valid-key';
    assert.strictEqual(isAIFeaturesEnabled(), false);
  });

  test('returns true if ENABLE_AI_FEATURES is not explicitly "false"', () => {
    setGlobalAIEnabled(true);
    delete process.env.ENABLE_AI_FEATURES;
    process.env.GEMINI_API_KEY = 'valid-key';
    assert.strictEqual(isAIFeaturesEnabled(), true);
  });

  test('returns false if GEMINI_API_KEY is invalid (empty, undefined string, default string, or truly undefined)', () => {
    setGlobalAIEnabled(true);
    process.env.ENABLE_AI_FEATURES = 'true';

    process.env.GEMINI_API_KEY = '';
    assert.strictEqual(isAIFeaturesEnabled(), false);

    process.env.GEMINI_API_KEY = 'undefined';
    assert.strictEqual(isAIFeaturesEnabled(), false);

    process.env.GEMINI_API_KEY = 'MY_GEMINI_API_KEY';
    assert.strictEqual(isAIFeaturesEnabled(), false);

    delete process.env.GEMINI_API_KEY;
    assert.strictEqual(isAIFeaturesEnabled(), false);
  });

  test('returns true if all conditions are met', () => {
    setGlobalAIEnabled(true);
    process.env.ENABLE_AI_FEATURES = 'true';
    process.env.GEMINI_API_KEY = 'valid-key';
    assert.strictEqual(isAIFeaturesEnabled(), true);
  });
});
