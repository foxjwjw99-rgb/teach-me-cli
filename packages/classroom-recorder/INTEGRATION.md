# Classroom Recorder Integration Guide

This guide explains how to integrate the `@openmaic/classroom-recorder` package into the teach-me-cli project.

## Setup Steps

### 1. Update Root package.json

Ensure the monorepo workspace is configured:

```json
{
  "workspaces": [
    "packages/*"
  ]
}
```

### 2. Install Dependencies

From the root directory:

```bash
pnpm install
```

This will install the classroom-recorder package along with its dependencies (Playwright, etc.).

### 3. Build the Package

```bash
cd packages/classroom-recorder
pnpm build
```

Or from root:

```bash
pnpm -C packages/classroom-recorder build
```

## CLI Integration

To add a CLI command for recording, create `tools/record-cli.ts`:

```typescript
import { recordClassroom } from '@openmaic/classroom-recorder';
import path from 'path';
import { createLogger } from '@openmaic/classroom-recorder/dist/utils';

const log = createLogger('RecordCLI');

export async function recordCommand(argv: string[]) {
  const classroomId = argv[0];
  const outputPath = argv[1] || `./output/${classroomId}.mp4`;

  if (!classroomId) {
    console.error('Usage: record <classroom-id> [output-path]');
    process.exit(1);
  }

  log.info('Starting classroom recording');

  const result = await recordClassroom({
    classroomId,
    baseUrl: process.env.CLASSROOM_URL || 'http://localhost:3000',
    outputPath,
  });

  if (result.success) {
    console.log(`✅ Recording saved to: ${result.outputPath}`);
  } else {
    console.error(`❌ Recording failed: ${result.error}`);
    process.exit(1);
  }
}
```

### Add to package.json scripts

```json
{
  "scripts": {
    "record": "node --loader tsx tools/record-cli.ts"
  }
}
```

Usage:

```bash
pnpm record classroom-123 ./output/video.mp4
```

## Playwright Configuration

The recorder uses Playwright's headless Chromium. For Docker environments, ensure:

1. Chromium dependencies are installed
2. No sandbox issues (handled by Playwright)

### For Docker

In `Dockerfile`:

```dockerfile
RUN apt-get update && apt-get install -y \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libxkbcommon0 \
    && rm -rf /var/lib/apt/lists/*
```

## Classroom Page Requirements

The classroom page must support recording mode:

1. **Query Parameters**: Parse `mode=record` and `autoplay=1`
2. **Record Mode Behavior**:
   - Pass `recordMode: true` to PlaybackEngine
   - Hide interactive UI (sidebar, chat)
   - Start playback automatically
3. **Completion Event**: Emit `classroom:recording-complete` when done

### Example Implementation (app/classroom/[id]/page.tsx)

```typescript
'use client';

import { useSearchParams } from 'next/navigation';
import { Stage } from '@/components/stage';
import { usePlaybackStore } from '@/lib/store/playback';

export default function ClassroomPage() {
  const searchParams = useSearchParams();
  const recordMode = searchParams.get('mode') === 'record';
  const autoplay = searchParams.get('autoplay') === '1';

  // Configure PlaybackEngine for record mode
  usePlaybackStore.subscribe((state, prevState) => {
    if (recordMode && state.engine && !prevState.engine) {
      state.engine.setRecordMode(true);
      if (autoplay) {
        state.engine.start();
      }
    }
  });

  return (
    <div className={recordMode ? 'record-mode' : ''}>
      {!recordMode && <Sidebar />}
      <Stage recordMode={recordMode} />
      {!recordMode && <Chat />}
    </div>
  );
}
```

## PlaybackEngine Updates

Ensure PlaybackEngine has been updated with:

1. `setRecordMode(enabled: boolean)` method
2. `isRecording()` getter
3. Completion event emission:

```typescript
private onPlaybackEnd(): void {
  if (this.recordMode) {
    window.dispatchEvent(new CustomEvent('classroom:recording-complete'));
  }
  this.setMode('idle');
}
```

See `RECORDING_IMPLEMENTATION_PLAN.md` for full PlaybackEngine changes.

## Testing

### Local Testing

1. Start the development server:

```bash
pnpm dev
```

2. Test recording manually:

```bash
curl "http://localhost:3000/classroom/test-123?mode=record&autoplay=1"
```

3. Use the CLI:

```bash
pnpm record test-123 ./test-output.mp4
```

### E2E Testing

Add playwright test:

```typescript
// e2e/recording.spec.ts
import { test, expect } from '@playwright/test';

test('should record classroom to mp4', async () => {
  const { recordClassroom } = await import('@openmaic/classroom-recorder');

  const result = await recordClassroom({
    classroomId: 'test-classroom',
    baseUrl: 'http://localhost:3000',
    outputPath: './test-output.mp4',
  });

  expect(result.success).toBe(true);
  expect(result.outputPath).toBe('./test-output.mp4');
});
```

## Environment Variables

Create `.env.local`:

```
CLASSROOM_URL=http://localhost:3000
RECORDING_TIMEOUT=120000
RECORDING_WIDTH=1920
RECORDING_HEIGHT=1080
DEBUG=0
```

Use in CLI:

```typescript
const baseUrl = process.env.CLASSROOM_URL || 'http://localhost:3000';
const timeout = parseInt(process.env.RECORDING_TIMEOUT || '120000');
```

## Troubleshooting

### Playwright Installation Fails

```bash
npx playwright install
```

### Recording Hangs

1. Check classroom URL is accessible
2. Verify `classroom:recording-complete` event is being emitted
3. Increase timeout: `timeout: 5 * 60 * 1000`
4. Enable debug logging: `DEBUG=1 pnpm record ...`

### Browser Crashes in Docker

Ensure Chromium dependencies are installed and disable sandbox:

```typescript
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
```

## Performance Optimization

For batch recordings:

```typescript
// Record sequentially (safer for system resources)
for (const id of classroomIds) {
  await recordClassroom({ classroomId: id, ... });
}

// Or with concurrency control
import pLimit from 'p-limit';
const limit = pLimit(2); // Max 2 concurrent recordings
await Promise.all(
  classroomIds.map(id => limit(() => recordClassroom({...})))
);
```

## Next Steps

1. ✅ Install and build the package
2. ✅ Update PlaybackEngine (if not done)
3. ✅ Update classroom page for record mode
4. ✅ Add CLI command
5. ✅ Test with example classrooms
6. ✅ Add to CI/CD pipeline
7. ✅ Document in main README

## References

- `packages/classroom-recorder/README.md` - Package documentation
- `RECORDING_IMPLEMENTATION_PLAN.md` - Architecture overview
- `examples/` - Usage examples
