import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

export type AiProvider = 'openai' | 'anthropic' | 'ollama';

@Injectable()
export class ModelService {
  constructor(private readonly config: ConfigService) {}

  getModel(): LanguageModel {
    const provider = (
      this.config.get<string>('AI_PROVIDER') ?? 'openai'
    ).toLowerCase() as AiProvider;
    const modelId =
      this.config.get<string>('AI_MODEL') ?? this.defaultModel(provider);

    switch (provider) {
      case 'anthropic': {
        const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
        if (!apiKey) {
          throw new Error(
            'ANTHROPIC_API_KEY is required when AI_PROVIDER=anthropic',
          );
        }
        return createAnthropic({ apiKey })(modelId);
      }
      case 'ollama': {
        const baseURL =
          this.config.get<string>('OLLAMA_BASE_URL') ??
          'http://127.0.0.1:11434/v1';
        return createOpenAI({
          baseURL,
          apiKey: this.config.get<string>('OLLAMA_API_KEY') ?? 'ollama',
        })(modelId);
      }
      case 'openai':
      default: {
        const apiKey = this.config.get<string>('OPENAI_API_KEY');
        if (!apiKey) {
          throw new Error('OPENAI_API_KEY is required when AI_PROVIDER=openai');
        }
        return createOpenAI({ apiKey })(modelId);
      }
    }
  }

  private defaultModel(provider: AiProvider): string {
    switch (provider) {
      case 'anthropic':
        return 'claude-sonnet-4-5';
      case 'ollama':
        return 'llama3.2';
      default:
        return 'gpt-4.1-mini';
    }
  }
}
