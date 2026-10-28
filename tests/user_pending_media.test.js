import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KEYS } from '../tgcloud/lib/constants/keys.js';
import { t } from '../tgcloud/lib/i18n/index.js';
import { getUser, setPendingMedia } from '../tgcloud/lib/services/user.js';

test('i18n contains STT language selection keys across all 3 languages', () => {
  for (const lang of ['uz', 'ru', 'en']) {
    assert.ok(t(KEYS.MSG_CHOOSE_STT_LANG, lang), `Missing MSG_CHOOSE_STT_LANG in ${lang}`);
    assert.ok(t(KEYS.BTN_CANCEL_SELECTION, lang), `Missing BTN_CANCEL_SELECTION in ${lang}`);
    assert.ok(t(KEYS.MSG_STT_CANCELLED, lang), `Missing MSG_STT_CANCELLED in ${lang}`);
  }
});

test('user service sets and retrieves pendingMedia correctly', async () => {
  let storedUsers = new Map();
  storedUsers.set(999, {
    chatId: 999,
    language: 'uz',
    isProcessing: false,
    state: 'stt',
    pendingMedia: null,
  });

  const mockDb = {
    select: () => ({
      from: () => ({
        where: () => ({
          get: async () => storedUsers.get(999),
        }),
      }),
    }),
    update: () => ({
      set: (values) => ({
        where: () => ({
          run: async () => {
            const current = storedUsers.get(999);
            storedUsers.set(999, { ...current, ...values });
          },
        }),
      }),
    }),
  };

  const initialUser = await getUser(999, mockDb);
  assert.equal(initialUser.pendingMedia, null);

  const mediaData = {
    fileId: 'tg_file_12345',
    fileName: 'voice.ogg',
    mimeType: 'audio/ogg',
  };

  await setPendingMedia(999, mediaData, mockDb);
  const updatedUser = await getUser(999, mockDb);
  assert.deepEqual(updatedUser.pendingMedia, mediaData);

  // Clear pendingMedia
  await setPendingMedia(999, null, mockDb);
  const clearedUser = await getUser(999, mockDb);
  assert.equal(clearedUser.pendingMedia, null);
});
