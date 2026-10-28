# Whisper All Languages STT with Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to transcribe audio/video in any of Whisper's 99 supported languages (plus auto-detect) via an interactive, paginated inline keyboard presented immediately after media is received, forcing clean Uzbek Latin script for Uzbek speech.

**Architecture:** 
1. When media arrives in `STATES.STT`, the bot validates constraints, saves media metadata (`fileId`, `fileName`, `mimeType`) to `pendingMedia` in the SQLite `users` table, and presents page 1 of an inline keyboard containing top trending languages and pagination controls.
2. `callback_query.js` intercepts `stt_page:<N>` to smoothly edit the inline keyboard markup in-place without sending extra messages.
3. When the user taps `stt_lang:<code>`, the bot edits the message to a processing state, fetches the media using Telegram SDK, and executes `transcribeMedia` with the target `language` code (and for `uz`, a conditioning `prompt` to enforce Uzbek Latin script and prevent Arabic/Cyrillic output).
4. Text delivery chunks result cleanly (up to 4000 characters per message or `.txt` file if lengthy), resets state to idle, and clears `pendingMedia`.

**Tech Stack:** Telegram Serverless (`tgcloud`, `sdk/db`, `sdk`), Groq Whisper API (`whisper-large-v3-turbo`), Node.js (test runner `node --test`).

**Spec:** User discussion and approved design: 8 languages per page, 13 pages total, Page 1 featuring top trending languages (Auto-detect, Uzbek, Russian, English, Turkish, Kazakh, Arabic, German), interactive pagination with `editMessageReplyMarkup`, single-task concurrency locking, and zero hardcoding (all keys in `keys.js` and `uz.js`, `ru.js`, `en.js`).

## Global Constraints

- Runtime V8 sandbox: No local `fs`, `child_process`, or global `setTimeout` (must use existing synchronous `Atomics.wait` sleep if needed).
- No external npm packages; only `sdk` imports.
- Zero hardcoded user-facing strings: all strings must be registered in `KEYS` and translated in `i18n/{uz.js, ru.js, en.js}`.
- Single-task concurrency: must enforce `isProcessing` flag.
- Max file size: 19.5 MB ceiling (`MAX_FILE_SIZE_BYTES`).
- All existing tests (36 unit tests) must continue passing.

## Review Focus

1. User sends voice in Uzbek: must produce Latin Uzbek text, not Arabic script.
2. User clicks next/prev page repeatedly: Telegram `callback_query` must answer immediately to avoid loading wheel, and `editMessageReplyMarkup` must not throw error on clicking the current page.
3. User clicks "Bekor qilish" (`stt_cancel`) on language keyboard: `pendingMedia` must be wiped, message deleted/updated, and user state restored to `idle`.
4. User sends new media while language selection is already pending: previous pending media must be overwritten or rejected cleanly.
5. Transcription returns empty speech or API failure: temporary progress message must be cleaned up, `pendingMedia` cleared, and an internationalized error delivered to user.

---

### Task 1: Add STT Languages Catalog & Groq Service Language Support

**Files:**
- Create: `tgcloud/lib/constants/stt_languages.js`
- Modify: `tgcloud/lib/services/groq.js:6-61`
- Test: `tests/groq_languages.test.js`

**Interfaces:**
- Produces: 
  - `STT_LANGUAGES`: Array of `{ code: string, name: string, flag: string, prompt?: string }` (length 99)
  - `POPULAR_STT_LANGUAGES`: Array of top 8 languages (Auto + 7 trend: uz, ru, en, tr, kk, ar, de)
  - `PAGINATED_STT_PAGES`: Array of pages where page 1 has top 8, and remaining 12 pages have alphabetical languages
  - `transcribeMedia({ fileBytes, fileName, mimeType, apiKey, language, prompt })`: passes `language` and `prompt` to Groq API FormData

- [ ] **Step 1: Write the failing test for language catalog and Groq language parameters**

