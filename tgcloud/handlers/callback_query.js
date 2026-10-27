import { api } from 'sdk';
import { setUserLanguage } from '../lib/services/user.js';
import { t, isValidLanguage } from '../lib/i18n/index.js';
import { KEYS } from '../lib/constants/keys.js';
import { buildReplyKeyboard } from '../lib/services/telegram.js';

export default async function (callbackQuery) {
  if (!callbackQuery) return;

  const chatId = callbackQuery.message?.chat?.id || callbackQuery.from?.id;
  const data = callbackQuery.data || '';

  // Answer callback query promptly to remove loading state in Telegram client
  try {
    await api.answerCallbackQuery({
      callback_query_id: callbackQuery.id,
    });
  } catch (err) {
    console.error('Failed to answer callback query:', err);
  }

  if (data.startsWith('set_lang:') && chatId) {
    const lang = data.split(':')[1];
    if (isValidLanguage(lang)) {
      await setUserLanguage(chatId, lang);

      await api.sendMessage({
        chat_id: chatId,
        text: t(KEYS.LANGUAGE_CHANGED, lang),
        reply_markup: buildReplyKeyboard(lang),
      });
    }
  }
}
