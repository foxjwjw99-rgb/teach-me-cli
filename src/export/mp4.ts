import { spawnSync } from 'child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import type { Classroom, Scene } from '../types.js';

// CJK-capable font candidates (macOS + Linux)
const CJK_FONT_CANDIDATES = [
  '/System/Library/Fonts/PingFang.ttc',
  '/System/Library/Fonts/Supplemental/Arial Unicode MS.ttf',
  '/usr/share/fonts/truetype/noto/NotoSansCJKsc-Regular.otf',
  '/usr/share/fonts/noto-cjk/NotoSansCJKsc-Regular.otf',
  '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
];

const VIDEO_WIDTH = 1920;
const VIDEO_HEIGHT = 1080;
const VIDEO_FPS = 30;
const DEFAULT_SCENE_DURATION = 30; // seconds

const SCENE_COLORS: Record<Scene['type'], string> = {
  slide: '0x13283F',
  quiz: '0x4A2A10',
  interactive: '0x123E38',
  pbl: '0x34124B',
};

function findFont(): string | undefined {
  return CJK_FONT_CANDIDATES.find(existsSync);
}

function ffmpegAvailable(): boolean {
  const r = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
  return r.status === 0;
}

function drawtextAvailable(): boolean {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-filters'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 10 * 1024 * 1024,
  });

  if (r.status !== 0) return false;
  return /\bdrawtext\b/.test(`${r.stdout ?? ''}\n${r.stderr ?? ''}`);
}

function runFfmpeg(args: string[], label: string): boolean {
  const r = spawnSync('ffmpeg', ['-y', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 10 * 1024 * 1024,
  });
  if (r.status !== 0) {
    const tail = (r.stderr ?? '').split('\n').slice(-8).join('\n');
    console.warn(`  ⚠️  ffmpeg [${label}] failed:\n${tail}`);
    return false;
  }
  return true;
}

function sceneTypeLabel(scene: Scene): string {
  const labels: Record<Scene['type'], string> = {
    slide: '講解場景',
    quiz: '測驗場景',
    interactive: '互動場景',
    pbl: '專題場景',
  };
  return labels[scene.type] ?? '教學場景';
}

function compactLines(lines: string[], maxLines = 10): string[] {
  return lines
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, maxLines);
}

function buildBodyLines(scene: Scene): string[] {
  const lines: string[] = [];

  if (scene.description) lines.push(scene.description);
  if (scene.content?.callout) lines.push(`重點：${scene.content.callout}`);

  for (const point of scene.keyPoints.slice(0, 4)) {
    lines.push(`• ${point}`);
  }

  for (const section of scene.content?.sections?.slice(0, 2) ?? []) {
    lines.push(`${section.heading}${section.body ? `：${section.body}` : ''}`);
    for (const bullet of section.bullets.slice(0, 2)) {
      lines.push(`  - ${bullet}`);
    }
  }

  if (scene.type === 'quiz' && scene.quiz) {
    lines.push(`題目：${scene.quiz.question}`);
    for (const option of scene.quiz.options?.slice(0, 4) ?? []) {
      lines.push(`  ${option}`);
    }
  }

  if (scene.type === 'interactive' && scene.interactive) {
    lines.push(`互動：${scene.interactive.instructions}`);
    if (scene.interactive.expectedOutcome) lines.push(`目標：${scene.interactive.expectedOutcome}`);
  }

  if (scene.type === 'pbl' && scene.pbl) {
    lines.push(`挑戰：${scene.pbl.challenge}`);
    if (scene.pbl.deliverable) lines.push(`產出：${scene.pbl.deliverable}`);
    for (const milestone of scene.pbl.milestones.slice(0, 3)) {
      lines.push(`  - ${milestone}`);
    }
  }

  if (scene.discussion?.prompt) lines.push(`討論：${scene.discussion.prompt}`);

  return compactLines(lines, 12);
}

