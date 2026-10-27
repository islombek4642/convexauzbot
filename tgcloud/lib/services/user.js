import { db as defaultDb } from 'sdk';
import { eq } from 'sdk/db';
import { users } from '../../schema.js';
import { DEFAULT_LANGUAGE } from '../constants/config.js';

export async function getUser(chatId, customDb) {
  const database = customDb || defaultDb;
  const existing = await database
    .select()
    .from(users)
    .where(eq(users.chatId, chatId))
    .get();

  if (existing) {
    return {
      chatId: existing.chatId,
      language: existing.language || DEFAULT_LANGUAGE,
      isProcessing: Boolean(existing.isProcessing),
    };
  }

  // Insert new user
  const [created] = await database
    .insert(users)
    .values({
      chatId,
      language: DEFAULT_LANGUAGE,
      isProcessing: false,
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
