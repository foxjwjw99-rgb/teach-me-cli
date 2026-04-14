import Anthropic from '@anthropic-ai/sdk';
import { LLMRequest, LLMResponse } from '../types.js';

/**
 * LLM Adapter for OpenClaw integration
 *
 * Works in two modes:
 * 1. Direct mode: OpenClaw calls teach-me-cli as a skill/tool
 * 2. Standalone mode: Uses ANTHROPIC_API_KEY from environment
 */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Remove lone UTF-16 surrogates from a string so it can be safely
 * serialized to JSON.  The Anthropic API rejects requests containing
 * invalid surrogate pairs (HTTP 400 "invalid high surrogate").
 */
function sanitizeText(text: string): string {
  // Replace lone high surrogates (U+D800–U+DBFF not followed by low surrogate)
  // and lone low surrogates (U+DC00–U+DFFF not preceded by high surrogate).
  return text.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '\uFFFD');
}

export class OpenClawLLMAdapter {
  private anthropic: Anthropic | null = null;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
    }
  }

  async call(request: LLMRequest): Promise<LLMResponse> {
    if (!this.anthropic) {
      throw new Error(
        'No LLM configured. Set ANTHROPIC_API_KEY in environment or .env.local.\n' +
        'When called from OpenClaw, the LLM will be automatically injected.'
      );
    }

    const messages: Anthropic.MessageParam[] = request.messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: sanitizeText(m.content),
    }));

    const model = request.model
      ?? process.env.TEACH_ME_MODEL
      ?? 'claude-opus-4-5';

    const response = await this.anthropic.messages.create({
      model,
      max_tokens: request.maxTokens ?? 4096,
      system: request.systemPrompt ? sanitizeText(request.systemPrompt) : undefined,
      messages,
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    return {
      text,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }

  async callWithRetry(request: LLMRequest, retries = 3): Promise<LLMResponse> {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await this.call(request);
      } catch (error) {
        if (attempt === retries - 1) throw error;
        const delay = Math.min(200 * Math.pow(2, attempt), 10000);
        console.warn(`⚠️  LLM call failed (attempt ${attempt + 1}/${retries}), retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
    // unreachable, but TypeScript needs it
    throw new Error('callWithRetry exhausted');
  }

  hasModel(): boolean {
    return this.anthropic !== null;
  }
}

export function createLLMAdapter(): OpenClawLLMAdapter {
  return new OpenClawLLMAdapter();
}
