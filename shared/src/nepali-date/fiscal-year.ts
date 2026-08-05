import { adDateToBs, adDateToBsObject, bsDateToAd } from './converter';
import { ADDate, BSDate, FiscalYear } from './types';

/** BS month of Shrawan = 4 (first month of the Nepali fiscal year). */
const SHRAWAN = 4;

/**
 * Compute the fiscal year that a given AD date falls into.
 * Nepali FY: Shrawan 1 -> Ashad end, labelled e.g. "2081/82".
 */
export function fiscalYearForDate(date: Date): FiscalYear {
  const bs = adDateToBs(date);

  // Before Shrawan (Baisakh..Ashad) belongs to the FY that started last BS year.
  let startYear = bs.year;
  if (bs.month < SHRAWAN) {
    startYear -= 1;
  }

  return fiscalYearForStartYear(startYear);
}

/** Build the fiscal year record for the FY starting in the given BS year (Shrawan 1). */
export function fiscalYearForStartYear(startYear: number): FiscalYear {
  const startBs: BSDate = { year: startYear, month: SHRAWAN, day: 1 };
  const startAd = bsDateToAd(startBs);

  const nextStartAd = bsDateToAd({ year: startYear + 1, month: SHRAWAN, day: 1 });
  const endAdDate = new Date(
    Date.UTC(nextStartAd.year, nextStartAd.month - 1, nextStartAd.day) - 1,
  );
  const endAd: ADDate = {
    year: endAdDate.getUTCFullYear(),
    month: endAdDate.getUTCMonth() + 1,
    day: endAdDate.getUTCDate(),
  };

  return {
    label: `${startYear}/${String((startYear + 1) % 100).padStart(2, '0')}`,
    startAd,
    endAd,
    startBs,
    endBs: adDateToBsObject(endAd),
  };
}

/** The current fiscal year based on today's date. */
export function currentFiscalYear(): FiscalYear {
  return fiscalYearForDate(new Date());
}

/** Whether an AD date falls inside the given fiscal year (inclusive). */
export function isDateInFiscalYear(date: Date, fy: FiscalYear): boolean {
  const ad = {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
  const start = Date.UTC(fy.startAd.year, fy.startAd.month - 1, fy.startAd.day);
  const end = Date.UTC(fy.endAd.year, fy.endAd.month - 1, fy.endAd.day);
  const target = Date.UTC(ad.year, ad.month - 1, ad.day);
  return target >= start && target <= end;
}
