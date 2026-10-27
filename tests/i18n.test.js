import assert from 'node:assert/strict';
import test from 'node:test';
import { t, getSupportedLanguages, isValidLanguage } from '../tgcloud/lib/i18n/index.js';
import { KEYS } from '../tgcloud/lib/constants/keys.js';
import { COMMANDS } from '../tgcloud/lib/constants/commands.js';

test('supported languages include uz, ru, and en', () => {
  const langs = getSupportedLanguages();
  assert.deepEqual(langs, ['uz', 'ru', 'en']);
  assert.equal(isValidLanguage('uz'), true);
  assert.equal(isValidLanguage('ru'), true);
  assert.equal(isValidLanguage('en'), true);
  assert.equal(isValidLanguage('es'), false);
});

test('commands include start, language, and help', () => {
  assert.equal(COMMANDS.START, 'start');
  assert.equal(COMMANDS.LANGUAGE, 'language');
  assert.equal(COMMANDS.HELP, 'help');
});

test('all translation keys exist in uz, ru, and en dictionaries and are non-empty strings', () => {
  const languages = ['uz', 'ru', 'en'];
  for (const lang of languages) {
    for (const [keyName, keyValue] of Object.entries(KEYS)) {
      const translation = t(keyValue, lang);
      assert.ok(translation, `Missing translation for key ${keyName} (${keyValue}) in ${lang}`);
      assert.equal(typeof translation, 'string');
      assert.ok(translation.trim().length > 0);
    }
  }
});

test('t() interpolates parameters properly', () => {
  const res = t(KEYS.CHUNK_HEADER, 'uz', { current: 1, total: 3 });
  assert.equal(res, '[1/3]');
});

test('t() falls back to uz if unknown language requested', () => {
  const res = t(KEYS.HELP_TITLE, 'unknown_lang');
  const uzRes = t(KEYS.HELP_TITLE, 'uz');
  assert.equal(res, uzRes);
});
