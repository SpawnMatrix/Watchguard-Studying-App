import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { isAIFeaturesEnabled, setGlobalAIEnabled } from './aiService';

describe('isAIFeaturesEnabled', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    // Reset state before each test
    setGlobalAIEnabled(false);
    delete process.env.ENABLE_AI_FEATURES;
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  test('returns true if customApiKey is provided and not empty', () => {
    assert.strictEqual(isAIFeaturesEnabled('custom-key'), true);
  });

  test('falls back to environment checks if customApiKey is empty or whitespace', () => {
    // With globalAIEnabled = false (default in beforeEach), should return false
    assert.strictEqual(isAIFeaturesEnabled(''), false);
    assert.strictEqual(isAIFeaturesEnabled('   '), false);
  });

  test('returns false if globalAIEnabled is false', () => {
    setGlobalAIEnabled(false);
    process.env.ENABLE_AI_FEATURES = 'true';
    process.env.GEMINI_API_KEY = 'valid-key';
    assert.strictEqual(isAIFeaturesEnabled(), false);
  });

  test('returns false if ENABLE_AI_FEATURES is "false"', () => {
    setGlobalAIEnabled(true);
    process.env.ENABLE_AI_FEATURES = 'false';
    process.env.GEMINI_API_KEY = 'valid-key';
    assert.strictEqual(isAIFeaturesEnabled(), false);
  });

  test('returns false if GEMINI_API_KEY is empty', () => {
    setGlobalAIEnabled(true);
    process.env.ENABLE_AI_FEATURES = 'true';
    process.env.GEMINI_API_KEY = '';
    assert.strictEqual(isAIFeaturesEnabled(), false);
  });

  test('returns true if all conditions are met', () => {
    setGlobalAIEnabled(true);
    process.env.ENABLE_AI_FEATURES = 'true';
    process.env.GEMINI_API_KEY = 'valid-key';
    assert.strictEqual(isAIFeaturesEnabled(), true);
  });
});
