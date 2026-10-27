import { GROQ_API_KEY as SECRET_KEY, RENDI_API_KEY as SECRET_RENDI_KEY } from './secrets.js';

// Maximum file size is strictly 19.5 MB to avoid Telegram 20 MB ceiling
export const MAX_FILE_SIZE_BYTES = 19.5 * 1024 * 1024; // 20447232 bytes

export const DEFAULT_LANGUAGE = 'uz';

// Reads from git-ignored secrets.js (or fallback to process.env if in testing)
export const GROQ_API_KEY =
  SECRET_KEY ||
  (typeof process !== 'undefined' && process?.env?.GROQ_API_KEY) ||
  '';

export const RENDI_API_KEY =
  SECRET_RENDI_KEY ||
  (typeof process !== 'undefined' && process?.env?.RENDI_API_KEY) ||
  '';
