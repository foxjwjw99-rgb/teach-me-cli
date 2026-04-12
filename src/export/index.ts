import PptxGenJS from 'pptxgenjs';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { Classroom } from '../types.js';

const SLIDE_WIDTH = 10;
const SLIDE_HEIGHT = 5.625; // 16:9

/**
 * Generate PPTX file from classroom structure
 */
export async function generatePPTX(
  classroom: Classroom,
  outputPath: string
): Promise<void> {
  console.log(`\n${'='.repeat(50)}`);
  console.log('📊 Export: Generating PPTX');
  console.log('='.repeat(50));

  // Ensure output directory exists
  const dir = dirname(outputPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const prs = new PptxGenJS();
  prs.defineLayout({
    name: 'LAYOUT1',
    master: 'MASTER1',
  });

  console.log(`Generating PPTX with ${classroom.scenes.length} slides...`);

  for (let i = 0; i < classroom.scenes.length; i++) {
    const scene = classroom.scenes[i];
    const slide = prs.addSlide();

    // Background
    slide.background = { color: 'FFFFFF' };

    // Title
    if (scene.title) {
      slide.addText(scene.title, {
        x: 0.5,
        y: 0.4,
        w: SLIDE_WIDTH - 1,
        h: 0.8,
        fontSize: 40,
        bold: true,
        color: '1F4E78',
        align: 'left',
      });

      // Title underline
      slide.addShape(prs.ShapeType.line, {
        x: 0.5,
        y: 1.25,
        w: SLIDE_WIDTH - 1,
        h: 0,
        line: { color: '5B9BD5', width: 2 },
      });
    }

    // Content
    let currentY = 1.5;

    // Key points as bullets
    if (scene.keyPoints && scene.keyPoints.length > 0) {
      for (const point of scene.keyPoints) {
        slide.addText(`• ${point}`, {
          x: 0.8,
          y: currentY,
          w: SLIDE_WIDTH - 1.6,
          h: 0.4,
          fontSize: 18,
          color: '333333',
          align: 'left',
          valign: 'top',
        });
        currentY += 0.5;
      }
    }

    // Narration as speaker notes
    if (scene.narration) {
      slide.addNotes(`${scene.narration}`);
    }

    // Page number
    slide.addText(`${i + 1}/${classroom.scenes.length}`, {
      x: 0.5,
      y: SLIDE_HEIGHT - 0.4,
      w: SLIDE_WIDTH - 1,
      h: 0.3,
      fontSize: 12,
      color: '999999',
      align: 'right',
    });
  }

  // Save
  try {
    prs.writeFile({ fileName: outputPath });
    console.log(`✅ PPTX saved: ${outputPath}`);
  } catch (error) {
    console.error(`❌ Failed to save PPTX: ${error}`);
    throw error;
  }
}

/**
 * Generate JSON export (complete course structure)
 */
export async function generateJSON(
  classroom: Classroom,
  outputPath: string
): Promise<void> {
  console.log(`\n📄 Exporting to JSON: ${outputPath}`);

  // Ensure output directory exists
  const dir = dirname(outputPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(outputPath, JSON.stringify(classroom, null, 2));
  console.log(`✅ JSON saved: ${outputPath}`);
}

/**
 * Generate HTML player (interactive playback)
 */
export async function generateHTML(
  classroom: Classroom,
  outputPath: string,
  audioDir?: string
): Promise<void> {
  console.log(`\n🎬 Exporting to HTML: ${outputPath}`);

  // Ensure output directory exists
  const dir = dirname(outputPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${classroom.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f5f5f5; }
    
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .header h1 { font-size: 28px; margin-bottom: 8px; color: #1F4E78; }
    .header p { color: #666; font-size: 14px; }
    
    .content { display: grid; grid-template-columns: 1fr 2fr; gap: 20px; }
    .sidebar { background: white; border-radius: 8px; overflow: hidden; }
    .main { background: white; border-radius: 8px; padding: 20px; }
    
    .slide-item {
      padding: 12px 16px;
      cursor: pointer;
      border-left: 3px solid transparent;
      transition: all 0.2s;
    }
    .slide-item:hover { background: #f0f0f0; }
    .slide-item.active {
      background: #e3f2fd;
      border-left-color: #1F4E78;
    }
    .slide-item-num { font-size: 12px; color: #999; }
    .slide-item-title { font-weight: 500; margin-top: 4px; }
    
    .slide { display: none; }
    .slide.active { display: block; }
    .slide h2 { font-size: 32px; color: #1F4E78; margin-bottom: 16px; }
    .slide-content { line-height: 1.8; }
    .slide-points { list-style: none; margin: 16px 0; }
    .slide-points li { padding: 8px 0; padding-left: 24px; position: relative; }
    .slide-points li:before { content: "▸"; position: absolute; left: 0; color: #5B9BD5; }
    
    .controls { margin-top: 20px; display: flex; gap: 10px; }
    button { padding: 10px 20px; background: #1F4E78; color: white; border: none; border-radius: 4px; cursor: pointer; }
    button:hover { background: #15355b; }
    button:disabled { background: #ccc; cursor: not-allowed; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎓 ${classroom.title}</h1>
      <p>共 ${classroom.scenes.length} 個場景</p>
    </div>
    
    <div class="content">
      <div class="sidebar">
        <div id="slideList"></div>
      </div>
      
      <div class="main">
        <div id="slides"></div>
        <div class="controls">
          <button id="prevBtn" onclick="previousSlide()">← 上一頁</button>
          <span id="slideCounter"></span>
          <button id="nextBtn" onclick="nextSlide()">下一頁 →</button>
        </div>
      </div>
    </div>
  </div>
  
  <script>
    const classroom = ${JSON.stringify(classroom)};
    let currentSlide = 0;
    
    function init() {
      renderSlideList();
      renderSlides();
      updateCurrentSlide();
    }
    
    function renderSlideList() {
      const list = document.getElementById('slideList');
      classroom.scenes.forEach((scene, idx) => {
        const div = document.createElement('div');
        div.className = 'slide-item';
        div.onclick = () => goToSlide(idx);
        div.innerHTML = \`
          <div class="slide-item-num">第 \${idx + 1}/\${classroom.scenes.length}</div>
          <div class="slide-item-title">\${scene.title}</div>
        \`;
        list.appendChild(div);
      });
    }
    
    function renderSlides() {
      const slidesDiv = document.getElementById('slides');
      classroom.scenes.forEach((scene, idx) => {
        const div = document.createElement('div');
        div.className = 'slide';
        div.id = \`slide-\${idx}\`;
        
        let points = '';
        if (scene.keyPoints && scene.keyPoints.length > 0) {
          points = \`<ul class="slide-points">\${
            scene.keyPoints.map(p => \`<li>\${p}</li>\`).join('')
          }</ul>\`;
        }
        
        div.innerHTML = \`
          <h2>\${scene.title}</h2>
          <div class="slide-content">
            \${points}
            \${scene.narration ? \`<p><strong>旁白：</strong>\${scene.narration}</p>\` : ''}
          </div>
        \`;
        slidesDiv.appendChild(div);
      });
    }
    
    function updateCurrentSlide() {
      const items = document.querySelectorAll('.slide-item');
      const slides = document.querySelectorAll('.slide');
      
      items.forEach((item, idx) => {
        item.classList.toggle('active', idx === currentSlide);
      });
      
      slides.forEach((slide, idx) => {
        slide.classList.toggle('active', idx === currentSlide);
      });
      
      document.getElementById('slideCounter').textContent = \`\${currentSlide + 1} / \${classroom.scenes.length}\`;
      document.getElementById('prevBtn').disabled = currentSlide === 0;
      document.getElementById('nextBtn').disabled = currentSlide === classroom.scenes.length - 1;
    }
    
    function previousSlide() {
      if (currentSlide > 0) currentSlide--;
      updateCurrentSlide();
    }
    
    function nextSlide() {
      if (currentSlide < classroom.scenes.length - 1) currentSlide++;
      updateCurrentSlide();
    }
    
    function goToSlide(idx) {
      currentSlide = idx;
      updateCurrentSlide();
    }
    
    init();
  </script>
</body>
</html>`;

  writeFileSync(outputPath, html);
  console.log(`✅ HTML saved: ${outputPath}`);
}
