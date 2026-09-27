import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AccessibilityPreferences,
  AppLanguage,
  DEFAULT_ACCESSIBILITY,
  LOCALE_BY_LANGUAGE,
} from '../model/preferences.model';

const LANGUAGE_KEY = 'arquitech.language';
const ACCESSIBILITY_KEY = 'arquitech.accessibility';

const TEXT_SIZE_CLASSES = ['a11y-text-lg', 'a11y-text-xl'];

/**
 * Language (HU46) and accessibility (HU19) preferences. They are applied
 * immediately and kept in the current browser, so they survive reloads.
 */
@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly translate = inject(TranslateService);
  private readonly document = inject(DOCUMENT);

  private readonly languageState = signal<AppLanguage>(this.restoreLanguage());
  private readonly accessibilityState = signal<AccessibilityPreferences>(this.restoreAccessibility());

  readonly language = this.languageState.asReadonly();
  readonly accessibility = this.accessibilityState.asReadonly();

  get locale(): string {
    return LOCALE_BY_LANGUAGE[this.languageState()];
  }

  /** Called once at start-up; resolves when the translation file is loaded. */
  initialize(): Observable<unknown> {
    this.translate.addLangs(environment.supportedLanguages);
    this.translate.setDefaultLang(environment.defaultLanguage);
    this.applyAccessibility(this.accessibilityState());
    this.document.documentElement.lang = this.languageState();
    return this.translate.use(this.languageState());
  }

  setLanguage(language: AppLanguage): void {
    this.languageState.set(language);
    this.document.documentElement.lang = language;
    this.translate.use(language);
    this.store(LANGUAGE_KEY, language);
  }

  updateAccessibility(changes: Partial<AccessibilityPreferences>): void {
    const next = { ...this.accessibilityState(), ...changes };
    this.accessibilityState.set(next);
    this.applyAccessibility(next);
    this.store(ACCESSIBILITY_KEY, JSON.stringify(next));
  }

  resetAccessibility(): void {
    this.updateAccessibility(DEFAULT_ACCESSIBILITY);
  }

  private applyAccessibility(preferences: AccessibilityPreferences): void {
    const root = this.document.documentElement.classList;
    root.remove(...TEXT_SIZE_CLASSES);
    if (preferences.textSize === 'large') {
      root.add('a11y-text-lg');
    } else if (preferences.textSize === 'x-large') {
      root.add('a11y-text-xl');
    }
    root.toggle('a11y-high-contrast', preferences.highContrast);
    root.toggle('a11y-reduce-motion', preferences.reduceMotion);
  }

  private restoreLanguage(): AppLanguage {
    const stored = this.read(LANGUAGE_KEY);
    if (stored === 'es' || stored === 'en') {
      return stored;
    }
    const browser = (globalThis.navigator?.language ?? '').slice(0, 2);
    return browser === 'en' ? 'en' : 'es';
  }

  private restoreAccessibility(): AccessibilityPreferences {
    try {
      const stored = this.read(ACCESSIBILITY_KEY);
      return stored
        ? { ...DEFAULT_ACCESSIBILITY, ...(JSON.parse(stored) as AccessibilityPreferences) }
        : DEFAULT_ACCESSIBILITY;
    } catch {
      return DEFAULT_ACCESSIBILITY;
    }
  }

  private read(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private store(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Preference applies to the current page only.
    }
  }
}
