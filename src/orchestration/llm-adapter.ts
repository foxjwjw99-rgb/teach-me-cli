import Anthropic from '@anthropic-ai/sdk';
import { LLMRequest, LLMResponse } from '../types.js';

/**
 * LLM Adapter for OpenClaw integration
 *
 * Priority order:
 * 1. OpenClaw gateway — when OPENCLAW_GATEWAY_TOKEN is set (called as OpenClaw skill)
 * 2. Anthropic SDK  — when ANTHROPIC_API_KEY is set (standalone mode)
 */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface OpenClawGatewayConfig {
  baseUrl: string;
  token: string;
  model: string;
}

export class OpenClawLLMAdapter {
  private anthropic: Anthropic | null = null;
  private openClaw: OpenClawGatewayConfig | null = null;

  constructor() {
    const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN;
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (gatewayToken) {
      this.openClaw = {
        baseUrl: (process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789').replace(/\/$/, ''),
        token: gatewayToken,
        model: process.env.OPENCLAW_MODEL || 'github-copilot/claude-haiku-4.5',
      };
    } else if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
    }
  }

  async call(request: LLMRequest): Promise<LLMResponse> {
    if (this.openClaw) {
      return this.callViaOpenClaw(request);
    }
    if (this.anthropic) {
      return this.callViaAnthropic(request);
    }
    throw new Error(
      'No LLM configured. Set ANTHROPIC_API_KEY in environment or .env.local.\n' +
      'When called from OpenClaw, set OPENCLAW_GATEWAY_TOKEN for automatic gateway routing.'
    );
  }

  private async callViaOpenClaw(request: LLMRequest): Promise<LLMResponse> {
    const { baseUrl, token, model } = this.openClaw!;

    const messages: Array<{ role: string; content: string }> = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    for (const m of request.messages) {
      messages.push({ role: m.role, content: m.content });
    }

    const resp = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
      }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`OpenClaw gateway error ${resp.status}: ${body}`);
    }

    const data = await resp.json() as {
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };

    return {
      text: data.choices[0].message.content,
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
      },
    };
  }

  private async callViaAnthropic(request: LLMRequest): Promise<LLMResponse> {
    const messages: Anthropic.MessageParam[] = request.messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const response = await this.anthropic!.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: request.maxTokens ?? 4096,
      system: request.systemPrompt,
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
    return this.openClaw !== null || this.anthropic !== null;
  }

  get mode(): 'openclaw' | 'anthropic' | 'none' {
    if (this.openClaw) return 'openclaw';
    if (this.anthropic) return 'anthropic';
    return 'none';
  }
}

export function createLLMAdapter(): OpenClawLLMAdapter {
  return new OpenClawLLMAdapter();
}
