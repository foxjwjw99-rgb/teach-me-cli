---
name: openmaic
description: Generate complete OpenMAIC courses via a staged local pipeline (research → outlines → scenes → TTS) and deploy to the OrbStack Docker container.
user-invocable: true
metadata: { "openclaw": { "emoji": "🏫" } }
---

# /openmaic — Staged Local Course Generation

When this skill is invoked, orchestrate a 9-phase pipeline that mirrors the server-side `generateClassroom()` flow in [lib/server/classroom-generation.ts](../../lib/server/classroom-generation.ts), but run entirely by the calling agent's own LLM, tools, and local filesystem.

## Usage

```
/openmaic <topic>                       # Default: staged, zh-TW, TTS on, research on
/openmaic <topic> --no-tts              # Skip TTS audio generation
/openmaic <topic> --no-research         # Skip Phase 2 web search
/openmaic <topic> --agents generate     # Phase 3: generate custom teacher/student personas (default: skip)
/openmaic <topic> --lang en             # Override language (zh-TW default)
/openmaic <topic> --id my-id            # Custom classroom ID
/openmaic <topic> --tts gemini          # Use Gemini TTS instead of local Qwen3
/openmaic <topic> --voice Kore          # Override voice (depends on TTS engine)
```

## Environment

- **OpenMAIC URL**: `https://openmaic.openmaic.orb.local` (Docker container via OrbStack)
- **Local TTS server**: `http://localhost:9880` (Qwen3-TTS, check with `curl http://localhost:9880/health`)
- **Gemini TTS**: requires `GEMINI_API_KEY` env var
- **Data folder**: `/Users/huli/Desktop/teach-me-cli/data/classrooms/` (bind-mounted to container)

> ⚠️ `save-classroom.ts` and `generate-tts.py` scripts do NOT exist. Always use the methods described below (direct file write + inline Python TTS).

## Progress Display

At the start of each phase, print **one status line** like:

```
Step 3/9 👥 生成教師/學生人格...
```

When inside a loop (Step 5 scenes, Step 7 TTS), update the line as `Step 5/9 🎨 生成場景 2/5...`. Don't print one line per LLM token.

---

## Step 1: Parse Input

Print: `Step 1/9 📝 解析輸入...`

Extract from args:
- `<topic>` — required
- `--no-tts`, `--no-research`, `--agents generate|default` (default: `default`)
- `--lang <code>` (default `zh-TW`)
- `--id <id>` — must match `/^[a-zA-Z0-9_-]+$/`
- `--tts gemini`, `--voice <name>`

If no topic: ask "請輸入課程主題。"

Generate classroom ID from topic if not given:
- Lowercase English, replace spaces/special chars with hyphens
- Example: "如何學英文" → `how-to-learn-english` (+ `-YYYY` if needed for uniqueness)

Announce parsed config:
```
主題：<topic>
ID：<classroom-id>
語言：<lang>
TTS：<engine|off>
研究：<on|off>
人格：<default|generate>
```

---

## Step 2: Research Phase (optional)

Print: `Step 2/9 🔍 研究主題中...`

- If `--no-research` is set OR the agent has no web-search tool: print `[skip] 略過研究階段` and continue
- Otherwise:
  - Query = topic (if topic > 400 chars, first ask LLM to rewrite as concise search query, per [search-query-builder.ts](../../lib/generation/search-query-builder.ts))
  - Perform one web search (top 10 results)
  - Compress results into `researchContext` string — for each result: `• <title>: <1-sentence snippet>`
  - Cap total at ~3000 characters

Store `researchContext` for Step 4.

---

## Step 3: Agent Profile Generation (optional)

Print: `Step 3/9 👥 生成教師/學生人格...`

- If `--agents default` (default): print `[skip] 使用預設老師/學生` and continue
- If `--agents generate`:
  - Prompt the LLM:
    ```
    為「<topic>」課程設計 3-5 個角色。用 <lang>。輸出 JSON：
    [
      { "name": "...", "role": "teacher", "persona": "2-3 句描述教學風格" },
      { "name": "...", "role": "student",  "persona": "..." },
      ...
    ]
    規則：
    - 恰 1 個 teacher
    - 其餘 2-4 個為 student 或 assistant
    - 所有 name/persona 用 <lang>
    ```
  - Format into `teacherContext` = `老師 <name>：<persona>\n學生 <name>：<persona>\n…` for Step 4

