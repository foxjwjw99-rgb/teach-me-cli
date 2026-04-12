// lib/outline-generator.mjs

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function generateOutline({
  topic,
  audience = "general learners",
  difficulty = "intermediate",
  systemPrompt,
  userPromptTemplate,
}) {
  const userPrompt = userPromptTemplate
    .replace("{topic}", topic)
    .replace("{audience}", audience)
    .replace("{difficulty}", difficulty);

  console.log(`📚 Generating outline for: ${topic}`);
  console.log(`   Audience: ${audience}, Difficulty: ${difficulty}\n`);

  const response = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
    system: systemPrompt,
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type");
  }

  // 嘗試解析 JSON
  let outline;
  try {
    // 移除可能的 markdown code block
    let text = content.text;
    if (text.includes("```json")) {
      text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (text.includes("```")) {
      text = text.replace(/```\n?/g, "");
    }
    outline = JSON.parse(text.trim());
  } catch (e) {
    console.error("❌ Failed to parse outline JSON:");
    console.error(content.text);
    throw e;
  }

  console.log(`✅ Generated ${outline.length} scenes\n`);
  return outline;
}

export async function generateSlideContent({
  slide,
  systemPrompt,
  userPromptTemplate,
}) {
  const userPrompt = userPromptTemplate
    .replace("{title}", slide.title)
    .replace("{keyPoints}", slide.keyPoints.join(", "));

  const response = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
    system: systemPrompt,
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type");
  }

  // 解析 JSON
  let slideContent;
  try {
    let text = content.text;
    if (text.includes("```json")) {
      text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (text.includes("```")) {
      text = text.replace(/```\n?/g, "");
    }
    slideContent = JSON.parse(text.trim());
  } catch (e) {
    console.error(`❌ Failed to parse slide content for "${slide.title}"`);
    console.error(content.text);
    // 返回默認結構
    slideContent = {
      id: slide.id,
      title: slide.title,
      narration: slide.content || slide.keyPoints.join(" "),
      elements: [
        {
          type: "text",
          content: slide.keyPoints.join("\n"),
          style: "bullet",
        },
      ],
    };
  }

  return slideContent;
}
