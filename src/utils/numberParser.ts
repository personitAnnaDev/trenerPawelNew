/**
 * Number parsing utilities with Polish decimal comma support
 *
 * Handles both Polish (35,5) and international (35.5) decimal formats
 */

/**
 * Parse decimal number from string, supporting both comma and dot separators
 *
 * @param value - Input value (string, number, null, undefined)
 * @returns Parsed number or undefined for invalid input
 *
 * @example
 * parseDecimal('35,5')  // → 35.5 (Polish)
 * parseDecimal('35.5')  // → 35.5 (International)
 * parseDecimal('35')    // → 35
 * parseDecimal('')      // → undefined
 * parseDecimal(null)    // → undefined
 */
export function parseDecimal(value: any): number | undefined {
  // Handle null, undefined, empty string
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  // If already a number, validate it's finite
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  // String processing: trim, replace comma with dot, parse
  if (typeof value === 'string') {
    const normalized = value.trim().replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  // Unsupported type
  return undefined;
}
