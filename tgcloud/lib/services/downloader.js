import { fetch as defaultFetch } from 'sdk';

const URL_REGEX = /https?:\/\/[^\s]+/i;
const DIRECT_VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'avi', 'mkv']);

export const COBALT_INSTANCES = [
  'https://rue-cobalt.xenon.zone',
  'https://cobaltapi.cjs.nz',
];

/**
 * Extracts the first HTTP/HTTPS URL from a text string.
 */
export function extractUrl(text) {
  if (!text || typeof text !== 'string') return null;
  const match = text.match(URL_REGEX);
  return match ? match[0] : null;
}

/**
 * Resolves a video link (YouTube, TikTok, Twitter, Instagram, direct MP4, etc.)
 * using Cobalt API with fallback support.
 */
export async function resolveVideoUrl(url, customFetch = null) {
  if (!url || typeof url !== 'string') {
    throw new Error('Valid URL is required');
  }

  const fetchFn = customFetch || defaultFetch || globalThis.fetch;
  const cleanUrl = url.trim();

  // 1. Direct video URL check
  const cleanPath = cleanUrl.split('?')[0].split('#')[0].toLowerCase();
  const ext = cleanPath.split('.').pop();
  if (DIRECT_VIDEO_EXTENSIONS.has(ext)) {
    return {
      downloadUrl: cleanUrl,
      fileName: 'video.' + ext,
      title: 'Direct Video',
    };
  }

  // 2. Try Cobalt API instances
  for (const instance of COBALT_INSTANCES) {
    try {
      const response = await fetchFn(`${instance}/`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: cleanUrl,
          videoQuality: '720',
          downloadMode: 'auto',
        }),
      });

      if (response && response.ok) {
        const data = await response.json();
        if (data.status === 'tunnel' || data.status === 'redirect') {
          return {
            downloadUrl: data.url,
            fileName: data.filename || 'video.mp4',
            title: data.filename || 'Video',
          };
        }
        if (data.status === 'picker' && Array.isArray(data.picker) && data.picker.length > 0) {
          const item = data.picker[0];
          return {
            downloadUrl: item.url,
            fileName: 'video.mp4',
            title: 'Video',
          };
        }
      }
    } catch {
      // Continue to next instance or fallback
    }
  }

  // 3. Fallback: TikWM for TikTok
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

  // 4. Default fallback: treat as direct media stream
  return {
    downloadUrl: cleanUrl,
    fileName: 'video.mp4',
    title: 'Video',
  };
}
