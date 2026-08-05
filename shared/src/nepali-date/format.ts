import { ADDate, BSDate } from './types';

/** Nepali month names in BS order (Baisakh = 1). */
export const BS_MONTH_NAMES = [
  'Baisakh',
  'Jestha',
  'Ashad',
  'Shrawan',
  'Bhadra',
  'Ashwin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra',
] as const;

/** Nepali month names in Nepali script (Baisakh = 1). */
export const BS_MONTH_NAMES_NP = [
  'बैशाख',
  'जेठ',
  'असार',
  'श्रावण',
  'भदौ',
  'असोज',
  'कात्तिक',
  'मंसिर',
  'पुष',
  'माघ',
  'फागुन',
  'चैत',
] as const;

const pad = (n: number): string => String(n).padStart(2, '0');

/** Format a BS date as `YYYY-MM-DD` (or custom separator). */
export function bsToString(bs: BSDate, separator = '-'): string {
  return `${bs.year}${separator}${pad(bs.month)}${separator}${pad(bs.day)}`;
}

/** Format an AD date as `YYYY-MM-DD` (or custom separator). */
export function adToString(ad: ADDate, separator = '-'): string {
  return `${ad.year}${separator}${pad(ad.month)}${separator}${pad(ad.day)}`;
}

/** e.g. "2081-04-01 BS" */
export function bsToStringLabel(bs: BSDate): string {
  return `${bsToString(bs)} BS`;
}

/** e.g. "2024-07-17 AD" */
export function adToStringLabel(ad: ADDate): string {
  return `${adToString(ad)} AD`;
}
