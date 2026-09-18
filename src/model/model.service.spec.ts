import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { ModelService } from './model.service.js';

const createOpenAI = vi.hoisted(() =>
  vi.fn(() => vi.fn(() => ({ provider: 'mock-openai' }))),
);

const createAnthropic = vi.hoisted(() =>
  vi.fn(() => vi.fn(() => ({ provider: 'mock-anthropic' }))),
);

vi.mock('@ai-sdk/openai', () => ({ createOpenAI }));
vi.mock('@ai-sdk/anthropic', () => ({ createAnthropic }));

function configWith(values: Record<string, string | undefined>): ConfigService {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

describe('ModelService', () => {
  beforeEach(() => {
    createOpenAI.mockClear();
    createAnthropic.mockClear();
  });

  it('throws when openai is selected without an API key', () => {
    const service = new ModelService(
      configWith({ AI_PROVIDER: 'openai', OPENAI_API_KEY: undefined }),
    );

    expect(() => service.getModel()).toThrow(/OPENAI_API_KEY is required/);
  });

  it('throws when anthropic is selected without an API key', () => {
    const service = new ModelService(
      configWith({ AI_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: undefined }),
    );

    expect(() => service.getModel()).toThrow(/ANTHROPIC_API_KEY is required/);
  });

  it('creates an openai model when configured', () => {
    const service = new ModelService(
      configWith({
        AI_PROVIDER: 'openai',
        AI_MODEL: 'gpt-4.1-mini',
        OPENAI_API_KEY: 'sk-test',
      }),
    );

    expect(service.getModel()).toBeDefined();
    expect(createOpenAI).toHaveBeenCalledWith({ apiKey: 'sk-test' });
  });

  it('creates an anthropic model when configured', () => {
    const service = new ModelService(
      configWith({
        AI_PROVIDER: 'anthropic',
        AI_MODEL: 'claude-sonnet-4-5',
        ANTHROPIC_API_KEY: 'ant-test',
      }),
    );

    expect(service.getModel()).toBeDefined();
    expect(createAnthropic).toHaveBeenCalledWith({ apiKey: 'ant-test' });
  });

  it('uses the default ollama base URL when unset', () => {
    const service = new ModelService(
      configWith({
        AI_PROVIDER: 'ollama',
        AI_MODEL: 'llama3.2',
        OLLAMA_BASE_URL: undefined,
      }),
    );

    expect(service.getModel()).toBeDefined();
    expect(createOpenAI).toHaveBeenCalledWith({
      baseURL: 'http://127.0.0.1:11434/v1',
      apiKey: 'ollama',
    });
  });
});
