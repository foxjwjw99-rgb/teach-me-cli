#!/usr/bin/env node

import PptxGenJS from 'pptxgenjs';
import fs from 'fs';
import path from 'path';

const SLIDE_WIDTH = 10;
const SLIDE_HEIGHT = 5.625;

const scenes = [
  {
    id: 'scene_001',
    title: '歡迎來到課程生成的世界',
    keyPoints: [
      '傳統課程製作耗時冗長',
      'teach-me-cli 一鍵生成專業課程',
      '今天你將學會背後的原理',
    ],
    narration: '大家好！歡迎來到 teach-me-cli 課程生成系統介紹。你是否曾為製作課程而頭疼？寫大綱、設計幻燈片、錄音... 往往要花上好幾天。但只需一個命令就能自動完成？這就是 teach-me-cli 的魔力！',
  },
  {
    id: 'scene_002',
    title: '問題：傳統課程製作的瓶頸',
    keyPoints: [
      '需要懂教學設計、內容寫作、視覺設計',
      '每個步驟都需要專門工具和技能',
      '修改一點內容就要重新製作',
      '成本高、週期長、難以迭代',
    ],
    narration: '想像你是一位老師。想為學生製作微積分課程。首先寫大綱、組織知識點、製作 PowerPoint、選圖片、配語音... 每個環節都很耗時。如果內容有誤，整個流程要重新來過。',
  },
  {
    id: 'scene_003',
    title: '解決方案：4 階段魔術',
    keyPoints: [
      'Stage 1️⃣: 大綱生成 — AI 自動結構化',
      'Stage 2️⃣: 內容生成 — 每個場景詳細說明',
      'Stage 3️⃣: 動作生成 — 白板、特效、旁白',
      'Stage 4️⃣: 音檔生成 — OmniVoice 自動配音',
    ],
    narration: 'teach-me-cli 用四個階段把這一切自動化。第一階段：AI 生成大綱。第二階段：生成詳細內容。第三階段：生成講師動作。第四階段：自動配音。完整課程誕生！',
  },
  {
    id: 'scene_004',
    title: 'Stage 1: 大綱生成 — AI 當課程設計師',
    keyPoints: [
      '你提供主題和內容',
      'Claude / GPT / Gemini AI 分析',
      '自動生成 12-20 個場景',
      '每個場景有標題、要點、類型',
    ],
    narration: '首先是大綱生成。你給 teach-me-cli 主題，AI 會讀懂內容，自動生成 12 到 20 個場景。每個場景包括標題、要點、類型（講座或測驗）。整個過程只要 15-30 秒。',
  },
  {
    id: 'scene_005',
    title: 'Stage 2: 內容生成 — 為每個場景補充血肉',
    keyPoints: [
      '每個場景生成詳細旁白（150-250 字）',
      '自動編寫易於理解的說明',
      '支援 Markdown、LaTeX 公式',
      '並行生成，提高效率',
    ],
    narration: '第二階段是內容生成。AI 為每個場景生成詳細內容，包括教師要念的旁白、幻燈片文字。旁白是口語化的，像真人在講。這一階段大約 30-60 秒。',
  },
  {
    id: 'scene_006',
    title: 'Stage 3: 動作生成 — 白板、特效、聚光燈',
    keyPoints: [
      '生成 28+ 種講師動作序列',
      '白板繪圖：用 SVG path 描述筆跡',
      '視覺效果：聚光燈、激光筆、轉場',
      '動作與旁白同步，製造沉浸感',
    ],
    narration: '第三階段是動作生成。AI 決定在什麼時候講師應該做什麼。講複雜公式時在白板推導。強調重點時用聚光燈。所有動作與旁白完全同步。',
  },
  {
    id: 'scene_007',
    title: 'Stage 4: 音檔生成 — OmniVoice 配音',
    keyPoints: [
      '呼叫本機 OmniVoice TTS',
      '使用固定克隆聲線（我的聲音！）',
      '台灣國語風格，自然親切',
      '並行生成，每個場景 1-2 秒',
    ],
    narration: '最後一個階段是音檔生成。teach-me-cli 呼叫本機 OmniVoice，把旁白轉成 MP3。用的是預先克隆的聲音，整個課程聲音統一。這一階段大約 30-45 秒。',
  },
  {
    id: 'scene_008',
    title: '架構：LangGraph 無狀態編排',
    keyPoints: [
      'LangGraph 是流程編排框架',
      '4 個節點：init → outline → content → actions',
      '完全無狀態（stateless）',
      '適合 Serverless、雲端部署',
    ],
    narration: '在技術層面，teach-me-cli 使用 LangGraph 編排流程。像精密流水線，每個階段一個節點。完全無狀態，每次運行完全獨立。可輕鬆部署到雲端。',
  },
  {
    id: 'scene_009',
    title: '集成：OpenClaw 是大腦',
    keyPoints: [
      'teach-me-cli 自己不持有 API key',
      'OpenClaw 提供 LLM 模型',
      '可以在 Telegram、Feishu 中直接使用',
      '完全無縫集成',
    ],
    narration: 'teach-me-cli 本身不需要 API key。它依賴 OpenClaw 作為大腦。可在 Telegram、Feishu 等任何平台使用。完全無縫。',
  },
  {
    id: 'scene_010',
    title: '多格式導出：選你所需',
    keyPoints: [
      '📊 PPTX — 編輯用，可用 PowerPoint 修改',
      '📄 JSON — 完整課程結構，機器可讀',
      '🌐 HTML — 互動式網頁播放器',
    ],
    narration: '生成完成後，選擇不同的導出格式。PPTX 可用 PowerPoint 編輯。JSON 包含完整結構。HTML 是網頁播放器，學生直接在瀏覽器觀看。',
  },
  {
    id: 'scene_011',
    title: '性能：從按鈕到課程',
    keyPoints: [
      '初始化：1-2 秒',
      '大綱生成：15-30 秒',
      '內容生成：30-60 秒',
      '動作 + 音檔：40-65 秒',
      '總計：2-3 分鐘完整課程',
    ],
    narration: '從點擊按鈕到得到完整課程，只需 2 到 3 分鐘。相比傳統手工製作要快 100 倍！',
  },
  {
    id: 'scene_012',
    title: '實戰：如何使用 teach-me-cli',
    keyPoints: [
      '命令行模式：npm run generate "主題"',
      'OpenClaw 模式：@狐狸 teach me about X',
      '支持 PDF、Markdown、純文本輸入',
      '2-3 分鐘內得到完整課程',
    ],
    narration: '實際使用非常簡單。運行 npm run generate 加主題。或在 Telegram 中說 teach me about 某個主題。2 到 3 分鐘完成。',
  },
  {
    id: 'scene_013',
    title: '結語：AI 教育的新時代',
    keyPoints: [
      '教育不再是稀缺資源',
      '任何人都可以成為課程設計師',
      '質量好、速度快、成本低',
      '現在就開始，教世界學習',
    ],
    narration: '我們正處於教育 AI 革命的時代。任何人現在都可在幾分鐘內創建專業課程。下一個被你的課程改變人生的學生，可能就在等待你。',
  },
];

