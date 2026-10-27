import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_FILE_SIZE_BYTES } from '../tgcloud/lib/constants/config.js';
import { getUser, setUserLanguage, setUserProcessing } from '../tgcloud/lib/services/user.js';
import { extractMediaInfo } from '../tgcloud/lib/services/telegram.js';

test('config defines safe max file size of 19.5 MB', () => {
  assert.equal(MAX_FILE_SIZE_BYTES, 19.5 * 1024 * 1024);
  assert.equal(MAX_FILE_SIZE_BYTES, 20447232);
});

test('extractMediaInfo correctly extracts video, audio, voice and valid documents', () => {
  const videoMsg = { video: { file_id: 'vid123', file_size: 5000000, file_name: 'clip.mp4' } };
  const audioMsg = { audio: { file_id: 'aud123', file_size: 2000000, file_name: 'track.mp3' } };
  const voiceMsg = { voice: { file_id: 'voi123', file_size: 50000 } };
  const docMsg = { document: { file_id: 'doc123', file_size: 3000000, file_name: 'lecture.m4a', mime_type: 'audio/m4a' } };
  const textMsg = { text: 'Hello' };
  const pdfMsg = { document: { file_id: 'pdf123', file_size: 1000, file_name: 'doc.pdf', mime_type: 'application/pdf' } };

  assert.equal(extractMediaInfo(videoMsg)?.fileId, 'vid123');
  assert.equal(extractMediaInfo(audioMsg)?.fileId, 'aud123');
  assert.equal(extractMediaInfo(voiceMsg)?.fileId, 'voi123');
  assert.equal(extractMediaInfo(docMsg)?.fileId, 'doc123');
  assert.equal(extractMediaInfo(textMsg), null);
  assert.equal(extractMediaInfo(pdfMsg), null);
});

test('user service gets or creates user with default language uz and isProcessing false', async () => {
  let dbRows = {};
  const mockDb = {
    select: () => ({
      from: () => ({
        where: () => ({
          get: async () => dbRows[100] || null,
        }),
      }),
    }),
    insert: () => ({
      values: (val) => ({
        onConflictDoUpdate: () => ({
          returning: () => ({
            run: async () => {
              dbRows[val.chatId] = { ...val };
              return [dbRows[val.chatId]];
            },
          }),
        }),
      }),
    }),
    update: () => ({
      set: (val) => ({
        where: () => ({
          run: async () => {
            if (dbRows[100]) {
              Object.assign(dbRows[100], val);
            }
          },
        }),
      }),
    }),
  };

  const user = await getUser(100, mockDb);
  assert.equal(user.chatId, 100);
  assert.equal(user.language, 'uz');
  assert.equal(user.isProcessing, false);

  await setUserLanguage(100, 'ru', mockDb);
  assert.equal(dbRows[100].language, 'ru');

  await setUserProcessing(100, true, mockDb);
  assert.equal(Boolean(dbRows[100].isProcessing), true);
});

test('message handler handles /start by greeting user and sending keyboards', async () => {
  const messageHandler = (await import('../tgcloud/handlers/message.js')).default;
  let sentMessages = [];

  // Mock sdk api
  const { api } = await import('sdk');
  let setCommandsPayload = null;
  api.setMyCommands = async (params) => {
    setCommandsPayload = params;
    return { ok: true };
  };
  api.sendMessage = async (params) => {
    sentMessages.push(params);
    return { ok: true };
  };

  await messageHandler({
    chat: { id: 12345 },
    text: '/start',
  });

  assert.equal(sentMessages.length, 1, 'Should send single combined welcome message with inline buttons');
  assert.equal(sentMessages[0].chat_id, 12345);
  assert.ok(sentMessages[0].text.includes('Assalomu alaykum'));
  assert.ok(sentMessages[0].reply_markup.inline_keyboard, 'Should contain inline keyboard');

  assert.ok(setCommandsPayload?.commands, 'Should register bot commands');
  const commandNames = setCommandsPayload.commands.map((c) => c.command);
  assert.deepEqual(commandNames, ['start', 'language', 'help']);
});

test('message handler rejects media if service is not selected first', async () => {
  const messageHandler = (await import('../tgcloud/handlers/message.js')).default;
  const { setUserState } = await import('../tgcloud/lib/services/user.js');
  const { t } = await import('../tgcloud/lib/i18n/index.js');
  const { KEYS } = await import('../tgcloud/lib/constants/keys.js');

  await setUserState(12345, 'idle');

  let sentMessages = [];
  const { api } = await import('sdk');
  api.sendMessage = async (params) => {
    sentMessages.push(params);
    return { ok: true };
  };

  await messageHandler({
    chat: { id: 12345 },
    video: {
      file_id: 'vid_unselected',
      file_size: 1000000,
      file_name: 'test.mp4',
    },
  });

  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0].text, t(KEYS.MSG_PLEASE_SELECT_SERVICE, 'uz'));
  assert.ok(sentMessages[0].reply_markup.keyboard, 'Should show main reply keyboard');
});

