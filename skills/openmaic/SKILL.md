---
name: openmaic
description: Hosted-only OpenMAIC skill for Jimmy's fork. Guides users to generate AI classrooms using the hosted open.maic.chat service via OpenClaw. No local setup required.
user-invocable: true
metadata: { "openclaw": { "emoji": "🏫" } }
---

# OpenMAIC Skill — Hosted-Only

This skill guides users through generating AI classrooms using **hosted-only OpenMAIC**. No local installation, provider configuration, or server startup needed.

## Core Rules

- **Hosted-only mode**: All users generate classrooms via open.maic.chat. No local deployment options.
- Move one phase at a time. Ask for confirmation before each action.
- Do not assume the OpenClaw agent's own model or API key will be reused by OpenMAIC.
- Only the hosted open.maic.chat access code is needed to generate classrooms.
- Do not offer or suggest local setup, self-hosting, or provider key configuration for this fork.
- Once the user has asked to generate a classroom, proceed without asking again.
- Confirm before reading local PDFs from disk.

## Optional Skill Config

If present, read defaults from `~/.openclaw/openclaw.json` under:

```jsonc
{
  "skills": {
    "entries": {
      "openmaic": {
        "enabled": true,
        "config": {
          "accessCode": "sk-xxx"
        }
      }
    }
  }
}
```

- If `accessCode` is present, use it directly. Do not ask the user to paste it.
- If no `accessCode`, guide the user to get one from open.maic.chat and add it to the config file.

## SOP Phases

### Phase 1 — Check / Acquire Access Code

Read `~/.openclaw/openclaw.json`:

- **If `accessCode` is found:** Announce the code is stored, skip to Phase 2.
- **If not found:** Tell the user:
  ```
  To generate classrooms, you need an access code from open.maic.chat.
  1. Visit https://open.maic.chat and get your access code (starts with sk-)
  2. Add it to ~/.openclaw/openclaw.json under:
     skills.entries.openmaic.config.accessCode
  3. Tell me when you're done.
  ```
  Wait for confirmation before continuing.

---

### Phase 2 — Connect & Authenticate

**Step 2a — Check service health (no auth):**

```
GET https://open.maic.chat/api/health
```

- **On success:** Extract the `capabilities` object from `data.capabilities`. You will use this in Phase 2.5.
- **On network failure:** Tell the user the service is unreachable and suggest checking their internet connection.

**Step 2b — Verify access code (obtain session cookie):**

```
POST https://open.maic.chat/api/access-code/verify
Content-Type: application/json

{ "code": "<access-code>" }
```

- **On 200:** The server sets an `openmaic_access` session cookie. Save this cookie — include it in all subsequent requests.
- **On 401:** Access code is invalid. Ask the user to regenerate it at open.maic.chat and update the config file.
- **On network error:** Retry once after 5 seconds; if still failing, report the issue.

---

### Phase 2.5 — Feature Selection

Based on the `capabilities` from Phase 2a, offer optional preferences **before** asking for the topic.

Always ask for **language**:
> 請選擇課程語言：
> - 中文 (zh-CN)
> - 英文 (en-US)

Always offer **agent mode**:
> 教師角色模式：
> - `default` — 使用預設的教師/學生角色（速度較快）
> - `generate` — 由 AI 根據主題生成專屬角色（內容更豐富，但稍慢）

Only present optional features when the corresponding capability is `true`:

| Feature | Capability flag | Recommend |
|---------|----------------|-----------|
| 網路搜尋 (Web search) | `capabilities.webSearch` | ✅ 推薦開啟 |
| 圖片生成 | `capabilities.imageGeneration` | 選填 |
| 影片生成 | `capabilities.videoGeneration` | 選填 |
| 語音朗讀 (TTS) | `capabilities.tts` | 選填 |

If **none** of the optional capabilities are `true`, skip feature selection and proceed directly to Phase 3.

---

### Phase 3 — Generate A Classroom

Load [references/hosted-generate-flow.md](references/hosted-generate-flow.md) for the complete technical API flow.

Follow these steps:

1. **Collect input**: Ask for topic text, or ask to upload a PDF (confirm before reading from disk). Combine with the preferences collected in Phase 2.5.

2. **Submit request**: POST to `/api/generate-classroom` with the full request body including all selected options.

3. **Show live progress**: While polling, display a progress bar and step label after each poll:
   ```
   [████████░░] 80% — 生成場景 4/5...
   ```
   Update the display on each response — do not print a new line per poll; replace the previous status line.

4. **Handle failure**: If `status === "failed"`, show the `error` field and offer to retry from the beginning.

5. **Return result**: When `status === "succeeded"`, return the classroom URL on its own line:
   ```
   https://open.maic.chat/classroom/<classroomId>
   ```
   Include a brief summary:
   - 主題
   - 語言
   - 場景數量
   - 啟用的功能（網路搜尋、圖片、TTS 等）

---

## Response Style

- Keep each step short and explicit.
- Explain why hosted-only is simpler: "No API keys to manage, instant access via open.maic.chat."
- When returning a classroom link, place the raw absolute URL on its own line with no bold, markdown link syntax, code formatting, or tables.
- Do not mention or suggest upstream OpenMAIC, local setup, or self-hosting options.
