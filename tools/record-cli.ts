#!/usr/bin/env node
/**
 * CLI for recording classrooms to WebM
 *
 * Usage:
 *   pnpm record --classroom <id> --output <path.webm> [--viewport width:height] [--timeout ms]
 *   pnpm record --help
 */

import { program } from 'commander';
import { recordClassroom } from '../packages/classroom-recorder/src/index';
import { createLogger } from '../lib/logger';
import path from 'path';
import { mkdir } from 'fs/promises';

const log = createLogger('RecordCLI');

interface RecordOptions {
  classroom: string;
  output: string;
  viewport?: string;
  timeout?: string;
  baseUrl?: string;
  verbose?: boolean;
}

async function main() {
  program
    .name('pnpm record')
    .description('Record a classroom to WebM video')
    .version('0.1.0')
    .option('-c, --classroom <id>', 'Classroom ID to record', '')
    .option('-o, --output <path>', 'Output WebM file path', '')
    .option('-v, --viewport <dimensions>', 'Viewport dimensions (WIDTHxHEIGHT), default: 1920x1080')
    .option('-t, --timeout <ms>', 'Recording timeout in milliseconds, default: 120000')
    .option('-u, --base-url <url>', 'Base URL of the app (default: http://localhost:3000)')
    .option('--verbose', 'Enable verbose logging')
    .action(async (options: RecordOptions) => {
      // Validate required options
      if (!options.classroom) {
        log.error('Error: --classroom is required');
        program.outputHelp();
        process.exit(1);
      }

      if (!options.output) {
        log.error('Error: --output is required');
        program.outputHelp();
        process.exit(1);
      }

      if (!options.output.toLowerCase().endsWith('.webm')) {
        log.error('Error: --output must end with .webm (current recorder writes WebM)');
        process.exit(1);
      }

      try {
        // Ensure output directory exists
        const outputDir = path.dirname(options.output);
        if (outputDir && outputDir !== '.') {
          await mkdir(outputDir, { recursive: true });
        }

        // Parse viewport if provided
        let viewport: { width: number; height: number } | undefined;
        if (options.viewport) {
          const [width, height] = options.viewport.split('x').map((v) => parseInt(v, 10));
          if (!width || !height || isNaN(width) || isNaN(height)) {
            log.error('Error: Invalid viewport format. Use WIDTHxHEIGHT (e.g., 1920x1080)');
            process.exit(1);
          }
          viewport = { width, height };
        }

        // Parse timeout if provided
        let timeout: number | undefined;
        if (options.timeout) {
          timeout = parseInt(options.timeout, 10);
          if (isNaN(timeout) || timeout <= 0) {
            log.error('Error: Timeout must be a positive number');
            process.exit(1);
          }
        }

        const baseUrl = options.baseUrl || 'http://localhost:3000';

        if (options.verbose) {
          log.info('Recording options:', {
            classroomId: options.classroom,
            outputPath: options.output,
            baseUrl,
            viewport: viewport || '1920x1080 (default)',
            timeout: timeout ? `${timeout}ms` : '120000ms (default)',
          });
        }

        log.info(`Starting classroom recording: ${options.classroom}`);
        console.log('');

        const result = await recordClassroom({
          classroomId: options.classroom,
          baseUrl,
          outputPath: options.output,
          viewport,
          timeout,
          onLog: (message) => {
            if (options.verbose) {
              log.info(message);
            }
          },
        });

        console.log('');

        if (result.success) {
          log.info(`✓ Recording completed successfully`);
          log.info(`Output: ${result.outputPath}`);
          if (result.duration) {
            const durationSec = (result.duration / 1000).toFixed(1);
            log.info(`Duration: ${durationSec}s`);
          }
          process.exit(0);
        } else {
          log.error(`✗ Recording failed: ${result.error}`);
          process.exit(1);
        }
      } catch (error) {
        log.error('Fatal error:', error);
        process.exit(1);
      }
    });

  // Add help command
  program.on('--help', () => {
    console.log('');
    console.log('Examples:');
    console.log('  $ pnpm record --classroom math-101 --output ./video.webm');
    console.log(
      '  $ pnpm record --classroom physics-201 --output ./output/physics.webm --viewport 1280x720',
    );
    console.log(
      '  $ pnpm record --classroom english-301 --output ./video.webm --timeout 300000 --verbose',
    );
    console.log('');
  });

  program.parse(process.argv);

  // If no command provided, show help
  if (process.argv.length === 2) {
    program.outputHelp();
  }
}

main().catch((error) => {
  log.error('Unexpected error:', error);
  process.exit(1);
});
