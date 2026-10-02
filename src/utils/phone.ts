const BD_MOBILE_PATTERN = /^01[3-9]\d{8}$/;

/**
 * Canonical Bangladeshi mobile number (`01XXXXXXXXX`) from user input such as
 * `+880 1712-345678`, `8801712345678`, `01712 345678` or `1712345678`.
 * Returns null when the input isn't a valid BD mobile number.
 */
export function normalizeBdMobile(value: string): string | null {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('880')) digits = digits.slice(2);
  else if (digits.length === 10 && digits.startsWith('1')) digits = `0${digits}`;
  return BD_MOBILE_PATTERN.test(digits) ? digits : null;
}
