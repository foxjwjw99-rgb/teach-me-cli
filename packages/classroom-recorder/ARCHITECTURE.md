# Classroom Recorder - Architecture & Data Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Classroom Recorder Package                      │
│                    @openmaic/classroom-recorder                     │
└─────────────────────────────────────────────────────────────────────┘
                                  ▲
                                  │
                    ┌─────────────┴──────────────┐
                    │                            │
            ┌───────▼────────┐          ┌───────▼────────┐
            │  CLI Command   │          │  Programmatic  │
            │  (record-cli)  │          │     API        │
            └────────────────┘          └────────────────┘
                                  │
                ┌─────────────────┴──────────────────┐
                │   recordClassroom(options)        │
                │     index.ts - Orchestrator       │
                └────────────────┬──────────────────┘
                                 │
                ┌────────────────┴──────────────────┐
                │   Validation (utils.ts)          │
                │   - Check required fields        │
                │   - Validate options             │
                │   - Return errors                │
                └────────────────┬──────────────────┘
                                 │
                ┌────────────────▼──────────────────┐
                │   Browser Capture (capture.ts)   │
                └────────────────┬──────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
    ┌───▼──┐              ┌─────▼────┐          ┌────────▼────┐
    │Launch│              │ Navigate │          │    Wait     │
    │Browser│              │   to     │          │    Event    │
    │       │              │ Classroom│          │             │
    └───┬──┘              └──────────┘          └────────┬────┘
        │                                                │
        │          Playwright Browser Context           │
        │              recordVideo enabled              │
        │                                                │
        └────────────────────────┬─────────────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │   Chromium Headless     │
                    │   - Renders classroom   │
                    │   - Captures frames     │
                    │   - Records audio       │
                    │   - Outputs MP4         │
                    └────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
    ┌───▼──┐              ┌─────▼────┐          ┌────────▼────┐
    │ Page │          ┌──►│PlaybackEngi│◄──┐    │  Custom     │
    │Loaded│          │   │   (tracks  │   │    │   Event     │
    └──────┘          │   │  progress) │   │    │   Listener  │
                      │   └────────────┘   │    └─────────────┘
                      │                    │
                      │  classroom:recording-complete
                      │         (event)
                      │
                      └────────────────────┘
```

## Data Flow Diagram

```
INPUT: RecordingOptions
  ┌─────────────────────────────────────┐
  │ classroomId: "math-101"             │
  │ baseUrl: "http://localhost:3000"    │
  │ outputPath: "./output/video.mp4"    │
  │ viewport: { w: 1920, h: 1080 }      │
  │ timeout: 120000                     │
  └────────────────┬────────────────────┘
                   │
                   ▼
       ┌───────────────────────────┐
       │  Validate Options         │
       │  (utils.ts)               │
       └───────────┬───────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
   VALID│                  INVALID
        │                     │
        ▼                     ▼
   ┌────────────┐      ┌──────────────┐
   │ Continue   │      │ Return Error │
   └────┬───────┘      │ Result       │
        │              └──────────────┘
        │
        ▼
    ┌────────────────────────────────┐
    │ Launch Browser                 │
    │ - chromium.launch()            │
    │ - createContext()              │
    │ - recordVideo config           │
    └────────────┬───────────────────┘
                 │
                 ▼
    ┌────────────────────────────────┐
    │ Create Page & Navigate         │
    │ - page.goto(recordUrl)         │
    │ - waitUntil: networkidle       │
    │ - delay 1s for initialization  │
    └────────────┬───────────────────┘
                 │
                 ▼
    ┌────────────────────────────────┐
    │ Listen for Completion Event    │
    │ - page.evaluate()              │
    │ - addEventListener (custom)    │
    │ - setTimeout (fallback)        │
    └────────────┬───────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
    SUCCESS         TIMEOUT/ERROR
        │                 │
        ▼                 ▼
    ┌────────┐      ┌─────────────┐
    │Wait    │      │Throw Error  │
    │500ms   │      │Return Fail  │
    └────┬───┘      │Result       │
        │           └─────────────┘
        ▼
    ┌────────────────────────────────┐
    │ Close Context & Browser        │
    │ - context.close()              │
    │ - browser.close()              │
    │ - Finalize video file          │
    └────────────┬───────────────────┘
                 │
                 ▼
    ┌────────────────────────────────┐
    │ Return RecordingResult         │
    │ - success: true                │
    │ - outputPath: string           │
    │ - duration: number (ms)        │
    │ - frameCount: number           │
    └────────────────────────────────┘

OUTPUT: RecordingResult
  ┌──────────────────────────────────────┐
  │ success: true                        │
  │ outputPath: "./output/video.mp4"     │
  │ duration: 45000 (ms)                 │
  │ frameCount: 1350 (@30fps)            │
  │ error: null                          │
  └──────────────────────────────────────┘
