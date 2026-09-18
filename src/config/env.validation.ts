import { z } from 'zod';

const aiProviderSchema = z.enum(['openai', 'anthropic', 'ollama']);
const authModeSchema = z.enum(['dev', 'jwt-stub', 'jwt']);
const stubAuthModes = new Set(['dev', 'jwt-stub']);
/** Stub auth is only permitted in these NODE_ENV values (plus Vitest). */
const localStubEnvs = new Set(['development', 'test']);
/** HS256 shared secret floor - rejects trivial values like "secret". */
export const MIN_JWT_SECRET_LENGTH = 32;

function truthyEnv(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

/**
 * Validates process env at boot via ConfigModule.
 * API key requirements are skipped under Vitest so unit/e2e can mock ModelService.
 * Stub auth (dev / jwt-stub) always needs ALLOW_INSECURE_AUTH outside tests.
 */
export function validateEnv(config: Record<string, unknown>) {
  const isTest =
    config.NODE_ENV === 'test' ||
    config.VITEST === 'true' ||
    config.VITEST === true;

  const baseSchema = z
    .object({
      NODE_ENV: z.string().optional(),
      HOST: z.string().optional(),
      PORT: z.string().optional(),
      AI_PROVIDER: aiProviderSchema.default('openai'),
      AI_MODEL: z.string().optional(),
      OPENAI_API_KEY: z.string().optional(),
      ANTHROPIC_API_KEY: z.string().optional(),
      OLLAMA_BASE_URL: z.string().optional(),
      OLLAMA_API_KEY: z.string().optional(),
      AUTH_MODE: authModeSchema.default('dev'),
      ALLOW_INSECURE_AUTH: z.string().optional(),
      JWT_SECRET: z.string().optional(),
      JWT_ISSUER: z.string().optional(),
      JWT_AUDIENCE: z.string().optional(),
      CORS_ORIGINS: z.string().optional(),
      BODY_SIZE_LIMIT: z.string().optional(),
      THROTTLE_TTL_MS: z.string().optional(),
      THROTTLE_LIMIT: z.string().optional(),
      AGENT_METRICS_LOG: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (stubAuthModes.has(data.AUTH_MODE)) {
        if (data.NODE_ENV === 'production') {
          ctx.addIssue({
            code: 'custom',
            path: ['AUTH_MODE'],
            message: `AUTH_MODE=${data.AUTH_MODE} is not allowed when NODE_ENV=production (insecure stub). Set AUTH_MODE=jwt and JWT_SECRET (optionally JWT_ISSUER / JWT_AUDIENCE).`,
          });
        } else if (!isTest) {
          if (!truthyEnv(data.ALLOW_INSECURE_AUTH)) {
            ctx.addIssue({
              code: 'custom',
              path: ['ALLOW_INSECURE_AUTH'],
              message: `AUTH_MODE=${data.AUTH_MODE} requires ALLOW_INSECURE_AUTH=true (explicit local opt-in). Never set this in deployed environments - use AUTH_MODE=jwt and JWT_SECRET instead.`,
            });
          }

          const nodeEnv = data.NODE_ENV?.trim() ?? '';
          if (!localStubEnvs.has(nodeEnv)) {
            ctx.addIssue({
              code: 'custom',
              path: ['NODE_ENV'],
              message: `AUTH_MODE=${data.AUTH_MODE} requires NODE_ENV=development or test (got ${nodeEnv || 'unset'}). Unset NODE_ENV does not count as local - set NODE_ENV=development with ALLOW_INSECURE_AUTH=true for demos, or AUTH_MODE=jwt for other environments.`,
            });
          }
        }
      }

      if (data.AUTH_MODE === 'jwt') {
        const secret = data.JWT_SECRET?.trim() ?? '';
        if (!secret) {
          ctx.addIssue({
            code: 'custom',
            path: ['JWT_SECRET'],
            message:
              'JWT_SECRET is required when AUTH_MODE=jwt (HS256). For IdP SSO, swap AuthGuard to JWKS verification later.',
          });
        } else if (secret.length < MIN_JWT_SECRET_LENGTH) {
          ctx.addIssue({
            code: 'custom',
            path: ['JWT_SECRET'],
            message: `JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters (got ${secret.length}). Weak values like "secret" are rejected.`,
          });
        }
      }

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
