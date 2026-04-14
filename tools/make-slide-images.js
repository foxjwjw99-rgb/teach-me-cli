const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const outDir = process.argv[2] || path.join(__dirname, '..', 'output', 'integral-summary-5min', 'images_v2');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function makeSVG(title, text) {
  const width = 1280;
  const height = 720;
  const lines = text.split('\n');
  // escape for XML
  const esc = (s) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const bodyLines = lines.map((l,i) => `  <tspan x=\"60\" dy=\"1.2em\">${esc(l)}</tspan>`).join('\n');
  const svg = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<svg width=\"${width}\" height=\"${height}\" viewBox=\"0 0 ${width} ${height}\" xmlns=\"http://www.w3.org/2000/svg\">
  <rect width=\"100%\" height=\"100%\" fill=\"#F7FBFF\" />
  <text x=\"60\" y=\"90\" font-family=\"Arial, Helvetica, sans-serif\" font-size=\"36\" fill=\"#1F4E79\">${esc(title)}</text>
  <g transform=\"translate(60,140)\">
    <text font-family=\"Arial, Helvetica, sans-serif\" font-size=\"24\" fill=\"#222222\">\n${bodyLines}\n    </text>
  </g>
  <text x=\"60\" y=\"680\" font-family=\"Arial, Helvetica, sans-serif\" font-size=\"12\" fill=\"#6A7A89\">5 分鐘微課 • 積分概要</text>
</svg>`;
  return svg;
}

(async function(){
  for (let i=1;i<=6;i++){
    const txtPath = path.join(__dirname,'..','output','integral-summary-5min',`slide${i}.txt`);
    if (!fs.existsSync(txtPath)) continue;
    const text = fs.readFileSync(txtPath,'utf8');
    const titleMap = {
      1:'積分概要（5 分鐘）',
      2:'什麼是積分？',
      3:'不定積分 = 反導數',
      4:'定積分與基本定理',
      5:'常見積分法則',
      6:'範例與小測'
    };
    const svg = makeSVG(titleMap[i], text);
    const outPng = path.join(outDir, `slide${i}.png`);
    await sharp(Buffer.from(svg)).png().toFile(outPng);
    console.log('wrote', outPng);
  }
})();
