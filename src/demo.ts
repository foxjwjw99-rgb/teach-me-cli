import type { Classroom } from '../types.js';
import { nanoid } from 'nanoid';

/**
 * Demo: Generate a course about teach-me-cli itself
 * This showcases the architecture and principles
 */

export function generateTeachMeCliDemoCourse(): Classroom {
  return {
    id: `course_${nanoid()}`,
    title: 'teach-me-cli 課程生成系統的原理與架構',
    topic: 'teach-me-cli 課程生成系統',
    description: '學習如何用 teach-me-cli 一鍵生成專業課程。涵蓋 4 階段編排、LangGraph 原理、OmniVoice 配音、多格式導出。',
    scenes: [
      {
        id: 'scene_001',
        type: 'slide',
        title: '歡迎來到課程生成的世界',
        keyPoints: [
          '傳統課程製作耗時冗長',
          'teach-me-cli 一鍵生成專業課程',
          '今天你將學會背後的原理',
        ],
        narration:
          '大家好！歡迎來到 teach-me-cli 課程生成系統介紹。你是否曾為製作課程而頭疼？寫大綱、設計幻燈片、錄音、調整效果... 往往要花上好幾天。但如果告訴你只需一個命令就能自動完成呢？這就是 teach-me-cli 的魔力。今天我們一起探索它如何在 2-3 分鐘內把任何主題變成專業課程。',
        actions: [
          {
            type: 'agent_speech',
            params: {
              text: '大家好！歡迎來到 teach-me-cli 課程生成系統介紹。',
            },
            delay: 0,
            duration: 3000,
          },
          {
            type: 'spotlight_on',
            params: { x: 50, y: 50, radius: 30 },
            delay: 2000,
            duration: 3000,
          },
        ],
        duration: 180,
      },

      {
        id: 'scene_002',
        type: 'slide',
        title: '問題：傳統課程製作的瓶頸',
        keyPoints: [
          '需要懂教學設計、內容寫作、視覺設計',
          '每個步驟都需要專門工具和技能',
          '修改一點內容就要重新製作',
          '成本高、週期長、難以迭代',
        ],
        narration:
          '想像你是一位老師。你想為學生製作一堂微積分課程。首先你要寫大綱、組織知識點、製作 PowerPoint、選擇合適的圖片、配上語音旁白、調整效果... 每個環節都很耗時。如果內容有誤需要修改，整個流程要重新來過。這就是傳統課程製作的困境。',
        actions: [
          {
            type: 'whiteboard_text',
            params: { text: '傳統流程', x: 20, y: 20 },
            delay: 0,
            duration: 2000,
          },
          {
            type: 'whiteboard_draw',
            params: {
              path: 'M30,40 L70,40 L70,100 L30,100 Z',
              color: '#FF6B6B',
            },
            delay: 1000,
            duration: 2000,
          },
        ],
        duration: 180,
      },

      {
        id: 'scene_003',
        type: 'slide',
        title: '解決方案：teach-me-cli 的 4 階段魔術',
        keyPoints: [
          'Stage 1️⃣: 大綱生成 — AI 自動結構化',
          'Stage 2️⃣: 內容生成 — 每個場景詳細說明',
          'Stage 3️⃣: 動作生成 — 白板、特效、旁白',
          'Stage 4️⃣: 音檔生成 — OmniVoice 自動配音',
        ],
        narration:
          '解決方案來了！teach-me-cli 用四個階段把這一切自動化。第一階段：AI 讀懂你的主題，自動生成課程大綱。第二階段：為每個大綱項目生成詳細內容、要點、旁白。第三階段：生成講師動作——什麼時候畫圖、什麼時候用聚光燈、什麼時候播放特效。第四階段：用 OmniVoice 自動生成高質量語音旁白。就這樣，完整的課程誕生了。',
        actions: [
          {
            type: 'slide_transition',
            params: { type: 'fade' },
            delay: 0,
            duration: 1000,
          },
          {
            type: 'element_animate',
            params: { type: 'entrance', effect: 'slideInLeft' },
            delay: 500,
            duration: 1500,
          },
        ],
        duration: 240,
      },

      {
        id: 'scene_004',
        type: 'slide',
        title: 'Stage 1️⃣: 大綱生成 — AI 當課程設計師',
        keyPoints: [
          '你提供主題和內容',
          'Claude/GPT/Gemini AI 分析',
          '自動生成 12-20 個場景',
          '每個場景有標題、要點、類型',
        ],
        narration:
          '讓我們深入每一個階段。首先是大綱生成。你給 teach-me-cli 一個主題，比如「微積分入門」或上傳一份文檔。AI 會讀懂內容，思考如何最好地組織這些知識。然後自動生成 12 到 20 個場景。每個場景包括標題、三到五個核心要點、場景類型（講座還是測驗）。整個過程只要 15-30 秒。',
        actions: [
          {
            type: 'whiteboard_text',
            params: { text: '輸入：主題', x: 10, y: 20 },
            delay: 500,
            duration: 2000,
          },
          {
            type: 'whiteboard_draw',
            params: { path: 'M50,30 L50,80', color: '#4A90E2' },
            delay: 2500,
            duration: 1500,
          },
          {
            type: 'whiteboard_text',
            params: { text: '輸出：大綱', x: 55, y: 20 },
            delay: 4000,
            duration: 2000,
          },
        ],
        duration: 180,
      },

      {
        id: 'scene_005',
        type: 'slide',
        title: 'Stage 2️⃣: 內容生成 — 為每個場景補充血肉',
        keyPoints: [
          '每個場景生成詳細旁白（150-250 字）',
          '自動編寫易於理解的說明',
          '支援 Markdown、LaTeX 公式',
          '並行生成，提高效率',
        ],
        narration:
          '第二階段是內容生成。這次 AI 為每一個大綱場景生成詳細內容。包括教師要念的旁白、幻燈片上顯示的文字、關鍵公式等。旁白是口語化的，就像真的老師在講話。這些內容都是根據大綱並行生成的，所以速度很快。這一階段大約需要 30-60 秒。',
        actions: [
          {
            type: 'agent_speech',
            params: {
              text: '為每個場景生成詳細內容...',
            },
            delay: 0,
            duration: 3000,
          },
        ],
        duration: 180,
      },

      {
        id: 'scene_006',
        type: 'slide',
        title: 'Stage 3️⃣: 動作生成 — 白板、特效、聚光燈',
        keyPoints: [
          '生成 28+ 種講師動作序列',
          '白板繪圖：用 SVG path 描述筆跡',
          '視覺效果：聚光燈、激光筆、轉場',
          '動作與旁白同步，製造沉浸感',
        ],
        narration:
          '第三階段是動作生成。AI 決定在什麼時候講師應該做什麼。比如在講複雜公式時，講師可能會在白板上一步步推導。在強調重點時，用聚光燈照亮重要區域。動作和旁白完全同步，創造出真實的教學氛圍。這包括 28 種以上的動作類型。',
        actions: [
          {
            type: 'whiteboard_draw',
            params: {
              path: 'M20,60 Q50,20 80,60',
              color: '#E74C3C',
            },
            delay: 0,
            duration: 2000,
          },
          {
            type: 'spotlight_on',
            params: { x: 50, y: 50, radius: 25 },
            delay: 2000,
            duration: 2000,
          },
        ],
        duration: 180,
      },

      {
        id: 'scene_007',
        type: 'slide',
        title: 'Stage 4️⃣: 音檔生成 — OmniVoice 配音',
        keyPoints: [
          '呼叫本機 OmniVoice TTS',
          '使用固定克隆聲線（我的聲音！）',
          '台灣國語風格，自然親切',
          '並行生成，每個場景 1-2 秒',
        ],
        narration:
          '最後一個階段是音檔生成。teach-me-cli 會呼叫本機安裝的 OmniVoice，把每個場景的旁白轉成 MP3 音檔。這裡用的是預先克隆好的聲音，確保整個課程聲音統一、自然。用的是台灣國語風格，聽起來就像真人在講課。這一階段大約 30-45 秒。',
        actions: [
          {
            type: 'agent_speech',
            params: {
              text: '正在生成音檔...',
            },
            delay: 0,
            duration: 2000,
          },
        ],
        duration: 180,
      },

      {
        id: 'scene_008',
        type: 'slide',
        title: '架構：LangGraph 無狀態編排',
        keyPoints: [
          'LangGraph 是流程編排框架',
          '4 個節點：init → outline → content → actions → finalize',
          '完全無狀態（stateless）',
          '適合 Serverless、雲端部署',
        ],
        narration:
          '在技術層面上，teach-me-cli 使用 LangGraph 來編排整個流程。LangGraph 像是一個精密的流水線，每個階段都是一個節點。從初始化、生成大綱、生成內容、生成動作、到最後的整合。整個過程完全無狀態，意思是每次運行都完全獨立。這樣設計的好處是可以輕鬆部署到雲端，成百上千的課程可以並行生成。',
        actions: [
          {
            type: 'whiteboard_draw',
            params: {
              path: 'M10,50 L30,50 M30,50 L50,50 M50,50 L70,50 M70,50 L90,50',
              color: '#27AE60',
            },
            delay: 0,
            duration: 3000,
          },
        ],
        duration: 180,
      },

      {
        id: 'scene_009',
        type: 'slide',
        title: '集成：OpenClaw 是大腦',
        keyPoints: [
          'teach-me-cli 自己不持有 API key',
          'OpenClaw 提供 LLM 模型（Claude、GPT、Gemini）',
          '可以在 Telegram、Feishu 中直接使用',
          '完全無縫集成',
        ],
        narration:
          '這裡的巧妙之處是 teach-me-cli 本身不需要 API key。它依賴 OpenClaw 作為大腦。OpenClaw 是一個個人 AI 助手，已經配置了各種 LLM 模型。當 teach-me-cli 需要 AI 力量時，它直接向 OpenClaw 要。這樣的好處是 teach-me-cli 可以在 Telegram、Feishu 等任何 OpenClaw 支持的平台使用，完全無縫。',
        actions: [
          {
            type: 'whiteboard_text',
            params: { text: 'teach-me-cli', x: 20, y: 40 },
            delay: 0,
            duration: 2000,
          },
          {
            type: 'whiteboard_draw',
            params: { path: 'M40,50 L60,50', color: '#8E44AD' },
            delay: 1000,
            duration: 1500,
          },
          {
            type: 'whiteboard_text',
            params: { text: 'OpenClaw 🦊', x: 62, y: 40 },
            delay: 2500,
            duration: 2000,
          },
        ],
        duration: 180,
      },

      {
        id: 'scene_010',
        type: 'slide',
        title: '多格式導出：選你所需',
        keyPoints: [
          '📊 PPTX — 編輯用，可用 PowerPoint 修改',
          '📄 JSON — 完整課程結構，機器可讀',
          '🌐 HTML — 互動式網頁播放器',
        ],
        narration:
          '生成完成後，你可以選擇不同的導出格式。PPTX 格式可以用 PowerPoint 繼續編輯，非常靈活。JSON 格式包含完整的課程結構，可以被其他工具讀取、播放或進一步處理。HTML 格式是一個完整的網頁播放器，你可以分享給學生，他們直接在瀏覽器中觀看，包括自動播放和音檔同步。',
        actions: [
          {
            type: 'element_animate',
            params: { type: 'entrance', effect: 'fadeIn' },
            delay: 0,
            duration: 2000,
          },
        ],
        duration: 180,
      },

      {
        id: 'scene_011',
        type: 'quiz',
        title: '小測驗：你學會了嗎？',
        keyPoints: [
          '複習 4 個生成階段',
          '測試你對架構的理解',
          '確保掌握了核心概念',
        ],
        narration:
          '現在讓我們通過小測驗來檢驗一下你的學習成果。我會問三個問題，考驗你對 teach-me-cli 原理的理解。',
        duration: 120,
      },

      {
        id: 'scene_012',
        type: 'slide',
        title: '實戰：如何使用 teach-me-cli',
        keyPoints: [
          '命令行模式：npm run generate "主題"',
          'OpenClaw 模式：@狐狸 teach me about X',
          '支持 PDF、Markdown、純文本輸入',
          '2-3 分鐘內得到完整課程',
        ],
        narration:
          '實際使用非常簡單。如果你在自己電腦上，只需要運行一個命令：npm run generate 加上你的主題。比如 npm run generate "機器學習"，就會開始生成。或者如果你用 OpenClaw，直接在 Telegram 或 Feishu 中說，teach me about blockchain，它會自動調用 teach-me-cli 為你生成課程。整個過程 2 到 3 分鐘完成。',
        actions: [
          {
            type: 'whiteboard_text',
            params: {
              text: 'npm run generate "主題"',
              x: 20,
              y: 50,
            },
            delay: 0,
            duration: 3000,
          },
        ],
        duration: 180,
      },

      {
        id: 'scene_013',
        type: 'slide',
        title: '性能：從按鈕到課程',
        keyPoints: [
          '初始化：1-2 秒',
          '大綱生成：15-30 秒',
          '內容生成：30-60 秒',
          '動作 + 音檔：40-65 秒',
          '總計：2-3 分鐘完整課程',
        ],
        narration:
          '你知道嗎？從點擊按鈕到得到一份完整的課程，只需要 2 到 3 分鐘。初始化大概 1 到 2 秒。大綱生成用 15 到 30 秒。內容生成用 30 到 60 秒，這是最長的因為要為每個場景生成內容。動作和音檔生成用 40 到 65 秒。所以總共 2 到 3 分鐘。相比傳統的手工製作要快 100 倍！',
        actions: [
          {
            type: 'whiteboard_chart',
            params: {
              type: 'bar',
              data: [
                { label: '初始化', value: 1.5 },
                { label: '大綱', value: 22 },
                { label: '內容', value: 45 },
                { label: '動作+音檔', value: 52 },
              ],
            },
            delay: 0,
            duration: 3000,
          },
        ],
        duration: 180,
      },

      {
        id: 'scene_014',
        type: 'slide',
        title: '技術棧：現代 AI 工程',
        keyPoints: [
          'LangGraph — 編排引擎',
          'TypeScript — 類型安全',
          'OmniVoice — 本機 TTS',
          'pptxgenjs — PowerPoint 生成',
          'OpenClaw — LLM 提供者',
        ],
        narration:
          '在技術選型上，teach-me-cli 採用了最佳實踐。LangGraph 用來編排流程。TypeScript 確保代碼質量和安全性。OmniVoice 提供本機文字轉語音，不需要依賴外部 API。pptxgenjs 用來生成 PowerPoint 文件。整個系統建立在 OpenClaw 的 LLM 支持之上。這些技術的組合形成了一個高效、可靠的課程生成引擎。',
        actions: [
          {
            type: 'agent_speech',
            params: { text: '現代 AI 工程的完美結合' },
            delay: 0,
            duration: 2000,
          },
        ],
        duration: 180,
      },

      {
        id: 'scene_015',
        type: 'slide',
        title: '未來展望：課程 AI 的可能性',
        keyPoints: [
          '✨ 支持圖像生成（DALL-E 等）',
          '📊 互動式測驗和遊戲化學習',
          '🌍 多語言自動翻譯',
          '📱 移動應用適配',
          '🎨 自訂主題和風格',
        ],
        narration:
          '展望未來，teach-me-cli 的潛力是無限的。我們可以加入圖像生成，為每個主題自動生成相關的圖片。可以支援互動式測驗，學生邊學邊練。支援多語言翻譯，讓全世界的人都能學習。開發移動應用，讓課程隨處可得。甚至支援自訂主題和風格，讓每個課程都獨一無二。AI 驅動的教育正在改變世界。',
        actions: [
          {
            type: 'slide_transition',
            params: { type: 'zoom' },
            delay: 0,
            duration: 1500,
          },
        ],
        duration: 180,
      },

      {
        id: 'scene_016',
        type: 'slide',
        title: '結語：AI 教育的新時代',
        keyPoints: [
          '教育不再是稀缺資源',
          '任何人都可以成為課程設計師',
          '質量好、速度快、成本低',
          '現在就開始，教世界學習',
        ],
        narration:
          '我們正處於教育 AI 革命的時代。曾經，製作高質量課程只有大機構和專業團隊才能做到。現在，任何人拿起 teach-me-cli，就可以在幾分鐘內創建一份專業課程。這民主化了教育。無論你是老師、培訓師、還是知識愛好者，你現在都有力量在全世界分享你的知識。那麼，為什麼不現在就開始呢？下一個被你的課程改變人生的學生，可能就在等待你。',
        actions: [
          {
            type: 'agent_speech',
            params: {
              text: 'AI 教育的新時代已經開始。現在就開始，教世界學習。',
            },
            delay: 0,
            duration: 4000,
          },
          {
            type: 'spotlight_on',
            params: { x: 50, y: 50, radius: 40 },
            delay: 2000,
            duration: 3000,
          },
        ],
        duration: 240,
      },
    ],
    metadata: {
      generatedAt: new Date().toISOString(),
      totalDuration: 2880, // 48 minutes
    },
  };
}
