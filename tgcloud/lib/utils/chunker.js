const DEFAULT_MAX_LEN = 4000;

export function chunkText(rawText, maxLen = DEFAULT_MAX_LEN) {
  if (!rawText || typeof rawText !== 'string') {
    return [];
  }

  const text = rawText.trim();
  if (!text) {
    return [];
  }

  // If already fits within max limit, return single chunk without headers
  if (text.length <= maxLen) {
    return [text];
  }

  // Estimate header size: "[99/99]\n" is ~8 characters. Leave safe 30 chars margin.
  const targetContentLen = Math.max(100, maxLen - 30);

  // Split text by paragraphs first, then sentences, keeping delimiters
  const segments = text.match(/[^.?!;\n]+(?:[.?!;\n]+(?:\s+|$)|$)/g) || [text];

  const contentChunks = [];
  let currentChunk = '';

  for (const segment of segments) {
    const trimmedSegment = segment.trim();
    if (!trimmedSegment) continue;

    // If segment itself is larger than targetContentLen, split by words
    if (trimmedSegment.length > targetContentLen) {
      const words = trimmedSegment.split(/\s+/);
      for (const word of words) {
        if (!word) continue;
        if (currentChunk.length + word.length + 1 > targetContentLen) {
          if (currentChunk.trim()) {
            contentChunks.push(currentChunk.trim());
          }
          currentChunk = word + ' ';
        } else {
          currentChunk += word + ' ';
        }
      }
    } else if (currentChunk.length + trimmedSegment.length + 1 > targetContentLen) {
      if (currentChunk.trim()) {
        contentChunks.push(currentChunk.trim());
      }
      currentChunk = trimmedSegment + ' ';
    } else {
      currentChunk += trimmedSegment + ' ';
    }
  }

  if (currentChunk.trim()) {
    contentChunks.push(currentChunk.trim());
  }

  const total = contentChunks.length;
  if (total <= 1) {
    return contentChunks;
  }

  return contentChunks.map((content, idx) => {
    return `[${idx + 1}/${total}]\n${content}`;
  });
}