---

## Step 4: Generate Outlines (single LLM call)

Print: `Step 4/9 📋 生成大綱中...`

Prompt the LLM with:

```
你是專業課程設計師。根據以下輸入產出 5-6 個場景大綱。

需求：<topic>
語言：<lang>

{如果有 researchContext}
最新研究參考：
<researchContext>

{如果有 teacherContext}
角色設定：
<teacherContext>

輸出純 JSON 陣列，每個元素：
{
  "id": "scene_1",
  "type": "slide" | "quiz",
  "title": "<scene 標題>",
  "description": "1-2 句描述教學目的",
  "keyPoints": ["3-5 個核心點"],
  "order": 1
}

規則：
- 最後一個 scene 固定 type: "quiz"
- 其餘為 type: "slide"
- 建議順序：cover → why → core concepts → deep dive → applications → quiz
- 所有文字使用 <lang>
- 禁止在 description 中提到任何老師名字
```

Parse JSON. On failure retry once. If still fails, abort with clear error.

Store `outlines: Outline[]` for Step 5.

---

## Step 5: Generate Scenes (loop with per-scene retry)

For each `outline` in `outlines`:

1. Print `Step 5/9 🎨 生成場景 <order>/<total>：<title>...`
2. Prompt LLM to produce a full scene JSON matching the schema in **Scene Schema Reference** below.
3. Validate the returned JSON:
   - Top-level: `id`, `stageId`, `type`, `title`, `order`, `content`, `actions` present
   - Slide: `content.canvas.elements` is an array; every shape has `viewBox`; every text has HTML `content`
   - Quiz: every option uses `label` (not `text`); `answer` matches an option `id`
   - `actions[0]` is `{ type: "speech", text: <string ≤ 60 chars>, id: "speech-<scene-id>" }`
4. **On validation failure**: retry once with a message like "上次輸出缺少 viewBox，請重新產出完整合法 JSON"
5. **If still fails**: push `{ order, title, reason }` to `skippedScenes`, print `⚠️ 場景 <order> 生成失敗，跳過`, continue to next outline

Collect successful scenes in `scenes: Scene[]`, sorted by `order`.

### Scene Prompt Template

```
產出一個 OpenMAIC 場景的完整 JSON。主題：<topic>。語言：<lang>。

本場景大綱：
<JSON.stringify(outline)>

{如果有 teacherContext}
角色設定：
<teacherContext>

輸出 JSON（不要 markdown 外框，直接 JSON）：
{
  "id": "<outline.id 改成 scene-<slug>>",
  "stageId": "<classroom-id>",
  "type": "<outline.type>",
  "title": "<outline.title>",
  "order": <outline.order>,
  "content": { ...按 outline.type 展開... },
  "actions": [
    { "id": "speech-<scene-id>", "type": "speech", "text": "60 字以內的旁白" }
  ]
}

遵守以下 Scene Schema 與 PPTist 規則（見下方 Schema Reference）。
```

### Scene Schema Reference

**Slide content (`type: "slide"`):**

```json
{
  "type": "slide",
  "canvas": {
    "id": "canvas-<slug>",
    "viewportSize": 1000,
    "viewportRatio": 0.5625,
    "theme": {
      "backgroundColor": "#0f172a",
      "themeColors": ["#6366f1", "#22d3ee", "#f472b6", "#34d399"],
      "fontColor": "#ffffff",
      "fontName": "Microsoft Yahei"
    },
    "elements": [ ... ]
  }
}
```

**Quiz content (`type: "quiz"`):**

```json
{
  "type": "quiz",
  "questions": [
    {
      "id": "q1",
      "type": "single",
      "question": "<question text>",
      "options": [
        { "id": "a", "label": "<option A>" },
        { "id": "b", "label": "<option B>" }
      ],
      "answer": "b",
      "explanation": "<why this is correct>"
    }
  ]
}
```

