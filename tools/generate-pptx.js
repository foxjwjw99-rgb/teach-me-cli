const PptxGenJS = require('../packages/pptxgenjs/dist/pptxgen.cjs.js');
const fs = require('fs');
const path = require('path');

const outDir = process.argv[2] || path.join(__dirname, '..', 'output', 'integral-summary-5min');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const fileName = path.join(outDir, '積分概要-5分鐘.pptx');

const slides = [
  {
    title: '積分概要（5 分鐘）',
    bullets: ['學習目標：直觀理解積分、區分不定/定積分、基本法則、範例計算'],
    notes: '學習目標：直觀理解積分（面積）、區分不定/定積分、知道基本積分法則並做範例。'
  },
  {
    title: '什麼是積分？',
    bullets: ['把曲線下面分成很多窄矩形，求和並取極限 → 面積'],
    notes: '直覺說明：用 y=x 在 0 到 2 的圖示，底下形成三角形，面積 1/2×2×2=2。'
  },
  {
    title: '不定積分 = 反導數',
    bullets: ['表示為 ∫ f(x) dx = F(x) + C（若 F\' = f）', '例：∫ 2x dx = x^2 + C'],
    notes: '說明反導數概念並舉例 2x 的反導數為 x^2。'
  },
  {
    title: '定積分與基本定理',
    bullets: ['∫_a^b f(x) dx 表示 a 到 b 的面積', '基本定理：∫_a^b f(x) dx = F(b) − F(a)'],
    notes: '例子：∫_0^2 x dx = (1/2)x^2 |_0^2 = 2。'
  },
  {
    title: '常見積分法則',
    bullets: ['常數乘法、線性和', '乘方規則：∫ x^n dx = x^(n+1)/(n+1) + C (n≠−1)', '簡單代換示意：∫ 2x·cos(x^2) dx → sin(x^2) + C'],
    notes: '快速列出法則並示範簡單代換想法。'
  },
  {
    title: '範例與小測',
    bullets: ['完整範例：∫_0^2 x^2 dx = x^3/3 |_0^2 = 8/3', '小測1：∫_0^1 2x dx = ?  → 1', '小測2：∫ x^2 dx = ? + C  → x^3/3 + C'],
    notes: '計算範例並給兩題小測作為檢驗。結尾：下一步練習建議。'
  }
];

const pptx = new PptxGenJS();
slides.forEach(s => {
  const slide = pptx.addSlide();
  slide.addText(s.title, { x: 0.5, y: 0.4, fontSize: 28, bold: true, color: '363636' });
  slide.addText(s.bullets.join('\n\n'), { x: 0.5, y: 1.2, fontSize: 18, color: '444444', bullet: true, lineSpacing: 20, wrap: true });
  if (s.notes) slide.addNotes(s.notes);
});

pptx.writeFile({ fileName })
  .then(() => console.log(`Wrote PPTX: ${fileName}`))
  .catch((err) => { console.error(err); process.exit(1); });
