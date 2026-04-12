# Hosted Generation Flow

This flow handles classroom generation via the hosted open.maic.chat service.

## Input Collection

Ask the user for input. They can provide:

1. **A topic** — Free text describing what to learn. Examples: "quantum entanglement", "photosynthesis process", "Shakespeare's sonnets"
2. **A PDF file** — Upload or reference a local PDF. Examples: lecture notes, research papers, textbooks

Ask for confirmation before reading the file from disk.

## Generation Request

Submit to the hosted API:

```
POST https://open.maic.chat/api/generate-classroom
Authorization: Bearer <access-code>
Content-Type: application/json

{
  "type": "topic",  // or "document" for PDF
  "input": "quantum entanglement",  // topic name
  // OR
  "document": "<base64-encoded PDF>",  // if PDF
  "documentName": "lecture-notes.pdf"  // optional, for display
}
```

Supported content types: `topic`, `document` (PDF).

## Polling & Status

After submission, you receive a `classroomId` and `jobId`. Poll for completion:

```
GET https://open.maic.chat/api/classrooms/{classroomId}/status
Authorization: Bearer <access-code>
```

Response status field values:

- `pending` — Still generating. Wait and poll again.
- `completed` — Ready. Return the classroom URL.
- `failed` — Generation error. Show error message to user.

## Polling Strategy

- Initial poll: immediately after submission
- Subsequent polls: every 3-5 seconds
- Maximum wait: ~60 seconds before suggesting manual check at open.maic.chat
- If the turn expires, tell the user to check the status manually at the classroom URL provided

## Success Response

Once `status === "completed"`, return the classroom URL:

```
https://open.maic.chat/classroom/{classroomId}
```

Place it on its own line with no bold, markdown link syntax, code formatting, or tables.

## Error Handling

| HTTP Status | Meaning | Action |
|-------------|---------|--------|
| 401 | Invalid access code | Check the code is correct; regenerate at open.maic.chat if needed |
| 403 | Daily quota exhausted | Inform user: 10 classrooms per day, resets at midnight UTC |
| 400 | Bad input (invalid topic or PDF) | Ask user to provide valid input and retry |
| 500 | Server error | Suggest retrying in a few moments or checking open.maic.chat status |

## Optional Features

The hosted service may support optional features returned in the capability check. Common ones:

- `enableWebSearch` — Enrich content with web research
- `enableImageGeneration` — Generate images for slides
- `enableVideoGeneration` — Generate short videos
- `enableTTS` — Text-to-speech narration

If the `/api/health` response includes `capabilities`, you can pass corresponding flags in the generation request. Example:

```json
{
  "type": "topic",
  "input": "photosynthesis",
  "enableWebSearch": true,
  "enableImageGeneration": true
}
```

Only send feature flags if the server advertises them via capabilities. Do not send unsupported fields.
