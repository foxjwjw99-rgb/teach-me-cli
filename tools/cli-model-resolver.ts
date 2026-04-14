import dotenv from 'dotenv';
import path from 'path';
import { getModel, parseModelString, getProvider, type ModelWithInfo } from '../lib/ai/providers';

// 確保環境變數載入
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config();

/**
 * 解析 CLI 中的 model 字串，並自動從環境變數取得 API Key
 *
 * @param modelString 格式與 web 介面相同，ex: "google:gemini-2.5-flash"
 */
export function resolveCliModel(modelString: string): ModelWithInfo {
  const { providerId, modelId } = parseModelString(modelString);
  const provider = getProvider(providerId);

  if (!provider) {
    throw new Error(`Unknown provider: ${providerId}`);
  }

  // 根據 providerId 推導環境變數的 prefix (ex: google -> GOOGLE_API_KEY)
  const envKeyPrefix = providerId.toUpperCase().replace('-', '_');
  let apiKey = process.env[`${envKeyPrefix}_API_KEY`];

  // 處理特例 fallback
  if (!apiKey && providerId === 'google') {
    apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  }
  if (!apiKey && providerId === 'openai') {
    apiKey = process.env.OPENAI_API_KEY;
  }

  let baseUrl = process.env[`${envKeyPrefix}_BASE_URL`];
  if (!baseUrl && providerId === 'openai') {
    baseUrl = process.env.OPENAI_BASE_URL;
  }

  // 使用 lib/ai/providers.ts 內的工廠方法建立真正的 LanguageModel 實例
  return getModel({
    providerId,
    modelId,
    apiKey,
    baseUrl,
  });
}
