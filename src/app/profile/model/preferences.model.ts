export type AppLanguage = 'es' | 'en';

export type TextSize = 'normal' | 'large' | 'x-large';

/** Accessibility preferences (HU19). */
export interface AccessibilityPreferences {
  textSize: TextSize;
  highContrast: boolean;
  reduceMotion: boolean;
}

export const DEFAULT_ACCESSIBILITY: AccessibilityPreferences = {
  textSize: 'normal',
  highContrast: false,
  reduceMotion: false,
};

/** Editable profile fields (HU16). The e-mail is the sign-in identifier and stays read-only. */
export interface ProfileUpdate {
  fullName: string;
  phone: string;
  company: string;
}

export const LOCALE_BY_LANGUAGE: Record<AppLanguage, string> = {
  es: 'es-PE',
  en: 'en-US',
};
