import { describe, expect, it } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { AuthGuard } from './auth.guard.js';
import { REQUEST_CONTEXT_KEY } from './request-context.decorator.js';
import type { RequestContext } from './request-context.js';

function createHttpContext(headerValue: string | undefined) {
  const request: Record<string | symbol, unknown> = {
    header: (name: string) =>
      name.toLowerCase() === 'x-user-id' ? headerValue : undefined,
  };

  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;

  return { context, request };
}

describe('AuthGuard', () => {
  it('defaults to demo-user when x-user-id is missing', () => {
    const guard = new AuthGuard();
    const { context, request } = createHttpContext(undefined);

    expect(guard.canActivate(context)).toBe(true);
    expect(request[REQUEST_CONTEXT_KEY]).toEqual({
      userId: 'demo-user',
    } satisfies RequestContext);
  });

  it('uses the x-user-id header when present', () => {
    const guard = new AuthGuard();
    const { context, request } = createHttpContext('  alice  ');

    expect(guard.canActivate(context)).toBe(true);
    expect(request[REQUEST_CONTEXT_KEY]).toEqual({
      userId: 'alice',
    } satisfies RequestContext);
  });

  it('treats blank x-user-id as demo-user', () => {
    const guard = new AuthGuard();
    const { context, request } = createHttpContext('   ');

    expect(guard.canActivate(context)).toBe(true);
    expect(request[REQUEST_CONTEXT_KEY]).toEqual({ userId: 'demo-user' });
  });
});
