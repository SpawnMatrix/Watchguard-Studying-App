import { describe, it, expect, vi, beforeEach } from 'vitest';
import { evaluateQuizAnswer, setGlobalAIEnabled } from '../aiService';
import { GoogleGenAI } from '@google/genai';

// Mock @google/genai to simulate API failure
vi.mock('@google/genai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@google/genai')>();
  return {
    ...actual,
    GoogleGenAI: vi.fn().mockImplementation(function() {
      return {
        models: {
          generateContent: vi.fn().mockRejectedValue(new Error('Simulated API failure'))
        }
      };
    })
  };
});

describe('aiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('evaluateQuizAnswer', () => {
    it('should fallback to local logic when AI API request fails', async () => {
      setGlobalAIEnabled(true);

      const question = "What is a firewall?";
      const options = ["Option A", "Option B", "Option C"];
      const selectedAnswer = "Option A";
      const correctAnswer = "Option A";

      // Keep console.warn quiet during test
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(function() {});

      const result = await evaluateQuizAnswer(
        question,
        options,
        selectedAnswer,
        correctAnswer,
        undefined,
        undefined,
        'dummy-api-key'
      );

      // Should return the local fallback which just checks string equality when questionId is undefined
      expect(result.isCorrect).toBe(true);
      expect(result.weaknessCategory).toBe("Policies");

      expect(errorSpy).toHaveBeenCalledWith(
        "[Error] AI Service evaluateQuizAnswer failed, using local fallback:",
        expect.any(Error)
      );
      expect(errorSpy.mock.calls[0][1].message).toBe("Simulated API failure");

      errorSpy.mockRestore();
    });

    it('should fallback to local logic when AI API request fails with incorrect answer', async () => {
      setGlobalAIEnabled(true);

      const question = "What is a firewall?";
      const options = ["Option A", "Option B", "Option C"];
      const selectedAnswer = "Option B";
      const correctAnswer = "Option A";

      // Keep console.warn quiet during test
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(function() {});

      const result = await evaluateQuizAnswer(
        question,
        options,
        selectedAnswer,
        correctAnswer,
        undefined,
        undefined,
        'dummy-api-key'
      );

      // Should return the local fallback which just checks string equality when questionId is undefined
      expect(result.isCorrect).toBe(false);
      expect(result.weaknessCategory).toBe("Policies");

      expect(errorSpy).toHaveBeenCalledWith(
        "[Error] AI Service evaluateQuizAnswer failed, using local fallback:",
        expect.any(Error)
      );
      expect(errorSpy.mock.calls[0][1].message).toBe("Simulated API failure");

      errorSpy.mockRestore();
    });
  });
});
