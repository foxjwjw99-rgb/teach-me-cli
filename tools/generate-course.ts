import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { resolveCliModel } from './cli-model-resolver';
import { createCliAiCall } from './cli-ai-call';
import {
  generateSceneOutlinesFromRequirements,
  generateSceneContent,
  applyOutlineFallbacks,
} from '../lib/generation/generation-pipeline';
import type { UserRequirements } from '../lib/types/generation';
import { createLogger } from '../lib/logger';

// 確保環境變數載入
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config();

const log = createLogger('CLI-Generator');

// 簡易版 CLI 參數解析
const args = process.argv.slice(2);
function getArg(key: string): string | undefined {
  const index = args.indexOf(key);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  return undefined;
}
function hasArg(key: string): boolean {
  return args.includes(key);
}

async function main() {
  const requirement = getArg('--requirement');
  const language = (getArg('--language') || 'zh-TW') as any;
  const modelStr = getArg('--model') || 'google:gemini-3.1-pro-preview';
  const outputPath = getArg('--output') || './output/course.json';
  const pptxPath = getArg('--pptx');

  if (!requirement) {
    console.error(
      'Usage: pnpm generate-course -- --requirement "..." [--language zh-TW] [--model google:gemini-3.1-pro-preview] [--output ./output/course.json]'
    );
    process.exit(1);
  }

  log.info(`Generating course based on requirement: "${requirement}"`);
  log.info(`Language: ${language}, Model: ${modelStr}`);

  // 1. 初始化模型與 API 呼叫函式
  const { model, modelInfo } = resolveCliModel(modelStr);
  const hasVision = !!modelInfo?.capabilities?.vision;
  const aiCall = createCliAiCall(model, hasVision);

  // 2. 準備 Stage 1 參數
  const userReqs: UserRequirements = {
    requirement,
    language,
  };

  // 3. 執行 Stage 1：生成課程大綱
  log.info('=== Stage 1: Generating Outlines ===');
  const outlinesResult = await generateSceneOutlinesFromRequirements(
    userReqs,
    undefined, // 沒有 PDF text
    undefined, // 沒有 PDF images
    aiCall,
    {
      onProgress: (p) => {
        log.info(`[Progress] ${p.statusMessage} (${p.overallProgress}%)`);
      },
    },
    {
      visionEnabled: hasVision,
      imageGenerationEnabled: false,
      videoGenerationEnabled: false,
    }
  );

  if (!outlinesResult.success || !outlinesResult.data) {
    log.error('Failed to generate outlines:', outlinesResult.error);
    process.exit(1);
  }

  const outlines = outlinesResult.data;
  log.info(`Successfully generated ${outlines.length} scene outlines.`);

  // 4. 執行 Stage 2：生成每個場景的詳細內容
  log.info('=== Stage 2: Generating Scene Content ===');
  
  let completedCount = 0;
  // 將每個 Scene 的生成包裝成 Promise 以進行並行處理（與 Web 端行為一致）
  const contentPromises = outlines.map(async (rawOutline) => {
    try {
      // 確保 Outline 有 default value
      const effectiveOutline = applyOutlineFallbacks(rawOutline, true);
      
      const content = await generateSceneContent(
        effectiveOutline,
        aiCall,
        undefined, // assignedImages
        undefined, // imageMapping
        model,     // languageModel (PBL 等場景會用到)
        hasVision,
        undefined, // generatedMediaMapping
        undefined  // agents (跳過 Actions 的話不會用到)
      );
      
      completedCount++;
      log.info(`[${completedCount}/${outlines.length}] Completed content for: ${effectiveOutline.title}`);
      
      return {
        outline: effectiveOutline,
        content,
      };
    } catch (err) {
      log.error(`Error generating content for outline: "${rawOutline.title}"`, err);
      return {
        outline: rawOutline,
        content: null,
        error: String(err),
      };
    }
  });

  const generatedScenes = await Promise.all(contentPromises);

  // 5. 組合並儲存輸出結果 JSON
  const resultObj = {
    generatedAt: new Date().toISOString(),
    requirement,
    language,
    model: modelStr,
    scenes: generatedScenes,
  };

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(resultObj, null, 2), 'utf-8');
  log.info(`✅ Course JSON structure saved to ${outputPath}`);

  // 6. 選擇性處理 PPTX
  if (pptxPath) {
    log.info(`[Notice] PPTX export path provided: ${pptxPath}.`);
    log.info(`To complete PPTX generation, please integrate with 'pptxtojson' or a compatible PPTX generator using the generated slide schema.`);
  }
}

main().catch((err) => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});
