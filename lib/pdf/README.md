# PDF 解析系统

提供统一接口支持多种 PDF 解析提供商。

## 支持的提供商

### 1. unpdf (内置)

- **成本**: 免费，内置
- **特性**: 基础文本提取、图片提取
- **要求**: 无
- **使用**: 直接上传 PDF 文件

### 2. MinerU (自托管)

- **成本**: 免费（需要自己部署）
- **特性**:
  - 高级文本提取（保留 Markdown 布局）
  - 表格识别
  - 公式提取（LaTeX）
  - 更好的 OCR 支持
  - 多种输出格式（markdown, JSON, docx, html, latex）
- **要求**:
  - 部署 MinerU 服务（Docker 或源码）
  - 配置服务器地址
- **优势**: 数据隐私、无文件大小限制

### 3. MinerU Cloud API (官方云) ⭐ 推荐

- **成本**: 官方服务（可能免费配额或付费）
- **特性**:
  - 高级文本提取（保留 Markdown 布局）
  - 表格识别
  - 公式提取（LaTeX）
  - 更好的 OCR 支持
  - 异步任务处理（自动轮询）
- **要求**:
  - 官方 MinerU Cloud API 密钥 (https://mineru.net)
  - 无需自托管
- **优势**: 无需部署、官方支持、自动轮询完成

## 快速开始

### 申请 MinerU Cloud API 密钥 (推荐)

1. 访问 https://mineru.net
2. 注册账户并获取 API 密钥
3. 在 OpenMAIC 中配置密钥
4. 开始使用，无需部署服务器

### 部署 MinerU 本地服务 (可选)

```bash
# Docker 部署（推荐）
docker pull opendatalab/mineru:latest
docker run -d --name mineru -p 8080:8080 opendatalab/mineru:latest

# 验证
curl http://localhost:8080/api/health
```

---

## API 使用

### 使用 unpdf（文件上传）

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

### 使用 MinerU 本地服务

```typescript
const formData = new FormData();
formData.append('pdf', pdfFile);
formData.append('providerId', 'mineru');
formData.append('baseUrl', 'http://localhost:8080');

const response = await fetch('/api/parse-pdf', {
  method: 'POST',
  body: formData,
});

const result = await response.json();
// result.data: ParsedPdfContent with imageMapping
```

### 使用 MinerU Cloud API (官方云) ⭐ 推荐

```typescript
const formData = new FormData();
formData.append('pdf', pdfFile);
formData.append('providerId', 'mineru-cloud');
formData.append('apiKey', 'your_mineru_cloud_api_key_here');

const response = await fetch('/api/parse-pdf', {
  method: 'POST',
  body: formData,
});

const result = await response.json();
// result.data: ParsedPdfContent with imageMapping
// 自动轮询完成，不需要手动指定 baseUrl
```

**特点**:
- ✅ 仅需 API 密钥
- ✅ 自动轮询任务完成
- ✅ 无需部署和维护
- ✅ 官方支持
- ✅ 一致的响应格式

---

## 配置

### 三种配置方式（任选其一）

#### 1. 全局设置（推荐）

```typescript
import { useSettingsStore } from '@/lib/store/settings';

// 选项 A: 使用 Cloud API
useSettingsStore.setState({
  pdfProviderId: 'mineru-cloud',
  pdfProvidersConfig: {
    'mineru-cloud': {
      apiKey: 'your_mineru_cloud_api_key_here',
    },
  },
});

// 选项 B: 使用自托管 MinerU
useSettingsStore.setState({
  pdfProviderId: 'mineru',
  pdfProvidersConfig: {
    mineru: {
      baseUrl: 'http://localhost:8080',
    },
  },
});
```

#### 2. 会话级配置（覆盖全局设置）

```typescript
// 在 API 调用时指定
const formData = new FormData();
formData.append('pdf', pdfFile);
formData.append('providerId', 'mineru-cloud');
formData.append('apiKey', 'your_mineru_cloud_api_key_here');
```

#### 3. 环境变量配置

```bash
# .env 或 server-providers.yml
export PDF_MINERU_CLOUD_API_KEY="your_mineru_cloud_api_key_here"
```

或在 `server-providers.yml`:

```yaml
pdf:
  mineru-cloud:
    apiKey: your_mineru_cloud_api_key_here
  mineru:
    baseUrl: http://localhost:8080
```

---

## 响应格式

```typescript
interface ParsedPdfContent {
  text: string; // 提取的文本（MinerU 为 Markdown）
  images: string[]; // Base64 图片数组

  // 扩展特性（MinerU）
  tables?: Array<{
    page: number;
    data: string[][];
    caption?: string;
  }>;

  formulas?: Array<{
    page: number;
    latex: string;
    position?: { x: number; y: number; width: number; height: number };
  }>;

  layout?: Array<{
    page: number;
    type: 'title' | 'text' | 'image' | 'table' | 'formula';
    content: string;
    position?: { x: number; y: number; width: number; height: number };
  }>;

  metadata?: {
    pageCount: number;
    parser: 'unpdf' | 'mineru' | 'mineru-cloud';
    fileName?: string;
    fileSize?: number;
    processingTime?: number;
    taskId?: string; // MinerU Cloud 任务 ID

    // 用于内容生成流程（MinerU）
    imageMapping?: Record<string, string>; // img_1 -> base64 URL
    pdfImages?: Array<{
      id: string; // img_1, img_2, etc.
      src: string; // base64 data URL
      pageNumber: number; // PDF 页码
      description?: string; // 图片描述
    }>;
  };
}
```

---

## 与内容生成集成

MinerU 解析器与内容生成流程无缝集成：

```typescript
// 1. 解析 PDF
const parseResult = await parsePDF(
  {
    providerId: 'mineru-cloud',
    apiKey: process.env.PDF_MINERU_CLOUD_API_KEY,
  },
  buffer,
);

// 2. 提取数据
const pdfText = parseResult.text; // Markdown（含 img_1 引用）
const pdfImages = parseResult.metadata.pdfImages; // 图片数组
const imageMapping = parseResult.metadata.imageMapping; // 图片映射

// 3. 生成场景大纲
await generateSceneOutlinesFromRequirements(
  requirements,
  pdfText, // Markdown 内容
  pdfImages, // 带页码的图片
  aiCall,
);

// 4. 生成场景（含图片）
await buildSceneFromOutline(
  outline,
  aiCall,
  stageId,
  assignedImages, // 从 pdfImages 筛选
  imageMapping, // 用于解析 img_1 到实际 URL
);
```

## 图片处理流程

MinerU 的图片处理：

1. **提取**: PDF → MinerU → Markdown + 图片
2. **转换**: `![alt](images/img_1.png)` → `![alt](img_1)`
3. **映射**: 创建 `{ "img_1": "data:image/png;base64,..." }`
4. **生成**: AI 使用 `img_1` 引用生成幻灯片
5. **解析**: `resolveImageIds()` 替换为实际 URL
6. **渲染**: 幻灯片显示图片

---

## 选型指南

### 何时选择各个提供商？

| 场景 | 推荐 | 原因 |
| --- | --- | --- |
| 体验/hobby | Cloud API | 一键使用，无需部署 |
| 小团队 (2-100人) | Cloud API | 快速尝试，官方维护 |
| 中型团队 (100-1k人) | 考虑自托管 | 成本优化、数据隐私 |
| 大型团队 (1k+) 或生产级 | 自托管 | 完全控制、性能优化 |
| 简单 PDF（纯文本） | unpdf | 最快、最轻量 |
| 包含表格、公式 | MinerU | 高精度、保留布局 |

### 快速决策树

```
需要解析复杂 PDF（表格/公式）?
  ├─ 是 → MinerU
  │   ├─ 有服务器部署能力? → 自托管
  │   └─ 没有 → Cloud API ⭐
  │
  └─ 否 → unpdf (最快、最简单)
```

---

## 添加新的提供商

### 1. 定义提供商

`lib/pdf/types.ts`:

```typescript
export type PDFProviderId = 'unpdf' | 'mineru' | 'mineru-cloud' | 'my-provider';
```

`lib/pdf/constants.ts`:

```typescript
export const PDF_PROVIDERS = {
  'my-provider': {
    id: 'my-provider',
    name: 'My Provider',
    requiresApiKey: true,
    icon: '/logos/my-provider.svg',
    features: ['text', 'images'],
  },
};
```

### 2. 实现解析器

`lib/pdf/pdf-providers.ts`:

```typescript
async function parseWithMyProvider(
  config: PDFParserConfig,
  pdfBuffer: Buffer,
): Promise<ParsedPdfContent> {
  // 实现解析逻辑
  return {
    text: '...',
    images: [...],
    metadata: {
      pageCount: 0,
      parser: 'my-provider',
    },
  };
}
```

### 3. 添加到路由

```typescript
switch (config.providerId) {
  case 'my-provider':
    result = await parseWithMyProvider(config, pdfBuffer);
    break;
  // ...
}
```

---

## 调试工具

访问 http://localhost:3000/debug/pdf-parser 测试解析功能：

- 切换提供商（unpdf / MinerU / Cloud API）
- 上传 PDF 文件
- 配置 API 密钥或服务器地址
- 查看解析结果
- 检查图片映射

---

## 常见问题

### Q: 如何获取 MinerU Cloud API 密钥？

**A**: 
1. 访问 https://mineru.net
2. 注册账户
3. 创建 API 密钥
4. 在 OpenMAIC 中配置

### Q: Cloud API 轮询超时怎么办？

**A**: 默认超时 5 分钟。可以自定义：

```typescript
const formData = new FormData();
formData.append('pdf', pdfFile);
formData.append('providerId', 'mineru-cloud');
formData.append('apiKey', apiKey);
formData.append('pollingTimeoutMs', 600000); // 10 分钟
formData.append('pollingIntervalMs', 3000); // 轮询间隔 3 秒
```

### Q: MinerU 服务无法连接？

**A**: 检查：

```bash
# 服务状态
docker ps | grep mineru

# 网络通连
curl http://localhost:8080/api/health

# 日志
docker logs mineru
```

### Q: 图片不显示？

**A**: 确保：

1. `imageMapping` 正确传递到生成 API
2. 图片 ID 格式正确（img_1, img_2）
3. Base64 编码完整

### Q: 解析速度慢？

**A**: 优化建议：

**云 API**:
- 检查网络连接
- 查看 MinerU 官方服务状态

**自托管 MinerU**:
```bash
docker run -d \
  --name mineru \
  -p 8080:8080 \
  --memory=4g \
  --cpus=2 \
  opendatalab/mineru:latest
```

---

## 性能建议

### MinerU 并发处理

```typescript
const files = [file1, file2, file3];

const results = await Promise.all(
  files.map((file) => {
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('providerId', 'mineru-cloud');
    formData.append('apiKey', apiKey);
    return fetch('/api/parse-pdf', {
      method: 'POST',
      body: formData,
    }).then((r) => r.json());
  }),
);
```

### 结果缓存

```typescript
// 考虑缓存解析结果
const cacheKey = `pdf_${fileHash}`;
const cached = localStorage.getItem(cacheKey);
if (cached) {
  return JSON.parse(cached);
}
```

---

## 参考资源

- **MinerU GitHub**: https://github.com/opendatalab/MinerU
- **MinerU Cloud**: https://mineru.net
- **调试工具**: http://localhost:3000/debug/pdf-parser

---

**最后更新**: 2026-04-12
**模式**: 支持自托管和云 API
**状态**: 生产就绪 ⭐
