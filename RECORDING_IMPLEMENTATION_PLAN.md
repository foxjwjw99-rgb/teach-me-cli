# Classroom Recording/Export Pipeline - Implementation Plan

## Overview
Add a recording pipeline that reuses the existing classroom playback/rendering stack to export classrooms as browser-native WebM videos. The solution leverages the real PlaybackEngine, ActionEngine, and scene renderers with minimal new code.

## Architecture

### A. Core Components

#### 1. **Playback Layer** (`lib/playback/`)
- ✅ Already has deterministic timing via ActionEngine delays
- **New**: Add `record` mode flag to PlaybackEngine
- **New**: Add `isRecording()` getter
- **New**: Emit `window.dispatchEvent(new CustomEvent('classroom:recording-complete'))` on playback end
- **New**: Support deterministic scene auto-advance (no user interaction needed)

#### 2. **Classroom Page** (`app/classroom/[id]/page.tsx`)
- **New**: Parse query params `?mode=record&autoplay=1`
- **New**: When in record mode:
  - Boot directly into playback
  - Hide interactive UI (sidebar, chat, controls)
  - Auto-start playback
  - Emit completion event on finish

#### 3. **Recorder Package** (`packages/classroom-recorder/`)
NEW monorepo package with three entry points:
- `index.ts` - Main orchestrator
- `capture.ts` - Browser capture logic (Playwright/Puppeteer)
- `merge-audio-video.ts` - FFmpeg integration (if needed)

**Recorder responsibilities:**
- Launch classroom URL in headless browser
- Set viewport to 1920x1080 (or configurable)
- Wait for playback ready signal
- Start screen capture
- Stop when `classroom:recording-complete` fires
- Save output to `/output/<job-id>/final.webm`

#### 4. **CLI** (`tools/` or top-level commands)
- **New**: `pnpm record --classroom <id> --output ./output/demo.webm`
- **Future**: optional MP4 export after WebM capture

### B. Data Flow

```
CLI Input (classroomId, output path)
     ↓
Create temp workdir & job ID
     ↓
Recorder Package
  ├─ Launch: http://localhost:3000/classroom/[id]?mode=record&autoplay=1
  ├─ Wait: page.on('classroom:recording-complete')
  ├─ Capture: Playwright video capture OR canvas-based frame capture
  └─ Output: /output/<job-id>/final.webm
```

### C. Non-Goals for MVP
- Separate slide renderer / static HTML export
- UI redesign for record mode
- Real-time progress reporting (silent wait is OK)
- Advanced compression/codec tuning

---

## Implementation Phases

### Phase 1: PlaybackEngine Record Mode
**File**: `lib/playback/engine.ts`

**Changes:**
1. Add `private recordMode: boolean = false`
2. Add setter: `setRecordMode(enabled: boolean)`
3. Add check in `start()`: if record mode, auto-advance on completion
4. At end of all scenes:
   ```typescript
   if (this.recordMode) {
     window.dispatchEvent(new CustomEvent('classroom:recording-complete'));
   }
   ```
5. Suppress interactive prompts in record mode (auto-accept discussion triggers)

### Phase 2: Classroom Page Query Params
**File**: `app/classroom/[id]/page.tsx`

**Changes:**
1. Read `useSearchParams()` for `mode` and `autoplay`
2. Store in state: `const [recordMode, setRecordMode] = useState(false)`
3. Pass to Stage component
4. Stage passes to PlaybackEngine setup
5. In record mode:
   - Hide sidebar, chat area, controls
   - Apply `className="!hidden"` or `display: none` to UI elements
   - Boot directly into playback (no manual start button)

### Phase 3: Create Recorder Package
**Path**: `packages/classroom-recorder/`

**Files:**
- `package.json` - Dependencies: playwright (or puppeteer), ffmpeg-static
- `index.ts` - Orchestrator
- `capture.ts` - Browser automation & frame capture
- `types.ts` - Recording options, progress events

**Capture strategy:**
- Use Playwright's `context.tracing.start()` + video capture
  - OR use `page.screenshot()` polling + audio remuxing
  - Option 1 (tracing) is simpler if ffmpeg is available
  - Option 2 (screenshot polling) is more portable

### Phase 4: CLI Integration
**File**: `tools/cli.ts` or top-level command

