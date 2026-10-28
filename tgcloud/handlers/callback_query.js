import { api as defaultApi } from 'sdk';
import { getUser, setUserLanguage, setUserState, setPendingMedia, setUserProcessing } from '../lib/services/user.js';
import { t, isValidLanguage } from '../lib/i18n/index.js';
import { KEYS } from '../lib/constants/keys.js';
import { STATES } from '../lib/constants/states.js';
import { buildReplyKeyboard, buildMainReplyKeyboard, buildSttLanguagesKeyboard } from '../lib/services/telegram.js';
import { executeSttTranscription } from '../lib/services/stt_executor.js';

export default async function (callbackQuery, deps = {}) {
  if (!callbackQuery) return;

  const api = deps.api || defaultApi;
  const db = deps.db || null;

  const chatId = callbackQuery.message?.chat?.id || callbackQuery.from?.id;
  const data = callbackQuery.data || '';

  // 1. Answer callback query promptly to remove loading state in Telegram client
  if (callbackQuery.id) {
    try {
      await api.answerCallbackQuery({
        callback_query_id: callbackQuery.id,
      });
    } catch (err) {
      console.error('Failed to answer callback query:', err);
    }
  }

  if (!chatId) return;

  // 2. Language setting callback (from /language menu)
  if (data.startsWith('set_lang:')) {
    const lang = data.split(':')[1];
    if (isValidLanguage(lang)) {
      await setUserLanguage(chatId, lang, db);

      await api.sendMessage({
        chat_id: chatId,
        text: t(KEYS.LANGUAGE_CHANGED, lang),
        reply_markup: buildReplyKeyboard(lang),
      });
    }
    return;
  }

  // 3. STT language pagination callback
  if (data.startsWith('stt_page:')) {
    const page = parseInt(data.split(':')[1], 10) || 1;
    const user = await getUser(chatId, db);

    if (callbackQuery.message?.message_id) {
      try {
        await api.editMessageReplyMarkup({
          chat_id: chatId,
          message_id: callbackQuery.message.message_id,
          reply_markup: buildSttLanguagesKeyboard(page, user.language),
        });
      } catch (editErr) {
        // Silently ignore 'message is not modified' if user clicks the current page number
      }
    }
    return;
  }

  // 4. STT cancel button callback
  if (data === 'stt_cancel') {
    await setUserState(chatId, STATES.IDLE, db);
    await setPendingMedia(chatId, null, db);
    await setUserProcessing(chatId, false, db);

    const user = await getUser(chatId, db);

    if (callbackQuery.message?.message_id) {
      try {
        await api.deleteMessage({
          chat_id: chatId,
          message_id: callbackQuery.message.message_id,
        });
      } catch (delErr) {
        console.error('Failed to delete prompt message on cancel:', delErr);
      }
    }

    await api.sendMessage({
      chat_id: chatId,
      text: t(KEYS.MSG_STT_CANCELLED, user.language),
      reply_markup: buildMainReplyKeyboard(user.language),
    });
    return;
  }

  // 5. STT language selection callback (execute transcription)
  if (data.startsWith('stt_lang:')) {
    const langCode = data.split(':')[1];
    const user = await getUser(chatId, db);

    if (!user.pendingMedia) {
      return;
    }

    const promptMsgId = callbackQuery.message?.message_id || null;
    if (promptMsgId) {
      try {
        await api.editMessageText({
          chat_id: chatId,
          message_id: promptMsgId,
          text: t(KEYS.MSG_PROCESSING, user.language),
        });
      } catch (err) {
        console.error('Failed to edit prompt message to processing:', err);
      }
    }

    await executeSttTranscription({
      chatId,
      lang: user.language,
      media: user.pendingMedia,
      languageCode: langCode,
      progressMessageId: promptMsgId,
      customApi: api,
      customDb: db,
      customFetch: deps.customFetch || null,
    });
  }
}
