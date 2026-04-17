/**
 * Example: Batch recording multiple classrooms
 *
 * Records multiple classrooms to separate MP4 files.
 *
 * Usage:
 *   pnpm node examples/batch-recording.ts
 */

import { recordClassroom } from '../src/index';
import { createLogger, formatDuration } from '../src/utils';
import { mkdir } from 'fs/promises';

const log = createLogger('BatchRecordingExample');

const CLASSROOMS = ['math-101', 'physics-201', 'chemistry-301'];

async function recordBatch() {
  log.info(`Starting batch recording of ${CLASSROOMS.length} classrooms`);

  // Ensure output directory exists
  await mkdir('./output/batch', { recursive: true });

  const results = [];
  const batchStartTime = Date.now();

  for (const classroomId of CLASSROOMS) {
    log.info(`Recording: ${classroomId}`);

    const startTime = Date.now();
    const result = await recordClassroom({
      classroomId,
      baseUrl: 'http://localhost:3000',
      outputPath: `./output/batch/${classroomId}.webm`,
      onLog: (message) => {
        log.debug(`[${classroomId}] ${message}`);
      },
    });

    const duration = formatDuration(Date.now() - startTime);

    if (result.success) {
      log.info(`✅ Completed: ${classroomId} (${duration})`);
    } else {
      log.error(`❌ Failed: ${classroomId} - ${result.error}`);
    }

    results.push({
      classroomId,
      success: result.success,
      error: result.error,
      duration,
    });
  }

  const totalDuration = formatDuration(Date.now() - batchStartTime);
  const successCount = results.filter((r) => r.success).length;

  log.info(`Batch recording complete`, {
    total: CLASSROOMS.length,
    successful: successCount,
    failed: CLASSROOMS.length - successCount,
    totalTime: totalDuration,
    results,
  });

  // Exit with error if any recordings failed
  if (successCount < CLASSROOMS.length) {
    process.exit(1);
  }
}

recordBatch().catch((error) => {
  log.error('Batch recording error:', error);
  process.exit(1);
});
