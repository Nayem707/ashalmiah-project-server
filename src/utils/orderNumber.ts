/**
 * Customer-facing order numbers: `#ORD-YYYYMMDD-NNN`, where the date is the store's
 * local calendar day and NNN restarts at 001 every day (grows past 999 if needed).
 */
export const ORDER_NUMBER_TIME_ZONE = 'Asia/Dhaka';
export const ORDER_NUMBER_PATTERN = /^#ORD-\d{8}-\d{3,}$/;

const SEQUENCE_PAD = 3;

const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: ORDER_NUMBER_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** `YYYYMMDD` for the given instant in the store's time zone. */
export function orderDateKey(date: Date): string {
  return dateKeyFormatter.format(date).replace(/-/g, '');
}

export function orderNumberPrefix(dateKey: string): string {
  return `#ORD-${dateKey}-`;
}

export function formatOrderNumber(dateKey: string, sequence: number): string {
  return `${orderNumberPrefix(dateKey)}${String(sequence).padStart(SEQUENCE_PAD, '0')}`;
}

/** Sequence part of a number for that day's prefix, or 0 when it doesn't match. */
export function orderSequenceOf(orderNumber: string, dateKey: string): number {
  const prefix = orderNumberPrefix(dateKey);
  if (!orderNumber.startsWith(prefix)) return 0;
  const sequence = Number(orderNumber.slice(prefix.length));
  return Number.isInteger(sequence) ? sequence : 0;
}
