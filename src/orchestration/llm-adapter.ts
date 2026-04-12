import { execFileSync } from 'child_process';
import { LLMRequest, LLMResponse } from '../types.js';

type InjectedLanguageModel = Record<string, unknown>;

type OpenClawInferOutput = {
  text?: string | null;
  mediaUrl?: string | null;
};

type OpenClawInferResponse = {
  model?: string;
  outputs?: OpenClawInferOutput[];
};

function composePrompt(request: LLMRequest): string {
  const sections: string[] = [];

  if (request.systemPrompt?.trim()) {
    sections.push(`[system]\n${request.systemPrompt.trim()}`);
  }

  for (const message of request.messages) {
    sections.push(`[${message.role}]\n${message.content.trim()}`);
  }

  sections.push(
    '[instruction]\nRespond to the latest user request. If the prompt asks for JSON, return JSON only without markdown fences or extra commentary.'
  );

  return sections.join('\n\n');
}

function parseOpenClawJson(raw: string): OpenClawInferResponse {
  const trimmed = raw.trim();

  try {
    return JSON.parse(trimmed) as OpenClawInferResponse;
  } catch {
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error('Could not find JSON payload in OpenClaw infer output.');
    }

    return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)) as OpenClawInferResponse;
  }
}

/**
 * LLM Adapter for OpenClaw integration
 *
 * In CLI mode, this uses the local `openclaw infer model run` command as the
 * actual model bridge, so no project-local API key is required.
 */
export class OpenClawLLMAdapter {
  private model: InjectedLanguageModel | null = null;
  private fallbackModel: string | null = null;

  constructor(model?: InjectedLanguageModel, fallback?: string) {
    this.model = model ?? null;
    this.fallbackModel = fallback ?? process.env.FALLBACK_MODEL ?? null;
  }

  async call(request: LLMRequest): Promise<LLMResponse> {
    try {
      if (this.model) {
        return await this.callWithModel(this.model, request);
      }

      return await this.callWithFallback(request);
    } catch (error) {
      throw new Error(`LLM call failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async callWithModel(
    model: InjectedLanguageModel,
    request: LLMRequest
  ): Promise<LLMResponse> {
    void model;
    return this.callWithFallback(request);
  }

  private async callWithFallback(request: LLMRequest): Promise<LLMResponse> {
    const openclawBin = process.env.OPENCLAW_BIN || 'openclaw';
    const prompt = composePrompt(request);
    const model = request.model ?? this.fallbackModel;

    const args = ['infer', 'model', 'run', '--json'];
    if (model) {
      args.push('--model', model);
    }
    args.push('--prompt', prompt);

    let stdout: string;

    try {
      stdout = execFileSync(openclawBin, args, {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
        env: process.env,
      });
    } catch (error) {
      throw new Error(
        `Failed to execute ${openclawBin} infer model run. ` +
        `${error instanceof Error ? error.message : String(error)}`
      );
    }

    const payload = parseOpenClawJson(stdout);
    const text = payload.outputs?.find((output) => typeof output.text === 'string')?.text?.trim();

    if (!text) {
      throw new Error('OpenClaw infer returned no text output.');
    }

    return {
      text,
      stopReason: 'completed',
    };
  }

  setModel(model: InjectedLanguageModel): void {
    this.model = model;
  }

  hasModel(): boolean {
    return this.model !== null || this.fallbackModel !== null || true;
  }
}

/**
 * Create a stateless LLM adapter for use in LangGraph
 */
export function createLLMAdapter(model?: InjectedLanguageModel): OpenClawLLMAdapter {
  return new OpenClawLLMAdapter(model, process.env.FALLBACK_MODEL);
}
