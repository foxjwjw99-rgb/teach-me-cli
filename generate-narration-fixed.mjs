// 用 say + ffmpeg 生成高質量語音
// node generate-narration-fixed.mjs

import { execSync } from "child_process";
import { writeFileSync, readFileSync, mkdirSync, existsSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const NARRATION_DIR = "output/narration";
const SLIDES_FILE = "output/slides.json";

if (!existsSync(NARRATION_DIR)) {
  mkdirSync(NARRATION_DIR, { recursive: true });
}

const slides = JSON.parse(readFileSync(SLIDES_FILE, "utf-8"));

console.log(`🎙️ Generating narration with say + ffmpeg...\n`);

const narration = { slides: [] };

for (let i = 0; i < slides.length; i++) {
  const slide = slides[i];
  const text = slide.narration || slide.title;
  const audioFile = `slide_${String(i + 1).padStart(3, "0")}.mp3`;
  const audioPath = `${NARRATION_DIR}/${audioFile}`;

  console.log(`📝 [${i + 1}/${slides.length}] ${slide.title}`);

  try {
    // 1. 用 say 生成臨時 aiff
    const tmpAiff = join(tmpdir(), `tmp_${i}.aiff`);
    execSync(`say -v Ting-Ting "${text.replace(/"/g, '\\"')}" -o "${tmpAiff}"`, {
      stdio: "pipe"
    });

    // 2. 用 ffmpeg 轉成 mp3
    execSync(`ffmpeg -i "${tmpAiff}" -q:a 9 -y "${audioPath}"`, {
      stdio: "pipe"
    });

    // 3. 清理臨時檔
    rmSync(tmpAiff, { force: true });

    console.log(`   ✅ Generated: ${audioFile}\n`);

    narration.slides.push({
      id: slide.id,
      slideIndex: i,
      title: slide.title,
      narrationText: text,
      audioFile,
      audioPath
    });
  } catch (error) {
    console.log(`   ⚠️  Failed: ${error.message}\n`);
  }
}

writeFileSync("output/narration.json", JSON.stringify(narration, null, 2));
console.log(`✅ Done! Generated ${narration.slides.length} audio files`);
