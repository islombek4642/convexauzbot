import assert from 'node:assert/strict';
import test from 'node:test';
import { uploadTempFile, extractAudioWithRendi } from '../tgcloud/lib/services/rendi.js';

test('uploadTempFile uploads file to temporary host and returns public url', async () => {
  const mockFetch = async (url, options) => {
    assert.equal(url, 'https://uguu.se/upload');
    assert.equal(options.method, 'POST');
    assert(options.body);

    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        files: [
          {
            url: 'https://n.uguu.se/test12345.mp4',
            filename: 'test.mp4',
            size: 100,
          },
        ],
      }),
    };
  };

  const fileBytes = new Uint8Array([1, 2, 3, 4]);
  const url = await uploadTempFile(fileBytes, 'test.mp4', 'video/mp4', mockFetch);
  assert.equal(url, 'https://n.uguu.se/test12345.mp4');
});

test('uploadTempFile throws on non-200 response', async () => {
  const mockFetch = async () => ({
    ok: false,
    status: 500,
    text: async () => 'Internal Server Error',
  });

  const fileBytes = new Uint8Array([1, 2, 3]);
  await assert.rejects(
    () => uploadTempFile(fileBytes, 'test.mp4', 'video/mp4', mockFetch),
    /Failed to upload temporary file/
  );
});

test('extractAudioWithRendi throws if apiKey is missing', async () => {
  await assert.rejects(
    () =>
      extractAudioWithRendi({
        fileBytes: new Uint8Array([1]),
        apiKey: '',
      }),
    /RENDI_API_KEY is missing/
  );
});

test('extractAudioWithRendi completes full conversion pipeline', async () => {
  const calls = [];
  const mockFetch = async (url, options = {}) => {
    calls.push({ url, options });

    // 1. Temporary upload
    if (url === 'https://uguu.se/upload') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          files: [{ url: 'https://n.uguu.se/clip.mp4' }],
        }),
      };
    }

    // 2. Submit command to Rendi
    if (url === 'https://api.rendi.dev/v1/run-ffmpeg-command') {
      assert.equal(options.headers['X-API-KEY'], 'mock-key');
      const body = JSON.parse(options.body);
      assert.equal(body.input_files.in_1, 'https://n.uguu.se/clip.mp4');
      assert.equal(body.output_files.out_1, 'audio.mp3');
      assert(body.ffmpeg_command.includes('-c:a libmp3lame'));
      return {
        ok: true,
        status: 200,
        json: async () => ({ command_id: 'cmd-999' }),
      };
    }

    // 3. Poll command status
    if (url === 'https://api.rendi.dev/v1/commands/cmd-999') {
      assert.equal(options.headers['X-API-KEY'], 'mock-key');
      return {
        ok: true,
        status: 200,
        json: async () => ({
          status: 'SUCCESS',
          output_files: {
            out_1: {
              storage_url: 'https://storage.rendi.dev/output/audio.mp3',
              duration: 42.5,
            },
          },
        }),
      };
    }

    // 4. Download output audio
    if (url === 'https://storage.rendi.dev/output/audio.mp3') {
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () => new Uint8Array([10, 20, 30]).buffer,
      };
    }

    throw new Error('Unexpected URL: ' + url);
  };

  const result = await extractAudioWithRendi({
    fileBytes: new Uint8Array([1, 2, 3]),
    fileName: 'vacation.mp4',
    mimeType: 'video/mp4',
    apiKey: 'mock-key',
    customFetch: mockFetch,
    pollIntervalMs: 10,
  });

  assert.equal(result.fileName, 'vacation.mp3');
  assert.equal(result.duration, 42.5);
  assert.equal(result.storageUrl, 'https://storage.rendi.dev/output/audio.mp3');
  assert.deepEqual(result.audioBytes, new Uint8Array([10, 20, 30]));
  assert.equal(calls.length, 4);
});

test('extractAudioWithRendi throws when Rendi status is FAILED', async () => {
  const mockFetch = async (url) => {
    if (url === 'https://uguu.se/upload') {
      return {
        ok: true,
        json: async () => ({ files: [{ url: 'https://n.uguu.se/clip.mp4' }] }),
      };
    }
    if (url === 'https://api.rendi.dev/v1/run-ffmpeg-command') {
      return {
        ok: true,
        json: async () => ({ command_id: 'cmd-fail' }),
      };
    }
    if (url === 'https://api.rendi.dev/v1/commands/cmd-fail') {
      return {
        ok: true,
        json: async () => ({
          status: 'FAILED',
          detail: 'Corrupt video file',
        }),
      };
    }
    throw new Error('Unexpected URL');
  };

  await assert.rejects(
    () =>
      extractAudioWithRendi({
        fileBytes: new Uint8Array([1]),
        apiKey: 'key',
        customFetch: mockFetch,
        pollIntervalMs: 10,
      }),
    /Rendi command failed: Corrupt video file/
  );
});
