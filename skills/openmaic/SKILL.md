---
name: openmaic
description: Generate complete OpenMAIC courses (slides + quiz + TTS audio) locally and deploy to the OrbStack Docker container.
user-invocable: true
metadata: { "openclaw": { "emoji": "🏫" } }
---

# /openmaic — Generate & Deploy Courses to OpenMAIC

When this skill is invoked, generate a complete course and deploy it to the local OpenMAIC instance.

## Usage

```
/openmaic <topic>                      # Generate course on any topic
/openmaic <topic> --no-tts             # Skip TTS audio generation
/openmaic <topic> --lang en            # Override language (zh-TW default)
/openmaic <topic> --id my-id           # Custom classroom ID (default: auto from topic)
/openmaic <topic> --tts gemini         # Use Gemini TTS instead of local Qwen3
/openmaic <topic> --voice Kore         # Override voice (depends on TTS engine)
```

## Environment

- **OpenMAIC URL**: `https://openmaic.openmaic.orb.local` (Docker container via OrbStack)
- **Local TTS server**: `http://localhost:9880` (Qwen3-TTS, check with `curl http://localhost:9880/health`)
- **Gemini TTS**: requires `GEMINI_API_KEY` env var and `pip install google-genai`
- **Data folder**: `/Users/huli/Desktop/teach-me-cli/data/` (bind-mounted to `/app/data` in container)

> ⚠️ `save-classroom.ts` and `generate-tts.py` scripts do NOT exist. Always use the methods described below (direct file write + inline Python TTS).

### TTS Engine Selection

| Flag | Engine | Requirement |
|------|--------|-------------|
| (default) | Local Qwen3-TTS | `localhost:9880` running |
| `--tts gemini` | Gemini 3.1 Flash TTS | `GEMINI_API_KEY` set |
| `--no-tts` | None | — |

If `--tts gemini` is not specified, check if `localhost:9880` is running. If not, fall back to Gemini TTS automatically (if API key available), otherwise skip TTS.

---

## Step 1: Parse Input

Extract from the args:
- `<topic>` — the course subject (required)
- `--no-tts` — skip TTS generation
- `--lang <code>` — language code (`zh-TW`, `en`, `ja`, etc.), default `zh-TW`
- `--id <id>` — custom classroom ID (only `[a-zA-Z0-9_-]` allowed)

If no topic, ask: "請輸入課程主題。"

Generate a **classroom ID** from the topic if not provided:
- Lowercase English, replace spaces/special chars with hyphens
- Example: "如何學英文" → `how-to-learn-english`, append `-YYYY` for year
- Must match `/^[a-zA-Z0-9_-]+$/`

---

## Step 2: Generate Course JSON

Use your AI brain to generate a complete course JSON. Follow the schema exactly.

