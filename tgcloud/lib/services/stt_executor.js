import { api as defaultApi, InputFile } from 'sdk';
import { setUserProcessing, setUserState, setPendingMedia } from './user.js';
import { t } from '../i18n/index.js';
import { KEYS } from '../constants/keys.js';
import { STATES } from '../constants/states.js';
import { GROQ_API_KEY } from '../constants/config.js';
import { downloadTelegramFile, buildMainReplyKeyboard } from './telegram.js';
import { chunkText } from '../utils/chunker.js';
import { formatSegmentsToTxt } from '../utils/formatter.js';
import { transcribeMedia } from './groq.js';

export async function executeSttTranscription({
  chatId,
  lang = 'uz',
  media,
  languageCode = 'auto',
  progressMessageId = null,
  customApi = null,
  customDb = null,
  customFetch = null,
}) {
  const api = customApi || defaultApi;
  await setUserProcessing(chatId, true, customDb);

  let progressMsgId = progressMessageId;
  try {
    if (!progressMsgId) {
      const msg = await api.sendMessage({
        chat_id: chatId,
        text: t(KEYS.MSG_PROCESSING, lang),
      });
      progressMsgId = msg?.message_id || null;
    }

    // Download file bytes directly via Telegram SDK
    const fileBytes = await downloadTelegramFile(media.fileId, api);
    if (!fileBytes) {
      throw new Error('Failed to retrieve file bytes from Telegram');
    }

    // Call Groq Whisper service with user-selected language
    const transcription = await transcribeMedia({
      fileBytes,
      fileName: media.fileName || 'audio.mp3',
      mimeType: media.mimeType || 'audio/mp3',
      apiKey: GROQ_API_KEY,
      language: languageCode,
      customFetch,
    });

    if (!transcription.text) {
      await setUserState(chatId, STATES.IDLE, customDb);
      await setPendingMedia(chatId, null, customDb);
      if (progressMsgId) {
        try {
          await api.deleteMessage({
            chat_id: chatId,
            message_id: progressMsgId,
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

    // Reset state and clear pending media
    await setUserState(chatId, STATES.IDLE, customDb);
    await setPendingMedia(chatId, null, customDb);

    const chunks = chunkText(transcription.text, 4000);

    if (chunks.length === 1) {
      if (progressMsgId) {
        try {
          await api.deleteMessage({
            chat_id: chatId,
            message_id: progressMsgId,
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
      if (progressMsgId) {
        try {
          await api.deleteMessage({
            chat_id: chatId,
            message_id: progressMsgId,
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
    await setUserState(chatId, STATES.IDLE, customDb);
    await setPendingMedia(chatId, null, customDb);
    if (progressMsgId) {
      try {
        await api.deleteMessage({
          chat_id: chatId,
          message_id: progressMsgId,
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
    await setUserProcessing(chatId, false, customDb);
  }
}
