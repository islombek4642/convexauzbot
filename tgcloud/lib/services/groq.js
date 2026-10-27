export const GROQ_WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
export const GROQ_WHISPER_MODEL = 'whisper-large-v3-turbo';

export async function transcribeMedia({
  fileBlob,
  fileName = 'audio.mp3',
  apiKey,
  customFetch,
}) {
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    throw new Error('GROQ_API_KEY is required for transcription');
  }

  if (!fileBlob) {
    throw new Error('fileBlob is required for transcription');
  }

  const fetchFn = customFetch || globalThis.fetch;
  if (typeof fetchFn !== 'function') {
    throw new Error('Fetch API is not available');
  }

  const formData = new FormData();
  formData.append('file', fileBlob, fileName);
  formData.append('model', GROQ_WHISPER_MODEL);
  formData.append('response_format', 'verbose_json');
  formData.append('temperature', '0');

  const response = await fetchFn(GROQ_WHISPER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = (data.text || '').trim();
  const segments = Array.isArray(data.segments) ? data.segments : [];

  return {
    text,
    segments,
    language: data.language || null,
    duration: data.duration || null,
  };
}
