import assert from 'node:assert/strict';
import test from 'node:test';
import { formatSeconds, formatSegmentsToTxt } from '../tgcloud/lib/utils/formatter.js';

test('formatSeconds formats seconds to MM:SS or HH:MM:SS correctly', () => {
  assert.equal(formatSeconds(0), '00:00');
  assert.equal(formatSeconds(5), '00:05');
  assert.equal(formatSeconds(65), '01:05');
  assert.equal(formatSeconds(3600), '01:00:00');
  assert.equal(formatSeconds(3665), '01:01:05');
});

test('formatSegmentsToTxt formats array of Whisper segments into clean timestamped text', () => {
  const segments = [
    { start: 0.0, end: 3.5, text: ' Assalomu alaykum.' },
    { start: 3.5, end: 8.2, text: ' Bugun yangi bot yaratamiz.' },
  ];

  const formatted = formatSegmentsToTxt(segments);
  const expected =
`[00:00 - 00:03] Assalomu alaykum.
[00:03 - 00:08] Bugun yangi bot yaratamiz.`;

  assert.equal(formatted.trim(), expected);
});

test('formatSegmentsToTxt handles empty or null segments gracefully', () => {
  assert.equal(formatSegmentsToTxt([]), '');
  assert.equal(formatSegmentsToTxt(null), '');
});
