import { KEYS } from '../constants/keys.js';

export const en = {
  [KEYS.WELCOME]: 'Hello! Welcome.\n\nConvexaUzBot is your convenient assistant for processing media and various files. Choose a feature from the menu below or send a file to get started!',
  [KEYS.CHOOSE_LANGUAGE]: 'Please choose your preferred language:',
  [KEYS.LANGUAGE_CHANGED]: 'Language successfully updated: 🇬🇧 English',
  [KEYS.HELP_TITLE]: 'ℹ️ User Guide',
  [KEYS.HELP_TEXT]: 'ℹ️ <b>General Help for ConvexaUzBot:</b>\n\nThis bot is your multi-functional assistant for processing media and various files.\n\n✨ <b>Available Features:</b>\n1. <b>Speech-to-Text:</b> Convert speech from video, audio, and voice messages into accurate text.\n<i>(New exciting features are coming soon!)</i>\n\n📋 <b>Main Commands:</b>\n/start - Restart the bot\n/language - Change language\n/help - General help and information\n\n⚠️ <b>General Rule:</b>\nEach user can only process <b>1 file</b> at a time.',
  [KEYS.STT_GUIDE_TEXT]: '🎙 <b>Speech-to-Text Guide:</b>\n\n1. Send me a video (MP4, WEBM), audio (MP3, M4A, WAV, OGG, FLAC) or a voice message.\n2. Speech will quickly be converted into accurate text.\n\n⚠️ <b>Technical Limits:</b>\n- Maximum file size: <b>19.5 MB</b>\n- Short texts are delivered directly as messages.\n- Long texts are split into parts and the full text is attached as a <b>.txt</b> file.',

  [KEYS.BTN_CHANGE_LANGUAGE]: '🌐 Change Language',
  [KEYS.BTN_GUIDE]: '🎙 Speech-to-Text',
  [KEYS.BTN_LANG_UZ]: '🇺🇿 O\'zbekcha',
  [KEYS.BTN_LANG_RU]: '🇷🇺 Русский',
  [KEYS.BTN_LANG_EN]: '🇬🇧 English',

  [KEYS.MSG_PROCESSING]: '⏳ File received. Transcribing speech to text, please wait...',
  [KEYS.MSG_COMPLETED]: '✅ Transcription completed successfully:',
  [KEYS.MSG_ATTACHED_TXT]: '📄 Attached below is the full transcription file.',
  [KEYS.CHUNK_HEADER]: '[{current}/{total}]',

  [KEYS.ERROR_ALREADY_PROCESSING]: '⚠️ Your previous file is still being processed. Please wait until it finishes before sending a new file.',
  [KEYS.ERROR_FILE_TOO_LARGE]: '❌ File is too large! Maximum allowed size is 19.5 MB.',
  [KEYS.ERROR_NO_SPEECH_DETECTED]: '⚠️ No speech was detected in the submitted audio/video.',
  [KEYS.ERROR_UNSUPPORTED_FORMAT]: '❌ Unsupported format. Please send a supported video or audio file.',
  [KEYS.ERROR_PROCESSING_FAILED]: '❌ An unexpected error occurred while processing. Please try again in a few moments.',
  [KEYS.ERROR_FETCH_FILE_FAILED]: '❌ Failed to download the file from Telegram servers.',
};
