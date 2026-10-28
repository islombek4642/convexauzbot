import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSttLanguagesKeyboard } from '../tgcloud/lib/services/telegram.js';

test('buildSttLanguagesKeyboard generates 13-page pagination keyboard without redundant cancel button', () => {
  const kbPage1 = buildSttLanguagesKeyboard(1, 'uz');
  assert.ok(kbPage1.inline_keyboard);
  // 4 rows of languages (8 languages, 2 per row) + 1 nav row = 5 rows
  assert.equal(kbPage1.inline_keyboard.length, 5);
  assert.equal(kbPage1.inline_keyboard[0][0].callback_data, 'stt_lang:auto');
  assert.equal(kbPage1.inline_keyboard[0][1].callback_data, 'stt_lang:uz');

  // Page 1 navigation has page indicator and Next button
  const navRow = kbPage1.inline_keyboard[4];
  assert.ok(navRow.some((btn) => btn.callback_data === 'stt_page:2'));
  assert.ok(navRow.some((btn) => btn.text.includes('1/13')));

  // Page 2 has Prev and Next
  const kbPage2 = buildSttLanguagesKeyboard(2, 'uz');
  const navRow2 = kbPage2.inline_keyboard[4];
  assert.ok(navRow2.some((btn) => btn.callback_data === 'stt_page:1'));
  assert.ok(navRow2.some((btn) => btn.callback_data === 'stt_page:3'));
  assert.ok(navRow2.some((btn) => btn.text.includes('2/13')));

  // Page 13 (last page, 4 items = 2 language rows + 1 nav row = 3 rows)
  const kbPage13 = buildSttLanguagesKeyboard(13, 'uz');
  const navRow13 = kbPage13.inline_keyboard[kbPage13.inline_keyboard.length - 1];
  assert.ok(navRow13.some((btn) => btn.callback_data === 'stt_page:12'));
  assert.ok(!navRow13.some((btn) => btn.callback_data === 'stt_page:14'));
  assert.ok(navRow13.some((btn) => btn.text.includes('13/13')));
});
