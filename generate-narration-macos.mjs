// 用 macOS say 命令生成語音
// node generate-narration-macos.mjs

import { execSync } from "child_process";
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "fs";

const NARRATION_DIR = "output/narration";
const SLIDES_FILE = "output/slides.json";

// 確保目錄存在
if (!existsSync(NARRATION_DIR)) {
  mkdirSync(NARRATION_DIR, { recursive: true });
}

// 讀取課程 slides
const slides = JSON.parse(readFileSync(SLIDES_FILE, "utf-8"));

console.log(`🎙️ Generating narration for ${slides.length} slides using macOS say...\n`);

const narration = {
  slides: []
};

for (let i = 0; i < slides.length; i++) {
  const slide = slides[i];
  const narrationText = slide.narration || `${slide.title}。`;
  const audioFile = `slide_${String(i + 1).padStart(3, "0")}.mp3`;
  const audioPath = `${NARRATION_DIR}/${audioFile}`;

  console.log(`📝 [${i + 1}/${slides.length}] ${slide.title}`);
  console.log(`   Text: "${narrationText.substring(0, 50)}..."`);

  try {
    // 用 macOS say 命令 + 中文人聲
    const cmd = `say -v Ting-Ting "${narrationText}" -o "${audioPath}" -f /dev/stdin`;
    
    // 改用更簡單的方式：直接用 say 生成
    execSync(
      `say -v Ting-Ting "${narrationText.replace(/"/g, '\\"')}" -o "${audioPath}"`,
      { stdio: "pipe", encoding: "utf-8" }
    );
    
    console.log(`   ✅ Generated: ${audioFile}\n`);

    narration.slides.push({
      id: slide.id,
      slideIndex: i,
      title: slide.title,
      narrationText,
      audioFile,
      audioPath
    });
  } catch (error) {
    console.log(`   ⚠️  Voice generation failed\n`);
    
    narration.slides.push({
      id: slide.id,
      slideIndex: i,
      title: slide.title,
      narrationText,
      audioFile: null,
      audioPath: null,
      error: error.message
    });
  }
}

// 保存 narration metadata
writeFileSync(
  "output/narration.json",
  JSON.stringify(narration, null, 2)
);

console.log(`✅ Narration metadata saved: output/narration.json`);
console.log(`\n📊 Summary:`);
console.log(`   • Total slides: ${slides.length}`);
console.log(`   • Generated audio: ${narration.slides.filter(s => s.audioFile).length} / ${slides.length}`);
console.log(`   • Location: ${NARRATION_DIR}/`);
