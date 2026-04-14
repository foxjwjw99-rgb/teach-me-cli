'use strict';
/**
 * generate-pptx-v3.js
 * 積分概要課程 — 進階版（深度內容 + 豐富版面）
 *
 * Usage:
 *   node tools/generate-pptx-v3.js [output-dir]
 */

const PptxGenJS = require('../packages/pptxgenjs/dist/pptxgen.cjs.js');
const fs = require('fs');
const path = require('path');

const outDir = process.argv[2] || path.join(__dirname, '..', 'output', 'integral-v3');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const fileName = path.join(outDir, '積分概要-完整版-v3.pptx');

// ─────────── 設計系統 ───────────
const C = {
  navy:   '1B3A6B',   // 深藍（標題主色）
  blue:   '2563EB',   // 亮藍（強調）
  teal:   '0F766E',   // 青綠（定積分主題）
  orange: 'EA580C',   // 橙（警示/技巧）
  gray:   '64748B',   // 灰（次要文字）
  light:  'F1F5F9',   // 極淺灰（背景區塊）
  white:  'FFFFFF',
  dark:   '0F172A',   // 接近黑（公式）
  green:  '15803D',   // 綠（例題框）
  yellow: 'CA8A04',   // 黃褐（小測）
  red:    'DC2626',   // 紅（注意）
};

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_16x9';

// ─────────── 輔助函式 ───────────

/** 在投影片上畫一條水平分隔線 */
function hLine(slide, y, color = 'CBD5E1') {
  slide.addShape(pptx.ShapeType.line, {
    x: 0.35, y, w: 9.3, h: 0,
    line: { color, width: 1.2 },
  });
}

/** 帶色圓角矩形標籤（badge） */
function badge(slide, text, x, y, bgColor, textColor = 'FFFFFF') {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w: 1.6, h: 0.38,
    fill: { color: bgColor },
    line: { color: bgColor },
  });
  slide.addText(text, {
    x, y, w: 1.6, h: 0.38,
    fontSize: 12, bold: true, color: textColor,
    align: 'center', valign: 'middle',
  });
}

/** 左側色條 + 標題列（每張投影片共用） */
function addHeader(slide, title, subtitle, accentColor = C.blue) {
  // 頂部色帶
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 10, h: 1.1,
    fill: { color: C.navy },
  });
  // 左側彩色細條
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 0.18, h: 7.5,
    fill: { color: accentColor },
  });
  // 主標題
  slide.addText(title, {
    x: 0.35, y: 0.08, w: 8.8, h: 0.55,
    fontSize: 26, bold: true, color: C.white,
  });
  // 副標題
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.35, y: 0.65, w: 8.8, h: 0.36,
      fontSize: 13, color: 'B0C4DE', italic: true,
    });
  }
  // 頁尾
  slide.addText('積分概要完整版 • OpenMAIC', {
    x: 0.35, y: 7.1, w: 9.3, h: 0.28,
    fontSize: 10, color: C.gray, align: 'right',
  });
}

/** 帶底色的公式框 */
function formulaBox(slide, formula, x, y, w, h, bg = C.light, textColor = C.dark) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    fill: { color: bg },
    line: { color: 'CBD5E1', width: 1 },
  });
  slide.addText(formula, {
    x: x + 0.1, y, w: w - 0.2, h,
    fontSize: 16, bold: true, color: textColor,
    align: 'center', valign: 'middle',
    fontFace: 'Courier New',
  });
}

/** 帶色左邊線的說明框 */
function sideBar(slide, text, x, y, w, h, barColor = C.blue, bgColor = 'EFF6FF') {
  slide.addShape(pptx.ShapeType.rect, {
    x, y, w: 0.07, h, fill: { color: barColor },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: x + 0.07, y, w: w - 0.07, h,
    fill: { color: bgColor },
    line: { color: bgColor },
  });
  slide.addText(text, {
    x: x + 0.22, y: y + 0.05, w: w - 0.35, h: h - 0.1,
    fontSize: 13, color: C.dark, valign: 'top', wrap: true,
  });
}

// ════════════════════════════════════════════════
//  投影片 00 — 封面
// ════════════════════════════════════════════════
function slide00_cover() {
  const s = pptx.addSlide();
  s.background = { color: C.navy };

  // 大色塊裝飾
  s.addShape(pptx.ShapeType.rect, { x: 6.8, y: 0, w: 3.2, h: 7.5, fill: { color: '142D55' } });
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 5.5, w: 10, h: 2, fill: { color: '142D55' } });

  // 積分符號裝飾（大字）
  s.addText('∫', {
    x: 7.0, y: 0.2, w: 2.8, h: 6,
    fontSize: 260, color: '1E4080', align: 'center',
    fontFace: 'Times New Roman',
  });

  // 課程標籤
  badge(s, '數學基礎課', 0.5, 1.2, C.blue);

  // 主標題
  s.addText('積分概要', {
    x: 0.5, y: 1.8, w: 6, h: 1.2,
    fontSize: 52, bold: true, color: C.white,
    fontFace: 'Arial',
  });

  // 副標題
  s.addText('從直覺理解到實際計算\nIntegral Calculus: Full Overview', {
    x: 0.5, y: 3.1, w: 5.8, h: 1.0,
    fontSize: 16, color: 'B0C4DE', lineSpacing: 24, italic: true,
  });

  // 課程亮點
  const highlights = ['直覺理解', '不定積分', '定積分', '基本定理', '常見法則', '換元積分', '分部積分', '實戰例題'];
  highlights.forEach((h, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    s.addText('✓ ' + h, {
      x: 0.5 + col * 2.9, y: 4.3 + row * 0.42, w: 2.8, h: 0.38,
      fontSize: 13, color: '7EC8E3', bold: false,
    });
  });

  s.addNotes('封面投影片。課程從直覺出發，循序介紹不定積分、定積分到進階技巧，最後附實戰例題。');
}

