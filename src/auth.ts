/** Supabase email codes are 6 digits by default (the length is configurable up to 10). */
export const CODE_MIN = 6;
export const CODE_MAX = 10;

/**
 * Clean up a pasted or typed code ("123 456", "123-456") into digits only.
 * Returns null if it can't be a valid code.
 */
export function normalizeCode(input: string): string | null {
  const digits = input.replace(/[\s-]/g, '');
  return new RegExp(`^\\d{${CODE_MIN},${CODE_MAX}}$`).test(digits) ? digits : null;
}
