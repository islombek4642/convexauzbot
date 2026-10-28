import { test } from 'node:test';
import assert from 'node:assert/strict';
import callbackQueryHandler from '../tgcloud/handlers/callback_query.js';
import { STATES } from '../tgcloud/lib/constants/states.js';
import { KEYS } from '../tgcloud/lib/constants/keys.js';
import { t } from '../tgcloud/lib/i18n/index.js';

test('callback query handles stt_page pagination smoothly', async () => {
  let editedMarkup = null;
  let answered = false;

  const mockApi = {
    answerCallbackQuery: async () => {
      answered = true;
      return { ok: true };
    },
    editMessageReplyMarkup: async (params) => {
      editedMarkup = params;
      return { ok: true };
    },
  };

  const userMap = new Map();
  userMap.set(111, {
    chatId: 111,
    language: 'uz',
    isProcessing: false,
    state: STATES.STT,
    pendingMedia: { fileId: 'f123', fileName: 'audio.mp3', mimeType: 'audio/mp3' },
  });

  const mockDb = {
    select: () => ({
      from: () => ({
        where: () => ({
          get: async () => userMap.get(111),
        }),
      }),
    }),
    update: () => ({
      set: (values) => ({
        where: () => ({
          run: async () => {
            const current = userMap.get(111);
            userMap.set(111, { ...current, ...values });
          },
        }),
      }),
    }),
  };

  const callbackQuery = {
    id: 'query_page_2',
    from: { id: 111 },
    message: { chat: { id: 111 }, message_id: 50 },
    data: 'stt_page:2',
  };

  await callbackQueryHandler(callbackQuery, { api: mockApi, db: mockDb });

  assert.ok(answered);
  assert.ok(editedMarkup);
  assert.equal(editedMarkup.chat_id, 111);
  assert.equal(editedMarkup.message_id, 50);
  assert.ok(editedMarkup.reply_markup.inline_keyboard[4].some((btn) => btn.text.includes('2/13')));
});

test('callback query handles stt_cancel and clears pendingMedia and state', async () => {
  let deletedMsg = null;
  let sentMsg = null;

  const mockApi = {
    answerCallbackQuery: async () => ({ ok: true }),
    deleteMessage: async (params) => {
      deletedMsg = params;
      return { ok: true };
    },
    sendMessage: async (params) => {
      sentMsg = params;
      return { ok: true };
    },
  };

  const userMap = new Map();
  userMap.set(111, {
    chatId: 111,
    language: 'uz',
    isProcessing: false,
    state: STATES.STT,
    pendingMedia: { fileId: 'f123', fileName: 'audio.mp3', mimeType: 'audio/mp3' },
  });

  const mockDb = {
    select: () => ({
      from: () => ({
        where: () => ({
          get: async () => userMap.get(111),
        }),
      }),
    }),
    update: () => ({
      set: (values) => ({
        where: () => ({
          run: async () => {
            const current = userMap.get(111);
            userMap.set(111, { ...current, ...values });
          },
        }),
      }),
    }),
  };

  const callbackQuery = {
    id: 'query_cancel',
    from: { id: 111 },
    message: { chat: { id: 111 }, message_id: 50 },
    data: 'stt_cancel',
  };

  await callbackQueryHandler(callbackQuery, { api: mockApi, db: mockDb });

  const updatedUser = userMap.get(111);
  assert.equal(updatedUser.pendingMedia, null);
  assert.equal(updatedUser.state, STATES.IDLE);
  assert.equal(updatedUser.isProcessing, 0);

  assert.equal(deletedMsg.message_id, 50);
  assert.equal(sentMsg.text, t(KEYS.MSG_STT_CANCELLED, 'uz'));
});

test('callback query handles stt_lang:uz and starts transcription', async () => {
  let editedText = null;
  let transcriptionExecuted = false;

  const mockApi = {
    answerCallbackQuery: async () => ({ ok: true }),
    editMessageText: async (params) => {
      editedText = params;
      return { ok: true };
    },
    getFileContent: async () => new Uint8Array([1, 2, 3]),
    sendMessage: async () => ({ ok: true }),
    deleteMessage: async () => ({ ok: true }),
  };

  const userMap = new Map();
  userMap.set(111, {
    chatId: 111,
    language: 'uz',
    isProcessing: false,
    state: STATES.STT,
    pendingMedia: { fileId: 'f123', fileName: 'audio.mp3', mimeType: 'audio/mp3' },
  });

  const mockDb = {
    select: () => ({
      from: () => ({
        where: () => ({
          get: async () => userMap.get(111),
        }),
      }),
    }),
    update: () => ({
      set: (values) => ({
        where: () => ({
          run: async () => {
            const current = userMap.get(111);
            userMap.set(111, { ...current, ...values });
          },
        }),
      }),
    }),
  };

  const mockFetch = async () => ({
    ok: true,
    json: async () => ({
      text: "O'zbekcha toza matn",
      segments: [],
      language: 'uz',
    }),
  });

  const callbackQuery = {
    id: 'query_lang_uz',
    from: { id: 111 },
    message: { chat: { id: 111 }, message_id: 50 },
    data: 'stt_lang:uz',
  };

  await callbackQueryHandler(callbackQuery, {
    api: mockApi,
    db: mockDb,
    customFetch: mockFetch,
  });

  // Edited message to processing
  assert.ok(editedText);
  assert.equal(editedText.chat_id, 111);
  assert.equal(editedText.message_id, 50);
  assert.equal(editedText.text, t(KEYS.MSG_PROCESSING, 'uz'));

  // User state cleared after transcription
  const finalUser = userMap.get(111);
  assert.equal(finalUser.pendingMedia, null);
  assert.equal(finalUser.state, STATES.IDLE);
});
