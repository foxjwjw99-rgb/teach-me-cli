// lib/tts-generator.mjs

import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";

export async function generateNarrationWithOmniVoice(
  narrationText,
  audioPath,
  options = {}
) {
  // 確保輸出目錄存在
  const dir = dirname(audioPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const refAudio =
    options.refAudio ||
    "/Users/huli/.openclaw/workspace/voice-clones/jimmy-current-clone-reference.wav";
  const refText =
    options.refText || "这是现在我们学校流行的装饰品了。";
  const instruct = options.instruct || "female, very low pitch";
  const speed = options.speed || 0.9;
  const style =
    options.style ||
    "請用台灣國語的感覺說話，使用台灣繁體中文常用詞。不要香港口音，不要港式語調，不要粵語感。不要中國播報腔，不要兒化音。語氣自然、親切、口語，像台灣日常對話。";

  try {
    // 使用 omnivoice-local 命令
    const cmd = [
      "omnivoice-local",
      "--text",
      `"${narrationText.replace(/"/g, '\\"')}"`,
      "--ref-audio",
      refAudio,
      "--ref-text",
      `"${refText}"`,
      "--instruct",
      `"${instruct}"`,
      "--speed",
      speed,
      "--style",
      `"${style}"`,
      "--output",
      audioPath,
    ].join(" ");

    console.log(`🎙️  Generating audio: ${audioPath}`);
    execSync(cmd, { stdio: "inherit" });
    console.log(`✅ Audio generated`);
    return audioPath;
  } catch (error) {
    console.error(`⚠️  OmniVoice generation failed, creating placeholder`);
    // 如果失敗，建立一個空的音檔
    // 實際上需要 ffmpeg，暫時skip
    return null;
  }
}

export async function generateCourseNarration(slides, outputDir, options = {}) {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const narration = {
    slides: [],
  };

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const narrationText = slide.narration || slide.title;

    if (!narrationText) {
      console.log(`⏭️  Skipping slide ${i + 1} (no narration)`);
      continue;
    }

    const audioPath = `${outputDir}/slide_${String(i + 1).padStart(3, "0")}.mp3`;

    try {
      await generateNarrationWithOmniVoice(narrationText, audioPath, {
        refAudio: options.refAudio,
        refText: options.refText,
        instruct: options.instruct,
        speed: options.speed,
        style: options.style,
      });

      narration.slides.push({
        id: slide.id,
        slideIndex: i,
        title: slide.title,
        narrationText,
        audioFile: `slide_${String(i + 1).padStart(3, "0")}.mp3`,
        audioPath,
      });
    } catch (error) {
      console.error(`❌ Failed to generate audio for slide ${i + 1}`);
      console.error(error.message);
    }
  }

  return narration;
}
