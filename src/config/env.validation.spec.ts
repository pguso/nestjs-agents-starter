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

  it('rejects AUTH_MODE=dev when NODE_ENV=production', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'production',
        AI_PROVIDER: 'ollama',
        AUTH_MODE: 'dev',
      }),
    ).toThrow(/AUTH_MODE=dev is not allowed when NODE_ENV=production/);
  });

  it('rejects AUTH_MODE=jwt-stub when NODE_ENV=production', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'production',
        AI_PROVIDER: 'ollama',
        AUTH_MODE: 'jwt-stub',
      }),
    ).toThrow(/AUTH_MODE=jwt-stub is not allowed when NODE_ENV=production/);
  });

  it('rejects default AUTH_MODE=dev when NODE_ENV=production', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'production',
        AI_PROVIDER: 'ollama',
      }),
    ).toThrow(/AUTH_MODE=dev is not allowed when NODE_ENV=production/);
  });

  it('requires JWT_SECRET when AUTH_MODE=jwt', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'development',
        AI_PROVIDER: 'ollama',
        AUTH_MODE: 'jwt',
      }),
    ).toThrow(/JWT_SECRET is required when AUTH_MODE=jwt/);
  });

  it('allows AUTH_MODE=jwt with JWT_SECRET when NODE_ENV=production', () => {
    const env = validateEnv({
      NODE_ENV: 'production',
      AI_PROVIDER: 'ollama',
      AUTH_MODE: 'jwt',
      JWT_SECRET: 'production-secret-at-least-32-chars!',
    });

    expect(env.AUTH_MODE).toBe('jwt');
    expect(env.JWT_SECRET).toBe('production-secret-at-least-32-chars!');
  });

  it('rejects legacy AUTH_MODE=jwt without treating it as the unsigned stub', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'development',
        AI_PROVIDER: 'ollama',
        AUTH_MODE: 'jwt',
      }),
    ).toThrow(/JWT_SECRET is required/);
  });
});