test('message handler rejects file exceeding 19.5 MB limit immediately when in STT state', async () => {
  const messageHandler = (await import('../tgcloud/handlers/message.js')).default;
  const { setUserState } = await import('../tgcloud/lib/services/user.js');

  await setUserState(12345, 'stt');

  let sentMessages = [];
  const { api } = await import('sdk');
  api.sendMessage = async (params) => {
    sentMessages.push(params);
    return { ok: true };
  };

  await messageHandler({
    chat: { id: 12345 },
    video: {
      file_id: 'huge_vid',
      file_size: 21 * 1024 * 1024, // 21 MB
      file_name: 'huge.mp4',
    },
  });

  assert.equal(sentMessages.length, 1);
  assert.ok(sentMessages[0].text.includes('19.5 MB'), 'Should return file too large message');
});

test('callback_query handler switches language to ru and sends confirmation', async () => {
  const callbackHandler = (await import('../tgcloud/handlers/callback_query.js')).default;
  let sentMessages = [];

  const { api } = await import('sdk');
  api.sendMessage = async (params) => {
    sentMessages.push(params);
    return { ok: true };
  };
  api.answerCallbackQuery = async () => ({ ok: true });

  await callbackHandler({
    id: 'query_1',
    from: { id: 99999 },
    message: { chat: { id: 99999 } },
    data: 'set_lang:ru',
  });

  assert.equal(sentMessages.length, 1);
  assert.ok(sentMessages[0].text.includes('Русский'));
});

test('message handler sends general HELP_TEXT for /help and STT_GUIDE_TEXT for guide button', async () => {
  const messageHandler = (await import('../tgcloud/handlers/message.js')).default;
  const { t } = await import('../tgcloud/lib/i18n/index.js');
  const { KEYS } = await import('../tgcloud/lib/constants/keys.js');

  let sentMessages = [];
  const { api } = await import('sdk');
  api.sendMessage = async (params) => {
    sentMessages.push(params);
    return { ok: true };
  };

  // 1. /help command
  sentMessages = [];
  await messageHandler({
    chat: { id: 12345 },
    text: '/help',
  });
  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0].text, t(KEYS.HELP_TEXT, 'uz'));
  assert.equal(sentMessages[0].parse_mode, 'HTML');

  // 2. Guide button click (Uzbek: "🎙 Ovozdan matnga")
  sentMessages = [];
  await messageHandler({
    chat: { id: 12345 },
    text: '🎙 Ovozdan matnga',
  });
  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0].text, t(KEYS.STT_GUIDE_TEXT, 'uz'));
  assert.equal(sentMessages[0].parse_mode, 'HTML');
  assert.notEqual(sentMessages[0].text, t(KEYS.HELP_TEXT, 'uz'));
});

test('message handler edits progress message in-place upon transcription completion', async () => {
  const messageHandler = (await import('../tgcloud/handlers/message.js')).default;
  const { setUserState } = await import('../tgcloud/lib/services/user.js');
  const { t } = await import('../tgcloud/lib/i18n/index.js');
  const { KEYS } = await import('../tgcloud/lib/constants/keys.js');
  const { api } = await import('sdk');

  await setUserState(12345, 'stt');

  let sentMessages = [];
  let editedMessages = [];

  api.sendMessage = async (params) => {
    sentMessages.push(params);
    return { ok: true, message_id: 888 };
  };

  api.editMessageText = async (params) => {
    editedMessages.push(params);
    return { ok: true };
  };

  // Mock globalThis.fetch to simulate Groq API response
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      text: 'Salom dunyo',
      segments: [{ start: 0, end: 2, text: 'Salom dunyo' }],
    }),
  });

  try {
    await messageHandler({
      chat: { id: 12345 },
      voice: { file_id: 'voice_file_1', file_size: 1000 },
    });

    // 1. Sent progress message
    assert.equal(sentMessages.length, 1);
    assert.equal(sentMessages[0].text, t(KEYS.MSG_PROCESSING, 'uz'));

    // 2. Edited progress message in-place
    assert.equal(editedMessages.length, 1);
    assert.equal(editedMessages[0].chat_id, 12345);
    assert.equal(editedMessages[0].message_id, 888);
    assert.ok(editedMessages[0].text.includes('Salom dunyo'));
    assert.ok(editedMessages[0].text.includes(t(KEYS.MSG_COMPLETED, 'uz')));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('cancel button resets user state to idle and sends cancellation confirmation', async () => {
  const messageHandler = (await import('../tgcloud/handlers/message.js')).default;
  const { setUserState, getUser } = await import('../tgcloud/lib/services/user.js');
  const { t } = await import('../tgcloud/lib/i18n/index.js');
  const { KEYS } = await import('../tgcloud/lib/constants/keys.js');

  await setUserState(12345, 'stt');

  let sentMessages = [];
  const { api } = await import('sdk');
  api.sendMessage = async (params) => {
    sentMessages.push(params);
    return { ok: true };
  };

  await messageHandler({
    chat: { id: 12345 },
    text: '❌ Bekor qilish',
  });

  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0].text, t(KEYS.MSG_ACTION_CANCELLED, 'uz'));
  assert.ok(sentMessages[0].reply_markup.keyboard, 'Should show main reply keyboard');

  const user = await getUser(12345);
  assert.equal(user.state, 'idle');
});

