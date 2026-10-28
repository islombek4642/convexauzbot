import { test } from 'node:test';
import assert from 'node:assert/strict';
import callbackQueryHandler from '../tgcloud/handlers/callback_query.js';
import { STATES } from '../tgcloud/lib/constants/states.js';
import { KEYS } from '../tgcloud/lib/constants/keys.js';
import { t } from '../tgcloud/lib/i18n/index.js';

test('callback query action_stt saves pendingMedia and prompts for language', async () => {
  let sentMessages = [];
  const userMap = new Map();
  userMap.set(888, {
    chatId: 888,
    language: 'uz',
    isProcessing: false,
    state: STATES.IDLE,
    pendingMedia: null,
  });

  const mockApi = {
    answerCallbackQuery: async () => ({ ok: true }),
    sendMessage: async (p) => {
      sentMessages.push(p);
      return { message_id: 101 };
    },
  };

  const mockDb = {
    select: () => ({
      from: () => ({
        where: () => ({
          get: async () => userMap.get(888),
        }),
      }),
    }),
    update: () => ({
      set: (values) => ({
        where: () => ({
          run: async () => {
            const current = userMap.get(888);
            userMap.set(888, { ...current, ...values });
          },
        }),
      }),
    }),
  };

  const callbackQuery = {
    id: 'query_stt_action',
    from: { id: 888 },
    message: {
      chat: { id: 888 },
      message_id: 50,
      video: {
        file_id: 'vid_file_from_action',
        file_name: 'downloaded.mp4',
        mime_type: 'video/mp4',
      },
    },
    data: 'action_stt',
  };

  await callbackQueryHandler(callbackQuery, { api: mockApi, db: mockDb });

  // 1. Pending media should be stored
  const user = userMap.get(888);
  const media = typeof user.pendingMedia === 'string' ? JSON.parse(user.pendingMedia) : user.pendingMedia;
  assert.equal(media.fileId, 'vid_file_from_action');

  // 2. Sent language prompt with pagination keyboard
  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0].text, t(KEYS.MSG_CHOOSE_STT_LANG, 'uz'));
  assert.ok(sentMessages[0].reply_markup.inline_keyboard);
});

test('callback query action_v2a extracts audio and delivers MP3', async () => {
  let sentAudio = null;
  let sentMessages = [];
  let deletedMessages = [];

  const userMap = new Map();
  userMap.set(888, {
    chatId: 888,
    language: 'uz',
    isProcessing: false,
    state: STATES.IDLE,
    pendingMedia: null,
  });

  const mockApi = {
    answerCallbackQuery: async () => ({ ok: true }),
    sendMessage: async (p) => {
      sentMessages.push(p);
      return { message_id: 201 };
    },
    deleteMessage: async (p) => {
      deletedMessages.push(p);
      return { ok: true };
    },
    getFileContent: async () => new Uint8Array([1, 2, 3]),
    sendAudio: async (p) => {
      sentAudio = p;
      return { ok: true };
    },
  };

  const mockDb = {
    select: () => ({
      from: () => ({
        where: () => ({
          get: async () => userMap.get(888),
        }),
      }),
    }),
    update: () => ({
      set: (values) => ({
        where: () => ({
          run: async () => {
            const current = userMap.get(888);
            userMap.set(888, { ...current, ...values });
          },
        }),
      }),
    }),
  };

  const mockRendi = async () => ({
    storageUrl: 'https://cdn.rendi.dev/sample.mp3',
    duration: 15,
  });

  const callbackQuery = {
    id: 'query_v2a_action',
    from: { id: 888 },
    message: {
      chat: { id: 888 },
      message_id: 50,
      video: {
        file_id: 'vid_file_for_v2a',
        file_name: 'sample.mp4',
        mime_type: 'video/mp4',
      },
    },
    data: 'action_v2a',
  };

  await callbackQueryHandler(callbackQuery, {
    api: mockApi,
    db: mockDb,
    customExtractAudio: mockRendi,
  });

  // 1. Sent MP3 audio
  assert.ok(sentAudio);
  assert.equal(sentAudio.audio, 'https://cdn.rendi.dev/sample.mp3');
  assert.equal(sentAudio.caption, t(KEYS.MSG_V2A_COMPLETED, 'uz'));

  // 2. User should not be processing anymore
  const user = userMap.get(888);
  assert.equal(user.isProcessing, 0);
});
