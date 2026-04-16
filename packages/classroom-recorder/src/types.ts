/**
 * RecordingOptions - Configuration for classroom recording
 */
export interface RecordingOptions {
  /** Unique identifier for the classroom */
  classroomId: string;

  /** Base URL where classroom is served (e.g., http://localhost:3000) */
  baseUrl: string;

  /** Output file path for the recorded video. Current implementation writes WebM. */
  outputPath: string;

  /** Viewport dimensions (default: 1920x1080) */
  viewport?: {
    width: number;
    height: number;
  };

  /** Maximum recording duration in milliseconds (safety limit) */
  timeout?: number;

  /** Log function for debugging */
  onLog?: (message: string) => void;
}

/**
 * RecordingResult - Result of a recording operation
 */
export interface RecordingResult {
  /** Whether recording succeeded */
  success: boolean;

  /** Output file path */
  outputPath: string;

  /** Error message if recording failed */
  error?: string;

  /** Duration of recording in milliseconds */
  duration?: number;

  /** Number of frames captured */
  frameCount?: number;
}

/**
 * RecordingProgress - Progress event during recording
 */
export interface RecordingProgress {
  /** Current phase: 'launching' | 'waiting' | 'recording' | 'finalizing' */
  phase: 'launching' | 'waiting' | 'recording' | 'finalizing';

  /** Human-readable status message */
  status: string;

  /** Progress percentage (0-100) */
  progress?: number;
}
