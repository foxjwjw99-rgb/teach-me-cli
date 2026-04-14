import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, describeConfig } from '../config.js';

// Snapshot and restore env vars for test isolation
const TRACKED_VARS = [
  'OMNIVOICE_REF_AUDIO',
  'OMNIVOICE_REF_TEXT',
  'OMNIVOICE_INSTRUCT',
  'OMNIVOICE_SPEED',
  'OMNIVOICE_STYLE',
  'OUTPUT_DIR',
  'OUTPUT_FORMATS',
  'LLM_MODEL',
  'LLM_PROVIDER',
];

let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = {};
  for (const v of TRACKED_VARS) {
    saved[v] = process.env[v];
    delete process.env[v];
  }
});

afterEach(() => {
  for (const v of TRACKED_VARS) {
    if (saved[v] === undefined) {
      delete process.env[v];
    } else {
      process.env[v] = saved[v];
    }
  }
});

describe('loadConfig', () => {
  it('returns defaults when no env vars are set', () => {
    const config = loadConfig();
    expect(config.omnivoice?.refAudio).toBeUndefined();
    expect(config.omnivoice?.refText).toBe('这是现在我们学校流行的装饰品了。');
    expect(config.omnivoice?.speed).toBe(0.9);
    expect(config.output?.dir).toBe('./output');
    expect(config.output?.formats).toEqual(['pptx', 'json']);
  });

  it('reads OMNIVOICE_REF_AUDIO from env', () => {
    process.env.OMNIVOICE_REF_AUDIO = '/my/ref.wav';
    const config = loadConfig();
    expect(config.omnivoice?.refAudio).toBe('/my/ref.wav');
  });

  it('reads OMNIVOICE_SPEED from env as a number', () => {
    process.env.OMNIVOICE_SPEED = '1.2';
    const config = loadConfig();
    expect(config.omnivoice?.speed).toBe(1.2);
  });

  it('falls back to default speed when OMNIVOICE_SPEED is not a number', () => {
    process.env.OMNIVOICE_SPEED = 'fast';
    const config = loadConfig();
    expect(config.omnivoice?.speed).toBe(0.9);
  });

  it('reads OUTPUT_DIR from env', () => {
    process.env.OUTPUT_DIR = '/tmp/my-output';
    const config = loadConfig();
    expect(config.output?.dir).toBe('/tmp/my-output');
  });

  it('applies outputDir override over env', () => {
    process.env.OUTPUT_DIR = '/tmp/from-env';
    const config = loadConfig({ outputDir: '/tmp/from-flag' });
    expect(config.output?.dir).toBe('/tmp/from-flag');
  });

  it('reads LLM_MODEL and LLM_PROVIDER from env', () => {
    process.env.LLM_MODEL = 'claude-opus-4-5';
    process.env.LLM_PROVIDER = 'anthropic';
    const config = loadConfig();
    expect(config.llm?.model).toBe('claude-opus-4-5');
    expect(config.llm?.provider).toBe('anthropic');
  });

  it('applies model/provider overrides over env', () => {
    process.env.LLM_MODEL = 'from-env';
    const config = loadConfig({ model: 'from-flag' });
    expect(config.llm?.model).toBe('from-flag');
  });
});

describe('describeConfig', () => {
  it('returns a non-empty string', () => {
    const desc = describeConfig();
    expect(typeof desc).toBe('string');
    expect(desc.length).toBeGreaterThan(0);
  });

  it('mentions OmniVoice section', () => {
    expect(describeConfig()).toContain('OmniVoice');
  });

  it('annotates env values as defaults when env is not set', () => {
    const desc = describeConfig();
    expect(desc).toContain('[default]');
  });
});
