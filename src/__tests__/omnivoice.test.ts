import { describe, it, expect } from 'vitest';
import { generateCourseNarration } from '../audio/omnivoice.js';

/**
 * These tests rely on `omnivoice-local` NOT being installed in PATH,
 * which is the expected state on any CI / developer machine that hasn't
 * explicitly set up OmniVoice.
 *
 * The function must gracefully skip audio generation instead of throwing.
 */
describe('generateCourseNarration (omnivoice-local not in PATH)', () => {
  const scenes = [
    { id: 'scene_001', title: 'Intro', narration: 'Hello world' },
    { id: 'scene_002', title: 'End', narration: 'Goodbye' },
  ];

  it('returns all-failure results without throwing when tool is missing', async () => {
    const results = await generateCourseNarration(scenes, '/tmp/test-audio-omnivoice-test');
    expect(results).toHaveLength(2);
    for (const r of results) {
      expect(r.success).toBe(false);
      expect(r.audioFile).toBe('');
    }
  }, 10_000);

  it('preserves sceneIds in the result', async () => {
    const results = await generateCourseNarration(scenes, '/tmp/test-audio-omnivoice-test');
    expect(results[0].sceneId).toBe('scene_001');
    expect(results[1].sceneId).toBe('scene_002');
  }, 10_000);
});
