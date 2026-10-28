# Video Link Downloader with Action Buttons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to send video links (TikTok, direct MP4/video URLs, and social media) to the bot; the bot downloads and sends the video accompanied by inline action buttons (`[ 🎙 Ovozdan matnga ]` and `[ 🎬 Videodan audio (MP3) ]`), enabling immediate conversion to speech-to-text or MP3 without re-uploading.

**Architecture:**
1. When user sends a message containing a URL (`http://` or `https://`):
   - Bot detects whether it's a supported video link (TikTok, direct `.mp4`/`.webm`/`.mov` URL, etc.).
   - Bot sends progress message `t(KEYS.MSG_DOWNLOADING_VIDEO, lang)`.
   - Bot resolves direct playable video URL via `downloader.js` (e.g. TikWM API for TikTok, or direct stream for URLs).
   - Bot sends the video to the user using `api.sendVideo({ chat_id, video: downloadUrl, caption, reply_markup: buildVideoActionKeyboard(lang) })`.
2. When the user taps an action button beneath the received video:
   - `action_stt`: Callback query handler retrieves `callbackQuery.message.video.file_id`, sets `pendingMedia`, and opens the 13-page STT language selection menu.
   - `action_v2a`: Callback query handler retrieves `callbackQuery.message.video.file_id`, passes it to Rendi, and delivers clean MP3 audio.
3. Clean up prompt leakage in `groq.js` (stop auto-injecting "O'zbek tilidagi nutq, lotin alifbosi." which Whisper hallucinates into transcripts).

**Tech Stack:** Telegram Serverless (`tgcloud`, `sdk`), TikWM API, Groq Whisper API, Rendi API, Node.js (`node --test`).

**Spec:** Zero hardcoding (all keys in `keys.js` and `uz.js`, `ru.js`, `en.js`), single-task concurrency locking (`isProcessing`), 19.5 MB file size limit enforcement.

## Global Constraints

- Runtime V8 sandbox: No local `fs`, `child_process`, or global `setTimeout`.
- Zero hardcoded user-facing strings: all strings must be registered in `KEYS` and translated in `i18n/{uz.js, ru.js, en.js}`.
- Single-task concurrency: must enforce `isProcessing` flag.
- Max file size: 19.5 MB ceiling (`MAX_FILE_SIZE_BYTES`).
- All existing tests (46 unit tests) must continue passing.

## Review Focus

1. User sends TikTok link: bot must download video without watermark and send video with action buttons.
2. User sends direct video URL (`.mp4`): bot must send video with action buttons.
3. User taps `[ 🎙 Ovozdan matnga ]`: bot must present STT language keyboard for that video and proceed to transcribe when language is chosen.
4. User taps `[ 🎬 Videodan audio (MP3) ]`: bot must extract MP3 audio using Rendi and deliver audio.
5. User sends invalid link or oversized video: bot must catch error and send localized error message.

---

### Task 1: Video Downloader Service & Fix Whisper Prompt Leakage

**Files:**
- Create: `tgcloud/lib/services/downloader.js`
- Modify: `tgcloud/lib/services/groq.js:37-45`
- Test: `tests/downloader.test.js`
- Test: `tests/groq_languages.test.js`

**Interfaces:**
- Produces:
  - `extractUrl(text: string) -> string | null`
  - `resolveVideoUrl(url: string, customFetch?: Function) -> Promise<{ downloadUrl: string, title?: string }>`
- In `groq.js`:
  - Only append `prompt` if provided explicitly (remove hardcoded prompt leakage).

- [ ] **Step 1: Write failing tests for downloader service and groq prompt fix**

