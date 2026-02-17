import { format } from 'date-fns';
import { he } from 'date-fns/locale';

/**
 * Normalizes any date-like value to a JS Date.
 * Handles: Firestore Timestamp (.toDate()), raw seconds object, string, Date, null/undefined.
 */
export function normalizeDate(date) {
  if (!date) return null;
  if (date instanceof Date) return date;
  if (typeof date?.toDate === 'function') return date.toDate();
  if (date?.seconds != null) return new Date(date.seconds * 1000);
  if (typeof date === 'string') return new Date(date);
  return null;
}

/**
 * Formats a date in Hebrew locale.
 * @param {*} date - Any date-like value
 * @param {string} fmt - date-fns format string (default: 'd בMMMM yyyy')
 * @returns {string}
 */
export function formatHebrewDate(date, fmt = 'd בMMMM yyyy') {
  const d = normalizeDate(date);
  return d ? format(d, fmt, { locale: he }) : '';
}

/**
 * Formats a date as HH:mm time.
 * @param {*} date - Any date-like value
 * @returns {string}
 */
export function formatHebrewTime(date) {
  const d = normalizeDate(date);
  return d ? format(d, 'HH:mm') : '';
}

/**
 * Checks if two dates are the same calendar day.
 * @param {*} date1 - Any date-like value
 * @param {*} date2 - Any date-like value
 * @returns {boolean}
 */
export function isSameDay(date1, date2) {
  const d1 = normalizeDate(date1);
  const d2 = normalizeDate(date2);
  if (!d1 || !d2) return false;
  return d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();
}

/**
 * Returns start of day (00:00:00.000) for a given date.
 * Does NOT mutate the original date.
 * @param {*} date - Any date-like value
 * @returns {Date}
 */
export function startOfDay(date) {
  const d = normalizeDate(date);
  if (!d) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Returns end of day (23:59:59.999) for a given date.
 * Does NOT mutate the original date.
 * @param {*} date - Any date-like value
 * @returns {Date}
 */
export function endOfDay(date) {
  const d = normalizeDate(date);
  if (!d) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/**
 * Formats a date for display in short Hebrew format (e.g., "יום שני, 5 בינואר")
 * @param {*} date - Any date-like value
 * @returns {string}
 */
export function formatHebrewDateShort(date) {
  const d = normalizeDate(date);
  return d ? format(d, 'EEEE, d בMMMM', { locale: he }) : '';
}

/**
 * Formats a date as a short date for lists (e.g., "5/1/2024")
 * @param {*} date - Any date-like value
 * @returns {string}
 */
export function formatShortDate(date) {
  const d = normalizeDate(date);
  return d ? format(d, 'd/M/yyyy') : '';
}
