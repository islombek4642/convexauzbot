import assert from 'node:assert/strict';
import test from 'node:test';
import { chunkText } from '../tgcloud/lib/utils/chunker.js';

test('short text <= 4000 chars returns single chunk without [1/1] header', () => {
  const result = chunkText('Assalomu alaykum dunyo');
  assert.deepEqual(result, ['Assalomu alaykum dunyo']);
});

test('empty or whitespace text returns single empty array or empty string', () => {
  assert.deepEqual(chunkText(''), []);
  assert.deepEqual(chunkText('   '), []);
});

test('long text > 4000 chars splits cleanly with [1/N] and [2/N] headers', () => {
  const sentence = 'Bu sun\'iy intellekt orqali transkripsiya qilingan matn qismi hisoblanadi. ';
  const text = sentence.repeat(100); // ~7500 chars
  const chunks = chunkText(text, 4000);
  assert.ok(chunks.length > 1, `Expected multiple chunks, got ${chunks.length}`);
  assert.match(chunks[0], /^\[1\/\d+\]\n/);
  assert.match(chunks[1], /^\[2\/\d+\]\n/);

  for (const c of chunks) {
    assert.ok(c.length <= 4000, `Chunk length ${c.length} exceeds 4000`);
  }
});

test('chunker splits on sentence boundaries and does not break words mid-character', () => {
  const sentence1 = 'Birinchi gap juda muhim. ';
  const sentence2 = 'Ikkinchi gap esa undan ham muhimroq. ';
  const text = (sentence1 + sentence2).repeat(150);
  const chunks = chunkText(text, 1000);

  for (const c of chunks) {
    assert.ok(c.length <= 1000);
    // Strip header
    const body = c.replace(/^\[\d+\/\d+\]\n/, '');
    // Shouldn't end with incomplete word fragment like "Birin"
    assert.match(body, /(\.|\?|!|\s)$/);
  }
});
