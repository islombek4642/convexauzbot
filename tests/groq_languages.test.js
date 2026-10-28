import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STT_LANGUAGES, POPULAR_STT_LANGUAGES, getSttPage } from '../tgcloud/lib/constants/stt_languages.js';
import { transcribeMedia } from '../tgcloud/lib/services/groq.js';

test('STT_LANGUAGES contains Whisper languages and getSttPage partitions correctly', () => {
  assert.ok(STT_LANGUAGES.length >= 95, 'Must contain at least 95 Whisper languages');
  
  // Page 1 should contain auto-detect + top 7 popular languages (total 8)
  const page1 = getSttPage(1);
  assert.equal(page1.items.length, 8);
  assert.equal(page1.items[0].code, 'auto');
  assert.equal(page1.items[1].code, 'uz');
  assert.equal(page1.page, 1);
  assert.equal(page1.totalPages, 13);

  // Page 2 should have 8 languages
  const page2 = getSttPage(2);
  assert.equal(page2.items.length, 8);
  assert.notEqual(page2.items[0].code, 'auto');

  // Page 13 (last page)
  const page13 = getSttPage(13);
  assert.ok(page13.items.length > 0 && page13.items.length <= 8);
  assert.equal(page13.page, 13);
});

test('transcribeMedia appends language and prompt to FormData when provided', async () => {
  let capturedBody = null;
  const mockFetch = async (url, options) => {
    capturedBody = options.body;
    return {
      ok: true,
      json: async () => ({ text: 'Salom dunyo', segments: [], language: 'uz' }),
    };
  };

  const dummyBytes = new Uint8Array([1, 2, 3]);
  const res = await transcribeMedia({
    fileBytes: dummyBytes,
    apiKey: 'test_key',
    language: 'uz',
    prompt: "O'zbek tilidagi nutq, lotin alifbosi.",
    customFetch: mockFetch,
  });

  assert.equal(res.text, 'Salom dunyo');
  assert.ok(capturedBody.has('language'));
  assert.equal(capturedBody.get('language'), 'uz');
  assert.ok(capturedBody.has('prompt'));
  assert.equal(capturedBody.get('prompt'), "O'zbek tilidagi nutq, lotin alifbosi.");
});

test('transcribeMedia automatically supplies Uzbek Latin prompt if language is uz and prompt omitted', async () => {
  let capturedBody = null;
  const mockFetch = async (url, options) => {
    capturedBody = options.body;
    return {
      ok: true,
      json: async () => ({ text: 'Assalomu alaykum', segments: [], language: 'uz' }),
    };
  };

  const dummyBytes = new Uint8Array([1, 2, 3]);
  const res = await transcribeMedia({
    fileBytes: dummyBytes,
    apiKey: 'test_key',
    language: 'uz',
    customFetch: mockFetch,
  });

  assert.equal(res.text, 'Assalomu alaykum');
  assert.equal(capturedBody.get('language'), 'uz');
  assert.equal(capturedBody.get('prompt'), "O'zbek tilidagi nutq, lotin alifbosi.");
});
