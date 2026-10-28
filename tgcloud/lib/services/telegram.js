import { api } from 'sdk';
import { t } from '../i18n/index.js';
import { KEYS } from '../constants/keys.js';
import { getSttPage } from '../constants/stt_languages.js';

const SUPPORTED_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'avi', 'mkv', 'mp3', 'm4a', 'wav', 'ogg', 'flac', 'oga']);

export function extractMediaInfo(message) {
  if (!message || typeof message !== 'object') {
    return null;
  }

  // 1. Video
  if (message.video) {
    return {
      fileId: message.video.file_id,
      fileName: message.video.file_name || 'video.mp4',
      fileSize: message.video.file_size || 0,
      mimeType: message.video.mime_type || 'video/mp4',
    };
  }

  // 2. Audio
  if (message.audio) {
    return {
      fileId: message.audio.file_id,
      fileName: message.audio.file_name || 'audio.mp3',
      fileSize: message.audio.file_size || 0,
      mimeType: message.audio.mime_type || 'audio/mp3',
    };
  }

  // 3. Voice message
  if (message.voice) {
    return {
      fileId: message.voice.file_id,
      fileName: 'voice.ogg',
      fileSize: message.voice.file_size || 0,
      mimeType: message.voice.mime_type || 'audio/ogg',
    };
  }

  // 4. Document (audio or video file sent as uncompressed document)
  if (message.document) {
    const mime = (message.document.mime_type || '').toLowerCase();
    const name = (message.document.file_name || '').toLowerCase();
    const ext = name.split('.').pop();

    const isAudioOrVideoMime = mime.startsWith('audio/') || mime.startsWith('video/');
    const isSupportedExt = SUPPORTED_EXTENSIONS.has(ext);

    if (isAudioOrVideoMime || isSupportedExt) {
      return {
        fileId: message.document.file_id,
        fileName: message.document.file_name || 'media.mp4',
        fileSize: message.document.file_size || 0,
        mimeType: message.document.mime_type || 'application/octet-stream',
      };
    }
  }

  return null;
}

export function buildMainReplyKeyboard(lang) {
  return {
    keyboard: [
      [
        { text: t(KEYS.BTN_GUIDE, lang) },
        { text: t(KEYS.BTN_V2A, lang) },
      ],
    ],
    resize_keyboard: true,
    persistent: true,
  };
}

export function buildCancelReplyKeyboard(lang) {
  return {
    keyboard: [
      [
        { text: t(KEYS.BTN_CANCEL, lang) },
      ],
    ],
    resize_keyboard: true,
    persistent: true,
  };
}

export function buildReplyKeyboard(lang) {
  return buildMainReplyKeyboard(lang);
}

export function buildLanguageInlineKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '🇺🇿 O\'zbekcha', callback_data: 'set_lang:uz' },
        { text: '🇷🇺 Русский', callback_data: 'set_lang:ru' },
        { text: '🇬🇧 English', callback_data: 'set_lang:en' },
      ],
    ],
  };
}

export function buildVideoActionKeyboard(lang) {
  return {
    inline_keyboard: [
      [
        { text: t(KEYS.BTN_ACTION_STT, lang), callback_data: 'action_stt' },
        { text: t(KEYS.BTN_ACTION_V2A, lang), callback_data: 'action_v2a' },
      ],
    ],
  };
}

export function buildSttLanguagesKeyboard(pageNumber = 1, lang = 'uz') {
  const { page, totalPages, items } = getSttPage(pageNumber);

  // Group languages into rows of 2
  const languageRows = [];
  for (let i = 0; i < items.length; i += 2) {
    const row = [
      {
        text: `${items[i].flag} ${items[i].name}`,
        callback_data: `stt_lang:${items[i].code}`,
      },
    ];
    if (i + 1 < items.length) {
      row.push({
        text: `${items[i + 1].flag} ${items[i + 1].name}`,
        callback_data: `stt_lang:${items[i + 1].code}`,
      });
    }
    languageRows.push(row);
  }

  // Navigation row: [ Prev ] [ Page/Total ] [ Next ]
  const navRow = [];
  if (page > 1) {
    navRow.push({
      text: t(KEYS.BTN_PAGINATION_PREV, lang),
      callback_data: `stt_page:${page - 1}`,
    });
  }

  navRow.push({
    text: `📄 ${page}/${totalPages}`,
    callback_data: `stt_page:${page}`,
  });

  if (page < totalPages) {
    navRow.push({
      text: t(KEYS.BTN_PAGINATION_NEXT, lang),
      callback_data: `stt_page:${page + 1}`,
    });
  }

  return {
    inline_keyboard: [...languageRows, navRow],
  };
}

export async function downloadTelegramFile(fileId, customApi) {
  const tgApi = customApi || api;
  return await tgApi.getFileContent(fileId);
}