> ⚠️ Quiz options MUST use `"label"` (NOT `"text"`). Quiz `actions[0].text` is `"現在來測驗！請回答題目。"`.

**PPTist elements — every element has base fields** `type, id, left, top, width, height, rotate`.

**Shape (MUST have `viewBox`):**
```json
{
  "type": "shape",
  "id": "my-shape",
  "left": 0, "top": 0, "width": 1000, "height": 562.5,
  "rotate": 0,
  "viewBox": [1000, 562.5],
  "path": "M 0 0 L 1000 0 L 1000 562.5 L 0 562.5 Z",
  "fill": "#1e293b",
  "fixedRatio": false
}
```

`viewBox` must equal `[width, height]`. Missing `viewBox` = runtime crash.

**Text (content MUST be HTML):**
```json
{
  "type": "text",
  "id": "my-text",
  "left": 50, "top": 100, "width": 800, "height": 80,
  "rotate": 0,
  "content": "<p><span style=\"font-size: 40px; color: #ffffff; font-weight: bold;\">標題</span></p>",
  "defaultFontName": "Microsoft Yahei",
  "defaultColor": "#ffffff"
}
```

Plain string content will NOT render.

**Shape paths:**

| Shape | Path |
|-------|------|
| Rectangle | `M 0 0 L {w} 0 L {w} {h} L 0 {h} Z` |
| Rounded rect (r=10) | `M 10 0 L {w-10} 0 Q {w} 0 {w} 10 L {w} {h-10} Q {w} {h} {w-10} {h} L 10 {h} Q 0 {h} 0 {h-10} L 0 10 Q 0 0 10 0 Z` |
| Circle | `M {r} 0 A {r} {r} 0 1 1 {r-0.01} 0 Z` |

**Layout:**
- Canvas 1000 × 562.5 px
- Heading font 36–44 px, top ≈ 30–50
- Divider bar: `left:50, top:95, width:80, height:5`, fill `#6366f1`
- Cards width 200–440 px, rounded rect, fill `#1e293b`
- Safe text area: left 50–950, top 30–530

**Dark theme palette:**

| Usage | Color |
|-------|-------|
| Background | `#0f172a` |
| Card background | `#1e293b` |
| Primary accent | `#6366f1` |
| Cyan accent | `#22d3ee` |
| Pink accent | `#f472b6` |
| Green accent | `#34d399` |
| Gold accent | `#f59e0b` |
| Body text | `#ffffff` |
| Secondary text | `#cbd5e1` |
| Muted text | `#94a3b8` |

**Narration (`actions[0].text`):**
- ≤ 60 中文字 (TTS timeout guard)
- Natural spoken language, not slide bullets
- Don't mention any teacher name

---

## Step 6: Assemble & Save

Print: `Step 6/9 💾 寫入檔案...`

Build the final course JSON:

```json
{
  "id": "<classroom-id>",
  "stage": {
    "id": "<classroom-id>",
    "name": "<course title>",
    "description": "<one-line description>",
    "language": "<zh-TW|en|ja>",
    "createdAt": "<ISO timestamp>",
    "updatedAt": "<ISO timestamp>"
  },
  "scenes": [...successful scenes, sorted by order...],
  "createdAt": "<ISO timestamp>"
}
```

Write directly to the Docker volume:

```python
import json, datetime

CLASSROOMS_DIR = "/Users/huli/Desktop/teach-me-cli/data/classrooms"
classroom_id = "<classroom-id>"

course_data = { ...the assembled dict... }

output_path = f"{CLASSROOMS_DIR}/{classroom_id}.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(course_data, f, ensure_ascii=False, indent=2)

print(f"Saved to {output_path}")
```

---

## Step 7: Generate TTS (unless `--no-tts`)

Print: `Step 7/9 🔊 生成 TTS...`

If `--no-tts`: print `[skip] TTS 已關閉` and continue to Step 8.