```javascript
// tests/groq_languages.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STT_LANGUAGES, POPULAR_STT_LANGUAGES, getSttPage } from '../tgcloud/lib/constants/stt_languages.js';
import { transcribeMedia } from '../tgcloud/lib/services/groq.js';

test('STT_LANGUAGES contains Whisper languages and getSttPage partitions correctly', () => {
  assert.ok(STT_LANGUAGES.length >= 95, 'Must contain at least 95 Whisper languages');
  const page1 = getSttPage(1);
  assert.equal(page1.items.length, 8);
  assert.equal(page1.items[0].code, 'auto');
  assert.equal(page1.items[1].code, 'uz');
  assert.equal(page1.totalPages, 13);
});

test('transcribeMedia appends language and prompt to FormData when provided', async () => {
  let capturedBody = null;
  const mockFetch = async (url, options) => {
    capturedBody = options.body;
    return {
      ok: true,
      json: async () => ({ text: "Salom dunyo", segments: [], language: 'uz' }),
    };
  };

  const dummyBytes = new Uint8Array([1, 2, 3]);
  const res = await transcribeMedia({
    fileBytes: dummyBytes,
    apiKey: 'test_key',
    language: 'uz',
    prompt: "O'zbek tilidagi nutq, lotin alifbosi.",
    customFetch: mockFetch,
  });

  assert.equal(res.text, "Salom dunyo");
  assert.ok(capturedBody.has('language'));
  assert.equal(capturedBody.get('language'), 'uz');
  assert.ok(capturedBody.has('prompt'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/groq_languages.test.js`
Expected: FAIL with "Cannot find module '../tgcloud/lib/constants/stt_languages.js'"

- [ ] **Step 3: Implement `stt_languages.js` catalog and update `groq.js`**

Implement `tgcloud/lib/constants/stt_languages.js` with all 99 languages and `getSttPage(pageNumber)`.
In `tgcloud/lib/services/groq.js`, accept `language` and `prompt`. If `language && language !== 'auto'`, append to FormData. If `prompt`, append to FormData. For Uzbek (`uz`), if prompt is not provided, default to `"O'zbek tilidagi nutq, lotin alifbosi."`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/groq_languages.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tgcloud/lib/constants/stt_languages.js tgcloud/lib/services/groq.js tests/groq_languages.test.js
git commit -m "feat(stt): add 99 whisper languages catalog and language/prompt parameters to groq service"
```

---

### Task 2: Update Schema, User Service & i18n Keys for STT Flow

**Files:**
- Modify: `tgcloud/schema.js:1-10`
- Modify: `tgcloud/lib/services/user.js:7-74`
- Modify: `tgcloud/lib/constants/keys.js:1-44`
- Modify: `tgcloud/lib/i18n/uz.js`
- Modify: `tgcloud/lib/i18n/ru.js`
- Modify: `tgcloud/lib/i18n/en.js`
- Test: `tests/user_pending_media.test.js`

**Interfaces:**
- Schema: `pendingMedia: text('pending_media')`
- User Service:
  - `setPendingMedia(chatId, mediaData, customDb)`
  - `getUser(chatId, customDb)` returns `pendingMedia`
- i18n Keys:
  - `MSG_CHOOSE_STT_LANG`
  - `BTN_PAGINATION_PREV`
  - `BTN_PAGINATION_NEXT`
  - `BTN_CANCEL_SELECTION`
  - `MSG_STT_CANCELLED`

- [ ] **Step 1: Write the failing test for pendingMedia and i18n keys**

```javascript
// tests/user_pending_media.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KEYS } from '../tgcloud/lib/constants/keys.js';
import { t } from '../tgcloud/lib/i18n/index.js';

