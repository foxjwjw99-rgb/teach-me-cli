# /teach-me — Generate Beautiful Courses Instantly

_Powered by teach-me-cli, your personal course generation engine._

Use teach-me-cli to generate interactive courses from any topic or document.

## Usage

```
/teach-me <topic-or-file>
```

### Examples

```
/teach-me "Teach me quantum computing"
/teach-me "Help me create a course from this PDF"
/teach-me "Machine learning for beginners"
```

## What You Get

✨ **Professional Course**
- 📚 Structured 12-20 scene outline
- 📊 Beautiful PowerPoint slides (editable)
- 🎙️ Natural narration with OmniVoice
- 🌐 Interactive HTML player

## How It Works

1. **Send your topic** — Plain text or upload a file (PDF, Markdown)
2. **AI generates outline** — 4-stage pipeline (outline → content → actions → audio)
3. **Get your course** — Download PPTX, JSON, or view as HTML

## Installation

```bash
clawhub install teach-me-cli
```

Or manually copy to `~/.openclaw/skills/teach-me/`

## Configuration

The skill auto-detects teach-me-cli installation. Set `TEACH_ME_CLI_PATH` in `.openclaw/openclaw.json` if needed:

```jsonc
{
  "skills": {
    "entries": {
      "teach-me": {
        "config": {
          "cliPath": "/path/to/teach-me-cli"
        }
      }
    }
  }
}
```

## Output Files

After generation:

```
🎓 Course generated: "Quantum Computing 101"

📁 Download files:
  • quantum-computing-101.pptx   (PowerPoint - editable)
  • classroom.json               (Course structure)
  • index.html                   (Interactive player)
  • audio/                       (MP3 narration files)
```

## Tips

- 📝 **Long content?** Upload a Markdown or PDF for best results
- 🎙️ **Custom voice?** Configure OmniVoice settings in `.env.local`
- 🚀 **Faster generation?** Shorter topics = faster generation (2-3 minutes typical)

## Need Help?

```
/teach-me --help
/teach-me config
```

Or ask: "Help me use teach-me"