// ════════════════════════════════════════════════
//  投影片 01 — 課程地圖（學習路徑）
// ════════════════════════════════════════════════
function slide01_roadmap() {
  const s = pptx.addSlide();
  s.background = { color: 'F8FAFC' };
  addHeader(s, '課程學習路徑', '你將經歷的 8 個關卡', C.blue);

  const steps = [
    { n: '1', label: '積分是什麼？', sub: '黎曼和 · 面積直覺', color: C.blue },
    { n: '2', label: '不定積分',     sub: '反導數 · +C 的由來', color: C.teal },
    { n: '3', label: '定積分',       sub: '上下界 · 面積計算', color: C.teal },
    { n: '4', label: '微積分基本定理', sub: 'FTC I & II',        color: C.navy },
    { n: '5', label: '基本積分法則', sub: '冪次 · 三角 · 指數', color: C.blue },
    { n: '6', label: '換元積分',     sub: 'u-substitution',      color: C.orange },
    { n: '7', label: '分部積分',     sub: 'Integration by Parts', color: C.orange },
    { n: '8', label: '實戰例題 & 小測', sub: '4 題演練',          color: C.green },
  ];

  steps.forEach((st, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 0.3 + col * 2.35;
    const y = 1.3 + row * 2.6;

    // 方塊
    s.addShape(pptx.ShapeType.roundRect, {
      x, y, w: 2.1, h: 2.2,
      fill: { color: st.color },
      shadow: { type: 'outer', blur: 8, offset: 3, angle: 270, color: '000000', opacity: 0.15 },
    });
    // 數字
    s.addText(st.n, {
      x, y: y + 0.08, w: 2.1, h: 0.7,
      fontSize: 32, bold: true, color: 'FFFFFF',
      align: 'center',
    });
    // 標題
    s.addText(st.label, {
      x: x + 0.1, y: y + 0.72, w: 1.9, h: 0.7,
      fontSize: 14, bold: true, color: C.white,
      align: 'center', wrap: true,
    });
    // 副說明
    s.addText(st.sub, {
      x: x + 0.1, y: y + 1.48, w: 1.9, h: 0.55,
      fontSize: 10, color: 'D4E6F1',
      align: 'center', italic: true,
    });
  });

  s.addNotes('課程共 8 個單元，建議依序學習。每個關卡約 3-5 分鐘。');
}

// ════════════════════════════════════════════════
//  投影片 02 — 什麼是積分？（直覺 + 黎曼和）
// ════════════════════════════════════════════════
function slide02_intuition() {
  const s = pptx.addSlide();
  s.background = { color: 'F8FAFC' };
  addHeader(s, '什麼是積分？', '從「累加」出發的直覺', C.blue);

  // 左欄：文字說明
  sideBar(s,
    '積分的核心思想：\n\n把一段「連續」的東西，\n切成無限多個「極小」的片段，\n再把它們全部加起來。',
    0.3, 1.3, 4.5, 2.0, C.blue, 'EFF6FF'
  );

  // 右欄：黎曼和示意（用矩形堆疊模擬）
  const barLabel = ['n=4（粗估）', 'n=8（較準）', 'n=∞（精確）'];
  const heights  = [1.2, 1.0, 0.85];
  const colors   = ['93C5FD', '3B82F6', C.navy];
  for (let k = 0; k < 3; k++) {
    const bx = 5.1 + k * 1.5;
    s.addShape(pptx.ShapeType.rect, {
      x: bx, y: 3.4 - heights[k], w: 1.2, h: heights[k],
      fill: { color: colors[k] },
      line: { color: C.white, width: 1 },
    });
    s.addText(barLabel[k], {
      x: bx - 0.1, y: 3.45, w: 1.4, h: 0.35,
      fontSize: 9, color: C.gray, align: 'center',
    });
  }
  s.addText('黎曼和：n 越大越精確', {
    x: 4.9, y: 3.85, w: 4.8, h: 0.35,
    fontSize: 12, color: C.gray, align: 'center', italic: true,
  });

  // 兩個核心定義
  hLine(s, 3.45);
  s.addText('核心符號', {
    x: 0.3, y: 3.5, w: 9.4, h: 0.4,
    fontSize: 14, bold: true, color: C.navy,
  });

  // 不定積分符號框
  formulaBox(s, '∫ f(x) dx', 0.3, 4.0, 4.4, 0.7, 'DBEAFE', C.navy);
  s.addText('讀作「f(x) 對 x 的積分」\n積分號 ∫ 是拉長的 S（Sum，求和）', {
    x: 0.3, y: 4.75, w: 4.4, h: 0.7,
    fontSize: 11, color: C.gray, lineSpacing: 16,
  });

  // 定積分符號框
  formulaBox(s, '∫ₐᵇ f(x) dx', 5.0, 4.0, 4.4, 0.7, 'CCFBF1', C.teal);
  s.addText('讀作「從 a 到 b，f(x) 對 x 的積分」\na 是下界，b 是上界', {
    x: 5.0, y: 4.75, w: 4.4, h: 0.7,
    fontSize: 11, color: C.gray, lineSpacing: 16,
  });

  s.addNotes('直覺起點：把曲線下的面積想成「無窮多個細長矩形的和」。黎曼和是積分的離散近似。');
}

