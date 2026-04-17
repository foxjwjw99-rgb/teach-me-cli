# @openmaic/classroom-recorder

Headless classroom recording pipeline for OpenMAIC. Captures classrooms as browser-native WebM videos using Playwright browser automation.

## Features

- **Headless Recording**: Launch classroom in headless mode for automated recording
- **Deterministic Playback**: Uses existing PlaybackEngine for consistent, repeatable recordings
- **Configurable Viewport**: Support for custom recording dimensions (default: 1920x1080)
- **Automatic Completion**: Listens for `classroom:recording-complete` event
- **Error Handling**: Comprehensive error handling and cleanup
- **Logging**: Built-in structured logging for debugging

## Installation

```bash
pnpm install @openmaic/classroom-recorder
```

## Usage

### Basic Example

```typescript
import { recordClassroom } from '@openmaic/classroom-recorder';

const result = await recordClassroom({
  classroomId: 'classroom-123',
  baseUrl: 'http://localhost:3000',
  outputPath: './output/classroom-123.webm',
});

if (result.success) {
  console.log(`Video saved to: ${result.outputPath}`);
  console.log(`Duration: ${result.duration}ms`);
} else {
  console.error(`Recording failed: ${result.error}`);
}
```

### Advanced Options

```typescript
import { recordClassroom } from '@openmaic/classroom-recorder';

const result = await recordClassroom({
  classroomId: 'classroom-456',
  baseUrl: 'http://localhost:3000',
  outputPath: './recordings/classroom-456.webm',
  
  // Custom viewport (default: 1920x1080)
  viewport: {
    width: 1280,
    height: 720,
  },
  
  // Maximum recording duration (default: 120000ms)
  timeout: 60000,
  
  // Progress callback
  onLog: (message) => {
    console.log(`[Recording] ${message}`);
  },
});
```

## API

### `recordClassroom(options: RecordingOptions): Promise<RecordingResult>`

Main entry point for recording a classroom.

**Parameters:**

- `classroomId` (string, required): Unique identifier of the classroom to record
- `baseUrl` (string, required): Base URL where classroom is served (e.g., `http://localhost:3000`)
- `outputPath` (string, required): Output file path for the recorded WebM video
- `viewport` (object, optional): Recording viewport dimensions
  - `width` (number): Default: 1920
  - `height` (number): Default: 1080
- `timeout` (number, optional): Maximum recording duration in milliseconds (default: 120000)
- `onLog` (function, optional): Callback for logging messages

**Returns:**

```typescript
interface RecordingResult {
  success: boolean;
  outputPath: string;
  error?: string;
  duration?: number;
  frameCount?: number;
}
```

## How It Works

1. **Browser Launch**: Playwright launches Chromium in headless mode
2. **Navigation**: Navigates to `/classroom/[id]?mode=record&autoplay=1`
3. **Video Recording**: Playwright's `recordVideo` context captures all rendering
4. **Event Listening**: Waits for `classroom:recording-complete` event from PlaybackEngine
5. **Finalization**: Closes browser context to finalize video file
6. **Cleanup**: Ensures all resources are released

## Integration with Classroom Page

The recorder expects the classroom page to support recording mode via query parameters:

```
GET /classroom/[id]?mode=record&autoplay=1
```

The page should:
1. Detect `mode=record` parameter
2. Pass `recordMode: true` to PlaybackEngine
3. Start playback automatically (via `autoplay=1`)
4. Emit `classroom:recording-complete` event when playback finishes

## Requirements

- Node.js 18+ (for ES modules and top-level await)
- Playwright 1.50.0+
- Access to running classroom instance (local or remote)

## Environment Variables

- `DEBUG`: Set to enable debug logging

```bash
DEBUG=1 node record-script.js
```

## Error Handling

The recorder includes comprehensive error handling:

- Browser launch failures
- Navigation timeouts
- Missing completion event
- Output directory creation failures
- Resource cleanup errors

All errors are captured and returned in the result object.

## Performance Considerations

- **Memory**: Headless recording uses minimal memory (~100-200MB)
- **Duration**: Recording time approximately equals classroom playback duration
- **Disk Space**: Output WebM size depends on viewport and codec (typically 50-200MB per minute)
- **CPU**: Moderate CPU usage during rendering and video encoding

## Troubleshooting

### Recording hangs (no completion event)

Ensure:
- PlaybackEngine calls `window.dispatchEvent(new CustomEvent('classroom:recording-complete'))`
- Classroom page is properly loading with `?mode=record` parameter
- Increase `timeout` option if classroom is long

### Large output file

The recorded WebM includes all visual rendering. To optimize:
- Reduce viewport dimensions
- Use ffmpeg for post-processing (outside this package)
- Consider frame rate limiting (future enhancement)

### Browser crashes

Check:
- Sufficient disk space for video buffering
- No resource constraints on system
- Classroom page doesn't have memory leaks

## CLI Integration

For CLI usage, see `tools/record-cli.ts` in the main project.

```bash
pnpm record --classroom <id> --output ./output/video.webm
```

## Development

Build the package:

```bash
cd packages/classroom-recorder
pnpm build
```

Watch mode:

```bash
pnpm dev
```

## Type Definitions

Full TypeScript support with exported types:

```typescript
import type { RecordingOptions, RecordingResult } from '@openmaic/classroom-recorder';
```

## License

Part of the OpenMAIC project. See LICENSE file in root.
