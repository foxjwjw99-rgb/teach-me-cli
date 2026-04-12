import { Scene } from '../types.js';

interface PromptPair {
  systemPrompt: string;
  userPrompt: string;
}

export function buildOutlinePrompt(topic: string, content: string): PromptPair {
  return {
    systemPrompt: `你是一位教育課程設計師。根據提供的主題和內容，生成結構化的課程大綱。

## 輸出格式 (JSON 陣列)

每個場景必須包含以下欄位：
\`\`\`json
[
  {
    "id": "scene_001",
    "type": "slide",
    "title": "章節標題",
    "keyPoints": ["要點1", "要點2", "要點3"],
    "duration": 120
  },
  ...
]
\`\`\`

## 設計規則

1. **類型**: slide（講座）| quiz（測驗）| interactive（互動）| pbl（專案學習）
2. **時長**: 1分鐘 = 120秒，通常1個slide = 2-3分鐘（120-180秒）
3. **要點**: 3-5個核心要點，每個15-30字
4. **測驗**: 每5-10個slide後加一個quiz
5. **總長度**: 生成15-30分鐘的課程（12-20個場景）
6. **語言**: 繁體中文，清晰易懂

## 要求

- 直接輸出 JSON 陣列，不要其他文字
- 每個 scene 必須有 id, type, title, keyPoints
- id 格式: scene_001, scene_002 等
- 最後一個場景應該是 quiz 或總結`,
    userPrompt: `請根據以下內容生成課程大綱：

**主題**: ${topic}

**內容**:
${content.substring(0, 1000)}${content.length > 1000 ? '\n...' : ''}

請輸出有效的 JSON 陣列，包含 12-20 個場景。只輸出 JSON，不要其他文字。`,
  };
}

export function buildContentPrompt(scene: Scene): PromptPair {
  return {
    systemPrompt: `你是課件設計師。為課程場景生成詳細的教學內容。

## 輸出格式 (JSON)

\`\`\`json
{
  "narration": "教師要念的文本（150-250字，自然口語化）",
  "content": {
    "text": "幻燈片上顯示的文字（簡潔、每行<30字）"
  }
}
\`\`\`

## 設計規則

1. **Narration**: 教師要大聲念的內容
   - 口語化、自然、親切
   - 150-250字
   - 邏輯清晰，易於理解
   
2. **Slide Content**: 視覺化呈現
   - 簡潔精煉
   - 支援Markdown格式
   - 可包含 LaTeX: \`$E=mc^2$\`
   
3. **語言**: 繁體中文，台灣國語感覺

## 要求

- 只輸出 JSON，不要其他文字
- narration 和 content.text 缺一不可`,
    userPrompt: `為以下場景生成詳細內容：

**標題**: ${scene.title}
**類型**: ${scene.type}
**要點**: 
${scene.keyPoints.map((p) => `- ${p}`).join('\n')}

請輸出 JSON 物件，包含 narration 和 content。只輸出 JSON。`,
  };
}

export function buildActionsPrompt(scene: Scene): PromptPair {
  return {
    systemPrompt: `你是互動課程設計師。根據課程內容，設計講師的動作序列。

## 動作類型

- \`agent_speech\` - 講師語音旁白
- \`whiteboard_draw\` - 繪製圖形（SVG path）
- \`whiteboard_text\` - 在白板上寫字
- \`whiteboard_shape\` - 繪製形狀（circle, rect, line）
- \`spotlight_on\` - 聚光燈效果
- \`laser_pointer\` - 激光筆
- \`slide_transition\` - 幻燈片切換
- \`element_animate\` - 元素動畫（entrance/exit）

## 輸出格式 (JSON)

\`\`\`json
{
  "actions": [
    {
      "type": "agent_speech",
      "params": { "text": "講師要說的話" },
      "delay": 0,
      "duration": 3000
    },
    {
      "type": "whiteboard_draw",
      "params": { "path": "M10,10 L100,100", "color": "#000" },
      "delay": 1000,
      "duration": 2000
    }
  ]
}
\`\`\`

## 設計規則

1. 動作按時間順序排列
2. \`delay\` - 距離上個動作的延遲（毫秒）
3. \`duration\` - 動作持續時間
4. 避免過多動作，保持清晰

## 要求

- 只輸出 JSON，不要其他文字`,
    userPrompt: `為以下場景設計動作序列：

**標題**: ${scene.title}
**旁白**: ${scene.narration || '（無旁白）'}
**要點**: ${scene.keyPoints.join(', ')}

請設計 3-5 個主要動作。只輸出 JSON 物件 \`{ "actions": [...] }\`。`,
  };
}
