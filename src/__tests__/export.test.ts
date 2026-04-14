import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { generateJSON, generateHTML } from '../export/index.js';
import type { Classroom } from '../types.js';

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'teach-me-test-'));
}

const mockClassroom: Classroom = {
  id: 'course_test',
  title: '測試課程',
  topic: '測試',
  scenes: [
    {
      id: 'scene_001',
      type: 'slide',
      title: '第一章',
      keyPoints: ['重點一', '重點二'],
      narration: '這是測試旁白',
      actions: [],
      duration: 120,
    },
    {
      id: 'scene_002',
      type: 'quiz',
      title: '小測驗',
      keyPoints: ['複習'],
      narration: '現在測驗',
      quiz: {
        kind: 'single_choice',
        question: '問題一',
        options: ['A', 'B', 'C'],
        answer: 'A',
        explanation: '解析',
      },
      actions: [],
      duration: 60,
    },
  ],
  metadata: {
    generatedAt: new Date().toISOString(),
    totalDuration: 180,
  },
};

describe('generateJSON', () => {
  it('writes a valid JSON file', async () => {
    const dir = tempDir();
    const outPath = path.join(dir, 'classroom.json');
    await generateJSON(mockClassroom, outPath);

    expect(fs.existsSync(outPath)).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
    expect(parsed.id).toBe('course_test');
    expect(parsed.scenes).toHaveLength(2);

    fs.rmSync(dir, { recursive: true });
  });
});

describe('generateHTML', () => {
  it('writes an HTML file that references scene titles', async () => {
    const dir = tempDir();
    const outPath = path.join(dir, 'index.html');
    await generateHTML(mockClassroom, outPath, path.join(dir, 'audio'));

    expect(fs.existsSync(outPath)).toBe(true);
    const html = fs.readFileSync(outPath, 'utf-8');
    expect(html).toContain('第一章');
    expect(html).toContain('小測驗');

    fs.rmSync(dir, { recursive: true });
  });
});
