// src/test-outline.mjs

import dotenv from "dotenv";
import { generateOutline } from "../lib/outline-generator.mjs";
import {
  OUTLINE_SYSTEM_PROMPT,
  OUTLINE_USER_PROMPT,
} from "../lib/prompts.mjs";

dotenv.config({ path: ".env.local" });

async function main() {
  const topic = "微積分入門";

  try {
    const outline = await generateOutline({
      topic,
      audience: "高中學生",
      difficulty: "中級",
      systemPrompt: OUTLINE_SYSTEM_PROMPT,
      userPromptTemplate: OUTLINE_USER_PROMPT,
    });

    console.log("📋 Course Outline:");
    console.log(JSON.stringify(outline, null, 2));

    // 保存
    const fs = await import("fs");
    fs.writeFileSync(
      "output/outline.json",
      JSON.stringify(outline, null, 2)
    );
    console.log("\n✅ Outline saved to output/outline.json");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main();
