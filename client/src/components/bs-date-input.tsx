'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  adDateToBs,
  adToBs,
  bsDateToAd,
  bsToString,
  daysInBsMonth,
} from '@ca-firm/shared';
import { Input } from '@/components/ui';

const BS_MONTH_NAMES = [
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
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const pad2 = (n: number): string => String(n).padStart(2, '0');

function parseAdDate(
  value: string,
): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function adStringFromFields(ad: {
  year: number;
  month: number;
  day: number;
}): string {
  return `${ad.year}-${pad2(ad.month)}-${pad2(ad.day)}`;
}

export function BsDateInput({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => {
    const now = new Date();
    return adDateToBs(now);
  }, []);

  const selected = useMemo(() => {
    const ad = parseAdDate(value);
    return ad ? adToBs(ad.year, ad.month, ad.day) : null;
  }, [value]);

  const [viewYear, setViewYear] = useState(today.year);
  const [viewMonth, setViewMonth] = useState(today.month);

  useEffect(() => {
    if (!open) return;
    function handlePointer(event: MouseEvent | TouchEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handlePointer);
    return () => document.removeEventListener('mousedown', handlePointer);
  }, [open]);

  useEffect(() => {
    if (!open || !inputRef.current || !popoverRef.current) return;
    const inputRect = inputRef.current.getBoundingClientRect();
    const popoverRect = popoverRef.current.getBoundingClientRect();
    const gap = 8;
    const fitsBelow = inputRect.bottom + popoverRect.height + gap <= window.innerHeight;
    const top = fitsBelow
      ? inputRect.bottom + gap
      : Math.max(gap, inputRect.top - popoverRect.height - gap);
    const left = Math.max(
      gap,
      Math.min(inputRect.left, window.innerWidth - popoverRect.width - gap),
    );
    setPlacement({ top, left });
  }, [open, viewYear, viewMonth]);

  function toggleOpen() {
    if (!open && selected) {
      setViewYear(selected.year);
      setViewMonth(selected.month);
    }
    setPlacement(null);
    setOpen((value) => !value);
  }

  const daysInMonth = daysInBsMonth(viewYear, viewMonth);
  const firstWeekday = (() => {
    const ad = bsDateToAd({ year: viewYear, month: viewMonth, day: 1 });
    return new Date(ad.year, ad.month - 1, ad.day).getDay();
  })();

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  function shiftMonth(delta: number) {
    const index = viewMonth - 1 + delta;
    setViewMonth(((index % 12) + 12) % 12 + 1);
    setViewYear((year) => year + Math.floor(index / 12));
  }

  function selectDay(day: number) {
    const ad = bsDateToAd({ year: viewYear, month: viewMonth, day });
    onChange(adStringFromFields(ad));
    setOpen(false);
  }

  const yearOptions = Array.from(
    { length: 41 },
    (_, index) => today.year - 20 + index,
  ).filter((year) => year >= 2000 && year <= 2090);

  const display = selected ? `${bsToString(selected)} BS` : '';

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          type="text"
          readOnly
          placeholder="Select BS date"
          value={display}
          onClick={toggleOpen}
          className="cursor-pointer pr-9"
        />
        <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      </div>

      {open && (
        <div
          ref={popoverRef}
          style={{
            position: 'fixed',
            top: placement?.top ?? 0,
            left: placement?.left ?? 0,
            zIndex: 60,
            visibility: placement ? 'visible' : 'hidden',
          }}
          className="w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="rounded-md border border-gray-300 bg-white px-1.5 py-1 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none"
              >
                {BS_MONTH_NAMES.map((name, index) => (
                  <option key={name} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="rounded-md border border-gray-300 bg-white px-1.5 py-1 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center">
            {WEEKDAYS.map((weekday) => (
              <div
                key={weekday}
                className="py-1 text-xs font-medium text-gray-400"
              >
                {weekday}
              </div>
            ))}
            {cells.map((day, index) =>
              day === null ? (
                <div key={`empty-${index}`} />
              ) : (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`rounded-md py-1.5 text-sm transition-colors ${
                    selected &&
                    selected.year === viewYear &&
                    selected.month === viewMonth &&
                    selected.day === day
                      ? 'bg-indigo-600 font-medium text-white'
                      : today.year === viewYear &&
                          today.month === viewMonth &&
                          today.day === day
                        ? 'bg-indigo-50 font-medium text-indigo-700'
                        : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {day}
                </button>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
