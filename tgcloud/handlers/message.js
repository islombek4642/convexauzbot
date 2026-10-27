import { api, InputFile } from 'sdk';
import { getUser, setUserProcessing, setUserState } from '../lib/services/user.js';
import { t } from '../lib/i18n/index.js';
import { KEYS } from '../lib/constants/keys.js';
import { COMMANDS } from '../lib/constants/commands.js';
import { STATES } from '../lib/constants/states.js';
import { MAX_FILE_SIZE_BYTES, GROQ_API_KEY, RENDI_API_KEY } from '../lib/constants/config.js';
import {
  extractMediaInfo,
  buildMainReplyKeyboard,
  buildCancelReplyKeyboard,
  buildLanguageInlineKeyboard,
  downloadTelegramFile,
} from '../lib/services/telegram.js';
import { chunkText } from '../lib/utils/chunker.js';
import { formatSegmentsToTxt } from '../lib/utils/formatter.js';
import { transcribeMedia } from '../lib/services/groq.js';
import { extractAudioWithRendi } from '../lib/services/rendi.js';

export default async function (message) {
  if (!message || !message.chat) return;

  const chatId = message.chat.id;
  const user = await getUser(chatId);
  const lang = user.language;
  const text = (message.text || '').trim();

  // 1. /start command
  if (text === `/${COMMANDS.START}` || text.startsWith(`/${COMMANDS.START} `)) {
    await setUserState(chatId, STATES.IDLE);
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

    // Send welcome message with reply keyboard
    await api.sendMessage({
      chat_id: chatId,
      text: t(KEYS.WELCOME, lang),
      reply_markup: buildMainReplyKeyboard(lang),
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

  // 3. /cancel command or cancel reply button
  const isCancelBtn =
    text === `/${COMMANDS.CANCEL}` ||
    text === t(KEYS.BTN_CANCEL, 'uz') ||
    text === t(KEYS.BTN_CANCEL, 'ru') ||
    text === t(KEYS.BTN_CANCEL, 'en');

  if (isCancelBtn) {
    await setUserState(chatId, STATES.IDLE);
    await api.sendMessage({
      chat_id: chatId,
      text: t(KEYS.MSG_ACTION_CANCELLED, lang),
      reply_markup: buildMainReplyKeyboard(lang),
    });
    return;
  }

  // 4. /help command
  if (text === `/${COMMANDS.HELP}`) {
    await api.sendMessage({
      chat_id: chatId,
      text: t(KEYS.HELP_TEXT, lang),
      parse_mode: 'HTML',
      reply_markup: user.state !== STATES.IDLE ? buildCancelReplyKeyboard(lang) : buildMainReplyKeyboard(lang),
    });
    return;
  }

  // 5. Speech-to-Text service button
  const isGuideBtn =
    text === t(KEYS.BTN_GUIDE, 'uz') ||
    text === t(KEYS.BTN_GUIDE, 'ru') ||
    text === t(KEYS.BTN_GUIDE, 'en');

  if (isGuideBtn) {
    await setUserState(chatId, STATES.STT);
    await api.sendMessage({
      chat_id: chatId,
      text: t(KEYS.STT_GUIDE_TEXT, lang),
      parse_mode: 'HTML',
      reply_markup: buildCancelReplyKeyboard(lang),
    });
    return;
  }

  // 6. Video-to-Audio (MP3) service button
  const isV2ABtn =
    text === t(KEYS.BTN_V2A, 'uz') ||
    text === t(KEYS.BTN_V2A, 'ru') ||
    text === t(KEYS.BTN_V2A, 'en');

  if (isV2ABtn) {
    await setUserState(chatId, STATES.V2A);
    await api.sendMessage({
      chat_id: chatId,
      text: t(KEYS.V2A_GUIDE_TEXT, lang),
      parse_mode: 'HTML',
      reply_markup: buildCancelReplyKeyboard(lang),
    });
    return;
  }

  // 7. Media extraction (Video, Audio, Voice, Audio Document)
  const media = extractMediaInfo(message);
  if (!media) {
    // If in STT state, guide user to send media or cancel
    if (user.state === STATES.STT) {
      await api.sendMessage({
        chat_id: chatId,
        text: t(KEYS.MSG_STT_PROMPT, lang),
        reply_markup: buildCancelReplyKeyboard(lang),
      });
      return;
    }

    // If in V2A state, guide user to send video or cancel
    if (user.state === STATES.V2A) {
      await api.sendMessage({
        chat_id: chatId,
        text: t(KEYS.MSG_V2A_PROMPT, lang),
        reply_markup: buildCancelReplyKeyboard(lang),
      });
      return;
    }

    // Idle plain text message: remind user to choose a service from the menu
    await api.sendMessage({
      chat_id: chatId,
      text: t(KEYS.HELP_TEXT, lang),
      parse_mode: 'HTML',
      reply_markup: buildMainReplyKeyboard(lang),
    });
    return;
  }

  // 8. Require user to activate service first
  if (user.state !== STATES.STT && user.state !== STATES.V2A) {
    await api.sendMessage({
      chat_id: chatId,
      text: t(KEYS.MSG_PLEASE_SELECT_SERVICE, lang),
      reply_markup: buildMainReplyKeyboard(lang),
    });
    return;
  }

  // 9. Single-task concurrency check
  if (user.isProcessing) {
    await api.sendMessage({
      chat_id: chatId,
      text: t(KEYS.ERROR_ALREADY_PROCESSING, lang),
      reply_markup: buildCancelReplyKeyboard(lang),
    });
    return;
  }

  // 10. File size validation (Strict 19.5 MB ceiling)
  if (media.fileSize > MAX_FILE_SIZE_BYTES) {
    await api.sendMessage({
      chat_id: chatId,
      text: t(KEYS.ERROR_FILE_TOO_LARGE, lang),
      reply_markup: buildCancelReplyKeyboard(lang),
    });
    return;
  }

  // 11. Handle Video-to-Audio (MP3) extraction
  if (user.state === STATES.V2A) {
    const isVideo =
      media.mimeType.startsWith('video/') ||
      ['mp4', 'webm', 'mov', 'avi', 'mkv'].some((ext) =>
        media.fileName.toLowerCase().endsWith('.' + ext)
      );

    if (!isVideo) {
      await api.sendMessage({
        chat_id: chatId,
        text: t(KEYS.ERROR_NOT_A_VIDEO, lang),
        reply_markup: buildCancelReplyKeyboard(lang),
      });
      return;
    }

    await setUserProcessing(chatId, true);
    let v2aProgressMsg = null;
    try {
      v2aProgressMsg = await api.sendMessage({
        chat_id: chatId,
        text: t(KEYS.MSG_V2A_PROCESSING, lang),
      });

      const fileBytes = await downloadTelegramFile(media.fileId);
      if (!fileBytes) {
        throw new Error('Failed to retrieve file bytes from Telegram');
      }

      const result = await extractAudioWithRendi({
        fileBytes,
        fileName: media.fileName,
        mimeType: media.mimeType,
        apiKey: RENDI_API_KEY,
      });

      await setUserState(chatId, STATES.IDLE);
      if (v2aProgressMsg && v2aProgressMsg.message_id) {
        try {
          await api.deleteMessage({
            chat_id: chatId,
            message_id: v2aProgressMsg.message_id,
          });
        } catch (delErr) {
          console.error('Failed to delete progress message:', delErr);
        }
      }

      await api.sendAudio({
        chat_id: chatId,
        audio: result.storageUrl,
        caption: t(KEYS.MSG_V2A_COMPLETED, lang),
        duration: result.duration ? Math.round(result.duration) : undefined,
        reply_markup: buildMainReplyKeyboard(lang),
      });
    } catch (v2aErr) {
      console.error('V2A processing error:', v2aErr);
      await setUserState(chatId, STATES.IDLE);
      if (v2aProgressMsg && v2aProgressMsg.message_id) {
        try {
          await api.deleteMessage({
            chat_id: chatId,
            message_id: v2aProgressMsg.message_id,
          });
        } catch (delErr) {
          console.error('Failed to delete progress message on error:', delErr);
        }
      }
      await api.sendMessage({
        chat_id: chatId,
        text: t(KEYS.ERROR_V2A_FAILED, lang),
        reply_markup: buildMainReplyKeyboard(lang),
      });
    } finally {
      await setUserProcessing(chatId, false);
    }
    return;
  }

  // 12. Handle Speech-to-Text (STT)
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
      await setUserState(chatId, STATES.IDLE);
      if (progressMsg && progressMsg.message_id) {
        try {
          await api.deleteMessage({
            chat_id: chatId,
            message_id: progressMsg.message_id,
          });
        } catch (delErr) {
          console.error('Failed to delete progress message:', delErr);
        }
      }
      await api.sendMessage({
        chat_id: chatId,
        text: t(KEYS.ERROR_NO_SPEECH_DETECTED, lang),
        reply_markup: buildMainReplyKeyboard(lang),
      });
      return;
    }

    // Deliver transcription and reset to main menu
    await setUserState(chatId, STATES.IDLE);
    const chunks = chunkText(transcription.text, 4000);

    if (chunks.length === 1) {
      if (progressMsg && progressMsg.message_id) {
        try {
          await api.deleteMessage({
            chat_id: chatId,
            message_id: progressMsg.message_id,
          });
        } catch (delErr) {
          console.error('Failed to delete progress message:', delErr);
        }
      }

      await api.sendMessage({
        chat_id: chatId,
        text: `${t(KEYS.MSG_COMPLETED, lang)}\n\n${chunks[0]}`,
        reply_markup: buildMainReplyKeyboard(lang),
      });
    } else {
      if (progressMsg && progressMsg.message_id) {
        try {
          await api.deleteMessage({
            chat_id: chatId,
            message_id: progressMsg.message_id,
          });
        } catch (delErr) {
          console.error('Failed to delete progress message:', delErr);
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
          reply_markup: buildMainReplyKeyboard(lang),
        });
      } catch (docErr) {
        console.error('Failed to send .txt document:', docErr);
      }
    }
  } catch (error) {
    console.error('Transcription processing error:', error);
    await setUserState(chatId, STATES.IDLE);
    if (progressMsg && progressMsg.message_id) {
      try {
        await api.deleteMessage({
          chat_id: chatId,
          message_id: progressMsg.message_id,
        });
      } catch (delErr) {
        console.error('Failed to delete progress message on error:', delErr);
      }
    }
    await api.sendMessage({
      chat_id: chatId,
      text: t(KEYS.ERROR_PROCESSING_FAILED, lang),
      reply_markup: buildMainReplyKeyboard(lang),
    });
  } finally {
    // Release processing lock
    await setUserProcessing(chatId, false);
  }
}
