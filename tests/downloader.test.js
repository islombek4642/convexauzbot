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

test('resolveVideoUrl resolves TikTok URLs via TikWM API', async () => {
  const mockFetch = async () => {
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
  };

  const res = await resolveVideoUrl('https://www.tiktok.com/@user/video/12345', mockFetch);
  assert.equal(res.downloadUrl, 'https://v16m.tiktokcdn.com/test.mp4');
  assert.equal(res.title, 'TikTok sample video');
});

test('resolveVideoUrl throws if service fails', async () => {
  const mockFetch = async () => {
    return {
      ok: true,
      json: async () => ({
        code: -1,
        msg: 'Video not found',
      }),
    };
  };

  await assert.rejects(
    async () => {
      await resolveVideoUrl('https://www.tiktok.com/@user/video/99999', mockFetch);
    },
    { message: /Video not found/ }
  );
});
