/**
 * Unit tests for classroom-recorder package
 *
 * Tests type safety, option validation, and utility functions
 */

import { describe, test, expect } from 'vitest';
import { validateOptions, formatDuration, createLogger } from '../src/utils';
import type { RecordingOptions } from '../src/types';

describe('validateOptions', () => {
  test('should accept valid options', () => {
    const options: RecordingOptions = {
      classroomId: 'test-123',
      baseUrl: 'http://localhost:3000',
      outputPath: './output/test.webm',
    };

    const result = validateOptions(options);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('should reject missing classroomId', () => {
    const options = {
      baseUrl: 'http://localhost:3000',
      outputPath: './output/test.webm',
    };

    const result = validateOptions(options);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('classroomId');
  });

  test('should reject missing baseUrl', () => {
    const options = {
      classroomId: 'test-123',
      outputPath: './output/test.webm',
    };

    const result = validateOptions(options);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('baseUrl');
  });

  test('should reject missing outputPath', () => {
    const options = {
      classroomId: 'test-123',
      baseUrl: 'http://localhost:3000',
    };

    const result = validateOptions(options);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('outputPath');
  });

  test('should reject invalid viewport', () => {
    const options: RecordingOptions = {
      classroomId: 'test-123',
      baseUrl: 'http://localhost:3000',
      outputPath: './output/test.webm',
      viewport: { width: 0, height: 0 },
    };

    const result = validateOptions(options);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('viewport');
  });

  test('should accept valid viewport', () => {
    const options: RecordingOptions = {
      classroomId: 'test-123',
      baseUrl: 'http://localhost:3000',
      outputPath: './output/test.webm',
      viewport: { width: 1920, height: 1080 },
    };

    const result = validateOptions(options);
    expect(result.valid).toBe(true);
  });

  test('should reject non-webm output paths', () => {
    const options: RecordingOptions = {
      classroomId: 'test-123',
      baseUrl: 'http://localhost:3000',
      outputPath: './output/test.mp4',
    };

    const result = validateOptions(options);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('.webm');
  });
});

describe('formatDuration', () => {
  test('should format milliseconds as seconds', () => {
    expect(formatDuration(1000)).toBe('1s');
    expect(formatDuration(5000)).toBe('5s');
  });

  test('should format minutes and seconds', () => {
    expect(formatDuration(60000)).toBe('1m 0s');
    expect(formatDuration(90000)).toBe('1m 30s');
    expect(formatDuration(120000)).toBe('2m 0s');
  });

  test('should handle edge cases', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(999)).toBe('0s');
    expect(formatDuration(1001)).toBe('1s');
  });
});

describe('createLogger', () => {
  test('should create logger with namespace', () => {
    const logger = createLogger('TestNamespace');
    expect(logger).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(logger.debug).toBeDefined();
  });

  test('should have all required methods', () => {
    const logger = createLogger('Test');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  test('should not throw when logging', () => {
    const logger = createLogger('Test');
    expect(() => {
      logger.info('test message');
      logger.warn('test warning');
      logger.error('test error');
    }).not.toThrow();
  });
});
