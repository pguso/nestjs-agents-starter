import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { REQUEST_CONTEXT_KEY } from './request-context.decorator.js';
import type { RequestContext } from './request-context.js';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = this.resolveRequestId(request);

    if (response.headersSent) {
      this.logger.error(
        JSON.stringify({
          msg: 'Error after response started',
          requestId,
          error:
            exception instanceof Error ? exception.message : String(exception),
          stack: exception instanceof Error ? exception.stack : undefined,
        }),
      );
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const payload =
        typeof body === 'string'
          ? { statusCode: status, message: body, requestId }
          : { ...(body as object), requestId };
      response.status(status).json(payload);
      return;
    }

    this.logger.error(
      JSON.stringify({
        msg: 'Unhandled error',
        requestId,
        error:
          exception instanceof Error ? exception.message : String(exception),
        stack: exception instanceof Error ? exception.stack : undefined,
      }),
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      requestId,
    });
  }

  private resolveRequestId(request: Request): string {
    const fromContext = (
      request as Request & { [REQUEST_CONTEXT_KEY]?: RequestContext }
    )[REQUEST_CONTEXT_KEY]?.requestId;
    if (fromContext) {
      return fromContext;
    }
    return request.header('x-request-id')?.trim() || 'unknown';
  }
}
