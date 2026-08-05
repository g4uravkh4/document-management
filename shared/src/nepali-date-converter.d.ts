declare module 'nepali-date-converter' {
  /** Month indexes are 0-based: 0 = Baisakh ... 11 = Chaitra (BS) or January ... December (AD). */
  interface IYearMonthDate {
    year: number;
    month: number;
    date: number;
    day?: number;
  }

  interface IAdBs {
    AD: IYearMonthDate;
    BS: IYearMonthDate;
  }

  class NepaliDate {
    static language: 'np' | 'en';
    constructor(value?: string | number | Date);
    constructor(year: number, monthIndex: number, date: number);
    toJsDate(): Date;
    getDate(): number;
    getYear(): number;
    getDay(): number;
    /** BS month index, 0 = Baisakh ... 11 = Chaitra */
    getMonth(): number;
    getDateObject(): IAdBs;
    getBS(): IYearMonthDate;
    getAD(): IYearMonthDate;
    format(formatString: string, language?: 'en' | 'np'): string;
    static parse(dateString: string): NepaliDate;
    static now(): NepaliDate;
    static fromAD(date: Date): NepaliDate;
    toString(): string;
  }

  export default NepaliDate;
}
