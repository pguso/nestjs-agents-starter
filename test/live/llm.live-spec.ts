import { describe, expect, it } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { generateText } from 'ai';
import { ModelService } from '../../src/model/model.service.js';

const enabled = process.env.LIVE_LLM_TEST === '1';

describe.skipIf(!enabled)('live LLM smoke', () => {
  it('returns a short completion from the configured provider', async () => {
    const config = new ConfigService({
      AI_PROVIDER: process.env.AI_PROVIDER,
      AI_MODEL: process.env.AI_MODEL,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
      OLLAMA_API_KEY: process.env.OLLAMA_API_KEY,
    });

    const model = new ModelService(config).getModel();
    const result = await generateText({
      model,
      prompt: 'Reply with exactly the word pong and nothing else.',
      maxOutputTokens: 16,
    });

    expect(result.text.toLowerCase()).toMatch(/pong/);
  });
});