**Commands:**
```bash
pnpm record --classroom <id> --output ./video.webm
# optional future step: convert WebM to MP4 after capture
```

---

## Key Implementation Details

### Auto-Advance in Record Mode
When `recordMode: true`, the PlaybackEngine should:
1. Skip proactive discussion card delays
2. Auto-confirm discussions with empty user input (or default behavior)
3. Auto-skip quiz prompts (or render them briefly then auto-dismiss)
4. Continue without waiting for user interaction

### Completion Signal
```typescript
// In PlaybackEngine.processNext() or similar end-of-playback location:
private onPlaybackEnd(): void {
  if (this.recordMode) {
    console.log('Recording: Playback complete, emitting completion signal');
    window.dispatchEvent(new CustomEvent('classroom:recording-complete'));
  }
  this.setMode('idle');
}
```

### Recorder Initialization
```typescript
// packages/classroom-recorder/index.ts
interface RecordingOptions {
  classroomId: string;
  baseUrl: string; // http://localhost:3000
  outputPath: string;
  viewport?: { width: number; height: number };
  timeout?: number; // max recording duration (safety)
}

export async function recordClassroom(options: RecordingOptions): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.createContext({
    recordVideo: { dir: tmpdir() },
    viewport: options.viewport || { width: 1920, height: 1080 },
  });
  // ... (see capture.ts)
}
```

### Manifest Update
**`package.json`** at root:
```json
{
  "workspaces": [
    "packages/*"
  ]
}
```

Then `packages/classroom-recorder/package.json`:
```json
{
  "name": "@openmaic/classroom-recorder",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "dependencies": {
    "@types/node": "^20",
    "playwright": "^1.50.0"
  }
}
```

---

## Testing Strategy

1. **Playback Mode Flag**
   - Verify PlaybackEngine accepts `recordMode` flag
   - Verify `classroom:recording-complete` event fires

2. **Classroom Page**
   - Test `?mode=record&autoplay=1` loads without sidebar/chat
   - Verify auto-playback starts immediately

3. **Recorder Package**
   - Mock classroom endpoint locally
   - Verify captured WebM is valid
   - Verify dimensions and frame rate

4. **CLI**
   - `pnpm record --classroom test-id --output ./test.webm`
   - Verify output exists and plays

---

## File Structure (After Implementation)

```
teach-me-cli/
├── app/
│   └── classroom/[id]/
│       └── page.tsx          (✏️ add query params handling)
├── lib/
│   └── playback/
│       └── engine.ts         (✏️ add record mode)
├── packages/
│   └── classroom-recorder/
│       ├── package.json      (NEW)
│       ├── src/
│       │   ├── index.ts      (NEW - main orchestrator)
│       │   ├── capture.ts    (NEW - browser capture)
│       │   ├── types.ts      (NEW - interfaces)
│       │   └── utils/        (NEW - helpers)
│       └── dist/             (compiled output)
├── tools/
│   └── record-cli.ts         (NEW - CLI entry point)
├── RECORDING_IMPLEMENTATION_PLAN.md  (this file)
```

---

## Dependencies Needed

```
playwright: ^1.50.0
ffmpeg-static: (optional, for advanced processing)
```

---

## Success Criteria

✅ Classroom can playback in record mode via `?mode=record&autoplay=1`
✅ Playback completes deterministically without user interaction
✅ `classroom:recording-complete` event fires on completion
✅ CLI command records classroom to WebM
✅ Output WebM preserves classroom visual style and timing
✅ Interactive mode still works normally
✅ No separate slide-to-video renderer introduced

---

## Known Constraints & Mitigations

| Constraint | Mitigation |
|-----------|-----------|
| Quiz/pause scenes block playback | Auto-skip or render briefly then dismiss in record mode |
| Discussion triggers wait for user | Auto-confirm with empty/default input |
| Audio timing must be precise | Use existing audio player, sync with ActionEngine |
| FFmpeg dependency | Optional; use Playwright video capture if available |
| Classroom URL must be accessible | Assume running locally or provide base URL param |

---

## Next Steps

1. Start with Phase 1 (PlaybackEngine record mode flag + completion event)
2. Test with classroom page manually (query params)
3. Build recorder package (capture.ts)
4. Wire CLI
5. E2E test: `pnpm record --classroom [known-id] --output ./test.webm`