async function generatePPTX() {
  const prs = new PptxGenJS();
  
  console.log(`\n📊 Generating PPTX with ${scenes.length} slides...\n`);
  
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const slide = prs.addSlide();
    
    slide.background = { color: 'FFFFFF' };
    
    // Title
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
    
    // Title line
    slide.addShape(prs.ShapeType.line, {
      x: 0.5,
      y: 1.25,
      w: SLIDE_WIDTH - 1,
      h: 0,
      line: { color: '5B9BD5', width: 2 },
    });
    
    // Key points
    let currentY = 1.5;
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
        });
        currentY += 0.5;
      }
    }
    
    // Notes
    if (scene.narration) {
      slide.addNotes(`${scene.narration}`);
    }
    
    // Page number
    slide.addText(`${i + 1}/${scenes.length}`, {
      x: 0.5,
      y: SLIDE_HEIGHT - 0.4,
      w: SLIDE_WIDTH - 1,
      h: 0.3,
      fontSize: 12,
      color: '999999',
      align: 'right',
    });
    
    console.log(`✅ Slide ${i + 1}/${scenes.length}: ${scene.title}`);
  }
  
  const outputDir = 'output/demo';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputPath = path.join(outputDir, 'teach-me-cli-demo.pptx');
  prs.writeFile({ fileName: outputPath });
  
  console.log(`\n✅ PPTX saved: ${outputPath}\n`);
  return outputPath;
}

