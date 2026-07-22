import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateChatResponse, setGlobalAIEnabled } from './aiService';

// Mock the @google/genai module
vi.mock('@google/genai', () => {
  class MockGoogleGenAI {
    models = {
      generateContent: vi.fn().mockRejectedValue(new Error('Mocked API failure'))
    };
  }
  return {
    GoogleGenAI: MockGoogleGenAI,
    Type: {
      OBJECT: 'OBJECT',
      STRING: 'STRING',
      BOOLEAN: 'BOOLEAN',
      ARRAY: 'ARRAY'
    }
  };
});

describe('aiService', () => {
  beforeEach(() => {
    // Reset vi mocks
    vi.clearAllMocks();

    // Set environment variables to enable AI
    process.env.ENABLE_AI_FEATURES = 'true';
    process.env.GEMINI_API_KEY = 'test-api-key';

    // Enable global AI features
    setGlobalAIEnabled(true);
  });

  describe('generateChatResponse', () => {
    it('should return local fallback when API call fails', async () => {
      const prompt = 'Can you help me with VPN setup?';
      const history: any[] = [];

      const response = await generateChatResponse(prompt, history);

      // Verification: the fallback should return a structured response
      // with requiresExternalLookup set to false for VPN setups.
      expect(response).toBeDefined();
      expect(response.message).toContain('VPN Setup Guidance');
      expect(response.requiresExternalLookup).toBe(false);
      expect(response.suggestedSearchTerms).toBe('');
    });
  });
});
