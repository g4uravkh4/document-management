import NepaliDate from 'nepali-date-converter';
import { ADDate, BSDate } from './types';

const KTM_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kathmandu',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Extract the calendar date of an instant in Nepal time (Asia/Kathmandu).
 * Stored date-times are Nepal-local midnights serialized as UTC instants,
 * so this must use a fixed timezone rather than the viewer's local time.
 */
export function adInstantToAd(date: Date): ADDate {
  const parts = KTM_FORMATTER.formatToParts(date);
  const field = (type: string): number =>
    Number(parts.find((p) => p.type === type)?.value ?? '0');
  return {
    year: field('year'),
    month: field('month'),
    day: field('day'),
  };
}

/** Convert a Gregorian (AD) date to Bikram Sambat (BS). Month: 1-12. */
export function adToBs(year: number, month: number, day: number): BSDate {
  const nd = NepaliDate.fromAD(new Date(year, month - 1, day));
  return { year: nd.getYear(), month: nd.getMonth() + 1, day: nd.getDate() };
}

/** Convert a Bikram Sambat (BS) date to Gregorian (AD). Month: 1-12. */
export function bsToAd(year: number, month: number, day: number): ADDate {
  const nd = new NepaliDate(year, month - 1, day);
  const ad = nd.getAD();
  return { year: ad.year, month: ad.month + 1, day: ad.date };
}

/** Convert an AD JS Date to a BSDate (interpreted in Nepal time). */
export function adDateToBs(date: Date): BSDate {
  const ad = adInstantToAd(date);
  return adToBs(ad.year, ad.month, ad.day);
}

/** Convert an ADDate to a BSDate. */
export function adDateToBsObject(ad: ADDate): BSDate {
  return adToBs(ad.year, ad.month, ad.day);
}

/** Convert a BSDate to an ADDate. */
export function bsDateToAd(bs: BSDate): ADDate {
  return bsToAd(bs.year, bs.month, bs.day);
}

/** Number of days in a BS month. Month: 1-12. */
export function daysInBsMonth(year: number, month: number): number {
  const start = new NepaliDate(year, month - 1, 1).toJsDate().getTime();
  const next = new NepaliDate(year, month, 1).toJsDate().getTime();
  return Math.round((next - start) / 86400000);
}
