import assert from 'node:assert/strict';
import test from 'node:test';

test('schema exports users table with required columns and types', async () => {
  const schema = await import('../tgcloud/schema.js');
  assert.ok(schema.users, 'users table must be exported');
  assert.equal(schema.users.name, 'users');
  assert.ok(schema.users.columns.chatId, 'chatId column must exist');
  assert.ok(schema.users.columns.language, 'language column must exist');
  assert.ok(schema.users.columns.isProcessing, 'isProcessing column must exist');
  assert.ok(schema.users.columns.updatedAt, 'updatedAt column must exist');
});
