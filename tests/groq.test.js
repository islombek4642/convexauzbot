import assert from 'node:assert/strict';
import test from 'node:test';
import { transcribeMedia, GROQ_WHISPER_MODEL } from '../tgcloud/lib/services/groq.js';

test('transcribeMedia throws if apiKey is missing', async () => {
  await assert.rejects(
    async () => {
      await transcribeMedia({
        fileBlob: new Blob(['dummy audio']),
        fileName: 'audio.mp3',
        apiKey: '',
      });
    },
    /GROQ_API_KEY is required/
  );
});

test('transcribeMedia sends correct model and payload to Groq Whisper endpoint', async () => {
  let interceptedUrl = '';
  let interceptedHeaders = {};
  let interceptedBody = null;

  const mockFetch = async (url, options) => {
    interceptedUrl = url;
    interceptedHeaders = options.headers;
    interceptedBody = options.body;

    return {
      ok: true,
      status: 200,
      json: async () => ({
        text: 'Bu test transkripsiyasi.',
        segments: [
          { start: 0.0, end: 2.5, text: 'Bu test transkripsiyasi.' },
        ],
      }),
    };
  };

  const res = await transcribeMedia({
    fileBlob: new Blob(['fake audio buffer'], { type: 'audio/mp3' }),
    fileName: 'sample.mp3',
    apiKey: 'gsk_test_123456789',
    customFetch: mockFetch,
  });

  assert.equal(interceptedUrl, 'https://api.groq.com/openai/v1/audio/transcriptions');
  assert.equal(interceptedHeaders.Authorization, 'Bearer gsk_test_123456789');
  assert.ok(interceptedBody instanceof FormData, 'Body must be FormData instance');
  assert.equal(interceptedBody.get('model'), GROQ_WHISPER_MODEL);
  assert.equal(interceptedBody.get('response_format'), 'verbose_json');

  assert.equal(res.text, 'Bu test transkripsiyasi.');
  assert.equal(res.segments.length, 1);
  assert.equal(res.segments[0].text, 'Bu test transkripsiyasi.');
});

test('transcribeMedia throws on Groq API non-200 failure', async () => {
  const mockFetch = async () => ({
    ok: false,
    status: 400,
    text: async () => JSON.stringify({ error: { message: 'Audio format not supported' } }),
  });

  await assert.rejects(
    async () => {
      await transcribeMedia({
        fileBlob: new Blob(['fake audio']),
        fileName: 'sample.unknown',
        apiKey: 'gsk_test',
        customFetch: mockFetch,
      });
    },
    /Groq API error/
  );
});
