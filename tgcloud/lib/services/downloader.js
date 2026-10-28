import { fetch as defaultFetch } from 'sdk';

const URL_REGEX = /https?:\/\/[^\s]+/i;
const DIRECT_VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'avi', 'mkv']);

/**
 * Extracts the first HTTP/HTTPS URL from a text string.
 */
export function extractUrl(text) {
  if (!text || typeof text !== 'string') return null;
  const match = text.match(URL_REGEX);
  return match ? match[0] : null;
}

/**
 * Resolves a video link (TikTok, direct MP4, etc.) to a direct downloadable video URL.
 */
export async function resolveVideoUrl(url, customFetch = null) {
  if (!url || typeof url !== 'string') {
    throw new Error('Valid URL is required');
  }

  const fetchFn = customFetch || defaultFetch || globalThis.fetch;
  const cleanUrl = url.trim();

  // 1. Direct video URL check
  const pathname = new URL(cleanUrl).pathname.toLowerCase();
  const ext = pathname.split('.').pop();
  if (DIRECT_VIDEO_EXTENSIONS.has(ext)) {
    return {
      downloadUrl: cleanUrl,
      fileName: 'video.' + ext,
      title: 'Direct Video',
    };
  }

  // 2. TikTok resolution via TikWM API (free, fast, no watermark)
  if (cleanUrl.includes('tiktok.com')) {
    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(cleanUrl)}`;
    const response = await fetchFn(apiUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`TikWM API failed with status ${response.status}`);
    }

    const data = await response.json();
    if (data.code !== 0 || !data.data?.play) {
      throw new Error(data.msg || 'Failed to extract TikTok video');
    }

    return {
      downloadUrl: data.data.play,
      title: data.data.title || 'TikTok Video',
      fileName: 'tiktok_video.mp4',
    };
  }

  // 3. Fallback: treat as direct media stream
  return {
    downloadUrl: cleanUrl,
    fileName: 'video.mp4',
    title: 'Video',
  };
}
