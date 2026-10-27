import { api } from 'sdk';
import { getUser, setUserProcessing } from '../lib/services/user.js';
import { t } from '../lib/i18n/index.js';
import { KEYS } from '../lib/constants/keys.js';
import { COMMANDS } from '../lib/constants/commands.js';
import { MAX_FILE_SIZE_BYTES, GROQ_API_KEY, BOT_TOKEN } from '../lib/constants/config.js';
import {
  extractMediaInfo,
  buildReplyKeyboard,
  buildLanguageInlineKeyboard,
  downloadTelegramFile,
} from '../lib/services/telegram.js';
import { chunkText } from '../lib/utils/chunker.js';
import { formatSegmentsToTxt } from '../lib/utils/formatter.js';
import { transcribeMedia } from '../lib/services/groq.js';

export default async function (message) {
  if (!message || !message.chat) return;

  const chatId = message.chat.id;
  const user = await getUser(chatId);
  const lang = user.language;
  const text = (message.text || '').trim();

  // 1. /start command
  if (text === `/${COMMANDS.START}` || text.startsWith(`/${COMMANDS.START} `)) {
    try {
      await api.setMyCommands({
        commands: [
          { command: COMMANDS.START, description: 'Botni ishga tushirish / Start bot' },
          { command: COMMANDS.LANGUAGE, description: 'Tilni tanlash / Select language' },
          { command: COMMANDS.HELP, description: 'Yordam va qo\'llanma / Help guide' },
        ],
      });
    } catch (cmdErr) {
      console.error('setMyCommands error:', cmdErr);
    }

    await api.sendMessage({
      chat_id: chatId,
      text: t(KEYS.WELCOME, lang),
      reply_markup: buildReplyKeyboard(lang),
    });

    await api.sendMessage({
      chat_id: chatId,
      text: t(KEYS.CHOOSE_LANGUAGE, lang),
      reply_markup: buildLanguageInlineKeyboard(),
    });
    return;
  }

  // 2. /language command or language reply button
  const isLangBtn =
    text === t(KEYS.BTN_CHANGE_LANGUAGE, 'uz') ||
    text === t(KEYS.BTN_CHANGE_LANGUAGE, 'ru') ||
    text === t(KEYS.BTN_CHANGE_LANGUAGE, 'en');

  if (text === `/${COMMANDS.LANGUAGE}` || isLangBtn) {
    await api.sendMessage({
      chat_id: chatId,
      text: t(KEYS.CHOOSE_LANGUAGE, lang),
      reply_markup: buildLanguageInlineKeyboard(),
    });
    return;
  }

  // 3. /help command or guide reply button
  const isGuideBtn =
    text === t(KEYS.BTN_GUIDE, 'uz') ||
    text === t(KEYS.BTN_GUIDE, 'ru') ||
    text === t(KEYS.BTN_GUIDE, 'en');

  if (text === `/${COMMANDS.HELP}` || isGuideBtn) {
    await api.sendMessage({
      chat_id: chatId,
      text: t(KEYS.HELP_TEXT, lang),
      reply_markup: buildReplyKeyboard(lang),
    });
    return;
  }

  // 4. Media detection (Video, Audio, Voice, Audio Document)
  const media = extractMediaInfo(message);
  if (!media) {
    // Plain unhandled text message: remind user how to use bot
    await api.sendMessage({
      chat_id: chatId,
      text: t(KEYS.HELP_TEXT, lang),
      reply_markup: buildReplyKeyboard(lang),
    });
    return;
  }

  // 5. Single-task concurrency check
  if (user.isProcessing) {
    await api.sendMessage({
      chat_id: chatId,
      text: t(KEYS.ERROR_ALREADY_PROCESSING, lang),
      reply_markup: buildReplyKeyboard(lang),
    });
    return;
  }

  // 6. File size validation (Strict 19.5 MB ceiling)
  if (media.fileSize > MAX_FILE_SIZE_BYTES) {
    await api.sendMessage({
      chat_id: chatId,
      text: t(KEYS.ERROR_FILE_TOO_LARGE, lang),
      reply_markup: buildReplyKeyboard(lang),
    });
    return;
  }

  // 7. Acquire processing lock
  await setUserProcessing(chatId, true);

  try {
    // Send progress indicator message
    await api.sendMessage({
      chat_id: chatId,
      text: t(KEYS.MSG_PROCESSING, lang),
    });

    // Get file info and download link
    const fileInfo = await api.getFile({ file_id: media.fileId });
    if (!fileInfo || !fileInfo.result || !fileInfo.result.file_path) {
      throw new Error('Telegram getFile returned invalid file path');
    }

    const fileBlob = await downloadTelegramFile(fileInfo.result.file_path, BOT_TOKEN);

    // Call Groq Whisper service
    const transcription = await transcribeMedia({
      fileBlob,
      fileName: media.fileName,
      apiKey: GROQ_API_KEY,
    });

    if (!transcription.text) {
      await api.sendMessage({
        chat_id: chatId,
        text: t(KEYS.ERROR_NO_SPEECH_DETECTED, lang),
        reply_markup: buildReplyKeyboard(lang),
      });
      return;
    }

    // Deliver transcription
    const chunks = chunkText(transcription.text, 4000);

    if (chunks.length === 1) {
      // Short text: single message
      await api.sendMessage({
        chat_id: chatId,
        text: `${t(KEYS.MSG_COMPLETED, lang)}\n\n${chunks[0]}`,
        reply_markup: buildReplyKeyboard(lang),
      });
    } else {
      // Long text: sequentially numbered chunks [1/N]
      for (const chunk of chunks) {
        await api.sendMessage({
          chat_id: chatId,
          text: chunk,
        });
      }

      // Format original segments with timestamps into .txt document
      const txtContent = formatSegmentsToTxt(transcription.segments) || transcription.text;
      const txtBlob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });

      try {
        await api.sendDocument({
          chat_id: chatId,
          document: txtBlob,
          caption: t(KEYS.MSG_ATTACHED_TXT, lang),
          reply_markup: buildReplyKeyboard(lang),
        });
      } catch (docErr) {
        console.error('Failed to send .txt document:', docErr);
      }
    }
  } catch (error) {
    console.error('Transcription processing error:', error);
    await api.sendMessage({
      chat_id: chatId,
      text: t(KEYS.ERROR_PROCESSING_FAILED, lang),
      reply_markup: buildReplyKeyboard(lang),
    });
  } finally {
    // Release processing lock
    await setUserProcessing(chatId, false);
  }
}