// ════════════════════════════════════════════════
//  投影片 03 — 不定積分（反導數）
// ════════════════════════════════════════════════
function slide03_indefinite() {
  const s = pptx.addSlide();
  s.background = { color: 'F8FAFC' };
  addHeader(s, '不定積分 = 反導數', '找到一個函數，使其導數等於 f(x)', C.teal);

  // 核心定義
  formulaBox(s, '∫ f(x) dx = F(x) + C    其中 F\'(x) = f(x)', 0.3, 1.3, 9.4, 0.75, 'CCFBF1', C.teal);

  // +C 的解釋
  sideBar(s,
    '為什麼要 +C？\n\nC 稱為「積分常數」。\n因為對任何常數 C，(F(x)+C)\' = F\'(x)，\n所以不定積分的答案有無窮多個，\n差別只在那個常數 C。',
    0.3, 2.25, 4.4, 2.2, C.teal, 'F0FDF4'
  );

  // 三個直觀例子
  s.addText('直觀範例', {
    x: 5.0, y: 2.25, w: 4.4, h: 0.4,
    fontSize: 14, bold: true, color: C.navy,
  });

  const examples = [
    { q: '∫ 2x dx', a: 'x² + C', check: '因為 (x²)\' = 2x ✓' },
    { q: '∫ cos x dx', a: 'sin x + C', check: '因為 (sin x)\' = cos x ✓' },
    { q: '∫ eˣ dx', a: 'eˣ + C', check: '因為 (eˣ)\' = eˣ ✓' },
  ];
  examples.forEach((ex, i) => {
    const y = 2.75 + i * 0.85;
    formulaBox(s, ex.q, 5.0, y, 1.8, 0.6, 'F1F5F9', C.navy);
    s.addText('→', { x: 6.9, y, w: 0.4, h: 0.6, fontSize: 18, color: C.teal, align: 'center', valign: 'middle' });
    formulaBox(s, ex.a, 7.3, y, 1.8, 0.6, 'CCFBF1', C.teal);
    s.addText(ex.check, { x: 5.0, y: y + 0.62, w: 4.1, h: 0.22, fontSize: 9.5, color: C.gray, italic: true });
  });

  // 注意事項
  s.addShape(pptx.ShapeType.rect, {
    x: 0.3, y: 4.55, w: 9.4, h: 0.65,
    fill: { color: 'FEF3C7' },
    line: { color: C.yellow, width: 1 },
  });
  s.addText('⚠️  記住：不定積分的答案一定要加 +C，否則是不完整的！', {
    x: 0.5, y: 4.6, w: 9.0, h: 0.55,
    fontSize: 13, color: '92400E', bold: true, valign: 'middle',
  });

  s.addNotes('不定積分即求反導數。關鍵是記得加積分常數 C。可用微分驗算答案。');
}

// ════════════════════════════════════════════════
//  投影片 04 — 定積分與幾何意義
// ════════════════════════════════════════════════
function slide04_definite() {
  const s = pptx.addSlide();
  s.background = { color: 'F8FAFC' };
  addHeader(s, '定積分與幾何意義', '從 a 到 b 的「帶正負號的面積」', C.teal);

  formulaBox(s, '∫ₐᵇ f(x) dx = F(b) − F(a)    （微積分基本定理）', 0.3, 1.3, 9.4, 0.75, 'CCFBF1', C.teal);

  // 左：幾何說明
  s.addText('幾何意義', { x: 0.3, y: 2.25, w: 4.3, h: 0.4, fontSize: 14, bold: true, color: C.navy });
  sideBar(s,
    '定積分 = x 軸上方面積 − x 軸下方面積\n\n若 f(x)≥0：結果恆正（純面積）\n若 f(x) 跨越 x 軸：正負抵消，\n   需注意符號！',
    0.3, 2.75, 4.3, 2.0, C.teal, 'F0FDFB'
  );

  // 正負面積示意（用矩形模擬）
  const baseline = 5.0;
  // 正面積（綠色）
  for (let i = 0; i < 4; i++) {
    const h = [0.9, 1.3, 1.1, 0.6][i];
    s.addShape(pptx.ShapeType.rect, {
      x: 0.5 + i * 0.6, y: baseline - h, w: 0.55, h,
      fill: { color: '86EFAC' }, line: { color: C.white, width: 0.5 },
    });
  }
  // 負面積（紅色）
  for (let i = 0; i < 3; i++) {
    const h = [0.4, 0.7, 0.45][i];
    s.addShape(pptx.ShapeType.rect, {
      x: 0.5 + (4 + i) * 0.6, y: baseline, w: 0.55, h,
      fill: { color: 'FCA5A5' }, line: { color: C.white, width: 0.5 },
    });
  }
  s.addShape(pptx.ShapeType.line, { x: 0.3, y: baseline, w: 4.4, h: 0, line: { color: C.dark, width: 1.5 } });
  s.addText('正面積 (+)', { x: 0.3, y: 5.1, w: 2.4, h: 0.3, fontSize: 10, color: C.green });
  s.addText('負面積 (−)', { x: 2.7, y: 5.1, w: 2.0, h: 0.3, fontSize: 10, color: C.red });

  // 右：計算範例
  s.addText('計算範例', { x: 5.0, y: 2.25, w: 4.3, h: 0.4, fontSize: 14, bold: true, color: C.navy });

  const steps = [
    '求  ∫₀² x² dx',
    '反導數  F(x) = x³/3',
    'F(2) = 8/3,   F(0) = 0',
    '∫₀² x² dx = 8/3 − 0 = 8/3 ≈ 2.67',
  ];
  steps.forEach((line, i) => {
    const bg = i === 3 ? 'CCFBF1' : 'F8FAFC';
    const clr = i === 3 ? C.teal : C.dark;
    s.addShape(pptx.ShapeType.rect, {
      x: 5.0, y: 2.72 + i * 0.55, w: 4.5, h: 0.5,
      fill: { color: bg }, line: { color: 'CBD5E1', width: 0.5 },
    });
    s.addText((i + 1) + '  ' + line, {
      x: 5.15, y: 2.72 + i * 0.55, w: 4.25, h: 0.5,
      fontSize: 13, color: clr, bold: i === 3, fontFace: 'Courier New', valign: 'middle',
    });
  });

  s.addNotes('定積分 = F(b)-F(a)，幾何上是帶正負號的面積。x 軸下方面積為負。');
}

