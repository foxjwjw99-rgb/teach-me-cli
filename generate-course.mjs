// 直接生成課程
// node generate-course.mjs

import { writeFileSync, mkdirSync } from "fs";
import PptxGenJS from "pptxgenjs";

// 直接寫入課程大綱 (我來生成)
const outline = [
  {
    id: "scene_1",
    title: "微積分是什麼",
    type: "slide",
    duration: 120,
    keyPoints: ["研究變化率和累積", "導數：瞬間變化率", "積分：累積總量"],
    content: "認識微積分的基本概念"
  },
  {
    id: "scene_2",
    title: "為什麼需要微積分",
    type: "slide",
    duration: 120,
    keyPoints: ["物理：運動、力學", "經濟：邊際分析", "工程：優化問題"],
    content: "理解微積分的應用領域"
  },
  {
    id: "scene_3",
    title: "函數與圖形",
    type: "slide",
    duration: 120,
    keyPoints: ["函數定義 f(x)", "圖形表示", "增長和遞減"],
    content: "學習函數基礎"
  },
  {
    id: "scene_4",
    title: "極限的概念",
    type: "slide",
    duration: 120,
    keyPoints: ["當 x 趨近於某值", "函數值的趨勢", "左極限和右極限"],
    content: "理解極限的定義"
  },
  {
    id: "scene_5",
    title: "導數入門",
    type: "slide",
    duration: 120,
    keyPoints: ["斜率的概念", "瞬間變化率", "導數的定義"],
    content: "認識導數"
  },
  {
    id: "scene_6",
    title: "求導法則",
    type: "slide",
    duration: 120,
    keyPoints: ["常數法則", "冪法則", "和差法則"],
    content: "學習基本求導公式"
  },
  {
    id: "scene_7",
    title: "導數的應用",
    type: "slide",
    duration: 120,
    keyPoints: ["找極大值和極小值", "速度和加速度", "最優化問題"],
    content: "導數實際應用"
  },
  {
    id: "scene_8",
    title: "積分的概念",
    type: "slide",
    duration: 120,
    keyPoints: ["面積計算", "累積總量", "反導數"],
    content: "認識積分"
  },
  {
    id: "scene_9",
    title: "定積分與不定積分",
    type: "slide",
    duration: 120,
    keyPoints: ["定積分：有邊界", "不定積分：加常數 C", "牛頓-萊布尼茨定理"],
    content: "積分的兩種形式"
  },
  {
    id: "scene_10",
    title: "積分技巧",
    type: "slide",
    duration: 120,
    keyPoints: ["換元積分", "分部積分", "特殊積分公式"],
    content: "學習進階積分方法"
  },
  {
    id: "scene_11",
    title: "微積分基本定理",
    type: "slide",
    duration: 120,
    keyPoints: ["導數和積分互為逆運算", "微分和積分的關係", "實際計算應用"],
    content: "微積分最重要的定理"
  },
  {
    id: "scene_12",
    title: "復習與練習",
    type: "quiz",
    duration: 120,
    keyPoints: ["導數計算", "積分計算", "應用問題"],
    content: "測驗時間"
  }
];

const slides = outline.map((scene, idx) => ({
  id: scene.id,
  title: scene.title,
  narration: `${scene.title}。${scene.content}。主要要點是：${scene.keyPoints.join("、")}。`,
  elements: [
    {
      type: "text",
      content: scene.keyPoints.join("\n"),
      style: "bullet"
    }
  ]
}));

// 生成 PPTX
const SLIDE_WIDTH = 10;
const SLIDE_HEIGHT = 5.625;

function getTextHeight(lines) {
  return 0.3 * lines;
}

const prs = new PptxGenJS();

console.log("📊 Generating PPTX with", slides.length, "slides...");

for (let i = 0; i < slides.length; i++) {
  const slide = slides[i];
  const pptSlide = prs.addSlide();

  pptSlide.background = { color: "FFFFFF" };

  // 標題
  pptSlide.addText(slide.title, {
    x: 0.5,
    y: 0.4,
    w: SLIDE_WIDTH - 1,
    h: 0.8,
    fontSize: 40,
    bold: true,
    color: "1F4E78",
    align: "left"
  });

  // 標題線
  pptSlide.addShape(prs.ShapeType.line, {
    x: 0.5,
    y: 1.25,
    w: SLIDE_WIDTH - 1,
    h: 0,
    line: { color: "5B9BD5", width: 2 }
  });

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
          fontSize: 18,
          color: "333333",
          align: "left",
          valign: "top",
          lineSpacing: 28
        });

        currentY += Math.max(textHeight, 0.5) + 0.3;
      }
    }
  }

  // 頁碼
  pptSlide.addText(`${i + 1}/${slides.length}`, {
    x: 0.5,
    y: SLIDE_HEIGHT - 0.4,
    w: SLIDE_WIDTH - 1,
    h: 0.3,
    fontSize: 12,
    color: "999999",
    align: "right"
  });
}

// 保存
mkdirSync("output", { recursive: true });
prs.writeFile({ fileName: "output/微積分入門.pptx" });

// 保存 JSON
writeFileSync("output/outline.json", JSON.stringify(outline, null, 2));
writeFileSync("output/slides.json", JSON.stringify(slides, null, 2));

console.log("✅ Files generated:");
console.log("   • output/微積分入門.pptx");
console.log("   • output/outline.json");
console.log("   • output/slides.json");
