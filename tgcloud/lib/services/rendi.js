import { fetch as sdkFetch, FormData as SdkFormData, InputFile } from 'sdk';

/**
 * Uploads media file to a fast temporary host so Rendi cloud can access it via direct URL.
 * Uguu allows up to 100 MB with 3-hour retention and instant direct download URL.
 */
export async function uploadTempFile(fileBytes, fileName = 'video.mp4', mimeType = 'video/mp4', customFetch = null) {
  const fetchFn = customFetch || sdkFetch;
  const FormDataClass = typeof FormData !== 'undefined' ? FormData : SdkFormData;

  const form = new FormDataClass();
  const filePayload = typeof Blob !== 'undefined'
    ? new Blob([fileBytes], { type: mimeType })
    : (typeof InputFile !== 'undefined' ? new InputFile(fileBytes, fileName, { type: mimeType }) : fileBytes);

  form.append('files[]', filePayload, fileName);

  const res = await fetchFn('https://uguu.se/upload', {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Failed to upload temporary file to Uguu: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  if (!data?.files?.[0]?.url) {
    throw new Error('Invalid upload response from temporary host');
  }

  return data.files[0].url;
}

function sleep(ms) {
  if (typeof setTimeout !== 'undefined') {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  try {
    const sab = new SharedArrayBuffer(4);
    const int32 = new Int32Array(sab);
    Atomics.wait(int32, 0, 0, ms);
  } catch (e) {
    const start = Date.now();
    while (Date.now() - start < ms) {
      // Busy wait fallback if Atomics is not allowed
    }
  }
  return Promise.resolve();
}

/**
 * Extracts audio from video using Rendi FFmpeg API.
 */
export async function extractAudioWithRendi({
  fileBytes,
  fileName = 'video.mp4',
  mimeType = 'video/mp4',
  apiKey,
  customFetch = null,
  pollIntervalMs = 2000,
  maxPollAttempts = 40,
}) {
  if (!apiKey) {
    throw new Error('RENDI_API_KEY is missing');
  }

  const fetchFn = customFetch || sdkFetch;

  // 1. Upload video to get direct public URL for Rendi
  const videoUrl = await uploadTempFile(fileBytes, fileName, mimeType, fetchFn);

  // 2. Submit FFmpeg extraction command to Rendi
  const submitRes = await fetchFn('https://api.rendi.dev/v1/run-ffmpeg-command', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({
      input_files: {
        in_1: videoUrl,
      },
      output_files: {
        out_1: 'audio.mp3',
      },
      ffmpeg_command: '-i {{in_1}} -vn -c:a libmp3lame -q:a 2 {{out_1}}',
    }),
  });

  if (!submitRes.ok) {
    const errorText = await submitRes.text().catch(() => '');
    throw new Error(`Rendi submit error: ${submitRes.status} ${errorText}`);
  }

  const { command_id } = await submitRes.json();
  if (!command_id) {
    throw new Error('Rendi did not return a command_id');
  }

  // 3. Poll command status until SUCCESS
  let storageUrl = null;
  let duration = null;

  for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
    if (attempt > 0) {
      await sleep(pollIntervalMs);
    }

    const pollRes = await fetchFn(`https://api.rendi.dev/v1/commands/${command_id}`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    if (!pollRes.ok) {
      continue;
    }

    const data = await pollRes.json();

    if (data.status === 'SUCCESS') {
      const out = data.output_files?.out_1;
      storageUrl = out?.storage_url;
      duration = out?.duration;
      break;
    }

    if (data.status === 'FAILED') {
      throw new Error(`Rendi command failed: ${data.detail || data.status}`);
    }
  }

  if (!storageUrl) {
    throw new Error('Rendi processing timed out');
  }

  // 4. Download extracted MP3 bytes
  const audioRes = await fetchFn(storageUrl);
  if (!audioRes.ok) {
    throw new Error(`Failed to download audio from Rendi storage: ${audioRes.status}`);
  }

  const audioBuffer = await audioRes.arrayBuffer();
  const audioBytes = new Uint8Array(audioBuffer);

  // Generate nice output MP3 filename based on input
  const baseName = fileName.replace(/\.[^/.]+$/, '');
  const outFileName = `${baseName || 'audio'}.mp3`;

  return {
    audioBytes,
    storageUrl,
    duration,
    fileName: outFileName,
  };
}
