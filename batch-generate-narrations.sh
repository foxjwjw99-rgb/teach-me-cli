#!/bin/bash

set -e

SKILL_DIR="$HOME/.openclaw/workspace/skills/omnivoice-local"
REF_AUDIO="$HOME/.openclaw/workspace/voice-clones/jimmy-current-clone-reference.wav"
REF_TEXT="这是现在我们学校流行的装饰品了。"
OUTPUT_DIR="./output/demo/narrations"
STYLE="請用台灣國語的感覺說話，使用台灣繁體中文常用詞。不要香港口音，不要港式語調，不要粵語感。不要中國播報腔，不要兒化音。語氣自然、親切、口語，像台灣日常對話。"

mkdir -p "$OUTPUT_DIR"

declare -a NARRATIONS=(
  "scene_001|大家好！歡迎來到 teach-me-cli 課程生成系統介紹。你是否曾為製作課程而頭疼？寫大綱、設計幻燈片、錄音... 往往要花上好幾天。但只需一個命令就能自動完成？這就是 teach-me-cli 的魔力！"
  "scene_002|想像你是一位老師。想為學生製作微積分課程。首先寫大綱、組織知識點、製作 PowerPoint、選圖片、配語音... 每個環節都很耗時。如果內容有誤，整個流程要重新來過。"
  "scene_003|teach-me-cli 用四個階段把這一切自動化。第一階段：AI 生成大綱。第二階段：生成詳細內容。第三階段：生成講師動作。第四階段：自動配音。完整課程誕生！"
  "scene_004|首先是大綱生成。你給 teach-me-cli 主題，AI 會讀懂內容，自動生成 12 到 20 個場景。每個場景包括標題、要點、類型（講座或測驗）。整個過程只要 15 到 30 秒。"
  "scene_005|第二階段是內容生成。AI 為每個場景生成詳細內容，包括教師要念的旁白、幻燈片文字。旁白是口語化的，像真人在講。這一階段大約 30 到 60 秒。"
  "scene_006|第三階段是動作生成。AI 決定在什麼時候講師應該做什麼。講複雜公式時在白板推導。強調重點時用聚光燈。所有動作與旁白完全同步。"
  "scene_007|最後一個階段是音檔生成。teach-me-cli 呼叫本機 OmniVoice，把旁白轉成 MP3。用的是預先克隆的聲音，整個課程聲音統一。這一階段大約 30 到 45 秒。"
  "scene_008|在技術層面，teach-me-cli 使用 LangGraph 編排流程。像精密流水線，每個階段一個節點。完全無狀態，每次運行完全獨立。可輕鬆部署到雲端。"
  "scene_009|teach-me-cli 本身不需要 API key。它依賴 OpenClaw 作為大腦。可在 Telegram、Feishu 等任何平台使用。完全無縫。"
  "scene_010|生成完成後，選擇不同的導出格式。PPTX 可用 PowerPoint 編輯。JSON 包含完整結構。HTML 是網頁播放器，學生直接在瀏覽器觀看。"
  "scene_011|從點擊按鈕到得到完整課程，只需 2 到 3 分鐘。相比傳統手工製作要快 100 倍！"
  "scene_012|實際使用非常簡單。運行 npm run generate 加主題。或在 Telegram 中說 teach me about 某個主題。2 到 3 分鐘完成。"
  "scene_013|我們正處於教育 AI 革命的時代。任何人現在都可在幾分鐘內創建專業課程。下一個被你的課程改變人生的學生，可能就在等待你。"
)

echo "🎙️ 開始用狐狸克隆聲線生成 13 個場景..."
echo ""

count=0
for item in "${NARRATIONS[@]}"; do
  IFS='|' read -r scene_id narration <<< "$item"
  count=$((count + 1))
  
  output_file="$OUTPUT_DIR/${scene_id}_narration.wav"
  
  printf "[%2d/13] 生成 %s... " "$count" "$scene_id"
  
  cd "$SKILL_DIR"
  
  # 用 voice-clone.sh 調用
  bash scripts/voice-clone.sh "$REF_AUDIO" "$narration" \
    --ref-text "$REF_TEXT" \
    --instruct "female, very low pitch" \
    > /tmp/omnivoice-$$.log 2>&1 || true
  
  # 找最新生成的文件
  latest=$(ls -t workspace/.cache/omnivoice-local/out/*.wav 2>/dev/null | head -1)
  if [ -f "$latest" ]; then
    cp "$latest" "$output_file"
    size=$(du -h "$output_file" | cut -f1)
    echo "✅ ($size)"
  else
    echo "❌"
  fi
  
  cd - > /dev/null
done

echo ""
echo "============================================================"
echo "✅ 全部完成！"
echo ""
ls -lh "$OUTPUT_DIR"/ | tail -15
echo ""
echo "📊 總共 $(ls $OUTPUT_DIR/*.wav 2>/dev/null | wc -l) 個音檔"
