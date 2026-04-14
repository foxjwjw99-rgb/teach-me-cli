import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';
import { mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { tmpdir } from 'os';
import { readdirSync, copyFileSync, rmSync } from 'fs';
import type { RecordingOptions, RecordingResult } from './types';
import { createLogger } from './utils';

const log = createLogger('Capture');

/**
 * Capture classroom recording using Playwright
 */
export async function captureClassroomRecording(
  options: RecordingOptions,
): Promise<RecordingResult> {
  let browser: Browser | null = null;
  let page: Page | null = null;
  let videoDir: string | null = null;

  try {
    // Ensure output directory exists
    const outputDir = dirname(options.outputPath);
    await mkdir(outputDir, { recursive: true });

    // Use a temporary directory for video recording
    videoDir = join(tmpdir(), `openmaic-recording-${Date.now()}`);
    await mkdir(videoDir, { recursive: true });

    const startTime = Date.now();

    // Launch Chromium
    log.info('Launching Chromium browser...');
    browser = await chromium.launch({
      headless: true,
    });

    // Define viewport
    const viewport = options.viewport || { width: 1920, height: 1080 };
    log.info(`Viewport: ${viewport.width}x${viewport.height}`);

    // Create browser context with video recording
    log.info('Creating browser context with video recording...');
    const context = await browser.newContext({
      viewport,
      recordVideo: { dir: videoDir },
    });

    // Create page
    page = await context.newPage();

    // Build the record URL
    const recordUrl = `${options.baseUrl}/classroom/${encodeURIComponent(options.classroomId)}?mode=record&autoplay=1`;
    log.info(`Navigating to: ${recordUrl}`);

    // Navigate to the classroom page
    await page.goto(recordUrl, { waitUntil: 'networkidle', timeout: 30000 });
    log.info('Page loaded successfully');

    // Wait for recording completion event
    log.info('Waiting for playback to complete...');
    const completionTimeout = options.timeout || 120000;

    try {
      await page.waitForFunction(
        () => {
          return (window as any).__recordingComplete === true;
        },
        { timeout: completionTimeout },
      );
      log.info('Playback completed (via flag)');
    } catch {
      // If flag-based detection fails, try event-based detection
      try {
        await page.evaluate(
          ({ timeout }) => {
            return new Promise<void>((resolve, reject) => {
              const timer = setTimeout(() => {
                reject(new Error('Timeout waiting for recording complete event'));
              }, timeout);

              const handler = () => {
                clearTimeout(timer);
                resolve();
              };

              window.addEventListener('classroom:recording-complete', handler);
            });
          },
          { timeout: completionTimeout },
        );
        log.info('Playback completed (via event)');
      } catch (error) {
        log.warn('Event-based completion detection failed, continuing anyway:', error);
      }
    }

    // Wait a bit for final rendering and video encoding
    log.info('Finalizing video encoding...');
    await page.waitForTimeout(3000);

    const duration = Date.now() - startTime;
    log.info(`Recording duration: ${(duration / 1000).toFixed(1)}s`);

    // Close the page and context to finalize the video
    log.info('Closing browser context...');
    await page.close();
    await context.close();
    log.info('Browser context closed');

    // Wait a moment for the video file to be fully written
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Find the recorded video file
    let videoFile: string | null = null;
    try {
      const files = readdirSync(videoDir);
      videoFile = files.find((f) => f.endsWith('.webm')) || null;
      if (videoFile) {
        log.info(`Found video file: ${videoFile}`);
      }
    } catch (error) {
      log.error('Error reading video directory:', error);
    }

    if (videoFile) {
      const sourceVideoPath = join(videoDir, videoFile);

      try {
        // Copy the video file to the output path
        copyFileSync(sourceVideoPath, options.outputPath);
        log.info(`Video saved to: ${options.outputPath}`);

        // Get file size
        const { statSync } = require('fs');
        const stats = statSync(options.outputPath);

        return {
          success: true,
          outputPath: options.outputPath,
          duration,
          frameCount: Math.ceil((duration / 1000) * 25), // Approximate: 25 fps for webm
        };
      } catch (error) {
        log.error('Error saving video file:', error);
        return {
          success: false,
          outputPath: options.outputPath,
          error: `Failed to save video: ${error}`,
        };
      }
    } else {
      return {
        success: false,
        outputPath: options.outputPath,
        error: 'No video file generated',
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error('Recording failed:', message);

    return {
      success: false,
      outputPath: options.outputPath,
      error: message,
    };
  } finally {
    // Cleanup
    if (browser) {
      try {
        await browser.close();
      } catch (error) {
        log.warn('Error closing browser:', error);
      }
    }

    // Clean up temporary directory
    if (videoDir) {
      try {
        rmSync(videoDir, { recursive: true, force: true });
        log.info('Cleaned up temporary recording directory');
      } catch (error) {
        log.warn('Error cleaning up temporary directory:', error);
      }
    }
  }
}
