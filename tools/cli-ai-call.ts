import type { LanguageModel } from 'ai';
import { callLLM } from '../lib/ai/llm';
import type { AICallFn } from '../lib/generation/pipeline-types';
import { buildVisionUserContent } from '../lib/generation/prompt-formatters';

/**
 * 建立可以在 CLI 環境執行的 aiCall 函式
 * 封裝了對 callLLM 的底層呼叫，相容於 pipeline-runner 所需的 AICallFn
 */
export function createCliAiCall(model: LanguageModel, hasVision: boolean): AICallFn {
  return async (
    systemPrompt: string,
    userPrompt: string,
    images?: Array<{ id: string; src: string }>
  ) => {
    // 如果有圖片並且模型支援 Vision，使用 vision 結構
    if (images && images.length > 0 && hasVision) {
      const result = await callLLM(
        {
          model,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: buildVisionUserContent(userPrompt, images),
            },
          ],
        },
        'cli-generation'
      );
      return result.text;
    }

    // 純文字呼叫
    const result = await callLLM(
      {
        model,
        system: systemPrompt,
        prompt: userPrompt,
      },
      'cli-generation'
    );
    return result.text;
  };
}
