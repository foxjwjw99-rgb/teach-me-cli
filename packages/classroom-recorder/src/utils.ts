/**
 * Simple logger utility for consistent output
 */
export function createLogger(namespace: string) {
  return {
    info: (message: string, data?: unknown) => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${namespace}] ℹ️  ${message}`, data ? `\n${JSON.stringify(data, null, 2)}` : '');
    },
    warn: (message: string, data?: unknown) => {
      const timestamp = new Date().toISOString();
      console.warn(`[${timestamp}] [${namespace}] ⚠️  ${message}`, data ? `\n${JSON.stringify(data, null, 2)}` : '');
    },
    error: (message: string, data?: unknown) => {
      const timestamp = new Date().toISOString();
      console.error(`[${timestamp}] [${namespace}] ❌ ${message}`, data ? `\n${JSON.stringify(data, null, 2)}` : '');
    },
    debug: (message: string, data?: unknown) => {
      if (process.env.DEBUG) {
        const timestamp = new Date().toISOString();
        console.debug(
          `[${timestamp}] [${namespace}] 🔍 ${message}`,
          data ? `\n${JSON.stringify(data, null, 2)}` : '',
        );
      }
    },
  };
}

/**
 * Validate recording options
 */
export function validateOptions(options: any): { valid: boolean; error?: string } {
  if (!options.classroomId) {
    return { valid: false, error: 'classroomId is required' };
  }

  if (!options.baseUrl) {
    return { valid: false, error: 'baseUrl is required' };
  }

  if (!options.outputPath) {
    return { valid: false, error: 'outputPath is required' };
  }

  if (options.viewport) {
    if (!options.viewport.width || !options.viewport.height) {
      return { valid: false, error: 'viewport must have width and height' };
    }
  }

  return { valid: true };
}

/**
 * Format duration for human readability
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  return `${seconds}s`;
}
