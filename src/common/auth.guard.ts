import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  REQUEST_CONTEXT_KEY,
} from './request-context.decorator.js';
import type { RequestContext } from './request-context.js';

/**
 * Dev-friendly identity stub. Reads `x-user-id`, defaults to `demo-user`.
 * Swap this guard for JWT/session auth in production.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.header('x-user-id');
    const ctx: RequestContext = {
      userId: header?.trim() || 'demo-user',
    };
    (request as Request & { [REQUEST_CONTEXT_KEY]: RequestContext })[
      REQUEST_CONTEXT_KEY
    ] = ctx;
    return true;
  }
}
