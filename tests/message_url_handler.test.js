import { test } from 'node:test';
import assert from 'node:assert/strict';
import messageHandler from '../tgcloud/handlers/message.js';
import { KEYS } from '../tgcloud/lib/constants/keys.js';
import { t } from '../tgcloud/lib/i18n/index.js';

test('messageHandler detects URL in text and sends video with action buttons', async () => {
  let sentVideos = [];
  let sentMessages = [];
  let deletedMessages = [];

  const userMap = new Map();
  userMap.set(777, {
    chatId: 777,
    language: 'uz',
    isProcessing: false,
    state: 'idle',
  });

  const mockApi = {
    sendMessage: async (p) => {
      sentMessages.push(p);
      return { message_id: 10 };
    },
    deleteMessage: async (p) => {
      deletedMessages.push(p);
      return { ok: true };
    },
    sendVideo: async (p) => {
      sentVideos.push(p);
      return { message_id: 11, video: { file_id: 'downloaded_vid_123' } };
    },
  };

  const mockDb = {
    select: () => ({
      from: () => ({
        where: () => ({
          get: async () => userMap.get(777),
        }),
      }),
    }),
    update: () => ({
      set: (values) => ({
        where: () => ({
          run: async () => {
            const current = userMap.get(777);
            userMap.set(777, { ...current, ...values });
          },
        }),
      }),
    }),
  };

  const fakeMessage = {
    chat: { id: 777 },
    from: { id: 777 },
    text: 'Mana video link: https://example.com/test.mp4 ko\'ring',
  };

  await messageHandler(fakeMessage, { api: mockApi, db: mockDb });

  // 1. Sent progress message
  assert.equal(sentMessages[0].text, t(KEYS.MSG_DOWNLOADING_VIDEO, 'uz'));

  // 2. Sent video with action buttons
  assert.equal(sentVideos.length, 1);
  assert.equal(sentVideos[0].chat_id, 777);
  assert.equal(sentVideos[0].video, 'https://example.com/test.mp4');
  assert.ok(sentVideos[0].reply_markup.inline_keyboard);
  assert.equal(sentVideos[0].reply_markup.inline_keyboard[0][0].callback_data, 'action_stt');
  assert.equal(sentVideos[0].reply_markup.inline_keyboard[1][0].callback_data, 'action_v2a');

  // 3. Progress message deleted
  assert.equal(deletedMessages.length, 1);
  assert.equal(deletedMessages[0].message_id, 10);
});