```javascript
// tests/downloader.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractUrl, resolveVideoUrl } from '../tgcloud/lib/services/downloader.js';

test('extractUrl detects valid HTTP/HTTPS URLs from message text', () => {
  assert.equal(extractUrl('Check this: https://www.tiktok.com/@user/video/123 ok'), 'https://www.tiktok.com/@user/video/123');
  assert.equal(extractUrl('salom dunyo'), null);
  assert.equal(extractUrl('https://example.com/test.mp4'), 'https://example.com/test.mp4');
});

test('resolveVideoUrl handles direct MP4 URLs', async () => {
  const res = await resolveVideoUrl('https://example.com/sample.mp4');
  assert.equal(res.downloadUrl, 'https://example.com/sample.mp4');
});

test('resolveVideoUrl resolves TikTok URLs via TikWM API', async () => {
  const mockFetch = async (url) => {
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/downloader.test.js`
Expected: FAIL with "Cannot find module '../tgcloud/lib/services/downloader.js'"

- [ ] **Step 3: Implement `downloader.js` and remove prompt leakage in `groq.js`**

Implement `extractUrl` and `resolveVideoUrl`. In `groq.js`, only append prompt if `prompt` is truthy, do not auto-inject `"O'zbek tilidagi nutq, lotin alifbosi."`. Update `tests/groq_languages.test.js` accordingly.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/downloader.test.js tests/groq_languages.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tgcloud/lib/services/downloader.js tgcloud/lib/services/groq.js tests/downloader.test.js tests/groq_languages.test.js
git commit -m "feat(downloader): add video url resolver and remove prompt leakage in groq"
```

---

### Task 2: Add Action Keyboard & i18n Translations

**Files:**
- Modify: `tgcloud/lib/constants/keys.js`
- Modify: `tgcloud/lib/i18n/uz.js`
- Modify: `tgcloud/lib/i18n/ru.js`
- Modify: `tgcloud/lib/i18n/en.js`
- Modify: `tgcloud/lib/services/telegram.js`
- Test: `tests/video_action_keyboard.test.js`

**Interfaces:**
- Produces:
  - `buildVideoActionKeyboard(lang: string)`:
    `inline_keyboard: [[ { text: t(KEYS.BTN_ACTION_STT, lang), callback_data: 'action_stt' }, { text: t(KEYS.BTN_ACTION_V2A, lang), callback_data: 'action_v2a' } ]]`
  - Keys:
    - `BTN_ACTION_STT`, `BTN_ACTION_V2A`, `MSG_DOWNLOADING_VIDEO`, `MSG_VIDEO_DOWNLOADED`, `ERROR_DOWNLOAD_FAILED`

- [ ] **Step 1: Write failing test for video action keyboard and translations**

```javascript
// tests/video_action_keyboard.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildVideoActionKeyboard } from '../tgcloud/lib/services/telegram.js';
import { KEYS } from '../tgcloud/lib/constants/keys.js';
import { t } from '../tgcloud/lib/i18n/index.js';

test('buildVideoActionKeyboard generates inline buttons for STT and V2A', () => {
  const kb = buildVideoActionKeyboard('uz');
  assert.ok(kb.inline_keyboard);
  assert.equal(kb.inline_keyboard.length, 1);
  assert.equal(kb.inline_keyboard[0][0].callback_data, 'action_stt');
  assert.equal(kb.inline_keyboard[0][1].callback_data, 'action_v2a');
});

