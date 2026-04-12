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

### 1. Check / Acquire Access Code

Check if `accessCode` is in the skill config at `~/.openclaw/openclaw.json`:

- **If found:** Announce the code is stored, skip to phase 2.
- **If not found:** Tell the user:
  ```
  To generate classrooms, you need an access code from open.maic.chat.
  1. Visit https://open.maic.chat and get your access code (starts with sk-)
  2. Add it to ~/.openclaw/openclaw.json under:
     skills.entries.openmaic.config.accessCode
  3. Tell me when you're done.
  ```
  Wait for confirmation before continuing.

### 2. Verify Connectivity

Make a test request to the hosted service:
```
GET https://open.maic.chat/api/health
Authorization: Bearer <access-code>
```

- **On success (200):** Proceed to phase 3 (generation).
- **On failure (401):** Access code is invalid. Ask the user to regenerate it at open.maic.chat and update the config.
- **On failure (network):** Suggest checking network connectivity or trying again later.

### 3. Generate A Classroom

Load [references/hosted-generate-flow.md](references/hosted-generate-flow.md).

Follow the flow to collect user input (topic or PDF), submit the generation request to the hosted service, and poll until completion.

## Response Style

- Keep each step short and explicit.
- Explain why hosted-only is simpler: "No API keys to manage, instant access via open.maic.chat."
- When returning a classroom link, place the raw absolute URL on its own line with no bold, markdown link syntax, code formatting, or tables.
- Do not mention or suggest upstream OpenMAIC, local setup, or self-hosting options.
