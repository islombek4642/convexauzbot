import { api, InputFile } from 'sdk';
import { getUser, setUserProcessing } from '../lib/services/user.js';
import { t } from '../lib/i18n/index.js';
import { KEYS } from '../lib/constants/keys.js';
import { COMMANDS } from '../lib/constants/commands.js';
import { MAX_FILE_SIZE_BYTES, GROQ_API_KEY } from '../lib/constants/config.js';
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
      text: `${t(KEYS.WELCOME, lang)}\n\n${t(KEYS.CHOOSE_LANGUAGE, lang)}`,
      reply_markup: buildLanguageInlineKeyboard(),
    });
    return;
  }

  // 2. /language command
  if (text === `/${COMMANDS.LANGUAGE}`) {
    await api.sendMessage({
      chat_id: chatId,
      text: t(KEYS.CHOOSE_LANGUAGE, lang),
      reply_markup: buildLanguageInlineKeyboard(),
    });
    return;
  }

  // 3. /help command
  if (text === `/${COMMANDS.HELP}`) {
    await api.sendMessage({
      chat_id: chatId,
      text: t(KEYS.HELP_TEXT, lang),
      parse_mode: 'HTML',
      reply_markup: buildReplyKeyboard(lang),
    });
    return;
  }

  // 4. Speech-to-Text guide button
  const isGuideBtn =
    text === t(KEYS.BTN_GUIDE, 'uz') ||
    text === t(KEYS.BTN_GUIDE, 'ru') ||
    text === t(KEYS.BTN_GUIDE, 'en');

  if (isGuideBtn) {
    await api.sendMessage({
      chat_id: chatId,
      text: t(KEYS.STT_GUIDE_TEXT, lang),
      parse_mode: 'HTML',
      reply_markup: buildReplyKeyboard(lang),
    });
    return;
  }

  // 5. Media detection (Video, Audio, Voice, Audio Document)
  const media = extractMediaInfo(message);
  if (!media) {
    // Plain unhandled text message: remind user how to use bot
    await api.sendMessage({
      chat_id: chatId,
      text: t(KEYS.HELP_TEXT, lang),
      parse_mode: 'HTML',
      reply_markup: buildReplyKeyboard(lang),
    });
    return;
  }

  // 6. Single-task concurrency check
  if (user.isProcessing) {
    await api.sendMessage({
      chat_id: chatId,
      text: t(KEYS.ERROR_ALREADY_PROCESSING, lang),
      reply_markup: buildReplyKeyboard(lang),
    });
    return;
  }

  // 7. File size validation (Strict 19.5 MB ceiling)
  if (media.fileSize > MAX_FILE_SIZE_BYTES) {
    await api.sendMessage({
      chat_id: chatId,
      text: t(KEYS.ERROR_FILE_TOO_LARGE, lang),
      reply_markup: buildReplyKeyboard(lang),
    });
    return;
  }

  // 8. Acquire processing lock
  await setUserProcessing(chatId, true);

  let progressMsg = null;
  try {
    // Send progress indicator message
    progressMsg = await api.sendMessage({
      chat_id: chatId,
      text: t(KEYS.MSG_PROCESSING, lang),
    });

    // Download file bytes directly via SDK
    const fileBytes = await downloadTelegramFile(media.fileId);
    if (!fileBytes) {
      throw new Error('Failed to retrieve file bytes from Telegram');
    }

    // Call Groq Whisper service
    const transcription = await transcribeMedia({
      fileBytes,
      fileName: media.fileName,
      mimeType: media.mimeType,
      apiKey: GROQ_API_KEY,
    });

    if (!transcription.text) {
      if (progressMsg && progressMsg.message_id) {
        try {
          await api.editMessageText({
            chat_id: chatId,
            message_id: progressMsg.message_id,
            text: t(KEYS.ERROR_NO_SPEECH_DETECTED, lang),
          });
          return;
        } catch (editErr) {
          console.error('Failed to edit message for no speech:', editErr);
        }
      }
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
      // Short text: edit the progress indicator directly
      let edited = false;
      if (progressMsg && progressMsg.message_id) {
        try {
          await api.editMessageText({
            chat_id: chatId,
            message_id: progressMsg.message_id,
            text: `${t(KEYS.MSG_COMPLETED, lang)}\n\n${chunks[0]}`,
          });
          edited = true;
        } catch (editErr) {
          console.error('Failed to edit progress message:', editErr);
        }
      }

      if (!edited) {
        await api.sendMessage({
          chat_id: chatId,
          text: `${t(KEYS.MSG_COMPLETED, lang)}\n\n${chunks[0]}`,
          reply_markup: buildReplyKeyboard(lang),
        });
      }
    } else {
      // Long text: edit the progress indicator to completion header
      if (progressMsg && progressMsg.message_id) {
        try {
          await api.editMessageText({
            chat_id: chatId,
            message_id: progressMsg.message_id,
            text: t(KEYS.MSG_COMPLETED, lang),
          });
        } catch (editErr) {
          console.error('Failed to edit progress message:', editErr);
        }
      }

      // Sequentially numbered chunks [1/N]
      for (const chunk of chunks) {
        await api.sendMessage({
          chat_id: chatId,
          text: chunk,
        });
      }

      // Format original segments with timestamps into .txt document
      const txtContent = formatSegmentsToTxt(transcription.segments) || transcription.text;
      const encoder = new TextEncoder();
      const txtBytes = encoder.encode(txtContent);

      try {
        const docFile = typeof InputFile !== 'undefined'
          ? new InputFile(txtBytes, 'transcription.txt', { type: 'text/plain' })
          : new Blob([txtBytes], { type: 'text/plain' });

        await api.sendDocument({
          chat_id: chatId,
          document: docFile,
          caption: t(KEYS.MSG_ATTACHED_TXT, lang),
          reply_markup: buildReplyKeyboard(lang),
        });
      } catch (docErr) {
        console.error('Failed to send .txt document:', docErr);
      }
    }
  } catch (error) {
    console.error('Transcription processing error:', error);
    if (progressMsg && progressMsg.message_id) {
      try {
        await api.editMessageText({
          chat_id: chatId,
          message_id: progressMsg.message_id,
          text: t(KEYS.ERROR_PROCESSING_FAILED, lang),
        });
        return;
      } catch (editErr) {
        console.error('Failed to edit progress message on error:', editErr);
      }
    }
    await api.sendMessage({
      chat_id: chatId,
      text: t(KEYS.ERROR_PROCESSING_FAILED, lang),
      reply_markup: buildReplyKeyboard(lang),
    });
  }
 finally {
    // Release processing lock
    await setUserProcessing(chatId, false);
  }
}
