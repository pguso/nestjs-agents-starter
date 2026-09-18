import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { REQUEST_CONTEXT_KEY } from './request-context.decorator.js';
import type { RequestContext } from './request-context.js';

/**
 * Identity guard.
 *
 * - AUTH_MODE=dev (default): reads `x-user-id`, defaults to `demo-user`.
 * - AUTH_MODE=jwt: requires `Authorization: Bearer <token>` and reads `sub`
 *   from an unsigned JSON payload (base64url). Replace with real JWT/JWKS
 *   validation before production.
 *
 * Always attaches a `requestId` (from `x-request-id` or a new UUID) on the
 * context and response header for log correlation.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const mode = (this.config.get<string>('AUTH_MODE') ?? 'dev').toLowerCase();
    const requestId = request.header('x-request-id')?.trim() || randomUUID();

    response.setHeader('x-request-id', requestId);

    const ctx: RequestContext = {
      requestId,
      userId:
        mode === 'jwt'
          ? this.userIdFromBearer(request)
          : this.userIdFromDevHeader(request),
    };

    (request as Request & { [REQUEST_CONTEXT_KEY]: RequestContext })[
      REQUEST_CONTEXT_KEY
    ] = ctx;
    return true;
  }

  private userIdFromDevHeader(request: Request): string {
    const header = request.header('x-user-id');
    return header?.trim() || 'demo-user';
  }

  private userIdFromBearer(request: Request): string {
    const authorization = request.header('authorization');
    if (!authorization?.toLowerCase().startsWith('bearer ')) {
      throw new UnauthorizedException(
        'AUTH_MODE=jwt requires Authorization: Bearer <token>. Replace AuthGuard with real JWT validation before production.',
      );
    }

    const token = authorization.slice('bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('Bearer token is empty.');
    }

    const userId = this.subFromUnsignedJwt(token);
    if (!userId) {
      throw new UnauthorizedException(
        'Bearer token must be an unsigned JWT-like payload with a string "sub" claim (starter stub only).',
      );
    }

    return userId;
  }

  /**
   * Starter-only: decode payload without verifying a signature.
   * Accepts either a full JWT (header.payload.sig) or a bare base64url JSON body.
   */
  private subFromUnsignedJwt(token: string): string | undefined {
    const parts = token.split('.');
    const payloadPart = parts.length >= 2 ? parts[1] : parts[0];

    try {
      const json = Buffer.from(payloadPart, 'base64url').toString('utf8');
      const payload = JSON.parse(json) as { sub?: unknown };
      return typeof payload.sub === 'string' && payload.sub.trim()
        ? payload.sub.trim()
        : undefined;
    } catch {
      return undefined;
    }
  }
}
