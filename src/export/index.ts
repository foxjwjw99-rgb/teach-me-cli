import PptxGenJS from 'pptxgenjs';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join, relative } from 'path';
import type { Classroom, Scene, SceneType } from '../types.js';

export { generateMP4 } from './mp4.js';

const SLIDE_WIDTH = 10;
const SLIDE_HEIGHT = 5.625; // 16:9

const SCENE_META: Record<SceneType, { label: string; accent: string; light: string }> = {
  slide: { label: '講解', accent: '1F4E78', light: 'EAF3FF' },
  quiz: { label: '測驗', accent: 'A64B00', light: 'FFF1E8' },
  interactive: { label: '互動', accent: '00695C', light: 'E8F7F3' },
  pbl: { label: '專題', accent: '6A1B9A', light: 'F4EAFE' },
};

function ensureDir(outputPath: string): void {
  const dir = dirname(outputPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function getSceneMeta(scene: Scene) {
  return SCENE_META[scene.type] ?? SCENE_META.slide;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderListHtml(items: string[], emptyText = '尚無資料'): string {
  if (!items.length) {
    return `<p class="muted">${escapeHtml(emptyText)}</p>`;
  }
  return `<ul class="clean">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function summarizeActions(scene: Scene): string[] {
  const labelMap: Record<string, string> = {
    agent_speech: '講師發話',
    whiteboard_draw: '白板繪圖',
    whiteboard_text: '白板文字',
    whiteboard_shape: '白板形狀',
    whiteboard_chart: '白板圖表',
    whiteboard_clear: '清空白板',
    spotlight_on: '聚光燈開啟',
    spotlight_off: '聚光燈關閉',
    laser_pointer: '雷射筆指示',
    slide_transition: '場景切換',
    element_animate: '元素動畫',
    agent_pause: '講師停頓',
    quiz_trigger: '觸發測驗',
    discussion_prompt: '引導討論',
  };

  return scene.actions.slice(0, 5).map((action, index) => `${index + 1}. ${labelMap[action.type] ?? action.type}`);
}

function sceneDetailLines(scene: Scene): string[] {
  const lines: string[] = [];

  if (scene.description) lines.push(`• ${scene.description}`);
  if (scene.content?.callout) lines.push(`• 重點提示：${scene.content.callout}`);

  if (scene.type === 'quiz' && scene.quiz) {
    lines.push(`• 題目：${scene.quiz.question}`);
    for (const option of scene.quiz.options ?? []) lines.push(`  - ${option}`);
    if (scene.quiz.explanation) lines.push(`• 解析：${scene.quiz.explanation}`);
  }

  if (scene.type === 'interactive' && scene.interactive) {
    lines.push(`• 任務：${scene.interactive.instructions}`);
    if (scene.interactive.initialState) lines.push(`• 起始：${scene.interactive.initialState}`);
    if (scene.interactive.expectedOutcome) lines.push(`• 目標：${scene.interactive.expectedOutcome}`);
  }

  if (scene.type === 'pbl' && scene.pbl) {
    lines.push(`• 挑戰：${scene.pbl.challenge}`);
    if (scene.pbl.deliverable) lines.push(`• 產出：${scene.pbl.deliverable}`);
    for (const milestone of scene.pbl.milestones.slice(0, 3)) lines.push(`  - ${milestone}`);
  }

  for (const section of scene.content?.sections?.slice(0, 2) ?? []) {
    lines.push(`• ${section.heading}${section.body ? `：${section.body}` : ''}`);
    for (const bullet of section.bullets.slice(0, 2)) lines.push(`  - ${bullet}`);
  }

  if (scene.discussion?.prompt) lines.push(`• 討論：${scene.discussion.prompt}`);

  return lines.slice(0, 8);
}

function buildNotes(scene: Scene): string {
  const parts: string[] = [];
  if (scene.narration) parts.push(`【旁白】\n${scene.narration}`);
  if (scene.teacherNotes) parts.push(`【講師備註】\n${scene.teacherNotes}`);
  if ((scene.learningObjectives ?? []).length > 0) {
    parts.push(`【學習目標】\n${(scene.learningObjectives ?? []).map((item) => `- ${item}`).join('\n')}`);
  }
  const actionSummary = summarizeActions(scene);
  if (actionSummary.length > 0) {
    parts.push(`【動作時間線】\n${actionSummary.join('\n')}`);
  }
  return parts.join('\n\n');
}

function resolveSceneAudioRelative(scene: Scene, sceneIndex: number, htmlPath: string, audioDir?: string): string | undefined {
  if (!audioDir) return undefined;

  const num = String(sceneIndex + 1).padStart(3, '0');
  const candidates = [
    join(audioDir, `${scene.id}.mp3`),
    join(audioDir, `${scene.id}.wav`),
    join(audioDir, `audio_${num}.mp3`),
    join(audioDir, `audio_${num}.wav`),
    join(audioDir, `scene_${num}_narration.mp3`),
    join(audioDir, `scene_${num}_narration.wav`),
    join(audioDir, `slide_${num}.mp3`),
    join(audioDir, `slide_${num}.wav`),
  ];

  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) return undefined;
  return relative(dirname(htmlPath), match).replace(/\\/g, '/');
}

function renderSectionsHtml(scene: Scene): string {
  const blocks: string[] = [];

  if (scene.content?.text) {
    blocks.push(`<div class="section-box"><strong>畫面摘要</strong><div class="muted body-text">${escapeHtml(scene.content.text)}</div></div>`);
  }

  for (const section of scene.content?.sections ?? []) {
    blocks.push(
      `<div class="section-box">` +
        `<strong>${escapeHtml(section.heading)}</strong>` +
        `${section.body ? `<div class="muted body-text">${escapeHtml(section.body)}</div>` : ''}` +
        `${renderListHtml(section.bullets, '沒有額外條列')}` +
      `</div>`,
    );
  }

  return blocks.length > 0 ? `<div class="sections">${blocks.join('')}</div>` : '<p class="muted">尚未生成畫面內容</p>';
}

function renderSpecialHtml(scene: Scene): string {
  if (scene.type === 'quiz' && scene.quiz) {
    return (
      `<div class="section-box">` +
        `<strong>題目</strong>` +
        `<div class="body-text">${escapeHtml(scene.quiz.question)}</div>` +
        `${(scene.quiz.options?.length ?? 0) > 0 ? renderListHtml(scene.quiz.options ?? []) : ''}` +
        `${scene.quiz.answer ? `<div class="pill-row"><span class="pill">答案：${escapeHtml(Array.isArray(scene.quiz.answer) ? scene.quiz.answer.join('、') : scene.quiz.answer)}</span></div>` : ''}` +
        `${scene.quiz.explanation ? `<div class="muted body-text">解析：${escapeHtml(scene.quiz.explanation)}</div>` : ''}` +
      `</div>`
    );
  }

  if (scene.type === 'interactive' && scene.interactive) {
    return (
      `<div class="section-box">` +
        `<strong>互動任務</strong>` +
        `<div class="body-text">${escapeHtml(scene.interactive.instructions)}</div>` +
        `<div class="pill-row">` +
          `<span class="pill">形式：${escapeHtml(scene.interactive.format)}</span>` +
          `${scene.interactive.initialState ? `<span class="pill">起始：${escapeHtml(scene.interactive.initialState)}</span>` : ''}` +
          `${scene.interactive.expectedOutcome ? `<span class="pill">目標：${escapeHtml(scene.interactive.expectedOutcome)}</span>` : ''}` +
        `</div>` +
      `</div>`
    );
  }

  if (scene.type === 'pbl' && scene.pbl) {
    return (
      `<div class="section-box">` +
        `<strong>專題任務</strong>` +
        `${scene.pbl.role ? `<div class="pill-row"><span class="pill">角色：${escapeHtml(scene.pbl.role)}</span></div>` : ''}` +
        `<div class="body-text">${escapeHtml(scene.pbl.challenge)}</div>` +
        `${scene.pbl.deliverable ? `<div class="muted body-text">產出物：${escapeHtml(scene.pbl.deliverable)}</div>` : ''}` +
        `${renderListHtml(scene.pbl.milestones, '沒有里程碑')}` +
      `</div>`
    );
  }

  return '<p class="muted">這個場景沒有額外的互動模組。</p>';
}

function renderDiscussionHtml(scene: Scene): string {
  if (!scene.discussion) return '<p class="muted">這個場景沒有討論提示。</p>';

  return (
    `<div class="section-box">` +
      `<strong>討論提示</strong>` +
      `<div class="body-text">${escapeHtml(scene.discussion.prompt)}</div>` +
      `${scene.discussion.participants.length > 0 ? `<div class="pill-row">${scene.discussion.participants.map((item) => `<span class="pill">${escapeHtml(item)}</span>`).join('')}</div>` : ''}` +
      `${scene.discussion.expectedTakeaway ? `<div class="muted body-text">預期收束：${escapeHtml(scene.discussion.expectedTakeaway)}</div>` : ''}` +
    `</div>`
  );
}

function renderActionsHtml(scene: Scene): string {
  if (!scene.actions.length) return '<p class="muted">目前沒有 actions timeline。</p>';

  return `<div class="timeline">${scene.actions.map((action, index) => {
    const title = summarizeActions({ ...scene, actions: [action] })[0]?.replace(/^1\. /, '') ?? action.type;
    return (
      `<div class="timeline-item">` +
        `<div class="timeline-time">#${index + 1}<br>${escapeHtml(action.delay ?? 0)}ms / ${escapeHtml(action.duration ?? 0)}ms</div>` +
        `<div>` +
          `<div class="timeline-title">${escapeHtml(title)}</div>` +
          `<div class="muted body-text">${escapeHtml(JSON.stringify(action.params ?? {}))}</div>` +
        `</div>` +
      `</div>`
    );
  }).join('')}</div>`;
}

function renderAudioHtml(audioSrc?: string): string {
  if (!audioSrc) return '<p class="muted">這個場景目前沒有對應音檔。</p>';
  return `<audio controls preload="none" src="${escapeHtml(audioSrc)}"></audio>`;
}

function renderScenePageHtml(scene: Scene, index: number, total: number, audioSrc?: string): string {
  const meta = getSceneMeta(scene);
  return (
    `<article class="scene-page ${index === 0 ? 'active' : ''}" data-scene-index="${index}">` +
      `<div class="main-header">` +
        `<div>` +
          `<span class="badge" style="background:${meta.light};color:#${meta.accent}">${escapeHtml(meta.label)}</span>` +
          `<h2 class="scene-main-title">${escapeHtml(scene.title)}</h2>` +
          `<div class="muted body-text">${escapeHtml(scene.description ?? '尚未提供描述')}</div>` +
        `</div>` +
        `<div class="pill-row">` +
          `<span class="pill">時長：${escapeHtml(scene.duration ?? 120)} 秒</span>` +
          `<span class="pill">Scene ${index + 1} / ${total}</span>` +
          `<span class="pill">ID：${escapeHtml(scene.id)}</span>` +
        `</div>` +
      `</div>` +
      `<div class="grid">` +
        `<section class="card col-4" style="border-color:#${meta.accent}22;background:#${meta.light}">` +
          `<h3 style="color:#${meta.accent}">學習目標</h3>` +
          `${renderListHtml(scene.learningObjectives ?? [], '尚未提供學習目標')}` +
        `</section>` +
        `<section class="card col-8">` +
          `<h3>核心重點</h3>` +
          `${renderListHtml(scene.keyPoints, '尚未生成重點')}` +
        `</section>` +
        `<section class="card col-7">` +
          `<h3>畫面內容</h3>` +
          `${renderSectionsHtml(scene)}` +
        `</section>` +
        `<section class="card col-5">` +
          `<h3>場景模組</h3>` +
          `${renderSpecialHtml(scene)}` +
        `</section>` +
        `<section class="card col-6">` +
          `<h3>旁白與講師備註</h3>` +
          `<div class="section-box"><strong>旁白</strong><div class="body-text">${escapeHtml(scene.narration ?? '尚未生成旁白')}</div></div>` +
          `<div class="section-box"><strong>講師備註</strong><div class="muted body-text">${escapeHtml(scene.teacherNotes ?? '尚未提供講師備註')}</div></div>` +
          `${scene.content?.callout ? `<div class="section-box"><strong>Callout</strong><div class="body-text">${escapeHtml(scene.content.callout)}</div></div>` : ''}` +
        `</section>` +
        `<section class="card col-6">` +
          `<h3>討論與聲音</h3>` +
          `${renderDiscussionHtml(scene)}` +
          `<div class="section-box"><strong>場景音訊</strong>${renderAudioHtml(audioSrc)}</div>` +
        `</section>` +
        `<section class="card col-12">` +
          `<h3>Actions Timeline</h3>` +
          `${renderActionsHtml(scene)}` +
        `</section>` +
      `</div>` +
    `</article>`
  );
}

/**
 * Generate PPTX file from classroom structure
 */
export async function generatePPTX(
  classroom: Classroom,
  outputPath: string,
): Promise<void> {
  console.log(`\n${'='.repeat(50)}`);
  console.log('📊 Export: Generating PPTX');
  console.log('='.repeat(50));

  ensureDir(outputPath);

  const prs = new PptxGenJS();
  prs.defineLayout({
    name: 'LAYOUT1',
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
  });
  prs.layout = 'LAYOUT1';

  console.log(`Generating PPTX with ${classroom.scenes.length} slides...`);

  for (let i = 0; i < classroom.scenes.length; i++) {
    const scene = classroom.scenes[i];
    const meta = getSceneMeta(scene);
    const slide = prs.addSlide();

    slide.background = { color: 'FFFFFF' };

    slide.addShape('rect', {
      x: 0,
      y: 0,
      w: 0.24,
      h: SLIDE_HEIGHT,
      fill: { color: meta.accent },
      line: { color: meta.accent },
    });

    slide.addText(scene.title, {
      x: 0.52,
      y: 0.32,
      w: 7,
      h: 0.5,
      fontSize: 27,
      bold: true,
      color: '1C2434',
      margin: 0,
    });

    slide.addShape('roundRect', {
      x: 8.2,
      y: 0.32,
      w: 0.95,
      h: 0.3,
      fill: { color: meta.light },
      line: { color: meta.light },
    });
    slide.addText(meta.label, {
      x: 8.2,
      y: 0.37,
      w: 0.95,
      h: 0.12,
      fontSize: 10,
      bold: true,
      color: meta.accent,
      align: 'center',
      margin: 0,
    });

    if (scene.description) {
      slide.addText(scene.description, {
        x: 0.54,
        y: 0.88,
        w: 8.4,
        h: 0.34,
        fontSize: 11,
        color: '57606A',
        margin: 0,
      });
    }

    slide.addShape('roundRect', {
      x: 0.52,
      y: 1.35,
      w: 3.12,
      h: 3.02,
      fill: { color: 'F8FAFD' },
      line: { color: 'D7E3F4', width: 1 },
    });
    slide.addText('核心重點', {
      x: 0.72,
      y: 1.56,
      w: 1.4,
      h: 0.2,
      fontSize: 16,
      bold: true,
      color: meta.accent,
      margin: 0,
    });
    slide.addText((scene.keyPoints.length > 0 ? scene.keyPoints : ['尚未生成重點']).map((item) => `• ${item}`).join('\n'), {
      x: 0.8,
      y: 1.92,
      w: 2.55,
      h: 2.18,
      fontSize: 15,
      color: '233142',
      breakLine: true,
      margin: 0,
      valign: 'top',
    });

    slide.addShape('roundRect', {
      x: 3.86,
      y: 1.35,
      w: 5.18,
      h: 3.02,
      fill: { color: meta.light },
      line: { color: meta.light, width: 1 },
    });
    slide.addText('場景細節', {
      x: 4.04,
      y: 1.56,
      w: 1.5,
      h: 0.2,
      fontSize: 16,
      bold: true,
      color: meta.accent,
      margin: 0,
    });
    slide.addText(sceneDetailLines(scene).join('\n') || '尚未生成場景細節', {
      x: 4.04,
      y: 1.92,
      w: 4.58,
      h: 2.15,
      fontSize: 12.5,
      color: '233142',
      breakLine: true,
      margin: 0,
      valign: 'top',
    });

    if ((scene.learningObjectives ?? []).length > 0) {
      slide.addText('學習目標', {
        x: 0.56,
        y: 4.56,
        w: 1.2,
        h: 0.18,
        fontSize: 13,
        bold: true,
        color: meta.accent,
        margin: 0,
      });
      slide.addText((scene.learningObjectives ?? []).map((item) => `• ${item}`).join('\n'), {
        x: 0.74,
        y: 4.82,
        w: 3.0,
        h: 0.46,
        fontSize: 10.5,
        color: '3F4B5A',
        breakLine: true,
        margin: 0,
      });
    }

    if (scene.content?.callout || scene.teacherNotes) {
      slide.addShape('roundRect', {
        x: 4.08,
        y: 4.48,
        w: 4.96,
        h: 0.62,
        fill: { color: 'FFFFFF' },
        line: { color: 'D9E2EC', width: 1 },
      });
      slide.addText(scene.content?.callout ?? scene.teacherNotes ?? '', {
        x: 4.24,
        y: 4.72,
        w: 4.5,
        h: 0.14,
        fontSize: 11,
        italic: true,
        color: '51606F',
        margin: 0,
      });
    }

    slide.addText(`${i + 1}/${classroom.scenes.length}`, {
      x: 8.45,
      y: 5.18,
      w: 0.7,
      h: 0.12,
      fontSize: 10,
      color: '7A8794',
      align: 'right',
      margin: 0,
    });

    const notes = buildNotes(scene);
    if (notes) {
      slide.addNotes(notes);
    }
  }

  await prs.writeFile({ fileName: outputPath });
  console.log(`✅ PPTX saved: ${outputPath}`);
}

/**
 * Generate JSON export (complete course structure)
 */
export async function generateJSON(
  classroom: Classroom,
  outputPath: string,
): Promise<void> {
  console.log(`\n📄 Exporting to JSON: ${outputPath}`);
  ensureDir(outputPath);
  writeFileSync(outputPath, JSON.stringify(classroom, null, 2));
  console.log(`✅ JSON saved: ${outputPath}`);
}

/**
 * Generate HTML player (interactive playback)
 */
export async function generateHTML(
  classroom: Classroom,
  outputPath: string,
  audioDir?: string,
): Promise<void> {
  console.log(`\n🎬 Exporting to HTML: ${outputPath}`);
  ensureDir(outputPath);

  const sidebarHtml = classroom.scenes.map((scene, index) => {
    const meta = getSceneMeta(scene);
    return (
      `<div class="scene-item ${index === 0 ? 'active' : ''}" data-scene-target="${index}" style="--accent:#${meta.accent};--light:#${meta.light}">` +
        `<div class="scene-index">Scene ${index + 1} / ${classroom.scenes.length}</div>` +
        `<span class="badge" style="background:#${meta.light};color:#${meta.accent}">${escapeHtml(meta.label)}</span>` +
        `<div class="scene-title">${escapeHtml(scene.title)}</div>` +
        `<div class="scene-desc">${escapeHtml(scene.description ?? '尚未提供描述')}</div>` +
      `</div>`
    );
  }).join('');

  const scenesHtml = classroom.scenes.map((scene, index) => {
    const audioSrc = resolveSceneAudioRelative(scene, index, outputPath, audioDir);
    return renderScenePageHtml(scene, index, classroom.scenes.length, audioSrc);
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(classroom.title)}</title>
  <style>
    :root {
      --bg: #f4f7fb;
      --card: #ffffff;
      --text: #1f2937;
      --muted: #667085;
      --border: #d8e1ec;
      --shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--text);
      background: linear-gradient(180deg, #f8fbff 0%, var(--bg) 100%);
    }
    .page { max-width: 1380px; margin: 0 auto; padding: 28px; }
    .hero {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 28px;
      box-shadow: var(--shadow);
      margin-bottom: 20px;
    }
    .hero-top { display: flex; gap: 16px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
    .hero h1 { margin: 0 0 10px; font-size: 34px; }
    .hero p { margin: 0; color: var(--muted); line-height: 1.7; }
    .hero-stats { display: flex; gap: 12px; flex-wrap: wrap; }
    .stat {
      background: #f8fafc;
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 12px 14px;
      min-width: 120px;
    }
    .stat-label { font-size: 12px; color: var(--muted); }
    .stat-value { font-size: 18px; font-weight: 700; margin-top: 4px; }
    .layout { display: grid; grid-template-columns: 320px minmax(0, 1fr); gap: 20px; }
    .sidebar, .main {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 24px;
      box-shadow: var(--shadow);
    }
    .sidebar { padding: 14px; height: calc(100vh - 140px); position: sticky; top: 20px; overflow: auto; }
    .scene-item {
      border: 1px solid transparent;
      border-radius: 18px;
      padding: 14px;
      cursor: pointer;
      transition: 0.18s ease;
      margin-bottom: 10px;
      background: #f8fbff;
    }
    .scene-item:hover { transform: translateY(-1px); border-color: var(--border); }
    .scene-item.active { border-color: var(--accent, var(--border)); background: var(--light, #eef5ff); }
    .scene-index { font-size: 12px; color: var(--muted); margin-bottom: 8px; }
    .badge {
      display: inline-flex; align-items: center; gap: 6px;
      border-radius: 999px; padding: 4px 10px; font-size: 12px; font-weight: 700;
    }
    .scene-title { margin: 10px 0 6px; font-size: 16px; font-weight: 700; line-height: 1.45; }
    .scene-desc { color: var(--muted); font-size: 13px; line-height: 1.6; }
    .main { padding: 24px; }
    .scene-page { display: none; }
    .scene-page.active { display: block; }
    .main-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .scene-main-title { margin: 12px 0 8px; font-size: 30px; }
    .muted { color: var(--muted); }
    .body-text { line-height: 1.8; margin-top: 8px; }
    .grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 16px; margin-top: 22px; }
    .card {
      background: #fbfdff;
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 18px;
      min-height: 100px;
    }
    .card h3 { margin: 0 0 12px; font-size: 15px; }
    .col-4 { grid-column: span 4; }
    .col-5 { grid-column: span 5; }
    .col-6 { grid-column: span 6; }
    .col-7 { grid-column: span 7; }
    .col-8 { grid-column: span 8; }
    .col-12 { grid-column: span 12; }
    ul.clean { margin: 0; padding-left: 18px; line-height: 1.8; }
    .sections, .timeline { display: grid; gap: 10px; }
    .section-box {
      border-radius: 14px;
      padding: 12px 14px;
      background: white;
      border: 1px solid #e6edf5;
      margin-top: 10px;
    }
    .section-box:first-child { margin-top: 0; }
    .section-box strong { display: block; margin-bottom: 6px; }
    .pill-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
    .pill {
      border-radius: 999px;
      padding: 6px 10px;
      background: white;
      border: 1px solid #dbe5ef;
      font-size: 12px;
      color: #334155;
    }
    .timeline-item {
      display: grid; grid-template-columns: 92px 1fr;
      gap: 10px;
      align-items: start;
      border-radius: 14px;
      background: white;
      border: 1px solid #e6edf5;
      padding: 10px 12px;
    }
    .timeline-time { font-size: 12px; color: var(--muted); }
    .timeline-title { font-weight: 700; margin-bottom: 4px; }
    .controls { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 24px; }
    button {
      border: none;
      border-radius: 12px;
      padding: 12px 16px;
      font-size: 14px;
      cursor: pointer;
      background: #1f4e78;
      color: white;
      font-weight: 700;
    }
    button.secondary { background: #eef4fb; color: #1f3b57; }
    button:disabled { opacity: 0.45; cursor: not-allowed; }
    audio { width: 100%; margin-top: 10px; }
    @media (max-width: 1024px) {
      .layout { grid-template-columns: 1fr; }
      .sidebar { position: static; height: auto; }
      .col-4, .col-5, .col-6, .col-7, .col-8, .col-12 { grid-column: span 12; }
    }
  </style>
</head>
<body>
  <div class="page">
    <section class="hero">
      <div class="hero-top">
        <div>
          <h1>🎓 ${escapeHtml(classroom.title)}</h1>
          <p>${escapeHtml(classroom.description ?? `這是一份以 ${classroom.topic} 為主題生成的互動式課程。`)}</p>
        </div>
        <div class="hero-stats">
          <div class="stat">
            <div class="stat-label">場景數</div>
            <div class="stat-value">${classroom.scenes.length}</div>
          </div>
          <div class="stat">
            <div class="stat-label">總時長</div>
            <div class="stat-value">${Math.round((classroom.metadata.totalDuration ?? 0) / 60)} 分</div>
          </div>
          <div class="stat">
            <div class="stat-label">模型</div>
            <div class="stat-value">${escapeHtml(classroom.metadata.generationModel ?? 'N/A')}</div>
          </div>
        </div>
      </div>
    </section>

    <section class="layout">
      <aside class="sidebar" id="sceneList">${sidebarHtml}</aside>
      <main class="main">
        <div id="scenePages">${scenesHtml}</div>
        <div class="controls">
          <button class="secondary" id="prevBtn">← 上一個場景</button>
          <button id="nextBtn">下一個場景 →</button>
          <span class="muted" id="counter">1 / ${classroom.scenes.length}</span>
        </div>
      </main>
    </section>
  </div>

  <script>
    (function () {
      var current = 0;
      var items = Array.prototype.slice.call(document.querySelectorAll('[data-scene-target]'));
      var pages = Array.prototype.slice.call(document.querySelectorAll('[data-scene-index]'));
      var prevBtn = document.getElementById('prevBtn');
      var nextBtn = document.getElementById('nextBtn');
      var counter = document.getElementById('counter');
      var total = pages.length;

      function setActive(index) {
        current = index;
        items.forEach(function (item, itemIndex) {
          item.classList.toggle('active', itemIndex === current);
        });
        pages.forEach(function (page, pageIndex) {
          page.classList.toggle('active', pageIndex === current);
        });
        counter.textContent = String(current + 1) + ' / ' + String(total);
        prevBtn.disabled = current === 0;
        nextBtn.disabled = current === total - 1;
      }

      items.forEach(function (item, index) {
        item.addEventListener('click', function () {
          setActive(index);
        });
      });

      prevBtn.addEventListener('click', function () {
        if (current > 0) setActive(current - 1);
      });

      nextBtn.addEventListener('click', function () {
        if (current < total - 1) setActive(current + 1);
      });

      document.addEventListener('keydown', function (event) {
        if (event.key === 'ArrowLeft' && current > 0) setActive(current - 1);
        if (event.key === 'ArrowRight' && current < total - 1) setActive(current + 1);
      });

      setActive(0);
    })();
  </script>
</body>
</html>`;

  writeFileSync(outputPath, html);
  console.log(`✅ HTML saved: ${outputPath}`);
}
