import { describe, it, expect } from 'vitest';
import { parseLLMJson } from '../utils/parse-json.js';

describe('parseLLMJson', () => {
  it('parses plain JSON', () => {
    const result = parseLLMJson<{ name: string }>('{"name":"test"}', 'ctx');
    expect(result.name).toBe('test');
  });

  it('strips ```json fences', () => {
    const input = '```json\n{"value": 42}\n```';
    const result = parseLLMJson<{ value: number }>(input, 'ctx');
    expect(result.value).toBe(42);
  });

  it('strips plain ``` fences', () => {
    const input = '```\n{"ok": true}\n```';
    const result = parseLLMJson<{ ok: boolean }>(input, 'ctx');
    expect(result.ok).toBe(true);
  });

  it('handles leading/trailing whitespace', () => {
    const input = '  \n  {"x": 1}  \n  ';
    const result = parseLLMJson<{ x: number }>(input, 'ctx');
    expect(result.x).toBe(1);
  });

  it('parses arrays', () => {
    const result = parseLLMJson<number[]>('[1, 2, 3]', 'ctx');
    expect(result).toEqual([1, 2, 3]);
  });

  it('throws a descriptive error on invalid JSON', () => {
    expect(() => parseLLMJson('not json at all', 'myContext')).toThrowError(
      '[myContext] Failed to parse JSON',
    );
  });

  it('includes raw response snippet in the error', () => {
    expect(() => parseLLMJson('bad{input', 'ctx')).toThrowError('bad{input');
  });
});