// ════════════════════════════════════════════════
//  投影片 05 — 微積分基本定理（FTC）
// ════════════════════════════════════════════════
function slide05_ftc() {
  const s = pptx.addSlide();
  s.background = { color: 'F8FAFC' };
  addHeader(s, '微積分基本定理（FTC）', '微分與積分的逆運算關係', C.navy);

  // FTC I
  s.addText('FTC 第一型（微分形式）', { x: 0.3, y: 1.3, w: 9.4, h: 0.38, fontSize: 14, bold: true, color: C.navy });
  formulaBox(s, 'd/dx [ ∫ₐˣ f(t) dt ] = f(x)', 0.3, 1.72, 6.5, 0.7, 'EFF6FF', C.blue);
  s.addText('若 F(x) = ∫ₐˣ f(t) dt，則 F\'(x) = f(x)\n→ 積分的導數「還原」成原函數', {
    x: 0.3, y: 2.48, w: 6.5, h: 0.7, fontSize: 12, color: C.gray, lineSpacing: 18,
  });

  hLine(s, 3.25);

  // FTC II
  s.addText('FTC 第二型（牛頓-萊布尼茨公式）', { x: 0.3, y: 3.3, w: 9.4, h: 0.38, fontSize: 14, bold: true, color: C.navy });
  formulaBox(s, '∫ₐᵇ f(x) dx = F(b) − F(a)', 0.3, 3.72, 6.5, 0.7, 'CCFBF1', C.teal);
  s.addText('若 F\'(x) = f(x)，則定積分可直接用 F(b)-F(a) 計算\n→ 這是我們最常用的計算公式', {
    x: 0.3, y: 4.48, w: 6.5, h: 0.7, fontSize: 12, color: C.gray, lineSpacing: 18,
  });

  // 右側：圖示說明
  s.addShape(pptx.ShapeType.roundRect, {
    x: 7.1, y: 1.3, w: 2.6, h: 4.4,
    fill: { color: 'F8FAFC' },
    line: { color: 'CBD5E1', width: 1 },
  });
  s.addText('微分 ↔ 積分', { x: 7.1, y: 1.35, w: 2.6, h: 0.4, fontSize: 13, bold: true, color: C.navy, align: 'center' });

  const arrows = [
    { from: 'F(x)', arrow: "F'(x) = f(x)", to: 'f(x)', dir: '微分 →' },
    { from: 'f(x)', arrow: '∫f(x)dx = F(x)+C', to: 'F(x)+C', dir: '← 積分' },
  ];
  arrows.forEach((a, i) => {
    const y = 1.9 + i * 1.8;
    s.addText(a.from, { x: 7.2, y, w: 2.4, h: 0.4, fontSize: 12, bold: true, color: C.navy, align: 'center' });
    s.addText(a.dir, { x: 7.2, y: y + 0.42, w: 2.4, h: 0.35, fontSize: 10, color: C.blue, align: 'center', italic: true });
    s.addText(a.arrow, { x: 7.2, y: y + 0.8, w: 2.4, h: 0.4, fontSize: 9, color: C.gray, align: 'center', fontFace: 'Courier New' });
    s.addText(a.to, { x: 7.2, y: y + 1.3, w: 2.4, h: 0.4, fontSize: 12, bold: true, color: C.teal, align: 'center' });
  });

  s.addNotes('微積分基本定理是微積分的靈魂，把微分和積分連接起來。FTC II 是定積分計算的核心工具。');
}

