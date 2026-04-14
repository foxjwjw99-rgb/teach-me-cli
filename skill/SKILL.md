# /teach-me — Generate Beautiful Courses Instantly

When this skill is invoked with `/teach-me [args]`, follow these steps exactly.

## Step 1: Parse Input

The `args` string after `/teach-me` is the `<input>`. It can be:
- A **topic string** (e.g., `"Teach me quantum computing"`)
- A **file path** (PDF, Markdown, or TXT — resolve to absolute path)

Supported optional flags the user may append:
- `--output <dir>` — output directory (default: `./output` inside CLI root)
- `--format pptx,json,html,graph` — comma-separated export formats (default: `pptx,json,html`)
  - `graph` generates an interactive knowledge graph (`graph.html`) showing scene and concept relationships
- `--concurrency <n>` — parallel LLM calls (default: 3)

If no args are provided, ask the user: "Please tell me the topic or file path for the course."

## Step 2: Run the CLI via Bash

Use the Bash tool to run:

```bash
cd /Users/huli/Desktop/teach-me-cli && npx tsx src/cli/index.ts generate "<input>" --format pptx,json,html
```

- `ANTHROPIC_API_KEY` is already in the environment — do not prompt for it.
- If the input is a file path, pass the absolute path and add `--topic "<title>"` if the user provided a title.
- Append any user-specified flags (e.g. `--output`, `--concurrency`).
- The command may take 2–5 minutes; inform the user it is running.

Example commands:

```bash
# Topic string
cd /Users/huli/Desktop/teach-me-cli && npx tsx src/cli/index.ts generate "Teach me quantum computing" --format pptx,json,html

# File input
cd /Users/huli/Desktop/teach-me-cli && npx tsx src/cli/index.ts generate "/absolute/path/to/notes.md" --topic "My Course" --format pptx,json,html

# Custom output dir
cd /Users/huli/Desktop/teach-me-cli && npx tsx src/cli/index.ts generate "TCP/IP Networking" --output ~/Desktop/courses --format pptx,json,html

# Include knowledge graph
cd /Users/huli/Desktop/teach-me-cli && npx tsx src/cli/index.ts generate "Machine Learning Basics" --format pptx,json,html,graph
```

## Step 3: Report Results

After the command completes, summarize:
- The generated files and their paths
- Number of scenes created
- Any warnings or errors from the output

If audio generation fails (OmniVoice not available), that is normal — mention it was skipped and the other files are still usable.

If `--format graph` is included, report the path to `graph.html` and note that it is an interactive knowledge graph viewable in any browser.
