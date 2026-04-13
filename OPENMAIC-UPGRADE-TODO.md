# OpenMAIC 對齊優化代辦

建立時間：2026-04-13 04:53 (Asia/Taipei)

## 目標
把 teach-me-cli 從「OpenMAIC-inspired」往更接近 OpenMAIC 的方向升級，分三條線同時收斂：

1. Scene 結構升級
2. Renderer / Export 升級
3. 生成流程升級

## Phase 1, Scene 結構升級
- [x] 為 `slide / quiz / interactive / pbl` 補上更明確的 scene-specific schema
- [x] 補 `description`, `learningObjectives`, `teacherNotes`, `discussion`, `quiz`, `interactive`, `pbl` 等欄位
- [x] 讓 outline 階段就先輸出 scene intent，不只是一組標題和 keyPoints
- [x] 保持舊資料結構相容，避免 export 全面炸掉

## Phase 2, Renderer / Export 升級
- [x] HTML renderer 支援更多 scene type 的顯示
- [x] HTML renderer 顯示 actions timeline / whiteboard / discussion cues
- [x] HTML renderer 顯示 narration / teacher notes / interaction blocks
- [x] PPTX export 改善資訊層級，而不是只列 bullet points
- [x] MP4 export 至少能吃 scene-specific 內容與 narration，視覺上更像完整課件

## Phase 3, 生成流程升級
- [x] outline prompt 改成先定義課程骨架與 scene intent
- [x] content prompt 依 scene type 分流
- [x] actions prompt 更貼近 OpenMAIC 的講師行為設計
- [x] director graph 升級為 outline → scene detail → actions → finalize
- [x] 補 fallback 與 parse 容錯，避免一段壞掉整批失敗

## 驗收
- [x] `npm run build` 通過
- [x] 生成一份 JSON-only / fast 課程驗證新 schema
- [x] 生成一份 HTML 驗證 renderer
- [x] 如果 ffmpeg 可用，驗證 MP4 export

## 備註
- 目前工作樹已有未提交變更，修改時要避免覆蓋既有內容
- 分支目前已和 upstream 同步 (`0 0`)
- 已額外補一個實務優化：若機器上找不到 `omnivoice-local`，現在會直接略過音訊生成，不再逐 scene 連續噴錯
- 驗證輸出：
  - `output/openmaic-upgrade-check/`
  - `output/openmaic-audio-check/`
  - `output/openmaic-mp4-check/`
- MP4 已完成實測；這台機器的 ffmpeg 缺少 `drawtext` filter，所以額外補了 plain-color fallback，避免整個 export 失敗
