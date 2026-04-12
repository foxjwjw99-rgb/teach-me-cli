// src/cli.mjs

import dotenv from "dotenv";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { generateOutline, generateSlideContent } from "../lib/outline-generator.mjs";
import { generatePPTX } from "../lib/pptx-generator.mjs";
import { generateCourseNarration } from "../lib/tts-generator.mjs";
import {
  OUTLINE_SYSTEM_PROMPT,
  OUTLINE_USER_PROMPT,
  SLIDE_CONTENT_SYSTEM_PROMPT,
  SLIDE_CONTENT_USER_PROMPT,
} from "../lib/prompts.mjs";

dotenv.config({ path: ".env.local" });

const OUTPUT_DIR = "output";
const NARRATION_DIR = join(OUTPUT_DIR, "narration");

async function ensureOutputDirs() {
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
  if (!existsSync(NARRATION_DIR)) mkdirSync(NARRATION_DIR, { recursive: true });
}

async function main() {
  const topic = process.argv[2] || "微積分入門";

  console.log(`🎓 Teaching CLI\n`);
  console.log(`Topic: ${topic}\n`);

  await ensureOutputDirs();

  try {
    // ============ Stage 1: 生成課程大綱 ============
    console.log(`\n${'='.repeat(50)}`);
    console.log("Stage 1️⃣  : Generating Course Outline");
    console.log('='.repeat(50));

    const outline = await generateOutline({
      topic,
      audience: "general learners",
      difficulty: "intermediate",
      systemPrompt: OUTLINE_SYSTEM_PROMPT,
      userPromptTemplate: OUTLINE_USER_PROMPT,
    });

    writeFileSync(
      join(OUTPUT_DIR, "outline.json"),
      JSON.stringify(outline, null, 2)
    );

    // ============ Stage 2: 生成課件內容 ============
    console.log(`\n${'='.repeat(50)}`);
    console.log("Stage 2️⃣  : Generating Slide Content");
    console.log('='.repeat(50));

    const slides = [];
    for (let i = 0; i < outline.length; i++) {
      const sceneOutline = outline[i];
      console.log(`\n📄 Processing scene ${i + 1}/${outline.length}: ${sceneOutline.title}`);

      let slideContent;
      if (sceneOutline.type === "quiz") {
        // 跳過 quiz，用簡單版本
        slideContent = {
          id: sceneOutline.id,
          title: sceneOutline.title,
          narration: "小測驗時間。請回答以下問題。",
          elements: [
            {
              type: "text",
              content: sceneOutline.keyPoints.join("\n"),
              style: "bullet",
            },
          ],
        };
      } else {
        // 生成詳細內容
        slideContent = await generateSlideContent({
          slide: sceneOutline,
          systemPrompt: SLIDE_CONTENT_SYSTEM_PROMPT,
          userPromptTemplate: SLIDE_CONTENT_USER_PROMPT,
        });
      }

      slides.push(slideContent);
    }

    writeFileSync(
      join(OUTPUT_DIR, "slides.json"),
      JSON.stringify(slides, null, 2)
    );

    console.log(`\n✅ Generated ${slides.length} slides`);

    // ============ Stage 3: 生成 PPTX ============
    console.log(`\n${'='.repeat(50)}`);
    console.log("Stage 3️⃣  : Generating PPTX File");
    console.log('='.repeat(50));

    await generatePPTX(slides, join(OUTPUT_DIR, `${topic}.pptx`));

    // ============ Stage 4: 生成語音 (Optional) ============
    console.log(`\n${'='.repeat(50)}`);
    console.log("Stage 4️⃣  : Generating Narration (Optional)");
    console.log('='.repeat(50));

    const narration = await generateCourseNarration(slides, NARRATION_DIR, {
      refAudio: "/Users/huli/.openclaw/workspace/voice-clones/jimmy-current-clone-reference.wav",
      refText: "这是现在我们学校流行的装饰品了。",
      instruct: "female, very low pitch",
      speed: 0.9,
    });

    writeFileSync(
      join(OUTPUT_DIR, "narration.json"),
      JSON.stringify(narration, null, 2)
    );

    // ============ 完成 ============
    console.log(`\n${'='.repeat(50)}`);
    console.log("✅ Course Generation Complete!");
    console.log('='.repeat(50));
    console.log(`\n📁 Output Files:`);
    console.log(`   • ${OUTPUT_DIR}/outline.json`);
    console.log(`   • ${OUTPUT_DIR}/slides.json`);
    console.log(`   • ${OUTPUT_DIR}/${topic}.pptx`);
    console.log(`   • ${OUTPUT_DIR}/narration.json`);
    console.log(`   • ${OUTPUT_DIR}/narration/slide_*.mp3`);
    console.log(`\n🎓 Ready to use!`);
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
