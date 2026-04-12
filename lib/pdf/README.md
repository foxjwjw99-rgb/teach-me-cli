# PDF 解析系统

OpenMAIC 目前採用 **內建 PDF parser（unpdf）** 作為預設且唯一的產品級 PDF 解析方案。

這樣做的目標很單純：

- 不需要額外本地服務
- 不需要自架 PDF 解析器
- 不需要額外 API Key
- Hosted / zero-setup 體驗更穩定

## 目前行為

### 內建 parser（unpdf）

- **成本**：免費，內建
- **特性**：基礎文字提取、圖片提取、基本 metadata
- **要求**：無
- **使用方式**：直接上傳 PDF 即可

## 範例

```typescript
const formData = new FormData();
formData.append('pdf', pdfFile);
formData.append('providerId', 'unpdf');

const response = await fetch('/api/parse-pdf', {
  method: 'POST',
  body: formData,
});

const result = await response.json();
// result.data: ParsedPdfContent
```

## 設定

設定層預設如下：

```typescript
{
  pdfProviderId: 'unpdf',
  pdfProvidersConfig: {
    unpdf: {
      apiKey: '',
      baseUrl: '',
      enabled: true,
    },
  },
}
```

## ParsedPdfContent 重點

回傳內容仍然維持統一格式：

```typescript
interface ParsedPdfContent {
  text: string;
  images?: string[];
  metadata?: {
    pageCount?: number;
    parser?: string;
    processingTime?: number;
    imageMapping?: Record<string, string>;
    pdfImages?: Array<{
      id: string;
      src: string;
      pageNumber: number;
      width?: number;
      height?: number;
    }>;
  };
}
```

## 設計說明

如果未來要重新加入其他 PDF provider，建議先確認：

1. 不會破壞 hosted 預設流程
2. 不會把本地部署 / 自架需求暴露成一般使用者預設路徑
3. UI、設定、文件要一起更新，避免出現「選得到但其實不能順用」的情況
