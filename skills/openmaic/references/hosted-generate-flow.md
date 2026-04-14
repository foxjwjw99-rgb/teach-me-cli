# Hosted Generation Flow

This flow handles classroom generation via the hosted open.maic.chat service.

---

## Step 1 — Check Service & Detect Capabilities

Call the health endpoint (no auth required):

```
GET https://open.maic.chat/api/health
```

Response:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "version": "1.x.x",
    "capabilities": {
      "webSearch": true,
      "imageGeneration": false,
      "videoGeneration": false,
      "tts": true
    }
  }
}
```

- If the request fails (network error / non-200), tell the user the service is unreachable and stop.
- Save the `capabilities` object — you will use it to determine which optional features to offer.

---

## Step 2 — Authenticate

Exchange the access code for a session cookie:

```
POST https://open.maic.chat/api/access-code/verify
Content-Type: application/json

{ "code": "<access-code>" }
```

- **200**: Success. The server sets an `openmaic_access` cookie. Save it and include it in all subsequent requests as `Cookie: openmaic_access=<value>`.
- **401**: Invalid access code. Ask the user to regenerate it at open.maic.chat and update `~/.openclaw/openclaw.json`.

---

## Step 3 — Collect Input

Ask the user for input. They can provide:

1. **A topic** — Free text describing what to learn.  
   Examples: "量子糾纏", "photosynthesis process", "Shakespeare's sonnets"
2. **A PDF file** — Upload or reference a local PDF (lecture notes, papers, textbooks).  
   Ask for confirmation before reading the file from disk.

Also collect optional preferences (only present options when the corresponding capability is `true`):

| Preference | Field | Default | Condition |
|------------|-------|---------|-----------|
| Language | `language` | `"zh-CN"` | Always ask |
| Web search | `enableWebSearch` | `false` | `capabilities.webSearch` |
| Image generation | `enableImageGeneration` | `false` | `capabilities.imageGeneration` |
| TTS audio | `enableTTS` | `false` | `capabilities.tts` |
| Agent mode | `agentMode` | `"default"` | Always offer |

**Agent mode options:**
- `"default"` — Uses built-in teacher/student personas (fast)
- `"generate"` — LLM generates custom personas tailored to the topic (richer, slower)

If no optional capabilities are available, skip directly to generation without asking.

---

## Step 4 — Submit Generation Request

```
POST https://open.maic.chat/api/generate-classroom
Cookie: openmaic_access=<token>
Content-Type: application/json

{
  "requirement": "<topic or description>",
  "language": "zh-CN",
  "enableWebSearch": true,
  "enableImageGeneration": false,
  "enableTTS": true,
  "agentMode": "default"
}
```

For PDF input, include `pdfContent` instead of (or alongside) a topic description:
```json
{
  "requirement": "依照上傳的課程講義生成教學課程",
  "pdfContent": {
    "text": "<extracted text from PDF>",
    "images": []
  },
  "language": "zh-CN"
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "data": {
    "jobId": "abc123",
    "status": "queued",
    "step": "queued",
    "message": "Classroom generation job queued",
    "pollUrl": "https://open.maic.chat/api/generate-classroom/abc123",
    "pollIntervalMs": 5000
  }
}
```

Save `jobId` and `pollUrl`.

---

## Step 5 — Poll for Completion

Poll `pollUrl` every `pollIntervalMs` milliseconds (default: 5 seconds) until `done === true`.

```
GET https://open.maic.chat/api/generate-classroom/<jobId>
Cookie: openmaic_access=<token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "abc123",
    "status": "running",
    "step": "generating_scenes",
    "progress": 65,
    "message": "Generated 3/5 scenes",
    "scenesGenerated": 3,
    "totalScenes": 5,
    "done": false,
    "result": null,
    "error": null
  }
}
```

**Status values:**

| `status` | Meaning |
|----------|---------|
| `queued` | Job is waiting to start |
| `running` | Generation in progress |
| `succeeded` | Complete — check `result` |
| `failed` | Generation failed — check `error` |

**Step values and their display labels:**

| `step` | Display |
|--------|---------|
| `queued` | 排隊中... |
| `initializing` | 初始化... |
| `researching` | 搜尋相關資料... |
| `generating_outlines` | 生成課程大綱... |
| `generating_scenes` | 生成場景 N/M... |
| `generating_media` | 生成媒體資源... |
| `generating_tts` | 生成語音... |
| `persisting` | 儲存課程... |
| `completed` | 完成！ |

**Progress bar format** (update each poll):
```
[████████░░] 80% — 生成場景 4/5...
```
Use `progress` for the bar (0–100) and `step` + `scenesGenerated`/`totalScenes` for the label.

**Maximum wait:** ~3 minutes. If not complete after 36 polls, tell the user to check the status at open.maic.chat.

---

## Step 6 — Return Result

When `status === "succeeded"`:
```json
{
  "result": {
    "classroomId": "xyz789",
    "url": "https://open.maic.chat/classroom/xyz789",
    "scenesCount": 6
  }
}
```

Return the classroom URL **on its own line** with no bold, markdown link syntax, code formatting, or tables:

```
https://open.maic.chat/classroom/xyz789
```

---

## Error Handling

| HTTP Status | Meaning | Action |
|-------------|---------|--------|
| 400 | Missing `requirement` field | Ask user for topic and retry |
| 401 | Missing or expired session cookie | Re-run Step 2 (access code verify) |
| 403 | Daily quota exhausted | 10 classrooms per day; resets at midnight UTC |
| 500 | Server error | Retry once after 10 seconds; if still failing, ask user to try later |

When `status === "failed"`, show the `error` field to the user and offer to retry.