// ════════════════════════════════════════════════
//  投影片 06 — 常見積分法則表
// ════════════════════════════════════════════════
function slide06_rules() {
  const s = pptx.addSlide();
  s.background = { color: 'F8FAFC' };
  addHeader(s, '常見積分法則速查表', '必背的基本公式', C.blue);

  const rows = [
    ['類型', '被積函數 f(x)', '不定積分 ∫f(x)dx', '條件'],
    ['冪次規則', 'xⁿ', 'xⁿ⁺¹/(n+1) + C', 'n ≠ −1'],
    ['常數', 'k', 'kx + C', '—'],
    ['自然對數', '1/x', 'ln|x| + C', 'x ≠ 0'],
    ['指數', 'eˣ', 'eˣ + C', '—'],
    ['指數（底 a）', 'aˣ', 'aˣ/ln(a) + C', 'a>0, a≠1'],
    ['正弦', 'sin x', '−cos x + C', '—'],
    ['餘弦', 'cos x', 'sin x + C', '—'],
    ['正切', 'tan x', '−ln|cos x| + C', '—'],
    ['反正弦', '1/√(1−x²)', 'arcsin x + C', '|x|<1'],
    ['反正切', '1/(1+x²)', 'arctan x + C', '—'],
  ];

  const colW = [1.5, 2.0, 3.2, 1.8];
  const colX = [0.25, 1.78, 3.81, 7.04];

  rows.forEach((row, ri) => {
    row.forEach((cell, ci) => {
      const isHeader = ri === 0;
      s.addShape(pptx.ShapeType.rect, {
        x: colX[ci], y: 1.2 + ri * 0.53,
        w: colW[ci], h: 0.5,
        fill: { color: isHeader ? C.navy : (ri % 2 === 0 ? 'EFF6FF' : C.white) },
        line: { color: 'CBD5E1', width: 0.5 },
      });
      s.addText(cell, {
        x: colX[ci] + 0.05, y: 1.2 + ri * 0.53,
        w: colW[ci] - 0.1, h: 0.5,
        fontSize: isHeader ? 11 : 11.5,
        bold: isHeader,
        color: isHeader ? C.white : (ci === 2 ? C.teal : C.dark),
        fontFace: (ci === 1 || ci === 2) && !isHeader ? 'Courier New' : 'Arial',
        align: ci === 0 ? 'left' : 'center',
        valign: 'middle',
      });
    });
  });

  s.addNotes('這張表是必備速查表。重點記憶：冪次規則、三角函數、指數與對數的積分。');
}

// ════════════════════════════════════════════════
//  投影片 07 — 換元積分法（u-substitution）
// ════════════════════════════════════════════════
function slide07_substitution() {
  const s = pptx.addSlide();
  s.background = { color: 'F8FAFC' };
  addHeader(s, '換元積分法（u-Substitution）', '把複雜積分轉換成簡單形式', C.orange);

  // 公式
  formulaBox(s, '若 u = g(x)，則 du = g\'(x) dx，因此 ∫f(g(x))·g\'(x) dx = ∫f(u) du', 0.3, 1.3, 9.4, 0.7, 'FFF7ED', C.orange);

  // 四步驟
  s.addText('換元四步驟', { x: 0.3, y: 2.18, w: 4.4, h: 0.38, fontSize: 14, bold: true, color: C.navy });
  const steps4 = [
    ['①', '選 u = g(x)（通常選「內層函數」）'],
    ['②', '求 du = g\'(x) dx'],
    ['③', '將 ∫ 全部替換為 u 的積分'],
    ['④', '積分完成後，把 u 換回 x'],
  ];
  steps4.forEach(([num, desc], i) => {
    s.addShape(pptx.ShapeType.rect, {
      x: 0.3, y: 2.65 + i * 0.6, w: 4.4, h: 0.55,
      fill: { color: i % 2 === 0 ? 'FFF7ED' : 'FFEDD5' },
      line: { color: 'FED7AA', width: 0.5 },
    });
    s.addText(num, { x: 0.35, y: 2.65 + i * 0.6, w: 0.5, h: 0.55, fontSize: 14, bold: true, color: C.orange, align: 'center', valign: 'middle' });
    s.addText(desc, { x: 0.85, y: 2.65 + i * 0.6, w: 3.8, h: 0.55, fontSize: 12, color: C.dark, valign: 'middle' });
  });

  // 範例
  s.addText('完整範例', { x: 5.1, y: 2.18, w: 4.5, h: 0.38, fontSize: 14, bold: true, color: C.navy });
  const example = [
    '求  ∫ 2x · cos(x²) dx',
    '設 u = x²，所以 du = 2x dx',
    '代入：∫ cos(u) du',
    '積分：sin(u) + C',
    '回代：sin(x²) + C',
  ];
  example.forEach((line, i) => {
    const isFirst = i === 0;
    const isLast = i === example.length - 1;
    s.addShape(pptx.ShapeType.rect, {
      x: 5.1, y: 2.65 + i * 0.58, w: 4.5, h: 0.53,
      fill: { color: isLast ? 'CCFBF1' : isFirst ? 'F1F5F9' : C.white },
      line: { color: 'CBD5E1', width: 0.5 },
    });
    s.addText(line, {
      x: 5.2, y: 2.65 + i * 0.58, w: 4.3, h: 0.53,
      fontSize: 12.5, color: isLast ? C.teal : C.dark,
      bold: isLast, fontFace: 'Courier New', valign: 'middle',
    });
  });

  // 小提示
  s.addShape(pptx.ShapeType.rect, {
    x: 0.3, y: 5.2, w: 9.4, h: 0.6,
    fill: { color: 'FFEDD5' }, line: { color: C.orange, width: 1 },
  });
  s.addText('💡 選 u 的訣竅：找到「某項函數」的導數恰好「剩餘」在被積分式中，就選它為 u', {
    x: 0.5, y: 5.2, w: 9.0, h: 0.55, fontSize: 12, color: '7C2D12', valign: 'middle',
  });

  s.addNotes('換元法（u-sub）是最常用的積分技巧之一，尤其用於複合函數。');
}

