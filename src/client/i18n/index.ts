// i18next initialisation. Importing this module has the side effect of
// configuring i18next for the whole app.
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en';
import zhHK from './zh-HK';

export const LANG_STORAGE_KEY = 'hkfbr.lang';
export const LANGS = ['en', 'zh-HK'] as const;
export type AppLang = (typeof LANGS)[number];

function initialLang(): AppLang {
  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (stored === 'en' || stored === 'zh-HK') return stored;
  } catch {
    // localStorage can be unavailable (privacy modes) — fall through to 'en'.
  }
  return 'en';
}

void i18next.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    'zh-HK': { translation: zhHK }
  },
  lng: initialLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
});

export function isAppLang(v: string | null | undefined): v is AppLang {
  return v === 'en' || v === 'zh-HK';
}

export function persistLang(lang: AppLang): void {
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // Ignore storage failures — the in-session language still switches.
  }
}

export default i18next;