test('i18n contains STT language selection keys across all 3 languages', () => {
  for (const lang of ['uz', 'ru', 'en']) {
    assert.ok(t(KEYS.MSG_CHOOSE_STT_LANG, lang), `Missing MSG_CHOOSE_STT_LANG in ${lang}`);
    assert.ok(t(KEYS.BTN_CANCEL_SELECTION, lang), `Missing BTN_CANCEL_SELECTION in ${lang}`);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/user_pending_media.test.js`
Expected: FAIL with missing key / assertion error

- [ ] **Step 3: Implement schema, user service methods, and i18n translations**

1. Add `pendingMedia: text('pending_media')` in `tgcloud/schema.js`.
2. Add `setPendingMedia(chatId, mediaData, customDb)` in `tgcloud/lib/services/user.js` and update `getUser` to parse `pendingMedia`.
3. Add keys in `KEYS` and translations in `uz.js`, `ru.js`, `en.js`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/user_pending_media.test.js tests/i18n.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tgcloud/schema.js tgcloud/lib/services/user.js tgcloud/lib/constants/keys.js tgcloud/lib/i18n/ tests/user_pending_media.test.js
git commit -m "feat(i18n, db): add pendingMedia schema and STT language selection translations"
```

---

### Task 3: Build STT Languages Inline Keyboard Builder

**Files:**
- Modify: `tgcloud/lib/services/telegram.js`
- Test: `tests/telegram_keyboards.test.js`

**Interfaces:**
- Produces: `buildSttLanguagesKeyboard(page, lang)`: Returns Telegram inline keyboard structure with:
  - 8 language buttons arranged in 2 columns
  - Row with navigation buttons: `⬅️ (stt_page:<N-1>)`, `📄 N/13`, `Keyingi ➡️ (stt_page:<N+1>)`
  - Cancel button: `❌ Bekor qilish (stt_cancel)`

- [ ] **Step 1: Write the failing test for buildSttLanguagesKeyboard**

```javascript
// tests/telegram_keyboards.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSttLanguagesKeyboard } from '../tgcloud/lib/services/telegram.js';

test('buildSttLanguagesKeyboard generates 13-page pagination keyboard', () => {
  const kbPage1 = buildSttLanguagesKeyboard(1, 'uz');
  assert.ok(kbPage1.inline_keyboard);
  // 4 rows of languages + 1 nav row + 1 cancel row = 6 rows
  assert.equal(kbPage1.inline_keyboard.length, 6);
  assert.equal(kbPage1.inline_keyboard[0][0].callback_data, 'stt_lang:auto');
  assert.equal(kbPage1.inline_keyboard[0][1].callback_data, 'stt_lang:uz');

  // Page 1 navigation has page indicator and Next button
  const navRow = kbPage1.inline_keyboard[4];
  assert.ok(navRow.some((btn) => btn.callback_data === 'stt_page:2'));

  const kbPage2 = buildSttLanguagesKeyboard(2, 'uz');
  const navRow2 = kbPage2.inline_keyboard[4];
  assert.ok(navRow2.some((btn) => btn.callback_data === 'stt_page:1'));
  assert.ok(navRow2.some((btn) => btn.callback_data === 'stt_page:3'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/telegram_keyboards.test.js`
Expected: FAIL with "buildSttLanguagesKeyboard is not a function"

- [ ] **Step 3: Implement `buildSttLanguagesKeyboard(page, lang)` in `tgcloud/lib/services/telegram.js`**

Implement keyboard generator using `getSttPage(page)` from `stt_languages.js` and localized cancel button from `KEYS.BTN_CANCEL_SELECTION`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/telegram_keyboards.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tgcloud/lib/services/telegram.js tests/telegram_keyboards.test.js
git commit -m "feat(telegram): add paginated STT languages inline keyboard builder"
```

---

### Task 4: Connect Media Message Handler to Language Selection Flow

**Files:**
- Modify: `tgcloud/handlers/message.js:267-330`
- Test: `tests/handlers_stt_flow.test.js`

**Interfaces:**
- When media is received in `STATES.STT`:
  - Validates file size (<= 19.5 MB)
  - Saves `{ fileId, fileName, mimeType }` into `setPendingMedia(chatId, ...)`
  - Sends message with `t(KEYS.MSG_CHOOSE_STT_LANG, lang)` and `buildSttLanguagesKeyboard(1, lang)`
  - Does NOT start transcription yet!

- [ ] **Step 1: Write the failing test for message handler STT intercept**

```javascript
// tests/handlers_stt_flow.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import messageHandler from '../tgcloud/handlers/message.js';
import { STATES } from '../tgcloud/lib/constants/states.js';

test('messageHandler prompts for language when media sent in STT state', async () => {
  let sentMessage = null;
  const mockApi = {
    sendMessage: async (payload) => {
      sentMessage = payload;
      return { message_id: 101 };
    },
  };

  // Mock user in STT state
  const mockUser = {
    chatId: 12345,
    language: 'uz',
    isProcessing: false,
    state: STATES.STT,
  };

  // Invoke handler with voice message
  // Verify it sends MSG_CHOOSE_STT_LANG with inline_keyboard
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/handlers_stt_flow.test.js`
Expected: FAIL

- [ ] **Step 3: Implement language selection prompt in `tgcloud/handlers/message.js`**

In `tgcloud/handlers/message.js`, replace direct STT execution with `setPendingMedia` and `api.sendMessage` presenting `buildSttLanguagesKeyboard(1, lang)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/handlers_stt_flow.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tgcloud/handlers/message.js tests/handlers_stt_flow.test.js
git commit -m "feat(handlers): prompt user with language keyboard when STT media is received"
```

---

### Task 5: Implement Callback Query Handler for STT Pagination & Transcription Execution

**Files:**
- Modify: `tgcloud/handlers/callback_query.js`
- Test: `tests/callback_query_stt.test.js`

**Interfaces:**
- Intercepts:
  - `stt_page:<N>`: Calls `api.editMessageReplyMarkup` with `buildSttLanguagesKeyboard(N, lang)`
  - `stt_cancel`: Deletes/edits prompt message, clears `pendingMedia`, resets state to `idle`, sends cancel confirmation
  - `stt_lang:<lang_code>`: 
    1. Acknowledges callback
    2. Edits prompt message to `MSG_PROCESSING`
    3. Sets `isProcessing = true`
    4. Downloads file via Telegram SDK
    5. Transcribes with `language` and Latin `prompt` for `uz`
    6. Delivers transcript
    7. Cleans up `pendingMedia`, resets `isProcessing = false`, restores `state = idle`

- [ ] **Step 1: Write failing tests for callback query STT interactions**

```javascript
// tests/callback_query_stt.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import callbackQueryHandler from '../tgcloud/handlers/callback_query.js';

test('callback query handles stt_page pagination smoothly', async () => {
  let editedMarkup = null;
  // verify api.editMessageReplyMarkup is called with new page
});

test('callback query handles stt_cancel and clears pendingMedia', async () => {
  // verify pending media is wiped and cancel message sent
});

test('callback query handles stt_lang:uz and executes transcription with latin prompt', async () => {
  // verify transcribeMedia called with language: 'uz' and prompt
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/callback_query_stt.test.js`
Expected: FAIL

- [ ] **Step 3: Implement STT callback routing and transcription in `tgcloud/handlers/callback_query.js`**

Implement handlers for `stt_page:`, `stt_cancel`, and `stt_lang:`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/callback_query_stt.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tgcloud/handlers/callback_query.js tests/callback_query_stt.test.js
git commit -m "feat(callback_query): handle STT pagination, cancel, and transcription execution"
```

---

### Task 6: Full Regression Verification & Live Deployment

**Files:**
- Run all test suites
- Push deployment to Telegram Serverless

- [ ] **Step 1: Run all unit tests**

Run: `npm test`
Expected: All tests pass (0 failures).

- [ ] **Step 2: Deploy to Telegram Serverless**

Run: `npm run deploy`
Expected: Deployment successful.

- [ ] **Step 3: Live Verification**

Send test audio or verify with live Telegram API call on chatId `8756078762`.
Ensure Uzbek transcription returns 100% clean Latin script text.
