import { exec } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import pLimit from 'p-limit';

function execAsync(cmd: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(cmd, { encoding: 'utf8' }, (error, stdout, stderr) => {
      if (error) {
        reject(Object.assign(error, { stdout, stderr }));
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * OmniVoice TTS Generator
 * Uses fixed clone reference for consistent voice
 */

export async function generateNarrationWithOmniVoice(
  narrationText: string,
  audioPath: string,
): Promise<string> {
  ensureDir(dirname(audioPath));

  const refAudio = process.env.OMNIVOICE_REF_AUDIO ?? '';
  const refText = process.env.OMNIVOICE_REF_TEXT ?? '这是现在我们学校流行的装饰品了。';
  const instruct = process.env.OMNIVOICE_INSTRUCT ?? 'female, very low pitch';
  const speed = process.env.OMNIVOICE_SPEED ?? '0.9';
  const style = process.env.OMNIVOICE_STYLE ??
    '請用台灣國語的感覺說話，使用台灣繁體中文常用詞。不要香港口音，不要港式語調，不要粵語感。不要中國播報腔，不要兒化音。語氣自然、親切、口語，像台灣日常對話。';

  // Escape text for shell (quotes + dollar signs)
  const escapedText = narrationText.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`');
  const escapedStyle = style.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$');

  const cmdParts = [
    'omnivoice-local',
    '--text', `"${escapedText}"`,
    ...(refAudio ? ['--ref-audio', refAudio] : []),
    '--ref-text', `"${refText}"`,
    '--instruct', `"${instruct}"`,
    '--speed', speed,
    '--style', `"${escapedStyle}"`,
    '--output', audioPath,
  ];

  const cmd = cmdParts.join(' ');

  console.log(`🎙️  Generating audio: ${audioPath}`);
  console.log(`   Text: ${narrationText.substring(0, 50)}...`);

  try {
    await execAsync(cmd);
  } catch (error) {
    // omnivoice sometimes exits non-zero but still generates the file
    if (!existsSync(audioPath)) {
      throw error;
    }
  }

  console.log(`✅ Audio generated: ${audioPath}`);
  return audioPath;
}

/**
 * Generate narration for all scenes in a course.
 * Uses p-limit for a true sliding-window concurrency model instead of fixed batches.
 */
export async function generateCourseNarration(
  scenes: Array<{ id: string; title: string; narration?: string }>,
  outputDir: string,
  concurrency = Number(process.env.TEACH_ME_AUDIO_CONCURRENCY ?? '3'),
): Promise<Array<{ sceneId: string; audioFile: string; success: boolean }>> {
  ensureDir(outputDir);

  console.log(`\n${'='.repeat(50)}`);
  console.log(`🎙️  Stage: Generating Audio Narration (concurrency: ${concurrency})`);
  console.log('='.repeat(50));

  const limit = pLimit(concurrency);
  let completed = 0;

  const tasks = scenes.map((scene) =>
    limit(async () => {
      const narrationText = scene.narration || scene.title;
      const audioFile = `${scene.id}.mp3`;
      const audioPath = `${outputDir}/${audioFile}`;

      try {
        await generateNarrationWithOmniVoice(narrationText, audioPath);
        completed++;
        console.log(`  [${completed}/${scenes.length}] ✅ ${scene.id}`);
        return { sceneId: scene.id, audioFile, success: true };
      } catch (error) {
        completed++;
        console.error(`  [${completed}/${scenes.length}] ❌ ${scene.id}: ${error instanceof Error ? error.message : String(error)}`);
        return { sceneId: scene.id, audioFile: '', success: false };
      }
    })
  );

  const results = await Promise.all(tasks);
  const succeeded = results.filter((r) => r.success).length;
  console.log(`\n✅ Audio complete: ${succeeded}/${scenes.length} succeeded`);
  return results;
}
