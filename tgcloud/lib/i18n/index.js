import { uz } from './uz.js';
import { ru } from './ru.js';
import { en } from './en.js';

const dictionaries = {
  uz,
  ru,
  en,
};

const DEFAULT_LANG = 'uz';

export function getSupportedLanguages() {
  return Object.keys(dictionaries);
}

export function isValidLanguage(lang) {
  return typeof lang === 'string' && Boolean(dictionaries[lang.toLowerCase()]);
}

export function t(key, lang = DEFAULT_LANG, params = {}) {
  const normalizedLang = isValidLanguage(lang) ? lang.toLowerCase() : DEFAULT_LANG;
  const dict = dictionaries[normalizedLang] || dictionaries[DEFAULT_LANG];
  let text = dict[key] || dictionaries[DEFAULT_LANG][key] || key;

  if (params && typeof params === 'object') {
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }

  return text;
}
