import { KEYS } from '../constants/keys.js';

export const en = {
  [KEYS.WELCOME]: 'Hello! Welcome.\n\nI am a bot that transcribes video, audio, and voice messages to text (Speech-to-Text). Send me a file to get started!',
  [KEYS.CHOOSE_LANGUAGE]: 'Please choose your preferred language:',
  [KEYS.LANGUAGE_CHANGED]: 'Language successfully updated: 🇬🇧 English',
  [KEYS.HELP_TITLE]: 'ℹ️ User Guide',
  [KEYS.HELP_TEXT]: '📌 **How to use:**\n1. Send me a video (MP4, WEBM), audio (MP3, M4A, WAV, OGG), or a voice message.\n2. I will convert the speech into accurate text using Whisper AI.\n\n⚠️ **Limits:**\n- Maximum file size: **19.5 MB**\n- Only **1 file** can be processed at a time.\n- If the text is very long, it will be delivered in parts and a full timestamped .txt file will be attached.',

  [KEYS.BTN_CHANGE_LANGUAGE]: '🌐 Change Language',
  [KEYS.BTN_GUIDE]: '🎙 Transcription Guide',
  [KEYS.BTN_LANG_UZ]: '🇺🇿 O\'zbekcha',
  [KEYS.BTN_LANG_RU]: '🇷🇺 Русский',
  [KEYS.BTN_LANG_EN]: '🇬🇧 English',

  [KEYS.MSG_PROCESSING]: '⏳ File received. Transcribing speech to text, please wait...',
  [KEYS.MSG_COMPLETED]: '✅ Transcription completed successfully:',
  [KEYS.MSG_ATTACHED_TXT]: '📄 Attached below is the full transcription file with all timestamps.',
  [KEYS.CHUNK_HEADER]: '[{current}/{total}]',

  [KEYS.ERROR_ALREADY_PROCESSING]: '⚠️ Your previous file is still being processed. Please wait until it finishes before sending a new file.',
  [KEYS.ERROR_FILE_TOO_LARGE]: '❌ File is too large! Maximum allowed size is 19.5 MB.',
  [KEYS.ERROR_NO_SPEECH_DETECTED]: '⚠️ No speech was detected in the submitted audio/video.',
  [KEYS.ERROR_UNSUPPORTED_FORMAT]: '❌ Unsupported format. Please send a supported video or audio file.',
  [KEYS.ERROR_PROCESSING_FAILED]: '❌ An unexpected error occurred while processing. Please try again in a few moments.',
  [KEYS.ERROR_FETCH_FILE_FAILED]: '❌ Failed to download the file from Telegram servers.',
};
