import { db as defaultDb } from 'sdk';
import { eq } from 'sdk/db';
import { users } from '../../schema.js';
import { DEFAULT_LANGUAGE } from '../constants/config.js';
import { STATES } from '../constants/states.js';

export async function getUser(chatId, customDb) {
  const database = customDb || defaultDb;
  const existing = await database
    .select()
    .from(users)
    .where(eq(users.chatId, chatId))
    .get();

  if (existing) {
    let pendingMedia = null;
    if (existing.pendingMedia) {
      try {
        pendingMedia = typeof existing.pendingMedia === 'string'
          ? JSON.parse(existing.pendingMedia)
          : existing.pendingMedia;
      } catch {
        pendingMedia = null;
      }
    }

    return {
      chatId: existing.chatId,
      language: existing.language || DEFAULT_LANGUAGE,
      isProcessing: Boolean(existing.isProcessing),
      state: existing.state || STATES.IDLE,
      pendingMedia,
    };
  }

  // Insert new user
  const [created] = await database
    .insert(users)
    .values({
      chatId,
      language: DEFAULT_LANGUAGE,
      isProcessing: false,
      state: STATES.IDLE,
    })
    .onConflictDoUpdate({
      target: users.chatId,
      set: { language: DEFAULT_LANGUAGE },
    })
    .returning()
    .run();

  return {
    chatId,
    language: created?.language || DEFAULT_LANGUAGE,
    isProcessing: Boolean(created?.isProcessing),
    state: created?.state || STATES.IDLE,
    pendingMedia: null,
  };
}

export async function setUserLanguage(chatId, language, customDb) {
  const database = customDb || defaultDb;
  await database
    .update(users)
    .set({ language })
    .where(eq(users.chatId, chatId))
    .run();
}

export async function setUserProcessing(chatId, isProcessing, customDb) {
  const database = customDb || defaultDb;
  await database
    .update(users)
    .set({ isProcessing: isProcessing ? 1 : 0 })
    .where(eq(users.chatId, chatId))
    .run();
}

export async function setUserState(chatId, state, customDb) {
  const database = customDb || defaultDb;
  await database
    .update(users)
    .set({ state })
    .where(eq(users.chatId, chatId))
    .run();
}

export async function setPendingMedia(chatId, mediaData, customDb) {
  const database = customDb || defaultDb;
  const serialized = mediaData ? JSON.stringify(mediaData) : null;
  await database
    .update(users)
    .set({ pendingMedia: serialized })
    .where(eq(users.chatId, chatId))
    .run();
}