test('i18n contains video download keys across uz, ru, and en', () => {
  for (const lang of ['uz', 'ru', 'en']) {
    assert.ok(t(KEYS.MSG_DOWNLOADING_VIDEO, lang));
    assert.ok(t(KEYS.MSG_VIDEO_DOWNLOADED, lang));
    assert.ok(t(KEYS.ERROR_DOWNLOAD_FAILED, lang));
    assert.ok(t(KEYS.BTN_ACTION_STT, lang));
    assert.ok(t(KEYS.BTN_ACTION_V2A, lang));
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/video_action_keyboard.test.js`
Expected: FAIL

- [ ] **Step 3: Implement keys, translations, and `buildVideoActionKeyboard`**

Add keys and translations to `keys.js`, `uz.js`, `ru.js`, `en.js`, and `buildVideoActionKeyboard` to `telegram.js`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/video_action_keyboard.test.js tests/i18n.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tgcloud/lib/constants/keys.js tgcloud/lib/i18n/ tgcloud/lib/services/telegram.js tests/video_action_keyboard.test.js
git commit -m "feat(ui, i18n): add video action keyboard and download status messages"
```

---

### Task 3: URL Detection and Video Delivery in Message Handler

**Files:**
- Modify: `tgcloud/handlers/message.js`
- Test: `tests/message_url_handler.test.js`

**Interfaces:**
- When text contains a URL and is not a command:
  - If user is processing, send `ERROR_ALREADY_PROCESSING`.
  - Sends progress message `MSG_DOWNLOADING_VIDEO`.
  - Calls `resolveVideoUrl`.
  - Delivers video using `api.sendVideo({ chat_id, video: downloadUrl, caption: t(KEYS.MSG_VIDEO_DOWNLOADED, lang), reply_markup: buildVideoActionKeyboard(lang) })`.
  - Cleans up progress message.

- [ ] **Step 1: Write failing test for URL message handling**

```javascript
// tests/message_url_handler.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import messageHandler from '../tgcloud/handlers/message.js';

test('messageHandler detects URL in text and sends video with action buttons', async () => {
  let sentVideos = [];
  let sentMessages = [];
  const mockApi = {
    sendMessage: async (p) => {
      sentMessages.push(p);
      return { message_id: 10 };
    },
    deleteMessage: async () => ({ ok: true }),
    sendVideo: async (p) => {
      sentVideos.push(p);
      return { message_id: 11, video: { file_id: 'downloaded_vid_123' } };
    },
  };
  // Test execution
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/message_url_handler.test.js`
Expected: FAIL

- [ ] **Step 3: Implement URL handling in `message.js`**

Implement URL branch in `message.js` before falling back to default help text.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/message_url_handler.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tgcloud/handlers/message.js tests/message_url_handler.test.js
git commit -m "feat(handlers): detect video URL in message and send video with action buttons"
```

---

### Task 4: Callback Query Handler for `action_stt` & `action_v2a`

**Files:**
- Modify: `tgcloud/handlers/callback_query.js`
- Test: `tests/callback_query_actions.test.js`

**Interfaces:**
- Intercepts:
  - `action_stt`:
    Extracts `callbackQuery.message.video`, saves it into `pendingMedia`, and sends `MSG_CHOOSE_STT_LANG` with `buildSttLanguagesKeyboard(1, lang)`.
  - `action_v2a`:
    Extracts `callbackQuery.message.video`, executes Rendi audio extraction, and delivers MP3 audio to user.

- [ ] **Step 1: Write failing test for `action_stt` and `action_v2a` callbacks**

```javascript
// tests/callback_query_actions.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import callbackQueryHandler from '../tgcloud/handlers/callback_query.js';

test('callback query action_stt prompts for language and saves pendingMedia', async () => {
  // test action_stt
});

test('callback query action_v2a triggers Rendi audio extraction and sends audio', async () => {
  // test action_v2a
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/callback_query_actions.test.js`
Expected: FAIL

- [ ] **Step 3: Implement `action_stt` and `action_v2a` in `callback_query.js`**

Add handling for `action_stt` and `action_v2a` in `callback_query.js`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/callback_query_actions.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tgcloud/handlers/callback_query.js tests/callback_query_actions.test.js
git commit -m "feat(callback_query): handle action_stt and action_v2a inline buttons on downloaded video"
```

---

### Task 5: Full Regression Testing, Deployment & Verification

- [ ] **Step 1: Run all project unit tests**
Run: `npm test`
Expected: All tests pass.

- [ ] **Step 2: Deploy to Telegram Serverless**
Run: `npm run deploy`
Expected: Deployment successful.

- [ ] **Step 3: Push to GitHub origin main**
Run: `git push origin main`
Expected: Remote synchronized.
