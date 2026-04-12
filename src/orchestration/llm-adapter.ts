import { LanguageModel } from 'ai';
import { LLMRequest, LLMResponse } from '../types.js';

/**
 * LLM Adapter for OpenClaw integration
 * 
 * This adapter bridges teach-me-cli to OpenClaw's LLM capabilities.
 * It can work in two modes:
 * 1. Direct mode: OpenClaw calls teach-me-cli as a skill/tool
 * 2. Server mode: teach-me-cli runs as a local service
 */

export class OpenClawLLMAdapter {
  private model: LanguageModel | null = null;
  private fallbackModel: string | null = null;

  constructor(model?: LanguageModel, fallback?: string) {
    this.model = model ?? null;
    this.fallbackModel = fallback ?? null;
  }

  /**
   * Call LLM with a request
   * 
   * When used within OpenClaw context, the model will be injected.
   * When used standalone, will try to use fallback or environment-configured LLM.
   */
  async call(request: LLMRequest): Promise<LLMResponse> {
    if (!this.model && !this.fallbackModel) {
      throw new Error(
        'No LLM configured. Either inject a model or set FALLBACK_MODEL env var.\n' +
        'When called from OpenClaw, the model will be automatically injected.'
      );
    }

    try {
      if (this.model) {
        // Use injected OpenClaw model
        return await this.callWithModel(this.model, request);
      } else {
        // Fallback to environment-configured model (for standalone mode)
        return await this.callWithFallback(request);
      }
    } catch (error) {
      throw new Error(`LLM call failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async callWithModel(
    model: LanguageModel,
    request: LLMRequest
  ): Promise<LLMResponse> {
    // This would be called when model is injected by OpenClaw
    // For now, we'll use a basic implementation
    // In production, this would use the Vercel AI SDK adapter
    throw new Error('Direct model injection not yet implemented. Use fallback mode.');
  }

  private async callWithFallback(request: LLMRequest): Promise<LLMResponse> {
    // Placeholder for fallback implementation
    // This would use environment variables to configure an LLM client
    throw new Error('Fallback LLM not configured. Install @anthropic-ai/sdk and set ANTHROPIC_API_KEY.');
  }

  setModel(model: LanguageModel): void {
    this.model = model;
  }

  hasModel(): boolean {
    return this.model !== null;
  }
}

/**
 * Create a stateless LLM adapter for use in LangGraph
 */
export function createLLMAdapter(model?: LanguageModel): OpenClawLLMAdapter {
  return new OpenClawLLMAdapter(model);
}
