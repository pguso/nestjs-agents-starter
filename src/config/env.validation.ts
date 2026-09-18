import { z } from 'zod';

const aiProviderSchema = z.enum(['openai', 'anthropic', 'ollama']);
const authModeSchema = z.enum(['dev', 'jwt']);

/**
 * Validates process env at boot via ConfigModule.
 * API key requirements are skipped under Vitest so unit/e2e can mock ModelService.
 */
export function validateEnv(config: Record<string, unknown>) {
  const isTest =
    config.NODE_ENV === 'test' ||
    config.VITEST === 'true' ||
    config.VITEST === true;

  const baseSchema = z
    .object({
      NODE_ENV: z.string().optional(),
      PORT: z.string().optional(),
      AI_PROVIDER: aiProviderSchema.default('openai'),
      AI_MODEL: z.string().optional(),
      OPENAI_API_KEY: z.string().optional(),
      ANTHROPIC_API_KEY: z.string().optional(),
      OLLAMA_BASE_URL: z.string().optional(),
      OLLAMA_API_KEY: z.string().optional(),
      AUTH_MODE: authModeSchema.default('dev'),
      CORS_ORIGINS: z.string().optional(),
      BODY_SIZE_LIMIT: z.string().optional(),
      THROTTLE_TTL_MS: z.string().optional(),
      THROTTLE_LIMIT: z.string().optional(),
      AGENT_METRICS_LOG: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (isTest) {
        return;
      }

      if (data.AI_PROVIDER === 'openai' && !data.OPENAI_API_KEY?.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['OPENAI_API_KEY'],
          message:
            'OPENAI_API_KEY is required when AI_PROVIDER=openai. Set it in .env or switch AI_PROVIDER to ollama.',
        });
      }

      if (data.AI_PROVIDER === 'anthropic' && !data.ANTHROPIC_API_KEY?.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['ANTHROPIC_API_KEY'],
          message:
            'ANTHROPIC_API_KEY is required when AI_PROVIDER=anthropic. Set it in .env or switch AI_PROVIDER.',
        });
      }
    });

  const result = baseSchema.safeParse(config);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  return result.data;
}

export type AppEnv = ReturnType<typeof validateEnv>;
