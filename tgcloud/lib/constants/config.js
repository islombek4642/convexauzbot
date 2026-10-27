// Maximum file size is strictly 19.5 MB to avoid Telegram 20 MB ceiling
export const MAX_FILE_SIZE_BYTES = 19.5 * 1024 * 1024; // 20447232 bytes

export const DEFAULT_LANGUAGE = 'uz';

// Safe environment variable retrieval in both Node and Telegram V8 sandbox
export const GROQ_API_KEY = (typeof process !== 'undefined' && process?.env?.GROQ_API_KEY) || '';
