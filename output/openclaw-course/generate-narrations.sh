#!/bin/bash
set -e

OUT_DIR="$(pwd)/narrations"
mkdir -p "$OUT_DIR"

declare -a TEXTS=(
"大家好！歡迎來到 OpenClaw 入門課程。我們會從核心概念開始，帶你理解 OpenClaw 如何把人類任務拆成 agent、skills 與工具，接著用實務範例示範如何建立 skill、調用本地工具，最後講部署與安全性考量。本課程適合開發者與產品負責人。"
"OpenClaw 的核心是把複雜任務拆成可組合的小單位：session（會話）管理交互上下文，agent 是執行智慧任務的單位，skill 定義可重用的功能語義，tool 則是能被呼叫的外部能力。理解這些概念，是設計可靠流程的基礎。"
"OpenClaw 的運行架構包含 gateway 與多個 agent runtime。gateway 負責接收外部事件並路由，agent runtime 執行具體工作。模型與外部服務通常是可插拔的資源，skill 與 sessions 透過它們擴展能力。"
"Skill 是 OpenClaw 的主要擴展單位。每個 skill 包含實作程式碼與 SKILL.md 描述檔，後者說明能力、參數與使用方式。良好的 SKILL.md 能讓 skill 被其他人或系統自動發現與使用。"
"Tools 提供可被 skill 呼叫的外部能力，如本機 TTS、網路抓取、Shell 執行等。設計 Tool 時要明確安全邊界，並處理重試與超時。"
"OpenClaw 支援多種記憶機制，例如向量資料庫與 BM25 的混合檢索策略。設計記憶時，需考慮資料保留、加密與隱私，避免敏感資料洩露。"
"對於複雜任務，OpenClaw 使用多階段編排，把工作拆成可重試、可觀察的節點。子代理可用於隔離長時間或風險較高的運算。"
"Heartbeat 適合做輕量檢查並合併回報；Cron 適合精準排程與提醒。設計時要避免過度通知，並提供降噪策略。"
"開發 OpenClaw skill 與 agent 時，建議在本地模擬外部工具回應，並用 sessions_spawn 建立隔離測試環境。把 SKILL.md、範例請求放在版本控制中。"
"部署時可選擇容器化或在受控主機上運行。務必設計日誌與指標，並設定審計記錄以追蹤高權限操作。"
"以 Slack 或 Telegram 為接入點，OpenClaw 可以把使用者指令轉為事件，交給 agent 執行 skill，例如自動化報表或文件摘要。示範流程包括驗證、非同步任務與失敗回退。"
"可參考官方文件、ClawHub、範例專案與社群（Discord）。深入學習建議從 reusable skill、記憶策略與編排模式開始實作。"
"總結：從小型自動化開始，測試並觀察，再逐步擴展到複雜編排與記憶策略。先實作一個簡單 skill 並在本地與 CI 驗證。"
)

i=1
for txt in "${TEXTS[@]}"; do
  idx=$(printf "%03d" $i)
  aiff="/tmp/openclaw_scene_${idx}.aiff"
  wav="$OUT_DIR/scene_${idx}_narration.wav"
  echo "[$i/${#TEXTS[@]}] 生成: $wav"
  # 使用 say 產生 aiff，再用 ffmpeg 轉為 wav
  say -v "Alex" -r 150 "$txt" -o "$aiff"
  ffmpeg -y -i "$aiff" -ar 44100 -ac 1 "$wav" -loglevel error
  rm -f "$aiff"
  echo "    ✅ 已生成 $wav"
  i=$((i+1))
done

echo "全部完成："
ls -lh "$OUT_DIR"/*.wav
