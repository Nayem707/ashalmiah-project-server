import { randomInt } from 'crypto';

/** Unambiguous characters only (no 0/O, 1/I/L) so numbers are easy to read out and type. */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CODE_LENGTH = 10;

export const ORDER_NUMBER_PATTERN = new RegExp(`^ORD-[${ALPHABET}]{${CODE_LENGTH}}$`);

export function generateOrderNumber(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `ORD-${code}`;
}

export function normalizeOrderNumber(value: string): string {
  return value.trim().toUpperCase();
}