// ════════════════════════════════════════════════
//  投影片 08 — 分部積分法
// ════════════════════════════════════════════════
function slide08_parts() {
  const s = pptx.addSlide();
  s.background = { color: 'F8FAFC' };
  addHeader(s, '分部積分法（Integration by Parts）', '乘積型被積函數的利器', C.orange);

  formulaBox(s, '∫ u dv = uv − ∫ v du        （由乘積微分法則推導而來）', 0.3, 1.3, 9.4, 0.7, 'FFF7ED', C.orange);

  // LIATE 規則
  s.addText('選 u 的技巧：LIATE 法則', { x: 0.3, y: 2.15, w: 4.5, h: 0.4, fontSize: 14, bold: true, color: C.navy });
  const liate = [
    ['L', 'Logarithmic', '對數函數 ln x'],
    ['I', 'Inverse trig', '反三角 arcsin, arctan'],
    ['A', 'Algebraic', '多項式 xⁿ'],
    ['T', 'Trigonometric', '三角函數 sin, cos'],
    ['E', 'Exponential', '指數函數 eˣ, aˣ'],
  ];
  const liateColors = [C.blue, C.teal, C.navy, C.orange, C.green];
  liate.forEach(([letter, eng, chi], i) => {
    s.addShape(pptx.ShapeType.roundRect, { x: 0.3, y: 2.65 + i * 0.55, w: 0.5, h: 0.48, fill: { color: liateColors[i] } });
    s.addText(letter, { x: 0.3, y: 2.65 + i * 0.55, w: 0.5, h: 0.48, fontSize: 16, bold: true, color: C.white, align: 'center', valign: 'middle' });
    s.addText(eng, { x: 0.85, y: 2.65 + i * 0.55, w: 2.1, h: 0.48, fontSize: 11, color: C.dark, valign: 'middle', bold: true });
    s.addText(chi, { x: 2.95, y: 2.65 + i * 0.55, w: 1.8, h: 0.48, fontSize: 11, color: C.gray, valign: 'middle', italic: true });
  });
  s.addText('越排前面越優先選為 u', { x: 0.3, y: 5.45, w: 4.5, h: 0.35, fontSize: 10, color: C.gray, italic: true });

  // 範例
  s.addText('範例：∫ x·eˣ dx', { x: 5.1, y: 2.15, w: 4.5, h: 0.4, fontSize: 14, bold: true, color: C.navy });
  const partsSteps = [
    '選 u = x，dv = eˣ dx（A 先於 E）',
    '則 du = dx，v = eˣ',
    '∫ x·eˣ dx = x·eˣ − ∫ eˣ dx',
    '= x·eˣ − eˣ + C',
    '= eˣ(x − 1) + C    ✓',
  ];
  partsSteps.forEach((line, i) => {
    const isLast = i === partsSteps.length - 1;
    s.addShape(pptx.ShapeType.rect, {
      x: 5.1, y: 2.65 + i * 0.58, w: 4.5, h: 0.53,
      fill: { color: isLast ? 'CCFBF1' : (i % 2 === 0 ? 'FFF7ED' : C.white) },
      line: { color: 'CBD5E1', width: 0.5 },
    });
    s.addText(line, {
      x: 5.2, y: 2.65 + i * 0.58, w: 4.3, h: 0.53,
      fontSize: 12, color: isLast ? C.teal : C.dark,
      bold: isLast, fontFace: 'Courier New', valign: 'middle',
    });
  });

  s.addNotes('分部積分 ∫u dv = uv − ∫v du。LIATE 幫助選擇 u：對數>反三角>多項式>三角>指數。');
}