### ⚠️ Top-level structure (MUST include `id` and `createdAt` at root)

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
  "scenes": [ ...scenes... ],
  "createdAt": "<ISO timestamp>"
}
```

### Scene types

Each scene must have: `id`, `stageId`, `type`, `title`, `order`, `content`

**Slide scene** (`type: "slide"`):
```json
{
  "id": "scene-<name>",
  "stageId": "<classroom-id>",
  "type": "slide",
  "title": "<scene title>",
  "order": 0,
  "content": {
    "type": "slide",
    "canvas": {
      "id": "canvas-<name>",
      "viewportSize": 1000,
      "viewportRatio": 0.5625,
      "theme": {
        "backgroundColor": "#0f172a",
        "themeColors": ["#6366f1", "#22d3ee", "#f472b6", "#34d399"],
        "fontColor": "#ffffff",
        "fontName": "Microsoft Yahei"
      },
      "elements": [ ...elements... ]
    }
  },
  "actions": [
    {
      "id": "speech-<scene-id>",
      "type": "speech",
      "text": "<narration text for TTS — keep under 60 Chinese characters>"
    }
  ]
}
```

**Quiz scene** (`type: "quiz"`):
```json
{
  "id": "scene-quiz",
  "stageId": "<classroom-id>",
  "type": "quiz",
  "title": "測驗",
  "order": 5,
  "content": {
    "type": "quiz",
    "questions": [
      {
        "id": "q1",
        "type": "single",
        "question": "<question text>",
        "options": [
          { "id": "a", "label": "<option A>" },
          { "id": "b", "label": "<option B>" },
          { "id": "c", "label": "<option C>" },
          { "id": "d", "label": "<option D>" }
        ],
        "answer": "b",
        "explanation": "<why this is correct>"
      }
    ]
  },
  "actions": [
    { "id": "speech-scene-quiz", "type": "speech", "text": "現在來測驗！請回答題目。" }
  ]
}
```

> ⚠️ Quiz options MUST use `"label"` field (NOT `"text"`). Using `"text"` will cause options to render blank in the UI.

---

## Step 3: PPTist Element Format (CRITICAL)

Every element needs these base fields: `type`, `id`, `left`, `top`, `width`, `height`, `rotate`

### ⚠️ Shape elements — MUST have `viewBox`

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

**`viewBox` must equal `[width, height]` of the shape.**

Missing `viewBox` = crash: `TypeError: Cannot read properties of undefined (reading '0')`

### ⚠️ Text elements — content MUST be HTML

```json
{
  "type": "text",
  "id": "my-text",
  "left": 50, "top": 100, "width": 800, "height": 80,
  "rotate": 0,
  "content": "<p><span style=\"font-size: 40px; color: #ffffff; font-weight: bold;\">標題文字</span></p>",
  "defaultFontName": "Microsoft Yahei",
  "defaultColor": "#ffffff"
}
```

Plain string content (no `<p>` tags) will NOT render correctly.

### Common shape paths

| Shape | Path |
|-------|------|
| Rectangle | `M 0 0 L {w} 0 L {w} {h} L 0 {h} Z` |
| Rounded rect (r=10) | `M 10 0 L {w-10} 0 Q {w} 0 {w} 10 L {w} {h-10} Q {w} {h} {w-10} {h} L 10 {h} Q 0 {h} 0 {h-10} L 0 10 Q 0 0 10 0 Z` |
| Circle | `M {r} 0 A {r} {r} 0 1 1 {r-0.01} 0 Z` |

### Slide layout recommendations

- Canvas: 1000 × 562.5px
- Heading: font-size 36-44px, top ~30-50px
- Divider bar: `left:50, top:95, width:80, height:5`, fill `#6366f1`
- Cards: width ~200-440px, rounded rect path, fill `#1e293b`
- Safe text area: left 50–950px, top 30–530px

### Dark theme color palette

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

---

## Step 4: Narration Text Guidelines

Each scene's `speech.text` should be:
- **Under 60 Chinese characters** to avoid TTS timeout
- Natural spoken language, not slide bullet points
- Summarize the slide content briefly

---

## Step 5: Save to OpenMAIC

