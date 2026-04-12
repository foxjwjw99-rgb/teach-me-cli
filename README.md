# teach-me-cli 

PPT + 語音課程生成工具

## 功能

- 📚 AI 生成課程大綱 (Claude)
- 📊 生成 PPTX 幻燈片
- 🎙️ OmniVoice 語音配音 (可選)
- 🎓 網頁播放器

## 快速開始

### 1. 安裝依賴

```bash
cd teach-me-cli
npm install
```

### 2. 配置 API Key

編輯 `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. 生成課程

```bash
# 默認主題: 微積分入門
npm run dev

# 自訂主題
npm run dev -- "教我 Python"
```

### 4. 輸出文件

```
output/
├── outline.json          # 課程大綱
├── slides.json           # 課件內容
├── [topic].pptx          # PPTX 檔案
├── narration.json        # 語音 metadata
└── narration/            # MP3 音檔
    ├── slide_001.mp3
    ├── slide_002.mp3
    └── ...
```

### 5. 播放課程

用瀏覽器打開 `public/index.html` 並用 web server 提供服務：

```bash
# 用 Python
python3 -m http.server 8000 --directory public

# 或 Node.js
npx serve public
```

然後訪問 `http://localhost:8000/index.html`

---

## 使用流程

### 生成課程

```bash
npm run dev -- "微積分入門"
```

**輸出**:
- `output/outline.json` — 大綱
- `output/slides.json` — 課件
- `output/微積分入門.pptx` — 可下載的 PPTX
- `output/narration/` — 語音檔

### 播放課程

1. 打開 `public/index.html`
2. 按「播放」🎓
3. 左側面板可以快速跳頁

---

## 技術棧

- **Outline**: Claude API (Sonnet 3.5)
- **PPTX**: pptxgenjs
- **TTS**: OmniVoice (本地)
- **播放器**: 純 HTML5 + JavaScript

---

## 開發

### 測試大綱生成

```bash
npm run test
```

生成 `output/outline.json`

### 調試

編輯 `lib/prompts.mjs` 調整提示詞

---

## 成本

- Claude API: ~0.01 USD per course (10 slides)
- OmniVoice: 本地免費

---

## 下一步

- [ ] 支援圖像生成 (DALL-E)
- [ ] 支援 PDF 匯入
- [ ] 交互式測驗
- [ ] 多語言支援
- [ ] 聲音自訂

---

Made with 🦊 by OpenClaw
