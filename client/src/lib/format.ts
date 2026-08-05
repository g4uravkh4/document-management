import { adDateToBs, adToBs, bsToString } from '@ca-firm/shared';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function formatDate(value: string | Date): string {
  let bs;
  if (typeof value === 'string' && DATE_ONLY.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    bs = adToBs(year, month, day);
  } else {
    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return '-';
    bs = adDateToBs(date);
  }
  return `${bsToString(bs)} BS`;
}

export function formatDateTime(value: string | Date): string {
  if (typeof value === 'string' && DATE_ONLY.test(value)) {
    return formatDate(value);
  }
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '-';

  const time = date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${formatDate(date)} ${time}`;
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** index;
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
