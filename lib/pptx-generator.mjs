// lib/pptx-generator.mjs

import PptxGenJS from "pptxgenjs";
import { writeFileSync } from "fs";

const SLIDE_WIDTH = 10;
const SLIDE_HEIGHT = 5.625; // 16:9

function getTextHeight(lines) {
  const baseHeight = 0.3;
  return baseHeight * lines;
}

export async function generatePPTX(slides, outputPath) {
  const prs = new PptxGenJS();
  prs.defineLayout({
    name: "LAYOUT1",
    master: "MASTER1",
  });

  console.log(`📊 Generating PPTX with ${slides.length} slides...`);

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const pptSlide = prs.addSlide();

    // 背景
    pptSlide.background = { color: "FFFFFF" };

    // 標題
    if (slide.title) {
      pptSlide.addText(slide.title, {
        x: 0.5,
        y: 0.4,
        w: SLIDE_WIDTH - 1,
        h: 0.8,
        fontSize: 40,
        bold: true,
        color: "1F4E78",
        align: "left",
      });

      // 標題底線
      pptSlide.addShape(prs.ShapeType.line, {
        x: 0.5,
        y: 1.25,
        w: SLIDE_WIDTH - 1,
        h: 0,
        line: { color: "5B9BD5", width: 2 },
      });
    }

    // 內容
    let currentY = 1.5;

    if (slide.elements && Array.isArray(slide.elements)) {
      for (const elem of slide.elements) {
        if (elem.type === "text") {
          const lines = elem.content.split("\n").length;
          const textHeight = getTextHeight(lines);

          pptSlide.addText(elem.content, {
            x: 0.8,
            y: currentY,
            w: SLIDE_WIDTH - 1.6,
            h: Math.max(textHeight, 0.5),
            fontSize: elem.style === "bullet" ? 18 : 24,
            color: "333333",
            align: "left",
            valign: "top",
            lineSpacing: 28,
          });

          currentY += Math.max(textHeight, 0.5) + 0.3;
        }
      }
    } else if (slide.narration) {
      // 降級：如果沒有 elements，用 narration
      const lines = slide.narration.split("\n").length;
      const textHeight = getTextHeight(lines);

      pptSlide.addText(slide.narration, {
        x: 0.8,
        y: currentY,
        w: SLIDE_WIDTH - 1.6,
        h: Math.max(textHeight, 0.5),
        fontSize: 18,
        color: "333333",
        align: "left",
        valign: "top",
        lineSpacing: 28,
      });
    }

    // 頁碼
    pptSlide.addText(`${i + 1}/${slides.length}`, {
      x: 0.5,
      y: SLIDE_HEIGHT - 0.4,
      w: SLIDE_WIDTH - 1,
      h: 0.3,
      fontSize: 12,
      color: "999999",
      align: "right",
    });
  }

  // 保存
  prs.writeFile({ fileName: outputPath });
  console.log(`✅ PPTX saved: ${outputPath}\n`);
}