function buildActionSummary(scene: Scene): string[] {
  const actionMap: Record<string, string> = {
    agent_speech: '講師發話',
    whiteboard_draw: '白板繪圖',
    whiteboard_text: '白板文字',
    whiteboard_shape: '白板形狀',
    whiteboard_chart: '白板圖表',
    whiteboard_clear: '清空白板',
    spotlight_on: '聚光燈開啟',
    spotlight_off: '聚光燈關閉',
    laser_pointer: '雷射筆',
    slide_transition: '切換',
    element_animate: '元素動畫',
    agent_pause: '停頓',
    quiz_trigger: '觸發測驗',
    discussion_prompt: '引導討論',
  };

  return compactLines(
    scene.actions.slice(0, 4).map((action, index) => `${index + 1}. ${actionMap[action.type] ?? action.type}`),
    4,
  );
}

function buildTextOverlayFiles(opts: { scene: Scene; index: number; total: number; tmpDir: string }) {
  const { scene, index, total, tmpDir } = opts;
  const titleTxt = join(tmpDir, `t${index}_title.txt`);
  const typeTxt = join(tmpDir, `t${index}_type.txt`);
  const bodyTxt = join(tmpDir, `t${index}_body.txt`);
  const actionTxt = join(tmpDir, `t${index}_actions.txt`);
  const counterTxt = join(tmpDir, `t${index}_counter.txt`);

  writeFileSync(titleTxt, scene.title ?? `Scene ${index + 1}`, 'utf8');
  writeFileSync(typeTxt, sceneTypeLabel(scene), 'utf8');
  writeFileSync(bodyTxt, buildBodyLines(scene).join('\n'), 'utf8');
  writeFileSync(actionTxt, buildActionSummary(scene).join('\n'), 'utf8');
  writeFileSync(counterTxt, `${index + 1} / ${total}`, 'utf8');

  return { titleTxt, typeTxt, bodyTxt, actionTxt, counterTxt };
}

/**
 * Build a single scene segment .mp4.
 * Always includes an audio track (real audio or silent anullsrc) so all
 * segments are concat-compatible without re-encoding.
 */
function buildSegment(opts: {
  scene: Scene;
  index: number;
  total: number;
  audioFile: string | undefined;
  outputPath: string;
  font: string | undefined;
  tmpDir: string;
  useDrawtext: boolean;
}): boolean {
  const { scene, index, total, audioFile, outputPath, font, tmpDir, useDrawtext } = opts;

  const duration = scene.duration ?? DEFAULT_SCENE_DURATION;
  const baseColor = SCENE_COLORS[scene.type] ?? SCENE_COLORS.slide;
  const videoSrc = `color=c=${baseColor}:size=${VIDEO_WIDTH}x${VIDEO_HEIGHT}:duration=${duration}:rate=${VIDEO_FPS}`;

  const args: string[] = ['-f', 'lavfi', '-i', videoSrc];

  if (audioFile && existsSync(audioFile)) {
    args.push('-i', audioFile);
  } else {
    args.push('-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo');
  }

  if (useDrawtext) {
    const fontOpt = font ? `fontfile=${font}:` : '';
    const files = buildTextOverlayFiles({ scene, index, total, tmpDir });
    const drawtextFilters: string[] = [
      `drawtext=${fontOpt}fontsize=62:fontcolor=white:x=96:y=88:textfile=${files.titleTxt}`,
      `drawtext=${fontOpt}fontsize=28:fontcolor=#FFE08A:x=96:y=170:textfile=${files.typeTxt}`,
      `drawtext=${fontOpt}fontsize=34:fontcolor=#E6F1FF:x=96:y=270:textfile=${files.bodyTxt}:line_spacing=16`,
      `drawtext=${fontOpt}fontsize=26:fontcolor=#9BD0FF:x=96:y=820:textfile=${files.actionTxt}:line_spacing=10`,
      `drawtext=${fontOpt}fontsize=28:fontcolor=#93A9C1:x=w-220:y=h-70:textfile=${files.counterTxt}`,
    ];
    args.push('-vf', drawtextFilters.join(','));
  }

  args.push('-t', String(duration));
  args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '23');
  args.push('-c:a', 'aac', '-b:a', '128k');
  if (audioFile && existsSync(audioFile)) {
    args.push('-shortest');
  }
  args.push(outputPath);

  return runFfmpeg(args, `scene ${index + 1}${audioFile && existsSync(audioFile) ? '' : ' (silent)'}`);
}

