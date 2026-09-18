import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { RequestContext } from './request-context.js';

export const REQUEST_CONTEXT_KEY = 'requestContext';

export const CurrentContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestContext => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return (request as Request & { [REQUEST_CONTEXT_KEY]: RequestContext })[
      REQUEST_CONTEXT_KEY
    ];
  },
);
