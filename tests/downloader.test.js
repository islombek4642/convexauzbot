import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractUrl, resolveVideoUrl } from '../tgcloud/lib/services/downloader.js';

test('extractUrl detects valid HTTP/HTTPS URLs from message text', () => {
  assert.equal(
    extractUrl('Check this: https://www.tiktok.com/@user/video/12345 ok'),
    'https://www.tiktok.com/@user/video/12345'
  );
  assert.equal(extractUrl('salom dunyo bu oddiy xabar'), null);
  assert.equal(extractUrl('https://example.com/video.mp4'), 'https://example.com/video.mp4');
});

test('resolveVideoUrl handles direct MP4 URLs', async () => {
  const res = await resolveVideoUrl('https://example.com/sample.mp4');
  assert.equal(res.downloadUrl, 'https://example.com/sample.mp4');
  assert.equal(res.fileName, 'video.mp4');
});

test('resolveVideoUrl resolves video via Cobalt API', async () => {
  const mockFetch = async (url) => {
    if (url.includes('cobalt')) {
      return {
        ok: true,
        json: async () => ({
          status: 'tunnel',
          url: 'https://cobalt-cdn.example.com/stream.mp4',
          filename: 'cobalt_video.mp4',
        }),
      };
    }
    throw new Error('Unexpected URL');
  };

  const res = await resolveVideoUrl('https://youtube.com/watch?v=12345', mockFetch);
  assert.equal(res.downloadUrl, 'https://cobalt-cdn.example.com/stream.mp4');
  assert.equal(res.fileName, 'cobalt_video.mp4');
});

test('resolveVideoUrl falls back to TikWM for TikTok when Cobalt fails', async () => {
  const mockFetch = async (url) => {
    if (url.includes('cobalt')) {
      return {
        ok: false,
        status: 500,
      };
    }
    if (url.includes('tikwm')) {
      return {
        ok: true,
        json: async () => ({
          code: 0,
          data: {
            play: 'https://v16m.tiktokcdn.com/test.mp4',
            title: 'TikTok sample video',
          },
        }),
      };
    }
    throw new Error('Unexpected URL');
  };

  const res = await resolveVideoUrl('https://www.tiktok.com/@user/video/12345', mockFetch);
  assert.equal(res.downloadUrl, 'https://v16m.tiktokcdn.com/test.mp4');
  assert.equal(res.title, 'TikTok sample video');
});

test('resolveVideoUrl throws if fallback service fails', async () => {
  const mockFetch = async (url) => {
    if (url.includes('cobalt')) {
      return { ok: false, status: 500 };
    }
    if (url.includes('tikwm')) {
      return {
        ok: true,
        json: async () => ({
          code: -1,
          msg: 'Video not found',
        }),
      };
    }
    throw new Error('Unexpected URL');
  };

  await assert.rejects(
    async () => {
      await resolveVideoUrl('https://www.tiktok.com/@user/video/99999', mockFetch);
    },
    { message: /Video not found/ }
  );
});
