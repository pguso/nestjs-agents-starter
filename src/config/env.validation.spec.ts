import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.validation.js';

describe('validateEnv', () => {
  it('requires OPENAI_API_KEY when provider is openai outside tests', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'development',
        AI_PROVIDER: 'openai',
        OPENAI_API_KEY: '',
      }),
    ).toThrow(/OPENAI_API_KEY is required/);
  });

  it('requires ANTHROPIC_API_KEY when provider is anthropic outside tests', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'development',
        AI_PROVIDER: 'anthropic',
      }),
    ).toThrow(/ANTHROPIC_API_KEY is required/);
  });

  it('accepts ollama without an API key', () => {
    const env = validateEnv({
      NODE_ENV: 'development',
      AI_PROVIDER: 'ollama',
    });

    expect(env.AI_PROVIDER).toBe('ollama');
  });

  it('rejects unknown AI_PROVIDER values', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'development',
        AI_PROVIDER: 'groq',
        OPENAI_API_KEY: 'sk-test',
      }),
    ).toThrow(/Invalid environment configuration/);
  });

  it('skips API key checks under Vitest', () => {
    const env = validateEnv({
      VITEST: 'true',
      AI_PROVIDER: 'openai',
    });

    expect(env.AI_PROVIDER).toBe('openai');
    expect(env.AUTH_MODE).toBe('dev');
  });

  it('defaults AUTH_MODE to dev', () => {
    const env = validateEnv({
      NODE_ENV: 'development',
      AI_PROVIDER: 'ollama',
    });

    expect(env.AUTH_MODE).toBe('dev');
  });
});
