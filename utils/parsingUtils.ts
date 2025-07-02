/**
 * Parses a string that may contain multiple numbers separated by newlines
 * into an array of valid numbers.
 * Filters out non-numeric entries and empty lines.
 * @param text The string to parse.
 * @returns An array of numbers.
 */
export const parseMultiLineNumericString = (text: string | null | undefined): number[] => {
  if (!text) {
    return [];
  }
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line !== '')
    .map(line => parseFloat(line))
    .filter(num => !isNaN(num));
};