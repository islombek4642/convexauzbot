export function formatSeconds(totalSeconds) {
  if (typeof totalSeconds !== 'number' || isNaN(totalSeconds) || totalSeconds < 0) {
    return '00:00';
  }

  const rounded = Math.floor(totalSeconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (hours > 0) {
    const hh = String(hours).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  return `${mm}:${ss}`;
}

export function formatSegmentsToTxt(segments) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return '';
  }

  const lines = [];

  for (const seg of segments) {
    if (!seg || typeof seg !== 'object') continue;
    const startStr = formatSeconds(seg.start ?? 0);
    const endStr = formatSeconds(seg.end ?? seg.start ?? 0);
    const textStr = (seg.text || '').trim();

    if (textStr) {
      lines.push(`[${startStr} - ${endStr}] ${textStr}`);
    }
  }

  return lines.join('\n');
}
