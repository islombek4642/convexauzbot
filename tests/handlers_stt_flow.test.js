import { test } from 'node:test';
import assert from 'node:assert/strict';
import messageHandler from '../tgcloud/handlers/message.js';
import { STATES } from '../tgcloud/lib/constants/states.js';
import { KEYS } from '../tgcloud/lib/constants/keys.js';
import { t } from '../tgcloud/lib/i18n/index.js';

test('messageHandler prompts for language and saves pendingMedia when media received in STT state', async () => {
  let sentMessages = [];
  let updatedUsers = new Map();

  const userRecord = {
    chatId: 555,
    language: 'uz',
    isProcessing: false,
    state: STATES.STT,
    pendingMedia: null,
  };
  updatedUsers.set(555, userRecord);

  // Mock sdk
  const mockApi = {
    sendMessage: async (payload) => {
      sentMessages.push(payload);
      return { message_id: 201 };
    },
    setMyCommands: async () => true,
  };

  const mockDb = {
    select: () => ({
      from: () => ({
        where: () => ({
          get: async () => updatedUsers.get(555),
        }),
      }),
    }),
    update: () => ({
      set: (values) => ({
        where: () => ({
          run: async () => {
            const current = updatedUsers.get(555);
            updatedUsers.set(555, { ...current, ...values });
          },
        }),
      }),
    }),
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: () => ({
          returning: () => ({
            run: async () => [updatedUsers.get(555)],
          }),
        }),
      }),
    }),
  };

  const fakeMessage = {
    chat: { id: 555 },
    from: { id: 555 },
    voice: {
      file_id: 'voice_file_999',
      file_size: 1024,
      mime_type: 'audio/ogg',
    },
  };

  await messageHandler(fakeMessage, { api: mockApi, db: mockDb });

  // 1. Must prompt for language
  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0].chat_id, 555);
  assert.equal(sentMessages[0].text, t(KEYS.MSG_CHOOSE_STT_LANG, 'uz'));
  assert.ok(sentMessages[0].reply_markup.inline_keyboard);
  assert.equal(sentMessages[0].reply_markup.inline_keyboard[0][0].callback_data, 'stt_lang:auto');

  // 2. Must have saved pendingMedia
  const savedUser = updatedUsers.get(555);
  const parsedMedia = typeof savedUser.pendingMedia === 'string'
    ? JSON.parse(savedUser.pendingMedia)
    : savedUser.pendingMedia;

  assert.equal(parsedMedia.fileId, 'voice_file_999');
});