// ════════════════════════════════════════════════
//  投影片 09 — 實戰例題（4 題）
// ════════════════════════════════════════════════
function slide09_examples() {
  const s = pptx.addSlide();
  s.background = { color: 'F8FAFC' };
  addHeader(s, '實戰例題精解', '4 道例題涵蓋所有核心技巧', C.green);

  const qs = [
    { n: 'Q1', q: '∫ (3x² + 2x − 5) dx', a: 'x³ + x² − 5x + C', tag: '基本法則', tc: C.blue },
    { n: 'Q2', q: '∫₁⁴ √x dx', a: '[2/3 · x^(3/2)]₁⁴ = 2/3(8−1) = 14/3', tag: '定積分', tc: C.teal },
    { n: 'Q3', q: '∫ x·sin(x²) dx', a: '換元 u=x²：−1/2·cos(x²)+C', tag: '換元法', tc: C.orange },
    { n: 'Q4', q: '∫ ln(x) dx', a: 'x·ln(x) − x + C（分部，u=lnx）', tag: '分部積分', tc: C.red },
  ];

  qs.forEach((q, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bx = 0.3 + col * 4.85;
    const by = 1.3 + row * 2.95;

    // 題目框
    s.addShape(pptx.ShapeType.roundRect, {
      x: bx, y: by, w: 4.5, h: 2.7,
      fill: { color: C.white },
      line: { color: 'CBD5E1', width: 1 },
      shadow: { type: 'outer', blur: 6, offset: 2, angle: 270, color: '000000', opacity: 0.1 },
    });
    // 標籤
    badge(s, q.tag, bx + 2.7, by + 0.08, q.tc);
    // 題號
    s.addText(q.n, { x: bx + 0.12, y: by + 0.08, w: 0.7, h: 0.38, fontSize: 14, bold: true, color: C.gray });
    // 題目
    s.addText(q.q, {
      x: bx + 0.12, y: by + 0.55, w: 4.2, h: 0.65,
      fontSize: 14, bold: true, color: C.dark, fontFace: 'Courier New', wrap: true,
    });
    // 分隔線
    hLine(s, by + 1.28);
    // 答案
    s.addText('答：', { x: bx + 0.12, y: by + 1.35, w: 0.55, h: 0.35, fontSize: 11, color: q.tc, bold: true });
    s.addText(q.a, {
      x: bx + 0.65, y: by + 1.35, w: 3.7, h: 1.2,
      fontSize: 12, color: C.dark, fontFace: 'Courier New', wrap: true, lineSpacing: 18,
    });
  });

  s.addNotes('Q1 基本多項式積分；Q2 定積分計算；Q3 換元法（u=x²，du=2x dx）；Q4 分部積分（u=ln x，dv=dx）。');
}

// ════════════════════════════════════════════════
//  投影片 10 — 自我測驗
// ════════════════════════════════════════════════
function slide10_quiz() {
  const s = pptx.addSlide();
  s.background = { color: 'F8FAFC' };
  addHeader(s, '自我測驗', '做完再對答案，誠實面對自己！', C.yellow);

  const quizzes = [
    { n: '1', q: '∫ 4x³ dx = ?', a: 'x⁴ + C' },
    { n: '2', q: '∫₀^π sin x dx = ?', a: '2' },
    { n: '3', q: '∫ 1/(2x+1) dx = ?', a: '(1/2) ln|2x+1| + C  （換元 u=2x+1）' },
    { n: '4', q: 'd/dx [∫₀ˣ t² dt] = ?', a: 'x²  （FTC 第一型）' },
    { n: '5', q: '∫ x·cos x dx = ?', a: 'x sin x + cos x + C  （分部積分）' },
    { n: '6', q: '∫₋₁¹ x³ dx = ?', a: '0  （奇函數，對稱區間積分為 0）' },
  ];

  quizzes.forEach((quiz, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const bx = 0.25 + col * 3.25;
    const by = 1.3 + row * 2.7;

    s.addShape(pptx.ShapeType.roundRect, {
      x: bx, y: by, w: 3.0, h: 2.5,
      fill: { color: 'FFFBEB' },
      line: { color: 'FDE68A', width: 1.5 },
    });
    // 題號
    s.addShape(pptx.ShapeType.ellipse, { x: bx + 0.1, y: by + 0.08, w: 0.45, h: 0.45, fill: { color: C.yellow } });
    s.addText(quiz.n, { x: bx + 0.1, y: by + 0.08, w: 0.45, h: 0.45, fontSize: 14, bold: true, color: C.white, align: 'center', valign: 'middle' });
    // 題目
    s.addText(quiz.q, {
      x: bx + 0.1, y: by + 0.62, w: 2.8, h: 0.8,
      fontSize: 13, bold: true, color: C.dark, fontFace: 'Courier New', wrap: true, align: 'center',
    });
    // 答案（隱藏提示）
    s.addShape(pptx.ShapeType.rect, { x: bx + 0.1, y: by + 1.5, w: 2.8, h: 0.85, fill: { color: 'FEF9C3' }, line: { color: 'FDE68A', width: 0.5 } });
    s.addText('答：' + quiz.a, {
      x: bx + 0.12, y: by + 1.52, w: 2.75, h: 0.8,
      fontSize: 9.5, color: C.orange, wrap: true, lineSpacing: 15, fontFace: 'Courier New',
    });
  });

  s.addNotes('建議先蓋住答案做題，再檢查。Q6 考察奇函數性質，這是常見陷阱。');
}

