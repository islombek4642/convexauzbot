import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildVideoActionKeyboard } from '../tgcloud/lib/services/telegram.js';
import { KEYS } from '../tgcloud/lib/constants/keys.js';
import { t } from '../tgcloud/lib/i18n/index.js';

test('buildVideoActionKeyboard generates inline buttons for STT and V2A', () => {
  const kb = buildVideoActionKeyboard('uz');
  assert.ok(kb.inline_keyboard);
  assert.equal(kb.inline_keyboard.length, 2);
  assert.equal(kb.inline_keyboard[0].length, 1);
  assert.equal(kb.inline_keyboard[1].length, 1);
  assert.equal(kb.inline_keyboard[0][0].callback_data, 'action_stt');
  assert.equal(kb.inline_keyboard[1][0].callback_data, 'action_v2a');
});

test('i18n contains video download keys across uz, ru, and en', () => {
  for (const lang of ['uz', 'ru', 'en']) {
    assert.ok(t(KEYS.MSG_DOWNLOADING_VIDEO, lang), `Missing MSG_DOWNLOADING_VIDEO in ${lang}`);
    assert.ok(t(KEYS.MSG_VIDEO_DOWNLOADED, lang), `Missing MSG_VIDEO_DOWNLOADED in ${lang}`);
    assert.ok(t(KEYS.ERROR_DOWNLOAD_FAILED, lang), `Missing ERROR_DOWNLOAD_FAILED in ${lang}`);
    assert.ok(t(KEYS.BTN_ACTION_STT, lang), `Missing BTN_ACTION_STT in ${lang}`);
    assert.ok(t(KEYS.BTN_ACTION_V2A, lang), `Missing BTN_ACTION_V2A in ${lang}`);
  }
});
