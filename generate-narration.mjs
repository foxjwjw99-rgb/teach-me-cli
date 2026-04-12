// 生成語音配音
// node generate-narration.mjs

import { execSync } from "child_process";
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "fs";
import { dirname } from "path";

const NARRATION_DIR = "output/narration";
const SLIDES_FILE = "output/slides.json";

// 確保目錄存在
if (!existsSync(NARRATION_DIR)) {
  mkdirSync(NARRATION_DIR, { recursive: true });
}

// 讀取課程 slides
const slides = JSON.parse(readFileSync(SLIDES_FILE, "utf-8"));

console.log(`🎙️ Generating narration for ${slides.length} slides...\n`);

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
    // 呼叫 OmniVoice
    const cmd = [
      "omnivoice-local",
      "--text",
      `"${narrationText.replace(/"/g, '\\"')}"`,
      "--ref-audio",
      "/Users/huli/.openclaw/workspace/voice-clones/jimmy-current-clone-reference.wav",
      "--ref-text",
      '"这是现在我们学校流行的装饰品了。"',
      "--instruct",
      '"female, very low pitch"',
      "--speed",
      "0.9",
      "--style",
      '"請用台灣國語的感覺說話，使用台灣繁體中文常用詞。不要香港口音，不要港式語調，不要粵語感。不要中國播報腔，不要兒化音。語氣自然、親切、口語，像台灣日常對話。"',
      "--output",
      audioPath
    ].join(" ");

    execSync(cmd, { stdio: "pipe" });
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
    console.log(`   ⚠️  OmniVoice not available or failed, using placeholder\n`);
    
    // 如果 OmniVoice 不可用，紀錄但繼續
    narration.slides.push({
      id: slide.id,
      slideIndex: i,
      title: slide.title,
      narrationText,
      audioFile: null,
      audioPath: null,
      error: "OmniVoice generation failed"
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
console.log(`   • Generated audio files: ${narration.slides.filter(s => s.audioFile).length}`);
console.log(`   • Location: ${NARRATION_DIR}/`);
