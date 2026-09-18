import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import {
  REQUEST_CONTEXT_KEY,
} from './request-context.decorator.js';
import type { RequestContext } from './request-context.js';

/**
 * Identity guard.
 *
 * - AUTH_MODE=dev (default): reads `x-user-id`, defaults to `demo-user`.
 * - AUTH_MODE=jwt: requires `Authorization: Bearer <token>` and reads `sub`
 *   from an unsigned JSON payload (base64url). Replace with real JWT/JWKS
 *   validation before production.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const mode = (this.config.get<string>('AUTH_MODE') ?? 'dev').toLowerCase();

    const ctx: RequestContext =
      mode === 'jwt'
        ? { userId: this.userIdFromBearer(request) }
        : { userId: this.userIdFromDevHeader(request) };

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
