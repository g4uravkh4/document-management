export const ROLES = {
  ADMIN: 'ADMIN',
  CLIENT: 'CLIENT',
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];

export const DOCUMENT_STATUSES = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
export type DocumentStatus =
  (typeof DOCUMENT_STATUSES)[keyof typeof DOCUMENT_STATUSES];

export const THEME_PREFERENCES = {
  LIGHT: 'LIGHT',
  DARK: 'DARK',
  SYSTEM: 'SYSTEM',
} as const;
export type ThemePreference =
  (typeof THEME_PREFERENCES)[keyof typeof THEME_PREFERENCES];

export const DATE_FORMATS = {
  BS: 'BS',
  AD: 'AD',
} as const;
export type DateFormat = (typeof DATE_FORMATS)[keyof typeof DATE_FORMATS];

export const LANGUAGES = ['en', 'ne'] as const;
export type Language = (typeof LANGUAGES)[number];
