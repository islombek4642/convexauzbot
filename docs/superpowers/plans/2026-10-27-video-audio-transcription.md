# Video/Audio to Text Transcription Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Telegram Serverless bot that transcribes video, audio, and voice messages to text using Groq's `whisper-large-v3-turbo` model with 3-language support (uz, ru, en) and intelligent chunking.

**Architecture:** The bot runs in Telegram Serverless (`tgcloud`) V8 sandbox. Updates flow into `handlers/message.js`, user language is tracked in SQLite via `schema.js`, business logic and external Groq API calls are handled via `lib/services/`, and all user copy and error messages are resolved from `lib/i18n/` using `lib/constants/`.

**Tech Stack:** Telegram Serverless (`@tgcloud/cli`), JavaScript (ES Modules), SQLite (`sdk/db`), Groq Whisper API (`whisper-large-v3-turbo`), Node.js test runner for unit tests.

**Spec:** [docs/superpowers/specs/2026-10-27-video-audio-transcription-design.md](file:///c:/ConvexaUzBot/docs/superpowers/specs/2026-10-27-video-audio-transcription-design.md)

## Global Constraints

- Platform: Telegram Serverless (`tgcloud`), runtime is V8 isolate without npm packages or local `fs`
- Imports in `tgcloud/` must be relative paths with `.js` extensions (e.g. `import { users } from '../schema.js'`)
- File Size Limit: Maximum 19.5 MB (strict ceiling for incoming media)
- Telegram Message Limit: Maximum 4096 characters per `sendMessage`
- Groq Model: `whisper-large-v3-turbo` with `response_format: "verbose_json"`
- Single-task Concurrency: A user may only process one file at a time; new uploads while `isProcessing` is true are immediately rejected with a localized message. Applies to all current and future features.
- Zero hardcoded user-facing strings or error messages; all must come from constants in `tgcloud/lib/constants/` and translations in `tgcloud/lib/i18n/`
- Supported languages: `uz` (default), `ru`, `en`

## Review Focus

1. Concurrent file uploads: If a second file arrives while the user's status is `processing`, the bot rejects it immediately with `ERROR_ALREADY_PROCESSING` in the user's language without downloading the file.
2. File size exceeds 19.5 MB: Handler rejects immediately with localized error without calling Telegram file download or Groq API.
3. Silent/untranscribable audio: Groq returns empty text; bot replies with localized "no speech detected" message instead of failing or sending empty message.
4. Message length > 4096 chars: Chunker splits text without splitting mid-sentence or mid-word, prepends `[1/N]`, `[2/N]` prefix, and sends all chunks in order plus attached `.txt` file with timestamps.
5. Language preference persistence: Language change via `/language` or reply button immediately takes effect on next message and persists in SQLite.
6. Missing Groq API key: Fails gracefully with localized service unavailable error rather than crashing the isolate.

---

### Task 1: Project Scaffolding & Database Schema

**Files:**
- Create: `package.json`
- Create: `tgcloud.jsonc`
- Create: `tgcloud/schema.js`
- Test: `tests/schema.test.js`

**Interfaces:**
- Produces: `users` table export from `tgcloud/schema.js` with fields `chatId` (primary key integer), `language` (text, default 'uz'), `isProcessing` (integer boolean, default 0), `updatedAt` (integer timestamp).

- [ ] **Step 1: Write the failing test for schema definition**

```javascript
// tests/schema.test.js
import assert from 'node:assert/strict';
import test from 'node:test';

test('schema exports users table with required columns', async () => {
  const schema = await import('../tgcloud/schema.js');
  assert.ok(schema.users, 'users table must be exported');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/schema.test.js`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement project configuration and `tgcloud/schema.js`**

Create `package.json`, `tgcloud.jsonc`, and `tgcloud/schema.js` using `sdk/db` DSL:
```javascript
// tgcloud/schema.js
import { table, integer, text, sql } from 'sdk/db';

export const users = table('users', {
  chatId: integer('chat_id').primaryKey(),
  language: text('language').notNull().default('uz'),
  isProcessing: integer('is_processing', { mode: 'boolean' }).notNull().default(false),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});
```

- [ ] **Step 4: Run test to verify it passes (with mocked sdk/db if running outside tgcloud runtime)**

Run: `node --test tests/schema.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json tgcloud.jsonc tgcloud/schema.js tests/schema.test.js
git commit -m "feat: scaffold tgcloud project and users schema"
```

---

### Task 2: Constants & Internationalization (i18n) Module

**Files:**
- Create: `tgcloud/lib/constants/keys.js`
- Create: `tgcloud/lib/constants/commands.js`
- Create: `tgcloud/lib/i18n/uz.js`
- Create: `tgcloud/lib/i18n/ru.js`
- Create: `tgcloud/lib/i18n/en.js`
- Create: `tgcloud/lib/i18n/index.js`
- Test: `tests/i18n.test.js`

**Interfaces:**
- Produces: `KEYS` object from `keys.js`
- Produces: `COMMANDS` object from `commands.js`
- Produces: `t(key, lang, params)` function from `index.js`

- [ ] **Step 1: Write the failing test for i18n completeness and parameter formatting**

```javascript
// tests/i18n.test.js
import assert from 'node:assert/strict';
import test from 'node:test';
import { t, getSupportedLanguages } from '../tgcloud/lib/i18n/index.js';
import { KEYS } from '../tgcloud/lib/constants/keys.js';

test('all translation keys exist in uz, ru, and en dictionaries', () => {
  const languages = ['uz', 'ru', 'en'];
  for (const lang of languages) {
    for (const [keyName, keyValue] of Object.entries(KEYS)) {
      const translation = t(keyValue, lang);
      assert.ok(translation, `Missing translation for key ${keyValue} in ${lang}`);
    }
  }
});

test('t() interpolates parameters correctly', () => {
  const res = t(KEYS.CHUNK_HEADER, 'uz', { current: 1, total: 3 });
  assert.equal(res, '[1/3]');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/i18n.test.js`
Expected: FAIL

- [ ] **Step 3: Implement constants and i18n dictionaries**

Define all message keys, buttons, commands, and error messages in `keys.js`. Populate full translations in `uz.js`, `ru.js`, `en.js`, and build `t()` helper in `index.js`.
Error messages include:
- `ERROR_ALREADY_PROCESSING`: Oldingi fayl qayta ishlanmoqda ogohlantirishi
- `ERROR_FILE_TOO_LARGE`: 19.5 MB exceeded
- `ERROR_NO_SPEECH_DETECTED`: No speech found
- `ERROR_UNSUPPORTED_FORMAT`: Invalid media
- `ERROR_PROCESSING_FAILED`: General transcription failure

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/i18n.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tgcloud/lib/constants/ tgcloud/lib/i18n/ tests/i18n.test.js
git commit -m "feat: implement constants and complete 3-language i18n engine"
```

---

### Task 3: Text Chunker & Segment Formatter Utilities

**Files:**
- Create: `tgcloud/lib/utils/chunker.js`
- Create: `tgcloud/lib/utils/formatter.js`
- Test: `tests/chunker.test.js`
- Test: `tests/formatter.test.js`

**Interfaces:**
- Produces: `chunkText(text, maxLen = 4000) -> string[]` (splits into array of `[i/N]\ntext`)
- Produces: `formatSegmentsToTxt(segments) -> string` (formats Whisper segments into `[00:00 - 00:04] text` string)

- [ ] **Step 1: Write tests for chunker and segment formatter**

```javascript
// tests/chunker.test.js
import assert from 'node:assert/strict';
import test from 'node:test';
import { chunkText } from '../tgcloud/lib/utils/chunker.js';

test('short text <= 4000 chars returns single chunk without [1/1] header', () => {
  const result = chunkText('Salom dunyo');
  assert.deepEqual(result, ['Salom dunyo']);
});

test('long text > 4000 chars splits cleanly with [1/N] headers', () => {
  const text = 'Gap. '.repeat(1000); // 5000 chars
  const chunks = chunkText(text, 4000);
  assert.ok(chunks.length > 1);
  assert.match(chunks[0], /^\[1\/\d+\]\n/);
  assert.match(chunks[1], /^\[2\/\d+\]\n/);
  for (const c of chunks) {
    assert.ok(c.length <= 4000);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/chunker.test.js tests/formatter.test.js`
Expected: FAIL

- [ ] **Step 3: Implement `chunker.js` and `formatter.js`**

Implement sentence/paragraph boundary splitting in `chunker.js` and time formatting (`HH:MM:SS` or `MM:SS`) in `formatter.js`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/chunker.test.js tests/formatter.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tgcloud/lib/utils/ tests/chunker.test.js tests/formatter.test.js
git commit -m "feat: implement smart text chunker and segment formatter"
```

---

### Task 4: Groq Whisper API Service

**Files:**
- Create: `tgcloud/lib/services/groq.js`
- Test: `tests/groq.test.js`

**Interfaces:**
- Produces: `transcribeMedia({ fileBuffer, fileName, mimeType, apiKey }) -> Promise<{ text: string, segments: Array<{ start: number, end: number, text: string }> }>`

- [ ] **Step 1: Write the failing test for Groq API service**

```javascript
// tests/groq.test.js
import assert from 'node:assert/strict';
import test from 'node:test';
import { transcribeMedia } from '../tgcloud/lib/services/groq.js';

test('transcribeMedia constructs proper multipart request and parses verbose_json', async () => {
  // Test with mock fetch
  const mockFetch = async (url, options) => {
    assert.equal(url, 'https://api.groq.com/openai/v1/audio/transcriptions');
    return {
      ok: true,
      json: async () => ({
        text: 'Transcribed text',
        segments: [{ start: 0, end: 2, text: 'Transcribed text' }]
      })
    };
  };

  const res = await transcribeMedia({
    fileBuffer: Buffer.from('mock-audio'),
    fileName: 'audio.m4a',
    apiKey: 'test-key',
    customFetch: mockFetch
  });

  assert.equal(res.text, 'Transcribed text');
  assert.equal(res.segments.length, 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/groq.test.js`
Expected: FAIL

- [ ] **Step 3: Implement `groq.js` using standard `fetch` and `FormData`**

Calls Groq's endpoint with model `whisper-large-v3-turbo` and `response_format: "verbose_json"`, handling API errors and returning structured data.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/groq.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tgcloud/lib/services/groq.js tests/groq.test.js
git commit -m "feat: implement Groq Whisper transcription service"
```

---

### Task 5: Telegram Service & Update Handlers

**Files:**
- Create: `tgcloud/lib/services/telegram.js`
- Create: `tgcloud/lib/services/user.js`
- Create: `tgcloud/handlers/message.js`
- Create: `tgcloud/handlers/callback_query.js`
- Test: `tests/handlers.test.js`

**Interfaces:**
- `handlers/message.js` default export `async function(message, ctx)`
- `handlers/callback_query.js` default export `async function(query, ctx)`

- [ ] **Step 1: Write tests for message handler routing**

Test:
- `/start` initializes user in DB and sends welcome message with language buttons
- `/language` displays language options
- `/help` sends usage guidelines
- Incoming media > 19.5 MB triggers `ERROR_FILE_TOO_LARGE`
- Incoming media <= 19.5 MB triggers transcription flow

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/handlers.test.js`
Expected: FAIL

- [ ] **Step 3: Implement `telegram.js`, `user.js`, and handlers**

- `telegram.js`: helper to download files via `api.getFile`, send text chunks, and send `.txt` document using `api.sendDocument`.
- `user.js`: helper to get or create user, update language in SQLite `schema.js`.
- `message.js`: routes commands, reply keyboard button clicks, and media updates.
- `callback_query.js`: handles inline language selection callbacks.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/handlers.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tgcloud/lib/services/ tgcloud/handlers/ tests/handlers.test.js
git commit -m "feat: implement Telegram handlers and media processing pipeline"
```

---

### Task 6: Full Verification with `tgcloud run`

**Files:**
- Test: `tests/integration/run_scenarios.js`

- [ ] **Step 1: Test handler locally with `npx tgcloud run`**

Run: `npx tgcloud run handlers/message '{"chat":{"id":12345},"text":"/start"}'`
Verify: Correct response and menu sent.

- [ ] **Step 2: Test language command with `npx tgcloud run`**

Run: `npx tgcloud run handlers/message '{"chat":{"id":12345},"text":"/language"}'`
Verify: Language selection prompt returned.

- [ ] **Step 3: Test oversized media rejection**

Run simulated message with `file_size: 21000000` (exceeding 19.5 MB).
Verify: Localized error message returned immediately.

- [ ] **Step 4: Commit**

```bash
git add tests/
git commit -m "test: verify all flows with tgcloud run"
```