Decide engine:
- Default: check `curl -s http://localhost:9880/health` — if `model_loaded: true`, use **Qwen3**
- If Qwen3 unavailable and `GEMINI_API_KEY` set: fall back to **Gemini**
- If `--tts gemini` explicit: use Gemini
- If neither available: print `[skip] No TTS engine available` and continue

Update status per scene: `Step 7/9 🔊 生成 TTS <n>/<N>...`

### Option A: Local Qwen3-TTS

```python
import json, urllib.request, os

CLASSROOMS_DIR = "/Users/huli/Desktop/teach-me-cli/data/classrooms"
classroom_id = "<classroom-id>"
voice = "serena"  # options: serena, vivian, ryan, aiden, eric, dylan, uncle_fu, ono_anna, sohee
audio_dir = f"{CLASSROOMS_DIR}/{classroom_id}/audio"
json_path = f"{CLASSROOMS_DIR}/{classroom_id}.json"
base_url = f"https://openmaic.openmaic.orb.local/api/classroom-media/{classroom_id}/audio"

os.makedirs(audio_dir, exist_ok=True)

with open(json_path) as f:
    data = json.load(f)

generated = 0
for scene in data["scenes"]:
    for action in scene.get("actions", []):
        if action.get("type") == "speech" and "audioUrl" not in action:
            text = action["text"]
            action_id = action["id"]
            audio_id = f"tts_{action_id}"
            audio_file = f"{audio_dir}/{audio_id}.wav"

            print(f"Generating: {action_id}")
            payload = json.dumps({
                "model": "qwen3-tts",
                "input": text,
                "voice": voice
            }).encode()
            req = urllib.request.Request(
                "http://localhost:9880/v1/audio/speech",
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            try:
                with urllib.request.urlopen(req, timeout=120) as resp:
                    audio_data = resp.read()
                with open(audio_file, "wb") as af:
                    af.write(audio_data)
                action["audioId"] = audio_id
                action["audioUrl"] = f"{base_url}/{audio_id}.wav"
                generated += 1
                print(f"  OK: {len(audio_data)} bytes")
            except Exception as e:
                print(f"  FAILED: {e}")

with open(json_path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Done: {generated} audio files generated.")
```

> ⚠️ Use `timeout=120` (not 60). Re-run to retry failed scenes (`"audioUrl" not in action` guards skip-re-do).

### Option B: Gemini TTS (Gemini 3.1 Flash TTS)

**Requirements:** `GEMINI_API_KEY` only (no SDK needed).

```python
import urllib.request, json, wave, base64, os

API_KEY = os.environ["GEMINI_API_KEY"]
CLASSROOMS_DIR = "/Users/huli/Desktop/teach-me-cli/data/classrooms"
classroom_id = "<classroom-id>"
voice = "Kore"  # see voice list below
audio_dir = f"{CLASSROOMS_DIR}/{classroom_id}/audio"
json_path = f"{CLASSROOMS_DIR}/{classroom_id}.json"
base_url = f"https://openmaic.openmaic.orb.local/api/classroom-media/{classroom_id}/audio"

os.makedirs(audio_dir, exist_ok=True)

def save_wav(filename, pcm_data, channels=1, rate=24000, sample_width=2):
    with wave.open(filename, "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(sample_width)
        wf.setframerate(rate)
        wf.writeframes(pcm_data)

def generate_tts(text):
    payload = json.dumps({
        "contents": [{"parts": [{"text": text}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {"voiceName": voice}
                }
            }
        }
    }).encode()
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key={API_KEY}",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read())
        b64 = data["candidates"][0]["content"]["parts"][0]["inlineData"]["data"]
        return base64.b64decode(b64)

with open(json_path) as f:
    data = json.load(f)

generated = 0
for scene in data["scenes"]:
    for action in scene.get("actions", []):
        if action.get("type") == "speech" and "audioUrl" not in action:
            text = action["text"]
            action_id = action["id"]
            audio_id = f"tts_{action_id}"
            audio_file = f"{audio_dir}/{audio_id}.wav"

            print(f"Generating (Gemini TTS): {action_id}")
            try:
                pcm = generate_tts(text)
                save_wav(audio_file, pcm)
                action["audioId"] = audio_id
                action["audioUrl"] = f"{base_url}/{audio_id}.wav"
                generated += 1
                print(f"  OK: {len(pcm):,} bytes")
            except Exception as e:
                print(f"  FAILED: {e}")

with open(json_path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Done: {generated} audio files generated.")
```

