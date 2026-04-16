import type { RecordingOptions, RecordingResult } from './types';
import { captureClassroomRecording } from './capture';
import { validateOptions, createLogger, formatDuration } from './utils';

const log = createLogger('Orchestrator');

/**
 * Record a classroom to browser-native WebM video
 *
 * Main entry point for classroom recording. Handles:
 * - Validation of options
 * - Browser launch and navigation
 * - Waiting for playback completion
 * - Video finalization
 *
 * @param options Recording configuration
 * @returns Promise resolving to recording result
 *
 * @example
 * ```typescript
 * const result = await recordClassroom({
 *   classroomId: 'classroom-123',
 *   baseUrl: 'http://localhost:3000',
 *   outputPath: './output/classroom-123.webm',
 *   viewport: { width: 1920, height: 1080 },
 *   timeout: 120000,
 * });
 *
 * if (result.success) {
 *   console.log(`Recording saved to: ${result.outputPath}`);
 * } else {
 *   console.error(`Recording failed: ${result.error}`);
 * }
 * ```
 */
export async function recordClassroom(options: RecordingOptions): Promise<RecordingResult> {
  log.info('Starting classroom recording orchestration');

  // Validate options
  const validation = validateOptions(options);
  if (!validation.valid) {
    const errorMsg = `Invalid options: ${validation.error}`;
    log.error(errorMsg);
    return {
      success: false,
      outputPath: options.outputPath || '<unknown>',
      error: errorMsg,
    };
  }

  log.info('Configuration valid', {
    classroomId: options.classroomId,
    baseUrl: options.baseUrl,
    outputPath: options.outputPath,
    viewport: options.viewport || { width: 1920, height: 1080 },
    timeout: options.timeout || 120000,
  });

  try {
    // Capture the recording
    const result = await captureClassroomRecording(options);

    if (result.success) {
      log.info('Recording completed successfully', {
        outputPath: result.outputPath,
        duration: formatDuration(result.duration || 0),
        frameCount: result.frameCount,
      });
    } else {
      log.error('Recording failed', {
        error: result.error,
        outputPath: result.outputPath,
      });
    }

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.error('Unexpected error during recording', { error: errorMsg });

    return {
      success: false,
      outputPath: options.outputPath,
      error: `Unexpected error: ${errorMsg}`,
    };
  }
}

/**
 * Export types for consumers
 */
export type { RecordingOptions, RecordingResult, RecordingProgress } from './types';