/**
 * Resolve the audio file for a scene, checking multiple filename conventions.
 */
function resolveAudioFile(
  scene: Scene,
  sceneIndex: number,
  audioDir: string | undefined,
): string | undefined {
  if (!audioDir) return undefined;

  const num = String(sceneIndex + 1).padStart(3, '0');
  const candidates = [
    join(audioDir, `${scene.id}.wav`),
    join(audioDir, `${scene.id}.mp3`),
    join(audioDir, `audio_${num}.wav`),
    join(audioDir, `audio_${num}.mp3`),
    join(audioDir, `scene_${num}_narration.wav`),
    join(audioDir, `scene_${num}_narration.mp3`),
    join(audioDir, `slide_${num}.mp3`),
    join(audioDir, `slide_${num}.wav`),
  ];

  return candidates.find(existsSync);
}

/**
 * Export a Classroom to a single MP4 file.
 */
export async function generateMP4(
  classroom: Classroom,
  outputPath: string,
  audioDir?: string,
): Promise<void> {
  console.log(`\n${'-'.repeat(50)}`);
  console.log('🎬 Export: Generating MP4');
  console.log('-'.repeat(50));

  if (!ffmpegAvailable()) {
    throw new Error('ffmpeg not found in PATH, install ffmpeg to use MP4 export.');
  }

  const outDir = dirname(outputPath);
  const tmpDir = join(outDir, '.mp4-tmp');

  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

  const font = findFont();
  const useDrawtext = drawtextAvailable();

  console.log(font ? `  Font: ${font}` : '  Font: none found (Latin only)');
  if (!useDrawtext) {
    console.log('  drawtext filter unavailable, using plain color fallback video.');
  }

  const scenes = classroom.scenes;
  console.log(`  Scenes: ${scenes.length}`);

  const segmentPaths: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const segPath = join(tmpDir, `seg_${String(i).padStart(3, '0')}.mp4`);

    const audioFile = resolveAudioFile(scene, i, audioDir);
    const audioLabel = audioFile ? '+audio' : 'silent';
    const titlePreview = (scene.title ?? '').slice(0, 40);
    console.log(`  [${i + 1}/${scenes.length}] ${titlePreview} [${scene.type}] [${audioLabel}]`);

    const ok = buildSegment({
      scene,
      index: i,
      total: scenes.length,
      audioFile,
      outputPath: segPath,
      font,
      tmpDir,
      useDrawtext,
    });

    if (ok) {
      segmentPaths.push(segPath);
    } else {
      console.warn(`    Skipping scene ${i + 1} due to ffmpeg error`);
    }
  }

  if (segmentPaths.length === 0) {
    rmSync(tmpDir, { recursive: true, force: true });
    throw new Error('All scene segments failed, MP4 export aborted.');
  }

  const concatTxt = join(tmpDir, 'concat.txt');
  writeFileSync(
    concatTxt,
    segmentPaths.map((p) => `file '${p.replace(/'/g, `'\\''`)}'`).join('\n'),
  );

  console.log(`  Concatenating ${segmentPaths.length}/${scenes.length} segments...`);

  const concatOk = runFfmpeg(
    ['-f', 'concat', '-safe', '0', '-i', concatTxt, '-c', 'copy', outputPath],
    'concat',
  );

  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }

  if (!concatOk) {
    throw new Error('ffmpeg concat step failed, see warnings above.');
  }

  console.log(`✅ MP4 saved: ${outputPath}`);
}
