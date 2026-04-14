/**
 * Example: Basic classroom recording
 *
 * Records a classroom to MP4 with default settings.
 *
 * Usage:
 *   pnpm node examples/basic.ts
 */

import { recordClassroom } from '../src/index';
import { createLogger } from '../src/utils';

const log = createLogger('BasicExample');

async function main() {
  log.info('Starting basic classroom recording example');

  // Assumes classroom server is running on localhost:3000
  const result = await recordClassroom({
    classroomId: 'example-classroom-1',
    baseUrl: 'http://localhost:3000',
    outputPath: './output/example-basic.mp4',
    onLog: (message) => {
      log.info(`Progress: ${message}`);
    },
  });

  if (result.success) {
    log.info(`✅ Recording completed successfully!`, {
      outputPath: result.outputPath,
      duration: `${Math.floor((result.duration || 0) / 1000)}s`,
    });
  } else {
    log.error(`❌ Recording failed: ${result.error}`);
    process.exit(1);
  }
}

main().catch((error) => {
  log.error('Unhandled error:', error);
  process.exit(1);
});
