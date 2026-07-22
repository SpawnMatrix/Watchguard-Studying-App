import { describe, it, expect } from 'vitest';
import { verifyAnswer } from './questions';

describe('verifyAnswer', () => {
  it('should return false when question ID is invalid', () => {
    const result = verifyAnswer(999999, ['some answer']);
    expect(result).toEqual({ isCorrect: false, correctAnswers: [] });
  });

  describe('Single-Select Questions (e.g. ID 1)', () => {
    // Question 1 correct answer: ["/16"]
    it('should return true when the correct single answer is provided', () => {
      const result = verifyAnswer(1, ['/16']);
      expect(result.isCorrect).toBe(true);
      expect(result.correctAnswers).toEqual(['/16']);
    });

    it('should return false when an incorrect single answer is provided', () => {
      const result = verifyAnswer(1, ['/24']);
      expect(result.isCorrect).toBe(false);
      expect(result.correctAnswers).toEqual(['/16']);
    });

    it('should return false when too many answers are provided for a single-select', () => {
      const result = verifyAnswer(1, ['/16', '/24']);
      expect(result.isCorrect).toBe(false);
      expect(result.correctAnswers).toEqual(['/16']);
    });
  });

  describe('Multi-Select Questions (e.g. ID 10)', () => {
    // Question 10 correct answers: ["Firebox-DB", "RADIUS"]
    it('should return true when all correct answers are provided', () => {
      const result = verifyAnswer(10, ['Firebox-DB', 'RADIUS']);
      expect(result.isCorrect).toBe(true);
      expect(result.correctAnswers).toEqual(['Firebox-DB', 'RADIUS']);
    });

    it('should return true when all correct answers are provided in a different order', () => {
      const result = verifyAnswer(10, ['RADIUS', 'Firebox-DB']);
      expect(result.isCorrect).toBe(true);
      expect(result.correctAnswers).toEqual(['Firebox-DB', 'RADIUS']);
    });

    it('should return false when only a partial correct answer is provided', () => {
      const result = verifyAnswer(10, ['Firebox-DB']);
      expect(result.isCorrect).toBe(false);
      expect(result.correctAnswers).toEqual(['Firebox-DB', 'RADIUS']);
    });

    it('should return false when an incorrect answer is included with a correct one', () => {
      const result = verifyAnswer(10, ['Firebox-DB', 'LDAP']);
      expect(result.isCorrect).toBe(false);
      expect(result.correctAnswers).toEqual(['Firebox-DB', 'RADIUS']);
    });

    it('should return false when too many answers are provided, even if they include all correct ones', () => {
      const result = verifyAnswer(10, ['Firebox-DB', 'RADIUS', 'LDAP']);
      expect(result.isCorrect).toBe(false);
      expect(result.correctAnswers).toEqual(['Firebox-DB', 'RADIUS']);
    });
  });
});
