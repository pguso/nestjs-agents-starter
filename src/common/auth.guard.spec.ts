import { describe, expect, it } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from './auth.guard.js';
import { REQUEST_CONTEXT_KEY } from './request-context.decorator.js';
import type { RequestContext } from './request-context.js';

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

describe('AuthGuard', () => {
  it('defaults to demo-user when x-user-id is missing in dev mode', () => {
    const guard = new AuthGuard(configWith({ AUTH_MODE: 'dev' }));
    const { context, request, responseHeaders } = createHttpContext({});

    expect(guard.canActivate(context)).toBe(true);
    const ctx = request[REQUEST_CONTEXT_KEY] as RequestContext;
    expect(ctx.userId).toBe('demo-user');
    expect(ctx.requestId).toBeTruthy();
    expect(responseHeaders['x-request-id']).toBe(ctx.requestId);
  });

  it('uses the x-user-id and x-request-id headers when present', () => {
    const guard = new AuthGuard(configWith({ AUTH_MODE: 'dev' }));
    const { context, request } = createHttpContext({
      'x-user-id': '  alice  ',
      'x-request-id': 'req-123',
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(request[REQUEST_CONTEXT_KEY]).toEqual({
      userId: 'alice',
      requestId: 'req-123',
    } satisfies RequestContext);
  });

  it('treats blank x-user-id as demo-user in dev mode', () => {
    const guard = new AuthGuard(configWith({ AUTH_MODE: 'dev' }));
    const { context, request } = createHttpContext({ 'x-user-id': '   ' });

    expect(guard.canActivate(context)).toBe(true);
    expect((request[REQUEST_CONTEXT_KEY] as RequestContext).userId).toBe(
      'demo-user',
    );
  });

  it('rejects missing Bearer token when AUTH_MODE=jwt', () => {
    const guard = new AuthGuard(configWith({ AUTH_MODE: 'jwt' }));
    const { context } = createHttpContext({});

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('reads sub from an unsigned JWT payload when AUTH_MODE=jwt', () => {
    const guard = new AuthGuard(configWith({ AUTH_MODE: 'jwt' }));
    const header = Buffer.from(
      JSON.stringify({ alg: 'none', typ: 'JWT' }),
    ).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: 'jwt-user' })).toString(
      'base64url',
    );
    const { context, request } = createHttpContext({
      authorization: `Bearer ${header}.${payload}.`,
    });

    expect(guard.canActivate(context)).toBe(true);
    expect((request[REQUEST_CONTEXT_KEY] as RequestContext).userId).toBe(
      'jwt-user',
    );
  });
});