// ════════════════════════════════════════════════
//  投影片 11 — 常見錯誤 & 注意事項
// ════════════════════════════════════════════════
function slide11_pitfalls() {
  const s = pptx.addSlide();
  s.background = { color: 'F8FAFC' };
  addHeader(s, '常見錯誤 & 注意事項', '學好積分，先學會不踩坑', C.red);

  const pitfalls = [
    {
      icon: '❌', title: '忘記加 +C',
      wrong: '∫ 2x dx = x²',
      right: '∫ 2x dx = x² + C',
      note: '不定積分必加 C，否則是不完整的',
    },
    {
      icon: '❌', title: '積分的積是乘法？',
      wrong: '∫ x·sin x dx = (-x·cos x) 直接完成',
      right: '需要分部積分：= -x cos x + sin x + C',
      note: '被積函數是乘積時，不能分開積再乘',
    },
    {
      icon: '❌', title: '定積分忘記代界',
      wrong: '∫₀² x dx = x²/2',
      right: '∫₀² x dx = [x²/2]₀² = 2 − 0 = 2',
      note: '定積分一定要代入上下界才算完成',
    },
    {
      icon: '❌', title: '換元後忘記換 dx',
      wrong: '令 u=x²，∫cos(x²)dx = ∫cos(u)du',
      right: 'du = 2x dx，所以要整理出 dx 或乘 1/(2x)',
      note: '換元時 dx 也要一起換，否則積分無效',
    },
  ];

  pitfalls.forEach((p, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bx = 0.25 + col * 4.85;
    const by = 1.3 + row * 2.9;

    s.addShape(pptx.ShapeType.roundRect, {
      x: bx, y: by, w: 4.5, h: 2.65,
      fill: { color: 'FFF1F2' },
      line: { color: 'FCA5A5', width: 1 },
    });
    s.addText(p.icon + ' ' + p.title, {
      x: bx + 0.12, y: by + 0.08, w: 4.2, h: 0.42,
      fontSize: 14, bold: true, color: C.red,
    });
    // 錯誤示範
    s.addShape(pptx.ShapeType.rect, { x: bx + 0.12, y: by + 0.55, w: 4.2, h: 0.52, fill: { color: 'FEE2E2' }, line: { color: 'FCA5A5', width: 0.5 } });
    s.addText('✗ ' + p.wrong, { x: bx + 0.18, y: by + 0.55, w: 4.05, h: 0.52, fontSize: 10.5, color: C.red, fontFace: 'Courier New', valign: 'middle', wrap: true });
    // 正確示範
    s.addShape(pptx.ShapeType.rect, { x: bx + 0.12, y: by + 1.1, w: 4.2, h: 0.52, fill: { color: 'DCFCE7' }, line: { color: '86EFAC', width: 0.5 } });
    s.addText('✓ ' + p.right, { x: bx + 0.18, y: by + 1.1, w: 4.05, h: 0.52, fontSize: 10.5, color: C.green, fontFace: 'Courier New', valign: 'middle', wrap: true });
    // 說明
    s.addText(p.note, { x: bx + 0.12, y: by + 1.68, w: 4.2, h: 0.82, fontSize: 10.5, color: C.gray, wrap: true, italic: true, lineSpacing: 16 });
  });

  s.addNotes('這四個是學生最常犯的錯誤。講解時可以讓學生找出錯在哪、再說明正確解法。');
}

// ════════════════════════════════════════════════
//  投影片 12 — 課程總結 & 下一步
// ════════════════════════════════════════════════
function slide12_summary() {
  const s = pptx.addSlide();
  s.background = { color: C.navy };

  // 右側裝飾
  s.addShape(pptx.ShapeType.rect, { x: 7.2, y: 0, w: 2.8, h: 7.5, fill: { color: '142D55' } });
  s.addText('∫', { x: 7.0, y: 0.2, w: 2.8, h: 6, fontSize: 260, color: '1E4080', align: 'center', fontFace: 'Times New Roman' });

  s.addText('📚 課程總結', { x: 0.5, y: 0.4, w: 6.4, h: 0.5, fontSize: 20, bold: true, color: C.white });

  const summaries = [
    { emoji: '🔢', text: '積分 = 無窮多個極小量的總和（黎曼和）' },
    { emoji: '⬅️', text: '不定積分 = 反導數，必須加 +C' },
    { emoji: '📐', text: '定積分 = F(b) − F(a)，代表帶正負號的面積' },
    { emoji: '🔗', text: 'FTC 把微分算子（d/dx）和積分（∫）連繫起來' },
    { emoji: '🔄', text: '換元法（u-sub）處理複合函數的積分' },
    { emoji: '✖️', text: '分部積分（∫u dv = uv − ∫v du）處理乘積型' },
  ];

  summaries.forEach((item, i) => {
    s.addText(item.emoji + '  ' + item.text, {
      x: 0.5, y: 1.05 + i * 0.65, w: 6.4, h: 0.58,
      fontSize: 13, color: i % 2 === 0 ? C.white : 'B0C4DE',
      lineSpacing: 18,
    });
  });

  hLine(s, 5.15, '2D4A7A');

  s.addText('🚀 下一步建議', { x: 0.5, y: 5.22, w: 6.4, h: 0.4, fontSize: 16, bold: true, color: '7EC8E3' });
  const nexts = ['練習：MIT OCW 18.01 習題集', '進階：多重積分（二、三重積分）', '應用：面積、弧長、體積計算'];
  nexts.forEach((n, i) => {
    s.addText('→ ' + n, { x: 0.6, y: 5.7 + i * 0.45, w: 6.2, h: 0.4, fontSize: 12, color: 'B0C4DE' });
  });

  s.addNotes('課程結束。恭喜完成積分概要！接下來可以練習應用題，或進入多重積分的學習。');
}

// ═══════════════════════════════════════
//  建立所有投影片
// ═══════════════════════════════════════
slide00_cover();
slide01_roadmap();
slide02_intuition();
slide03_indefinite();
slide04_definite();
slide05_ftc();
slide06_rules();
slide07_substitution();
slide08_parts();
slide09_examples();
slide10_quiz();
slide11_pitfalls();
slide12_summary();

// ═══════════════════════════════════════
//  輸出
// ═══════════════════════════════════════
pptx.writeFile({ fileName })
  .then(() => console.log(`✅ Wrote PPTX (13 slides): ${fileName}`))
  .catch(err => { console.error(err); process.exit(1); });
