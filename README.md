# teach-me-cli v2.0

**OpenMAIC-inspired course generation tool powered by OpenClaw + OmniVoice**

Generate beautiful, interactive courses from any topic or document. Powered by your choice of LLM (Claude, GPT, Gemini, etc.) via OpenClaw, with beautiful narration via OmniVoice.

## Features

✨ **Multi-Stage Generation Pipeline**
- 📚 Stage 1: Generate structured course outline (12-20 scenes)
- 📄 Stage 2: Generate detailed content for each scene
- 🎬 Stage 3: Generate speaker actions (whiteboard, speech, effects)
- 🎙️  Stage 4: Generate audio narration with OmniVoice

✅ **Rich Output Formats**
- **PPTX** — Beautiful, editable PowerPoint presentations
- **JSON** — Complete course structure (compatible with OpenMAIC player)
- **HTML** — Interactive web player for in-browser viewing

🧠 **LLM Integration**
- Works with any OpenClaw-supported model (Claude, GPT-4, Gemini, etc.)
- Stateless design — perfect for serverless deployments
- No API key management — OpenClaw handles authentication

🎙️ **Professional Audio**
- OmniVoice text-to-speech with fixed voice cloning
- Taiwan Mandarin style for natural, conversational narration
- Configurable speech rate and tone

🔌 **OpenClaw Integration**
- Can be called as an OpenClaw skill from messaging apps (Telegram, Feishu, etc.)
- Accepts both text topics and uploaded documents

## Quick Start

### 1. Install Dependencies

```bash
cd teach-me-cli
npm install
```

### 2. Configure

Create or update `.env.local`:

```env
ANTHROPIC_API_KEY=sk-ant-...  # Optional, for standalone mode
```

OmniVoice configuration is pre-baked (uses fixed clone reference).

### 3. Generate a Course

```bash
# From a topic
npm run generate "微積分入門"

# From a file
npm run generate ./my-notes.md -o ./output

# With custom formats
npm run generate "Python 基礎" -f pptx,json,html
```

### 4. View Output

```
output/
├── 微積分入門.pptx       # Editable PowerPoint
├── classroom.json        # Course structure
├── index.html           # Interactive player
└── audio/               # MP3 narration files
```

Open `output/index.html` in your browser to view the course.

## CLI Usage

```bash
teach-me generate <input> [options]

Options:
  -o, --output <dir>      Output directory (default: ./output)
  -f, --format <list>     Export formats: pptx,json,html (default: pptx,json)
  -t, --topic <string>    Override topic (useful for files)

Examples:
  teach-me generate "Teach me React"
  teach-me generate ./lecture.pdf -o ./courses
  teach-me generate ./notes.md -f json -t "Advanced JavaScript"
```

## Architecture

```
Input (Topic / File)
       ↓
┌──────────────────────────────────┐
│  LangGraph Director              │
│  (4-stage course generation)     │
└──────────────────────────────────┘
       ↓ ↓ ↓ ↓
   Stage 1: Outline Generation
   Stage 2: Content Generation
   Stage 3: Action Generation
   Stage 4: Audio Generation
       ↓ ↓ ↓
   Export (PPTX / JSON / HTML)
```

### Design Principles

1. **Stateless** — Each run is independent, no server state
2. **Modular** — Each stage can be customized independently
3. **OpenClaw-Native** — Designed to work seamlessly with OpenClaw
4. **Type-Safe** — Full TypeScript support with Zod validation

## Project Structure

```
src/
├── cli/
│   ├── index.ts              # CLI entry point
│   └── commands/
│       └── generate.ts       # Generate command
├── orchestration/
│   ├── director-graph.ts     # LangGraph 4-stage pipeline
│   ├── llm-adapter.ts        # OpenClaw LLM integration
│   └── prompt-builder.ts     # Prompt generation
├── generation/
│   ├── stage-outline.ts      # Stage 1
│   ├── stage-content.ts      # Stage 2
│   ├── stage-images.ts       # Stage 3 (optional)
│   └── stage-actions.ts      # Stage 4 (optional)
├── export/
│   └── index.ts              # PPTX, JSON, HTML export
├── audio/
│   └── omnivoice.ts          # OmniVoice TTS
└── types.ts                  # Type definitions

skill/
└── SKILL.md                  # OpenClaw skill definition
```

## Using with OpenClaw

teach-me-cli is designed to work as an OpenClaw skill.

### Install as OpenClaw Skill

```bash
clawhub install teach-me-cli
# or manually:
cp -r ./skill ~/.openclaw/skills/teach-me
```

### Usage from OpenClaw

```
User → OpenClaw → /teach-me "Teach me machine learning"
                ↓
           teach-me-cli (this tool)
                ↓
         Course generation
                ↓
           User receives PPTX + JSON + HTML
```

## Development

### Build

```bash
npm run build
```

### Run in Dev Mode

```bash
npm run dev -- "Test Topic"
```

### Test

```bash
npm run test
```

## Configuration

### OmniVoice Settings

Edit `.env.local` or pass config directly:

```env
OMNIVOICE_REF_AUDIO=/path/to/voice-clone.wav
OMNIVOICE_REF_TEXT="Reference text"
OMNIVOICE_INSTRUCT="female, very low pitch"
OMNIVOICE_SPEED=0.9
OMNIVOICE_STYLE="台灣國語..."
```

### LLM Integration

**Primary (OpenClaw mode):**
teach-me-cli uses OpenClaw's local model bridge (`openclaw infer model run --json`).
In this mode, you don't need API keys — OpenClaw handles model routing.

**Fallback (Direct API, if needed):**
For direct API access without OpenClaw, set:

```env
ANTHROPIC_API_KEY=sk-ant-...
```

## Performance

- **Outline generation** — ~30 seconds (with LLM)
- **Content generation** — ~60-90 seconds (parallel processing)
- **Audio generation** — ~30 seconds (3-5 scenes)
- **Total** — ~2-3 minutes per full course

## Troubleshooting

### "OmniVoice not found"

Make sure OmniVoice is installed and in your PATH:

```bash
which omnivoice-local
# Should return the path, if not: pip install omnivoice-cli
```

### "No LLM configured"

teach-me-cli primarily runs via OpenClaw's local model bridge. If you're running without OpenClaw, set a direct API key as fallback:

```bash
# Fallback: direct API mode (without OpenClaw)
export ANTHROPIC_API_KEY=sk-ant-...
npm run generate "Your topic"
```

### Audio generation failures

OmniVoice might not be available. The CLI will skip audio generation but still produce PPTX/JSON:

```bash
npm run generate "Your topic" -f pptx,json
```

## Roadmap

- [ ] Support for PDF image extraction
- [ ] Interactive quiz generation with auto-grading
- [ ] Diagram generation (via DALL-E, etc.)
- [ ] Real-time playback with whiteboard simulation
- [ ] Multi-language support
- [ ] Cloud deployment (AWS Lambda, Google Cloud Functions)

## License

MIT — Made with 🦊 by Jimmy + OpenClaw

## Support

Questions or issues? Open an issue on GitHub or ask your OpenClaw assistant!

```bash
# In OpenClaw
"Help me debug teach-me-cli"
```
