import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import type { Config } from '../types.js';

/**
 * OmniVoice TTS Generator
 * Uses fixed clone reference for consistent voice
 */

export async function generateNarrationWithOmniVoice(
  narrationText: string,
  audioPath: string,
  config: Partial<Config> = {}
): Promise<string> {
  const ovc = (config.omnivoice ?? {}) as Partial<NonNullable<Config['omnivoice']>>;
  
  // Ensure output directory exists
  const dir = dirname(audioPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const refAudio = ovc.refAudio || '/Users/huli/.openclaw/workspace/voice-clones/jimmy-current-clone-reference.wav';
  const refText = ovc.refText || '这是现在我们学校流行的装饰品了。';
  const instruct = ovc.instruct || 'female, very low pitch';
  const speed = ovc.speed || 0.9;
  const style = ovc.style || 
    '請用台灣國語的感覺說話，使用台灣繁體中文常用詞。不要香港口音，不要港式語調，不要粵語感。不要中國播報腔，不要兒化音。語氣自然、親切、口語，像台灣日常對話。';

  try {
    // Escape text for shell
    const escapedText = narrationText.replace(/"/g, '\\"').replace(/\$/g, '\\$');
    
    const cmd = [
      'omnivoice-local',
      '--text', `"${escapedText}"`,
      '--ref-audio', refAudio,
      '--ref-text', `"${refText}"`,
      '--instruct', `"${instruct}"`,
      '--speed', String(speed),
      '--style', `"${style}"`,
      '--output', audioPath,
    ].join(' ');

    console.log(`🎙️  Generating audio: ${audioPath}`);
    console.log(`   Text: ${narrationText.substring(0, 50)}...`);
    
    try {
      execSync(cmd, { stdio: 'pipe', encoding: 'utf8' });
    } catch (error) {
      // Sometimes omnivoice returns non-zero but still generates file
      if (!existsSync(audioPath)) {
        throw error;
      }
    }
    
    console.log(`✅ Audio generated successfully`);
    return audioPath;
  } catch (error) {
    console.error(`❌ OmniVoice generation failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Generate narration for all scenes in a course
 * Processes sequentially to avoid overwhelming the system
 */
export async function generateCourseNarration(
  scenes: Array<{ id: string; title: string; narration?: string }>,
  outputDir: string,
  config: Partial<Config> = {}
): Promise<Array<{ sceneId: string; audioFile: string; success: boolean }>> {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log('🎙️  Stage: Generating Audio Narration');
  console.log('='.repeat(50));

  const results: Array<{ sceneId: string; audioFile: string; success: boolean }> = [];
  const parallelCount = config.generation?.parallelScenes || 1;

  for (let i = 0; i < scenes.length; i += parallelCount) {
    const batch = scenes.slice(i, Math.min(i + parallelCount, scenes.length));
    
    const promises = batch.map(async (scene) => {
      const narrationText = scene.narration || scene.title;
      if (!narrationText) {
        console.log(`⏭️  Skipping scene ${scene.id} (no narration)`);
        return { sceneId: scene.id, audioFile: '', success: false };
      }

      const audioFile = `${scene.id.replace('scene_', 'audio_')}.mp3`;
      const audioPath = `${outputDir}/${audioFile}`;

      try {
        await generateNarrationWithOmniVoice(narrationText, audioPath, config);
        return { sceneId: scene.id, audioFile, success: true };
      } catch (error) {
        console.error(`❌ Failed to generate audio for scene ${scene.id}`);
        return { sceneId: scene.id, audioFile: '', success: false };
      }
    });

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);

    // Show progress
    const completed = results.filter((r) => r.success).length;
    console.log(`Progress: ${completed}/${scenes.length} scenes`);
  }

  console.log(`\n✅ Audio generation complete: ${results.filter((r) => r.success).length}/${scenes.length} succeeded`);
  return results;
}
