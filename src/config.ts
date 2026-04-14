import { config as loadDotenv } from 'dotenv';
import { resolve } from 'path';
import type { Config } from './types.js';

// Load .env.local from the project root (two levels up from src/)
loadDotenv({ path: resolve(process.cwd(), '.env.local') });

/** OmniVoice defaults — configurable via env, no hardcoded personal paths */
const OMNIVOICE_DEFAULTS = {
  refText: '这是现在我们学校流行的装饰品了。',
  instruct: 'female, very low pitch',
  speed: 0.9,
  style:
    '請用台灣國語的感覺說話，使用台灣繁體中文常用詞。不要香港口音，不要港式語調，不要粵語感。不要中國播報腔，不要兒化音。語氣自然、親切、口語，像台灣日常對話。',
} as const;

export interface ConfigOverrides {
  outputDir?: string;
  formats?: string[];
  model?: string;
  provider?: string;
  skipAudio?: boolean;
}

/**
 * Load configuration from environment variables + .env.local.
 * CLI flag overrides can be merged in by the caller.
 *
 * Priority (highest → lowest):
 *   CLI flags (passed as overrides) > env vars / .env.local > built-in defaults
 */
export function loadConfig(overrides: ConfigOverrides = {}): Config {
  const speedRaw = process.env.OMNIVOICE_SPEED;
  const speed = speedRaw !== undefined ? parseFloat(speedRaw) : OMNIVOICE_DEFAULTS.speed;

  return {
    omnivoice: {
      refAudio: process.env.OMNIVOICE_REF_AUDIO,
      refText: process.env.OMNIVOICE_REF_TEXT ?? OMNIVOICE_DEFAULTS.refText,
      instruct: process.env.OMNIVOICE_INSTRUCT ?? OMNIVOICE_DEFAULTS.instruct,
      speed: isNaN(speed) ? OMNIVOICE_DEFAULTS.speed : speed,
      style: process.env.OMNIVOICE_STYLE ?? OMNIVOICE_DEFAULTS.style,
    },
    generation: {
      parallelScenes: 1,
      timeoutMs: 300_000,
      retries: 2,
    },
    output: {
      formats: overrides.formats
        ? (overrides.formats as Array<'pptx' | 'json' | 'html'>)
        : (process.env.OUTPUT_FORMATS?.split(',').map((f) => f.trim()) as Array<'pptx' | 'json' | 'html'>) ?? [
            'pptx',
            'json',
          ],
      dir: overrides.outputDir ?? process.env.OUTPUT_DIR ?? './output',
    },
    llm: {
      provider: (overrides.provider ?? process.env.LLM_PROVIDER) as Config['llm'] extends undefined
        ? never
        : NonNullable<Config['llm']>['provider'],
      model: overrides.model ?? process.env.LLM_MODEL,
    },
  };
}

/**
 * Return a human-readable summary of the current config with source annotations.
 */
export function describeConfig(overrides: ConfigOverrides = {}): string {
  const lines: string[] = [];

  const annotate = (value: string | number | undefined, envVar: string, isDefault: boolean) => {
    if (value === undefined) return '(not set)';
    const source = isDefault ? 'default' : `env:${envVar}`;
    return `${value}  [${source}]`;
  };

  lines.push('OmniVoice:');
  lines.push(
    `  refAudio  : ${process.env.OMNIVOICE_REF_AUDIO ?? '(not set — OMNIVOICE_REF_AUDIO required for audio generation)'}`,
  );
  lines.push(
    `  refText   : ${annotate(process.env.OMNIVOICE_REF_TEXT ?? OMNIVOICE_DEFAULTS.refText, 'OMNIVOICE_REF_TEXT', !process.env.OMNIVOICE_REF_TEXT)}`,
  );
  lines.push(
    `  instruct  : ${annotate(process.env.OMNIVOICE_INSTRUCT ?? OMNIVOICE_DEFAULTS.instruct, 'OMNIVOICE_INSTRUCT', !process.env.OMNIVOICE_INSTRUCT)}`,
  );
  lines.push(
    `  speed     : ${annotate(process.env.OMNIVOICE_SPEED ?? String(OMNIVOICE_DEFAULTS.speed), 'OMNIVOICE_SPEED', !process.env.OMNIVOICE_SPEED)}`,
  );

  lines.push('\nOutput:');
  const outputDir = overrides.outputDir ?? process.env.OUTPUT_DIR ?? './output';
  lines.push(
    `  dir       : ${annotate(outputDir, 'OUTPUT_DIR', !overrides.outputDir && !process.env.OUTPUT_DIR)}`,
  );

  lines.push('\nLLM:');
  const model = overrides.model ?? process.env.LLM_MODEL;
  lines.push(`  model     : ${model ?? '(not set — will use provider default)'}`);
  const provider = overrides.provider ?? process.env.LLM_PROVIDER;
  lines.push(`  provider  : ${provider ?? '(not set — defaults to anthropic)'}`);

  return lines.join('\n');
}
