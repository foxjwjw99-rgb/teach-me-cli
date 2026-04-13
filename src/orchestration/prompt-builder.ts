import type { Scene } from '../types.js';

interface PromptPair {
  systemPrompt: string;
  userPrompt: string;
}

export function buildOutlinePrompt(topic: string, content: string): PromptPair {
  return {
    systemPrompt: `你是一位多代理課程設計師，風格參考 OpenMAIC，但輸出要精準、可解析、可直接拿去渲染。

## 任務
根據主題與素材，先生成課程骨架。請不要只列標題，而是定義每個 scene 的教學意圖、互動方式與後續需要補完的資訊。

## 輸出格式
直接輸出 JSON 陣列，每個物件符合以下格式：

\`\`\`json
[
  {
    "id": "scene_001",
    "type": "slide",
    "title": "章節標題",
    "description": "這個場景要完成什麼教學目的",
    "learningObjectives": ["學生完成後能做到什麼"],
    "keyPoints": ["核心要點 1", "核心要點 2"],
    "teacherNotes": "講師帶領方式與提醒",
    "duration": 150,
    "discussion": {
      "prompt": "可選，若需要討論時提供",
      "participants": ["老師", "同學 A"],
      "expectedTakeaway": "討論收束"
    },
    "quiz": {
      "kind": "single_choice",
      "question": "若 scene type = quiz 才填",
      "options": ["A", "B", "C", "D"],
      "answer": "A",
      "explanation": "答案解析"
    },
    "interactive": {
      "format": "exercise",
      "instructions": "若 scene type = interactive 才填",
      "initialState": "起始狀態",
      "expectedOutcome": "預期結果"
    },
    "pbl": {
      "role": "若 scene type = pbl 才填",
      "challenge": "挑戰內容",
      "deliverable": "產出物",
      "milestones": ["步驟 1", "步驟 2"]
    }
  }
]
\`\`\`

## 設計規則
1. scene type 只允許：slide, quiz, interactive, pbl
2. 預設 10-16 個 scenes，做成 18-35 分鐘的課
3. 大部分是 slide，但至少在合適時加入 quiz / interactive / pbl
4. 每個 scene 都要有 description、learningObjectives、keyPoints、teacherNotes
5. discussion / quiz / interactive / pbl 只有在需要時才出現
6. 語言用繁體中文，偏台灣常用表達
7. 直接輸出 JSON，不要 markdown，不要解釋

## 品質要求
- 結構先行，內容不要過度展開
- 讓後續 renderer 可以看得出每個 scene 的差異
- 最後一個場景應是 quiz、總結，或帶行動收束的 pbl`,
    userPrompt: `請根據以下內容生成課程骨架：

主題：${topic}

參考內容：
${content.substring(0, 1800)}${content.length > 1800 ? '\n...' : ''}

請輸出有效 JSON 陣列，只輸出 JSON。`,
  };
}

export function buildContentPrompt(scene: Scene): PromptPair {
  const typeSpecificGuidance = {
    slide: `補強 slide 的講解節奏。請提供清楚的 narration、content sections、callout，以及講師備註。`,
    quiz: `把 quiz 變成真正可用的測驗。請補 question、options（若適用）、answer、explanation，並讓 narration 有帶答題節奏。`,
    interactive: `把 interactive scene 變成可操作的互動任務。請補 instructions、initialState、expectedOutcome，並加入引導學生操作的 narration。`,
    pbl: `把 pbl scene 變成可執行的小型專題任務。請補 challenge、deliverable、milestones，並讓 narration 有任務感與收束感。`,
  }[scene.type];

  return {
    systemPrompt: `你是課件設計師，負責把課程骨架補成可播放、可輸出、可教學的 scene 詳細內容。

## 任務
針對單一 scene，輸出一個 JSON 物件，內容會 merge 回原本的 scene。

## 必填方向
- narration：老師實際會說的口語稿，約 120-220 字
- teacherNotes：給講師或 renderer 的帶領提醒
- content：畫面要顯示的內容，至少包含 text 或 sections 其中一種
- 若 scene 類型需要，補 discussion / quiz / interactive / pbl
- 可補 description 與 learningObjectives，若你認為可以更好

## content 建議格式
\`\`\`json
{
  "text": "畫面摘要",
  "callout": "想特別強調的一句話",
  "sections": [
    {
      "heading": "小節標題",
      "body": "小節說明",
      "bullets": ["條列 1", "條列 2"]
    }
  ]
}
\`\`\`

## 規則
1. 只輸出 JSON 物件，不要其他文字
2. 語言用繁體中文，台灣常用語氣
3. 結構要乾淨，避免過長段落
4. quiz / interactive / pbl 請真的依 type 填內容，不要留空殼
5. 如果 scene 已有某些欄位，輸出時可以補強但不要故意推翻原意

## 本 scene 類型補充
${typeSpecificGuidance}`,
    userPrompt: `請補完以下 scene：

${JSON.stringify(scene, null, 2)}

只輸出 JSON 物件。`,
  };
}

export function buildActionsPrompt(scene: Scene): PromptPair {
  return {
    systemPrompt: `你是互動課程導演。請為單一 scene 設計可播放的 action timeline，風格參考 OpenMAIC 的講師演出，但要保持輕量、容易渲染。

## 可用動作類型
- agent_speech
- whiteboard_draw
- whiteboard_text
- whiteboard_shape
- whiteboard_chart
- whiteboard_clear
- spotlight_on
- spotlight_off
- laser_pointer
- slide_transition
- element_animate
- agent_pause
- quiz_trigger
- discussion_prompt

## 輸出格式
\`\`\`json
{
  "actions": [
    {
      "type": "agent_speech",
      "params": { "text": "講師要說的句子" },
      "delay": 0,
      "duration": 3000
    }
  ]
}
\`\`\`

## 規則
1. 只輸出 JSON
2. 依時間順序排列
3. 一般場景 3-6 個 actions 即可
4. 要和 scene type 相符
5. 如果是 quiz，應該有 quiz_trigger 或 discussion_prompt 之類的引導
6. 如果有 keyPoints 或 content sections，適合搭配 spotlight / whiteboard_text / laser_pointer
7. agent_speech.params.text 應該是 narration 的精簡片段，不要重貼整段全文`,
    userPrompt: `請為以下 scene 設計 action timeline：

${JSON.stringify(scene, null, 2)}

只輸出 {"actions": [...]}。`,
  };
}
