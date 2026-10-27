// Maximum file size is strictly 19.5 MB to avoid Telegram 20 MB ceiling
export const MAX_FILE_SIZE_BYTES = 19.5 * 1024 * 1024; // 20447232 bytes

export const DEFAULT_LANGUAGE = 'uz';

export const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
export const BOT_TOKEN = process.env.BOT_TOKEN || '';
