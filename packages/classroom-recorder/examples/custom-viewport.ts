/**
 * Example: Recording with custom viewport
 *
 * Records a classroom with custom dimensions and timeout settings.
 *
 * Usage:
 *   pnpm node examples/custom-viewport.ts
 */

import { recordClassroom } from '../src/index';
import { createLogger, formatDuration } from '../src/utils';

const log = createLogger('CustomViewportExample');

async function main() {
  log.info('Starting classroom recording with custom viewport');

  const startTime = Date.now();

  const result = await recordClassroom({
    classroomId: 'example-classroom-2',
    baseUrl: 'http://localhost:3000',
    outputPath: './output/example-1280x720.mp4',

    // Custom viewport for 16:9 aspect ratio
    viewport: {
      width: 1280,
      height: 720,
    },

    // 5 minute safety timeout
    timeout: 5 * 60 * 1000,

    onLog: (message) => {
      log.info(message);
    },
  });

  const elapsed = formatDuration(Date.now() - startTime);

  if (result.success) {
    log.info(`✅ Recording completed!`, {
      outputPath: result.outputPath,
      elapsed,
      recordingDuration: formatDuration(result.duration || 0),
      frameCount: result.frameCount,
    });
  } else {
    log.error(`❌ Recording failed: ${result.error}`, { elapsed });
    process.exit(1);
  }
}

main().catch((error) => {
  log.error('Unhandled error:', error);
  process.exit(1);
});