function generateJSON() {
  const outputDir = 'output/demo';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const classroom = {
    id: 'course_demo_' + Date.now(),
    title: 'teach-me-cli 課程生成系統的原理與架構',
    topic: 'teach-me-cli',
    description: '學習如何用 teach-me-cli 一鍵生成專業課程。涵蓋 4 階段編排、LangGraph 原理、OmniVoice 配音、多格式導出。',
    scenes: scenes.map(s => ({
      ...s,
      type: 'slide',
      actions: [],
      duration: 180,
    })),
    metadata: {
      generatedAt: new Date().toISOString(),
      totalDuration: scenes.length * 180,
    }
  };
  
  const outputPath = path.join(outputDir, 'classroom.json');
  fs.writeFileSync(outputPath, JSON.stringify(classroom, null, 2));
  
  console.log(`✅ JSON saved: ${outputPath}`);
  return outputPath;
}

function generateHTML() {
  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>teach-me-cli 課程生成系統的原理與架構</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f5f5f5; line-height: 1.6; }
    
    .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; border-radius: 8px; margin-bottom: 30px; text-align: center; }
    .header h1 { font-size: 36px; margin-bottom: 10px; }
    .header p { font-size: 16px; opacity: 0.9; }
    
    .content { display: grid; grid-template-columns: 250px 1fr; gap: 20px; }
    .sidebar { background: white; border-radius: 8px; overflow: hidden; max-height: 80vh; overflow-y: auto; }
    .main { background: white; border-radius: 8px; padding: 40px; }
    
    .slide-item {
      padding: 12px 16px;
      cursor: pointer;
      border-left: 4px solid transparent;
      transition: all 0.2s;
      font-size: 13px;
    }
    .slide-item:hover { background: #f0f0f0; }
    .slide-item.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-left-color: white;
    }
    .slide-item-num { opacity: 0.7; font-size: 11px; }
    .slide-item-title { font-weight: 500; margin-top: 4px; }
    
    .slide { display: none; animation: fadeIn 0.3s; }
    .slide.active { display: block; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    
    .slide h2 { font-size: 36px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 24px; }
    .slide-content { font-size: 16px; line-height: 1.8; }
    .slide-points { list-style: none; margin: 20px 0; }
    .slide-points li { padding: 10px 0; padding-left: 28px; position: relative; }
    .slide-points li:before { content: "▸"; position: absolute; left: 0; color: #667eea; font-weight: bold; font-size: 20px; }
    .slide-narration { margin-top: 24px; padding: 16px; background: #f8f9ff; border-left: 4px solid #667eea; border-radius: 4px; font-style: italic; color: #555; }
    
    .controls { margin-top: 32px; display: flex; gap: 12px; justify-content: center; }
    button { padding: 10px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500; transition: transform 0.2s; }
    button:hover { transform: translateY(-2px); }
    button:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .slide-counter { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
    
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎓 teach-me-cli 課程生成系統的原理與架構</h1>
      <p>用 AI 和自動化把任何主題變成完整課程</p>
    </div>
    
    <div class="content">
      <div class="sidebar">
        <div id="slideList"></div>
      </div>
      
      <div class="main">
        <div id="slides"></div>
        <div class="controls">
          <button id="prevBtn" onclick="previousSlide()">← 上一頁</button>
          <button id="nextBtn" onclick="nextSlide()">下一頁 →</button>
        </div>
        <div class="slide-counter" id="slideCounter"></div>
      </div>
    </div>
    
    <div class="footer">
      <p>由 teach-me-cli v2.0 自動生成 | 由 🦊 狐狸 為 Jimmy 精心製作</p>
    </div>
  </div>
  
  <script>
    const scenes = ${JSON.stringify(scenes)};
    let currentSlide = 0;
    
    function init() {
      renderSlideList();
      renderSlides();
      updateCurrentSlide();
    }
    
    function renderSlideList() {
      const list = document.getElementById('slideList');
      scenes.forEach((scene, idx) => {
        const div = document.createElement('div');
        div.className = 'slide-item';
        div.onclick = () => goToSlide(idx);
        div.innerHTML = \`
          <div class="slide-item-num">第 \${idx + 1}/\${scenes.length}</div>
          <div class="slide-item-title">\${scene.title}</div>
        \`;
        list.appendChild(div);
      });
    }
    
    function renderSlides() {
      const slidesDiv = document.getElementById('slides');
      scenes.forEach((scene, idx) => {
        const div = document.createElement('div');
        div.className = 'slide';
        div.id = \`slide-\${idx}\`;
        
        let points = '';
        if (scene.keyPoints && scene.keyPoints.length > 0) {
          points = \`<ul class="slide-points">\${
            scene.keyPoints.map(p => \`<li>\${p}</li>\`).join('')
          }</ul>\`;
        }
        
        let narration = '';
        if (scene.narration) {
          narration = \`<div class="slide-narration">\${scene.narration}</div>\`;
        }
        
        div.innerHTML = \`
          <h2>\${scene.title}</h2>
          <div class="slide-content">
            \${points}
            \${narration}
          </div>
        \`;
        slidesDiv.appendChild(div);
      });
    }
    
    function updateCurrentSlide() {
      const items = document.querySelectorAll('.slide-item');
      const slides = document.querySelectorAll('.slide');
      
      if (items[currentSlide]) {
        items[currentSlide].scrollIntoView({ block: 'nearest' });
      }
      
      items.forEach((item, idx) => {
        item.classList.toggle('active', idx === currentSlide);
      });
      
      slides.forEach((slide, idx) => {
        slide.classList.toggle('active', idx === currentSlide);
      });
      
      document.getElementById('slideCounter').textContent = \`\${currentSlide + 1} / \${scenes.length}\`;
      document.getElementById('prevBtn').disabled = currentSlide === 0;
      document.getElementById('nextBtn').disabled = currentSlide === scenes.length - 1;
    }
    
    function previousSlide() {
      if (currentSlide > 0) {
        currentSlide--;
        updateCurrentSlide();
      }
    }
    
    function nextSlide() {
      if (currentSlide < scenes.length - 1) {
        currentSlide++;
        updateCurrentSlide();
      }
    }
    
    function goToSlide(idx) {
      currentSlide = idx;
      updateCurrentSlide();
    }
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') previousSlide();
      if (e.key === 'ArrowRight') nextSlide();
    });
    
    init();
  </script>
</body>
</html>`;
  
  const outputDir = 'output/demo';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputPath = path.join(outputDir, 'index.html');
  fs.writeFileSync(outputPath, html);
  
  console.log(`✅ HTML saved: ${outputPath}`);
  return outputPath;
}

async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('🎓 teach-me-cli Demo Course Generator');
  console.log('='.repeat(60));
  
  try {
    await generatePPTX();
    generateJSON();
    generateHTML();
    
    console.log(`${'='.repeat(60)}`);
    console.log('✅ Demo course generated successfully!\n');
    console.log('📁 Output files:');
    console.log('   • output/demo/teach-me-cli-demo.pptx');
    console.log('   • output/demo/classroom.json');
    console.log('   • output/demo/index.html\n');
    console.log('🌐 To view the course:');
    console.log('   open output/demo/index.html\n');
  } catch (error) {
    console.error('❌ Generation failed:', error);
    process.exit(1);
  }
}

main();
