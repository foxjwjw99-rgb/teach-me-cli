// 用 OmniVoice skill 生成語音
// node generate-narration-omnivoice.mjs

import { execSync } from "child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "fs";

const SKILL_DIR = "/Users/huli/.openclaw/workspace/skills/omnivoice-local";
const SLIDES_FILE = "output/slides.json";
const OUTPUT_DIR = "output/narration";

mkdirSync(OUTPUT_DIR, { recursive: true });

const slides = JSON.parse(readFileSync(SLIDES_FILE, "utf-8"));

console.log(`🎙️ Generating narration with OmniVoice (voice clone)...\n`);

const narration = { slides: [] };

for (let i = 0; i < slides.length; i++) {
  const slide = slides[i];
  const text = slide.narration || slide.title;
  const audioFile = `slide_${String(i + 1).padStart(3, "0")}.mp3`;
  const audioPath = `${OUTPUT_DIR}/${audioFile}`;

  console.log(`📝 [${i + 1}/${slides.length}] ${slide.title}`);
  console.log(`   Text: "${text.substring(0, 40)}..."`);

  try {
    // 呼叫 OmniVoice 的 tts.sh，使用 voice clone 模式
    const cmd = [
      `cd "${SKILL_DIR}" && bash scripts/tts.sh`,
      `"${text.replace(/"/g, '\\"')}"`,
      `--ref-audio /Users/huli/.openclaw/workspace/voice-clones/jimmy-current-clone-reference.wav`,
      `--ref-text "这是现在我们学校流行的装饰品了。"`
    ].join(" ");

    console.log(`   Running OmniVoice...`);
    execSync(cmd, { stdio: "pipe", shell: "/bin/bash" });

    // 查找生成的輸出
    const cacheOut = "/Users/huli/.openclaw/workspace/.cache/omnivoice-local/out";
    const files = execSync(`ls -t "${cacheOut}"/*.wav 2>/dev/null | head -1`, {
      encoding: "utf-8",
      shell: "/bin/bash"
    }).trim();

    if (!files) {
      throw new Error("No WAV output found");
    }

    const wavPath = files.split("\n")[0];

    // 轉成 MP3
    const tempWav = `/tmp/temp_${i}.wav`;
    copyFileSync(wavPath, tempWav);

    execSync(`ffmpeg -i "${tempWav}" -q:a 9 -y "${audioPath}" 2>&1 | grep -E "Duration|error" || true`, {
      stdio: "inherit",
      shell: "/bin/bash"
    });

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
console.log(`📁 Location: ${OUTPUT_DIR}/`);
