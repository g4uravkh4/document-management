/** Bikram Sambat (BS) calendar date. Month: 1 = Baisakh ... 12 = Chaitra */
export interface BSDate {
  year: number;
  month: number;
  day: number;
}

/** Gregorian (AD) calendar date. Month: 1 = January ... 12 = December */
export interface ADDate {
  year: number;
  month: number;
  day: number;
}

/** A Nepali fiscal year, spanning Shrawan 1 to Ashad end. */
export interface FiscalYear {
  /** e.g. "2081/82" */
  label: string;
  startAd: ADDate;
  endAd: ADDate;
  startBs: BSDate;
  endBs: BSDate;
}
