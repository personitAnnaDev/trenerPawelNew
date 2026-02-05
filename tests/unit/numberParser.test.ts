/**
 * Unit tests for numberParser utility
 *
 * Tests decimal number parsing with Polish comma support (35,5 → 35.5)
 *
 * TDD Phase: 🔴 RED (failing tests)
 */

import { describe, it, expect } from 'vitest';
import { parseDecimal } from '@/utils/numberParser';

describe('parseDecimal', () => {
  describe('Polish decimal comma support', () => {
    it('should parse Polish decimal comma (35,5 → 35.5)', () => {
      expect(parseDecimal('35,5')).toBe(35.5);
    });

    it('should parse Polish decimal comma with multiple digits (123,456 → 123.456)', () => {
      expect(parseDecimal('123,456')).toBe(123.456);
    });

    it('should parse Polish decimal comma with single digit (2,5 → 2.5)', () => {
      expect(parseDecimal('2,5')).toBe(2.5);
    });
  });

  describe('International decimal dot support', () => {
    it('should parse international decimal dot (35.5 → 35.5)', () => {
      expect(parseDecimal('35.5')).toBe(35.5);
    });

    it('should parse international decimal dot with multiple digits (123.456 → 123.456)', () => {
      expect(parseDecimal('123.456')).toBe(123.456);
    });
  });

  describe('Integer support', () => {
    it('should parse integer string (35 → 35)', () => {
      expect(parseDecimal('35')).toBe(35);
    });

    it('should parse integer number (42 → 42)', () => {
      expect(parseDecimal(42)).toBe(42);
    });

    it('should parse zero (0 → 0)', () => {
      expect(parseDecimal('0')).toBe(0);
    });
  });

  describe('Invalid input handling', () => {
    it('should return undefined for empty string', () => {
      expect(parseDecimal('')).toBeUndefined();
    });

    it('should return undefined for null', () => {
      expect(parseDecimal(null as any)).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      expect(parseDecimal(undefined as any)).toBeUndefined();
    });

    it('should return undefined for non-numeric string', () => {
      expect(parseDecimal('abc')).toBeUndefined();
    });

    it('should return undefined for NaN', () => {
      expect(parseDecimal(NaN)).toBeUndefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle leading/trailing whitespace', () => {
      expect(parseDecimal('  35,5  ')).toBe(35.5);
    });

    it('should handle negative numbers with comma', () => {
      expect(parseDecimal('-35,5')).toBe(-35.5);
    });

    it('should handle negative numbers with dot', () => {
      expect(parseDecimal('-35.5')).toBe(-35.5);
    });
  });
});