```

## Component Interaction

```
┌──────────────────────────────────────────────────────┐
│                   recordClassroom()                  │
│                   (index.ts)                         │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │ 1. Validate Options (utils.ts)               │   │
│  │    validateOptions(options)                  │   │
│  └──────────────────────────────────────────────┘   │
│                       │                              │
│                       ▼                              │
│  ┌──────────────────────────────────────────────┐   │
│  │ 2. Capture Recording (capture.ts)            │   │
│  │    captureClassroomRecording(options)        │   │
│  │                                              │   │
│  │  ┌────────────────────────────────────────┐  │   │
│  │  │ • launchRecordingBrowser()             │  │   │
│  │  │ • ensureOutputDir()                    │  │   │
│  │  │ • waitForRecordingComplete()           │  │   │
│  │  │ • Error handling & cleanup             │  │   │
│  │  └────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────┘   │
│                       │                              │
│                       ▼                              │
│  ┌──────────────────────────────────────────────┐   │
│  │ 3. Return Result (index.ts)                  │   │
│  │    RecordingResult                           │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

## File Dependencies

```
index.ts (main orchestrator)
  ├─ imports: types.ts
  ├─ imports: capture.ts
  ├─ imports: utils.ts
  └─ exports: RecordingOptions, RecordingResult, RecordingProgress

capture.ts (browser capture)
  ├─ imports: playwright/chromium
  ├─ imports: types.ts
  ├─ imports: utils.ts (createLogger)
  └─ exports: captureClassroomRecording

utils.ts (helpers)
  ├─ exports: createLogger, validateOptions, formatDuration
  └─ no internal imports

types.ts (type definitions)
  ├─ exports: RecordingOptions, RecordingResult, RecordingProgress
  └─ no imports
```

## Event Flow: Recording Lifecycle

```
User invokes: recordClassroom(options)
        │
        ▼
┌───────────────────────────────┐
│ [START]                       │
│ - Validate options            │
│ - Log: Starting capture       │
└───────┬───────────────────────┘
        │
        ▼
┌───────────────────────────────┐
│ [LAUNCH_BROWSER]              │
│ - chromium.launch()           │
│ - createContext()             │
│ - recordVideo: enabled        │
│ - onLog?: "Launching..."      │
└───────┬───────────────────────┘
        │
        ▼
┌───────────────────────────────┐
│ [NAVIGATE]                    │
│ - page.goto(recordUrl)        │
│ - waitUntil: networkidle      │
│ - onLog?: "Classroom loaded"  │
└───────┬───────────────────────┘
        │
        ▼
┌───────────────────────────────┐
│ [WAIT_FOR_EVENT]              │
│ - Listen: window event        │
│ - Event: "classroom:         │
│   recording-complete"         │
│ - onLog?: "Waiting for..."    │
└───────┬───────────────────────┘
        │
     ┌──┴──┐
    YES    NO (timeout)
     │       │
     ▼       ▼
  [SUCCESS] [TIMEOUT_ERROR]
     │       │
     └──┬────┘
        │
        ▼
┌───────────────────────────────┐
│ [FINALIZE]                    │
│ - Wait 500ms buffer           │
│ - context.close()             │
│ - browser.close()             │
│ - onLog?: "Finalizing..."     │
└───────┬───────────────────────┘
        │
        ▼
┌───────────────────────────────┐
│ [RETURN_RESULT]               │
│ {                             │
│   success: boolean,           │
│   outputPath: string,         │
│   duration?: number,          │
│   frameCount?: number,        │
│   error?: string              │
│ }                             │
└───────────────────────────────┘
        │
        ▼
  User receives result
```

## Playwright Integration Points

```
┌──────────────────────────────────────────┐
│        Playwright API Usage              │
├──────────────────────────────────────────┤
│                                          │
│  chromium.launch({                       │
│    headless: true                        │
│  })                                      │
│  ├─ Returns: Browser object              │
│  │                                       │
│  browser.createContext({                 │
│    recordVideo: { dir: outputDir }       │
│    viewport: { width, height }           │
│  })                                      │
│  ├─ Returns: BrowserContext object       │
│  │                                       │
│  context.newPage()                       │
│  ├─ Returns: Page object                 │
│  │                                       │
│  page.goto(recordUrl, {                  │
│    waitUntil: 'networkidle'              │
│  })                                      │
│  │                                       │
│  page.evaluate(function) {               │
│    // Browser-side event listener        │
│    window.addEventListener(...)         │
│    return Promise                        │
│  }                                       │
│  │                                       │
│  context.close()                         │
│  ├─ Finalizes video file                 │
│  │                                       │
│  browser.close()                         │
│  └─ Releases resources                   │
│                                          │
└──────────────────────────────────────────┘

Output: Video file at recordDir/*.webm
        (Renamed/processed as needed)
```

## Error Handling Flow

```
RecordingError possible at:

1. Validation Phase
   ├─ Missing classroomId ──► Return error
   ├─ Missing baseUrl ──────► Return error
   └─ Missing outputPath ──► Return error

2. Directory Creation
   └─ No permissions ──────► Return error

3. Browser Launch
   ├─ Chromium not found ──► Return error
   └─ Memory limit ────────► Return error

4. Navigation
   ├─ Timeout (30s) ──────► Return error
   ├─ Network error ──────► Return error
   └─ Page not found ─────► Return error

5. Event Listening
   ├─ No event (timeout) ─► Return error
   └─ Page crashed ───────► Return error

6. Cleanup
   └─ Logged but handled ─► Return success/error

All errors return: RecordingResult {
  success: false,
  error: "descriptive message"
}
```

This architecture ensures:
- ✓ Single responsibility principle
- ✓ Clear data flow
- ✓ Comprehensive error handling
- ✓ Resource cleanup
- ✓ Type safety throughout
