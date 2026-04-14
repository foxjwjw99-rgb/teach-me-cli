import { describe, it, expect } from 'vitest';
import { ConfigSchema, ClassroomSchema } from '../types.js';

describe('ConfigSchema', () => {
  it('accepts empty object (all optional)', () => {
    const result = ConfigSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial omnivoice config', () => {
    const result = ConfigSchema.safeParse({
      omnivoice: { refAudio: '/path/to/ref.wav', speed: 1.1 },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.omnivoice?.refAudio).toBe('/path/to/ref.wav');
      expect(result.data.omnivoice?.speed).toBe(1.1);
    }
  });

  it('rejects invalid llm provider', () => {
    const result = ConfigSchema.safeParse({
      llm: { provider: 'invalid-provider' },
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid llm providers', () => {
    for (const provider of ['openclaw', 'anthropic', 'openai', 'gemini']) {
      const result = ConfigSchema.safeParse({ llm: { provider } });
      expect(result.success).toBe(true);
    }
  });
});

describe('ClassroomSchema', () => {
  const minimalClassroom = {
    id: 'course_001',
    title: 'Test Course',
    topic: 'Testing',
    scenes: [],
    metadata: {
      generatedAt: new Date().toISOString(),
    },
  };

  it('accepts a minimal valid classroom', () => {
    const result = ClassroomSchema.safeParse(minimalClassroom);
    expect(result.success).toBe(true);
  });

  it('accepts valid scene types', () => {
    for (const type of ['slide', 'quiz', 'interactive', 'pbl']) {
      const classroom = {
        ...minimalClassroom,
        scenes: [{ id: 'scene_001', type, title: 'Test', keyPoints: [], actions: [] }],
      };
      const result = ClassroomSchema.safeParse(classroom);
      expect(result.success).toBe(true);
    }
  });

  it('rejects missing required fields', () => {
    const result = ClassroomSchema.safeParse({ title: 'No ID' });
    expect(result.success).toBe(false);
  });
});