> ℹ️ Audio format: PCM 24 kHz, 16-bit, mono.

**Gemini TTS voice options (30 voices):**

| Style | Voices |
|-------|--------|
| Bright/Upbeat | Zephyr, Puck, Leda, Aoede, Callirrhoe |
| Warm/Calm | Kore, Orus, Autonoe, Enceladus, Despina |
| Deep/Strong | Charon, Fenrir, Iapetus, Umbriel, Algieba |
| Expressive | Erinome, Algenib, Rasalgethi, Laomedeia, Achernar |
| Others | Alnilam, Schedar, Gacrux, Pulcherrima, Achird, Zubenelgenubi, Vindemiatrix, Sadachbia, Sadaltager, Sulafat |

**Recommended for zh-TW:** `Kore`, `Aoede`, `Zephyr`.

**Audio style tags** (embed in speech text):
- `[輕聲地]` / `[whispers]`
- `[興奮地]` / `[excitedly]`
- `[笑著說]` / `[laughs]`

---

## Step 8: Verify Deployment

Print: `Step 8/9 ✔️ 驗證部署...`

```bash
curl -sk https://openmaic.openmaic.orb.local/classroom/<classroom-id> -w "\n%{http_code}" | tail -1
# Should return 200
```

URL: `https://openmaic.openmaic.orb.local/classroom/<classroom-id>`

---

## Step 9: Report Result

Print: `Step 9/9 ✅ 完成！`

Then output:

```
📚 主題：<topic>
🆔 ID：<classroom-id>
🔗 URL：https://openmaic.openmaic.orb.local/classroom/<classroom-id>
🌐 研究：<已整合 N 筆網路資料 | 已略過>
👥 人格：<自訂 N 個角色 | 預設>
📊 場景：<N> 個（<X> 張投影片 + <Y> 題測驗）
🎵 TTS：<N 個已生成 | 已跳過>
{ 如果 skippedScenes.length > 0 }
⚠️ 跳過的場景：<N> 個
  - 場景 <order>：<title> — <reason>
```

---

## Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot read properties of undefined (reading '0')` | Shape missing `viewBox` | Add `"viewBox": [width, height]` to every shape |
| Text not rendering | `content` is plain string | Wrap in `<p><span style="...">text</span></p>` |
| Quiz options show blank | Options use `"text"` field | Change to `"label"` |
| TTS timeout (Qwen3) | 60s default too short | `timeout=120`; re-run to retry failed scenes |
| Gemini TTS `GEMINI_API_KEY` error | Key not set | `export GEMINI_API_KEY="..."` |
| Gemini audio wrong speed | Wrong WAV params | `rate=24000, channels=1, sample_width=2` |
| Course not found (404) | JSON not saved correctly | Verify file exists at `classrooms/<id>.json` with top-level `"id"` field |
| Old audio not heard | IndexedDB stale cache | Run `indexedDB.deleteDatabase('MAIC-Database')` in browser console, reload |
| Scene generation loops forever | LLM returning markdown-wrapped JSON | Re-prompt with "純 JSON，不要 ``` 外框" |
| All scenes skipped | LLM ignoring schema | Abort the run, not worth continuing with 0 scenes |

---

## Recommended Course Structure (5+1 scenes)

1. **Cover** — title, subtitle, decorative ∫ or topic symbol
2. **Why** — motivation, 4 reason cards
3. **Core Concepts** — 2–4 concept cards with formulas/icons
4. **Deep Dive** — detailed explanations, formulas, examples
5. **Applications** — real-world use cases, 4 application cards
6. **Quiz** — 4 questions (mix formula, numerical, conceptual)

Adjust structure based on topic complexity. The Step 4 outline generator enforces `type:"quiz"` for the final scene.
