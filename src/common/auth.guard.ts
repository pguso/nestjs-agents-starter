import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jwtVerify } from 'jose';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { REQUEST_CONTEXT_KEY } from './request-context.decorator.js';
import type { RequestContext } from './request-context.js';

type AuthMode = 'dev' | 'jwt-stub' | 'jwt';

/**
 * Identity guard.
 *
 * - AUTH_MODE=dev (default): reads `x-user-id`, defaults to `demo-user`.
 * - AUTH_MODE=jwt-stub: requires Bearer token; reads `sub` from an unsigned
 *   payload (local/demo only).
 * - AUTH_MODE=jwt: verifies HS256 Bearer JWT with JWT_SECRET; optional
 *   JWT_ISSUER / JWT_AUDIENCE. Prefer JWKS from your IdP for real SSO.
 *
 * Always attaches a `requestId` (from `x-request-id` or a new UUID) on the
 * context and response header for log correlation.
 */
@Injectable()
export class AuthGuard implements CanActivate, OnModuleInit {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const mode = this.authMode();
    if (mode === 'dev') {
      this.logger.warn(
        'AUTH_MODE=dev: identity is spoofable via the x-user-id header. Local development only — never expose this process publicly.',
      );
    } else if (mode === 'jwt-stub') {
      this.logger.warn(
        'AUTH_MODE=jwt-stub: Bearer tokens are NOT signature-verified (unsigned sub only). Local/demo only — use AUTH_MODE=jwt with JWT_SECRET for verified tokens.',
      );
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const mode = this.authMode();
    const requestId = request.header('x-request-id')?.trim() || randomUUID();

    response.setHeader('x-request-id', requestId);

    const userId =
      mode === 'jwt'
        ? await this.userIdFromVerifiedJwt(request)
        : mode === 'jwt-stub'
          ? this.userIdFromUnsignedJwt(request)
          : this.userIdFromDevHeader(request);

    const ctx: RequestContext = {
      requestId,
      userId,
    };

    (request as Request & { [REQUEST_CONTEXT_KEY]: RequestContext })[
      REQUEST_CONTEXT_KEY
    ] = ctx;
    return true;
  }

  private authMode(): AuthMode {
    const mode = (this.config.get<string>('AUTH_MODE') ?? 'dev').toLowerCase();
    if (mode === 'jwt' || mode === 'jwt-stub' || mode === 'dev') {
      return mode;
    }
    return 'dev';
  }

  private userIdFromDevHeader(request: Request): string {
    const header = request.header('x-user-id');
    return header?.trim() || 'demo-user';
  }

  private bearerToken(request: Request, modeLabel: string): string {
    const authorization = request.header('authorization');
    if (!authorization?.toLowerCase().startsWith('bearer ')) {
      throw new UnauthorizedException(
        `${modeLabel} requires Authorization: Bearer <token>.`,
      );
    }

    const token = authorization.slice('bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('Bearer token is empty.');
    }
    return token;
  }

  private userIdFromUnsignedJwt(request: Request): string {
    const token = this.bearerToken(request, 'AUTH_MODE=jwt-stub');
    const userId = this.subFromUnsignedJwt(token);
    if (!userId) {
      throw new UnauthorizedException(
        'Bearer token must be an unsigned JWT-like payload with a string "sub" claim (AUTH_MODE=jwt-stub only).',
      );
    }
    return userId;
  }

  private async userIdFromVerifiedJwt(request: Request): Promise<string> {
    const token = this.bearerToken(request, 'AUTH_MODE=jwt');
    const secret = this.config.get<string>('JWT_SECRET')?.trim();
    if (!secret) {
      throw new UnauthorizedException(
        'AUTH_MODE=jwt requires JWT_SECRET (misconfigured server).',
      );
    }

    const issuer = this.config.get<string>('JWT_ISSUER')?.trim();
    const audience = this.config.get<string>('JWT_AUDIENCE')?.trim();

    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(secret),
        {
          algorithms: ['HS256'],
          ...(issuer ? { issuer } : {}),
          ...(audience ? { audience } : {}),
        },
      );

      if (typeof payload.sub !== 'string' || !payload.sub.trim()) {
        throw new UnauthorizedException(
          'Bearer JWT must include a string "sub" claim.',
        );
      }
      return payload.sub.trim();
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Bearer JWT is invalid or expired.');
    }
  }

  /**
   * Stub-only: decode payload without verifying a signature.
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