Write the JSON **directly to the Docker volume** (do NOT use save-classroom.ts — it doesn't exist):

```python
import json

CLASSROOMS_DIR = "/Users/huli/Desktop/teach-me-cli/data/classrooms"
classroom_id = "<classroom-id>"

course_data = { ...the full JSON dict... }

output_path = f"{CLASSROOMS_DIR}/{classroom_id}.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(course_data, f, ensure_ascii=False, indent=2)

print(f"Saved to {output_path}")
```

Verify it's accessible:
```bash
curl -sk https://openmaic.openmaic.orb.local/classroom/<classroom-id> -w "\n%{http_code}" | tail -1
# Should return 200
```

URL: `https://openmaic.openmaic.orb.local/classroom/<classroom-id>`

---

## Step 6: Generate TTS Audio (unless `--no-tts`)

### Option A: Local Qwen3-TTS

First check if server is running:
```bash
curl -s http://localhost:9880/health
# Look for: "model_loaded": true
```

If running, use this inline Python:

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

> ⚠️ Use `timeout=120` (not 60). Some TTS requests take 60–90 seconds. If scenes fail, re-run the script — it skips already-generated scenes via `"audioUrl" not in action` guard.

---

### Option B: Gemini TTS (Gemini 3.1 Flash TTS)

Use when `--tts gemini` is specified, or when local server is not running.

**Requirements:** only `GEMINI_API_KEY` — no SDK install needed (uses REST API directly via `urllib`)

**Inline Python (REST API, no SDK needed):**

```python
import urllib.request, json, wave, base64, os

API_KEY = os.environ["GEMINI_API_KEY"]  # or paste key directly
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

> ℹ️ Audio format: PCM 24kHz, 16-bit, mono — must match `save_wav()` params exactly.

**Gemini TTS voice options (30 voices):**

| Style | Voices |
|-------|--------|
| Bright/Upbeat | Zephyr, Puck, Leda, Aoede, Callirrhoe |
| Warm/Calm | Kore, Orus, Autonoe, Enceladus, Despina |
| Deep/Strong | Charon, Fenrir, Iapetus, Umbriel, Algieba |
| Expressive | Erinome, Algenib, Rasalgethi, Laomedeia, Achernar |
| Others | Alnilam, Schedar, Gacrux, Pulcherrima, Achird, Zubenelgenubi, Vindemiatrix, Sadachbia, Sadaltager, Sulafat |

**Recommended for zh-TW content:** `Kore`, `Aoede`, `Zephyr`

**Audio style tags** (embed in speech text):
- `[輕聲地]` / `[whispers]` — whisper style
- `[興奮地]` / `[excitedly]` — excited tone
- `[笑著說]` / `[laughs]` — with laughter
- Example: `"[輕聲地] 這是個小秘密..."`

---

## Step 7: Report Result

After completion, report:

```
✅ 課程已生成！

📚 主題：<topic>
🆔 ID：<classroom-id>
🔗 URL：https://openmaic.openmaic.orb.local/classroom/<classroom-id>
🎵 TTS：<X 個場景已生成音訊 / 已跳過>
📊 場景：<N> 個（<X> 張投影片 + <Y> 題測驗）
```

---

## Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot read properties of undefined (reading '0')` | Shape missing `viewBox` | Add `"viewBox": [width, height]` to every shape |
| Text not rendering | `content` is plain string | Wrap in `<p><span style="...">text</span></p>` |
| Quiz options show blank | Options use `"text"` field | Change to `"label"` field |
| TTS timeout on first run (Qwen3) | 60s default too short | Use `timeout=120`; re-run script to retry failed scenes |
| Gemini TTS `google.genai` not found | SDK not installed | `pip install google-genai` |
| Gemini TTS `GEMINI_API_KEY` error | Key not set | `export GEMINI_API_KEY="..."` before running |
| Gemini audio sounds wrong speed | Wrong WAV params | Must use `rate=24000, channels=1, sample_width=2` |
| Course not found (404) | JSON not saved correctly | Verify file exists at `classrooms/<id>.json` with top-level `"id"` field |
| Old audio not heard | IndexedDB stale cache | Run `indexedDB.deleteDatabase('MAIC-Database')` in browser console, reload |
| `save-classroom.ts` not found | Script doesn't exist | Write JSON directly to Docker volume (see Step 5) |
| `generate-tts.py` not found | Script doesn't exist | Use inline Python TTS (see Step 6) |

---

## Recommended Course Structure (5+1 scenes)

1. **Cover** (scene-cover) — title, subtitle, decorative ∫ or topic symbol
2. **Why** (scene-why) — motivation, 4 reason cards
3. **Core Concepts** (scene-concepts) — 2–4 concept cards with formulas/icons
4. **Deep Dive** (scene-deep) — detailed explanations, formulas, examples
5. **Applications** (scene-tools) — real-world use cases, 4 application cards
6. **Quiz** (scene-quiz) — 4 questions (mix formula, numerical, conceptual)

Adjust structure based on topic complexity.
