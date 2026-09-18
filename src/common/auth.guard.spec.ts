import { describe, expect, it } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignJWT } from 'jose';
import { AuthGuard } from './auth.guard.js';
import { REQUEST_CONTEXT_KEY } from './request-context.decorator.js';
import type { RequestContext } from './request-context.js';

const JWT_SECRET = 'test-secret-at-least-32-characters!';

function configWith(values: Record<string, string | undefined>): ConfigService {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

function createHttpContext(headers: Record<string, string | undefined>) {
  const normalized = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );

  const responseHeaders: Record<string, string> = {};
  const request: Record<string | symbol, unknown> = {
    header: (name: string) => normalized[name.toLowerCase()],
  };
  const response = {
    setHeader: (name: string, value: string) => {
      responseHeaders[name.toLowerCase()] = value;
    },
  };

  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;

  return { context, request, responseHeaders };
}

async function signedToken(options: {
  sub: string;
  secret?: string;
  issuer?: string;
  audience?: string;
}): Promise<string> {
  let builder = new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(options.sub)
    .setIssuedAt()
    .setExpirationTime('2h');

  if (options.issuer) {
    builder = builder.setIssuer(options.issuer);
  }
  if (options.audience) {
    builder = builder.setAudience(options.audience);
  }

  return builder.sign(new TextEncoder().encode(options.secret ?? JWT_SECRET));
}

describe('AuthGuard', () => {
  it('defaults to demo-user when x-user-id is missing in dev mode', async () => {
    const guard = new AuthGuard(configWith({ AUTH_MODE: 'dev' }));
    const { context, request, responseHeaders } = createHttpContext({});

    expect(await guard.canActivate(context)).toBe(true);
    const ctx = request[REQUEST_CONTEXT_KEY] as RequestContext;
    expect(ctx.userId).toBe('demo-user');
    expect(ctx.requestId).toBeTruthy();
    expect(responseHeaders['x-request-id']).toBe(ctx.requestId);
  });

  it('uses the x-user-id and x-request-id headers when present', async () => {
    const guard = new AuthGuard(configWith({ AUTH_MODE: 'dev' }));
    const { context, request } = createHttpContext({
      'x-user-id': '  alice  ',
      'x-request-id': 'req-123',
    });

    expect(await guard.canActivate(context)).toBe(true);
    expect(request[REQUEST_CONTEXT_KEY]).toEqual({
      userId: 'alice',
      requestId: 'req-123',
    } satisfies RequestContext);
  });

  it('treats blank x-user-id as demo-user in dev mode', async () => {
    const guard = new AuthGuard(configWith({ AUTH_MODE: 'dev' }));
    const { context, request } = createHttpContext({ 'x-user-id': '   ' });

    expect(await guard.canActivate(context)).toBe(true);
    expect((request[REQUEST_CONTEXT_KEY] as RequestContext).userId).toBe(
      'demo-user',
    );
  });

  it('rejects missing Bearer token when AUTH_MODE=jwt-stub', async () => {
    const guard = new AuthGuard(configWith({ AUTH_MODE: 'jwt-stub' }));
    const { context } = createHttpContext({});

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('reads sub from an unsigned JWT payload when AUTH_MODE=jwt-stub', async () => {
    const guard = new AuthGuard(configWith({ AUTH_MODE: 'jwt-stub' }));
    const header = Buffer.from(
      JSON.stringify({ alg: 'none', typ: 'JWT' }),
    ).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: 'stub-user' })).toString(
      'base64url',
    );
    const { context, request } = createHttpContext({
      authorization: `Bearer ${header}.${payload}.`,
    });

    expect(await guard.canActivate(context)).toBe(true);
    expect((request[REQUEST_CONTEXT_KEY] as RequestContext).userId).toBe(
      'stub-user',
    );
  });

  it('rejects missing Bearer token when AUTH_MODE=jwt', async () => {
    const guard = new AuthGuard(configWith({ AUTH_MODE: 'jwt', JWT_SECRET }));
    const { context } = createHttpContext({});

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('verifies a signed HS256 JWT when AUTH_MODE=jwt', async () => {
    const guard = new AuthGuard(configWith({ AUTH_MODE: 'jwt', JWT_SECRET }));
    const token = await signedToken({ sub: 'jwt-user' });
    const { context, request } = createHttpContext({
      authorization: `Bearer ${token}`,
    });

    expect(await guard.canActivate(context)).toBe(true);
    expect((request[REQUEST_CONTEXT_KEY] as RequestContext).userId).toBe(
      'jwt-user',
    );
  });

  it('rejects unsigned tokens when AUTH_MODE=jwt', async () => {
    const guard = new AuthGuard(configWith({ AUTH_MODE: 'jwt', JWT_SECRET }));
    const payload = Buffer.from(JSON.stringify({ sub: 'nope' })).toString(
      'base64url',
    );
    const { context } = createHttpContext({
      authorization: `Bearer ${payload}`,
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('enforces JWT_ISSUER and JWT_AUDIENCE when set', async () => {
    const guard = new AuthGuard(
      configWith({
        AUTH_MODE: 'jwt',
        JWT_SECRET,
        JWT_ISSUER: 'https://issuer.example',
        JWT_AUDIENCE: 'nestjs-agents',
      }),
    );

    const badToken = await signedToken({ sub: 'jwt-user' });
    const { context: badContext } = createHttpContext({
      authorization: `Bearer ${badToken}`,
    });
    await expect(guard.canActivate(badContext)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    const goodToken = await signedToken({
      sub: 'jwt-user',
      issuer: 'https://issuer.example',
      audience: 'nestjs-agents',
    });
    const { context, request } = createHttpContext({
      authorization: `Bearer ${goodToken}`,
    });
    expect(await guard.canActivate(context)).toBe(true);
    expect((request[REQUEST_CONTEXT_KEY] as RequestContext).userId).toBe(
      'jwt-user',
    );
  });
});
