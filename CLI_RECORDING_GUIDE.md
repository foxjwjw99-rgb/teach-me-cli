# 🎬 Classroom Recording - CLI Usage Guide

## Quick Start

### 基本錄製

```bash
pnpm record --classroom math-101 --output ./video.mp4
```

### 完整範例

```bash
# 簡單錄製（預設 1920x1080, 120秒逾時）
pnpm record --classroom physics-201 --output ./output/physics.mp4

# 自訂視口（1280x720）
pnpm record --classroom english-301 --output ./video.mp4 --viewport 1280x720

# 延長逾時（5分鐘）
pnpm record --classroom history-401 --output ./history.mp4 --timeout 300000

# 詳細日誌
pnpm record --classroom math-101 --output ./video.mp4 --verbose

# 自訂基礎 URL（開發/測試用）
pnpm record --classroom demo-001 --output ./demo.mp4 --base-url http://192.168.1.100:3000
```

## 命令選項

### 必需參數

| 選項 | 縮寫 | 說明 | 範例 |
|------|------|------|------|
| `--classroom` | `-c` | 要錄製的課堂 ID | `math-101` |
| `--output` | `-o` | 輸出 MP4 檔案路徑 | `./video.mp4` |

### 可選參數

| 選項 | 縮寫 | 說明 | 預設值 | 範例 |
|------|------|------|--------|------|
| `--viewport` | `-v` | 視口尺寸 (WIDTHxHEIGHT) | `1920x1080` | `1280x720` |
| `--timeout` | `-t` | 逾時時間（毫秒） | `120000` | `300000` |
| `--base-url` | `-u` | 應用基礎 URL | `http://localhost:3000` | `http://192.168.1.1:3000` |
| `--verbose` | - | 啟用詳細日誌 | false | `--verbose` |

## 使用範例

### 場景 1: 簡單錄製

```bash
# 錄製課堂並保存到默認位置
pnpm record --classroom intro-course --output ./intro.mp4

# 結果：./intro.mp4 (1920x1080, 最多120秒)
```

### 場景 2: 小尺寸視口（移動設備預覽）

```bash
# 以手機尺寸錄製
pnpm record --classroom mobile-demo --output ./mobile.mp4 --viewport 375x667
```

### 場景 3: 長課程（延長逾時）

```bash
# 10分鐘課程
pnpm record --classroom long-lecture --output ./long.mp4 --timeout 600000

# 或更簡潔的語法
pnpm record -c long-lecture -o long.mp4 -t 600000
```

### 場景 4: 調試模式

```bash
# 詳細日誌 + 自訂基礎 URL
pnpm record \
  --classroom debug-course \
  --output ./debug.mp4 \
  --base-url http://localhost:3001 \
  --verbose
```

### 場景 5: 批次錄製（Shell 腳本）

```bash
#!/bin/bash

# 錄製多個課堂
for id in math-101 physics-201 chemistry-301; do
  echo "Recording $id..."
  pnpm record \
    --classroom "$id" \
    --output "./output/${id}.mp4" \
    --verbose
  
  if [ $? -eq 0 ]; then
    echo "✓ $id completed"
  else
    echo "✗ $id failed"
  fi
  
  # 等待 5 秒再開始下一個
  sleep 5
done

echo "All recordings finished"
```

## 輸出說明

### 成功範例

```
[RecordCLI] Starting classroom recording: math-101

[RecordCLI] ✓ Recording completed successfully
[RecordCLI] Output: ./video.mp4
[RecordCLI] Duration: 45.3s
```

### 失敗範例

```
[RecordCLI] Starting classroom recording: invalid-id

[RecordCLI] ✗ Recording failed: Classroom page failed to load (404)
```

## 常見問題

### Q: 找不到命令
**A:** 確保你已安裝依賴
```bash
pnpm install
```

### Q: 錄製卡住不動
**A:** 增加逾時時間
```bash
pnpm record --classroom <id> --output video.mp4 --timeout 300000 --verbose
```

### Q: 連接到不同的應用實例
**A:** 使用 `--base-url` 參數
```bash
pnpm record --classroom <id> --output video.mp4 --base-url http://other-server:3000
```

### Q: 文件很大
**A:** 使用較小的視口尺寸
```bash
pnpm record --classroom <id> --output video.mp4 --viewport 1280x720
```

### Q: 需要幫助
**A:** 查看完整幫助
```bash
pnpm record --help
```

## 進階用法

### 環境變數

```bash
# 設定默認基礎 URL
export OPENMAIC_BASE_URL=http://production-server:3000

# 設定默認逾時
export RECORDING_TIMEOUT=300000
```

### 與其他工具整合

**與 ffmpeg 合併音頻（未來）**
```bash
pnpm record --classroom math-101 --output temp.mp4
ffmpeg -i temp.mp4 -i audio.mp3 -c:v copy -c:a aac final.mp4
```

**上傳到雲端**
```bash
pnpm record --classroom math-101 --output temp.mp4 && \
aws s3 cp temp.mp4 s3://my-bucket/classroom-recordings/
```

## 性能提示

- **最快**: 使用 16:9 縱橫比（1920x1080 或 1280x720）
- **平衡**: 1280x720 視口 + 120秒逾時
- **詳細**: 啟用 `--verbose` 只在調試時使用

## 故障排除

### 檢查清單

1. ✓ 應用在 http://localhost:3000 上運行
   ```bash
   curl http://localhost:3000
   ```

2. ✓ 課堂 ID 有效
   ```bash
   # 在應用中查看 URL 欄位
   ```

3. ✓ 輸出目錄可寫
   ```bash
   mkdir -p ./output && touch ./output/test.mp4
   ```

4. ✓ Playwright Chromium 已安裝
   ```bash
   npx playwright install
   ```

## 下一步

- 查看 [packages/classroom-recorder/README.md](../packages/classroom-recorder/README.md) 了解 API
- 查看 [RECORDING_IMPLEMENTATION_PLAN.md](./RECORDING_IMPLEMENTATION_PLAN.md) 了解設計
- 檢查 [packages/classroom-recorder/examples/](../packages/classroom-recorder/examples/) 了解更多範例

---

**記錄你的課堂，分享知識！** 🎬
