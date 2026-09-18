import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ArgumentsHost,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter.js';
import { REQUEST_CONTEXT_KEY } from './request-context.decorator.js';

function createHost(params: {
  response: {
    headersSent: boolean;
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
  request?: Record<string | symbol, unknown>;
}) {
  return {
    switchToHttp: () => ({
      getResponse: () => params.response,
      getRequest: () =>
        params.request ?? {
          header: () => undefined,
        },
    }),
  } as unknown as ArgumentsHost;
}

describe('HttpExceptionFilter', () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  it('maps NotFoundException to JSON status and body with requestId', () => {
    const filter = new HttpExceptionFilter();
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const response = { headersSent: false, status, json };

    filter.catch(
      new NotFoundException('Order missing'),
      createHost({
        response,
        request: {
          [REQUEST_CONTEXT_KEY]: { userId: 'demo-user', requestId: 'req-1' },
          header: () => undefined,
        },
      }),
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Order missing',
        requestId: 'req-1',
      }),
    );
  });

  it('does not write when headers were already sent', () => {
    const filter = new HttpExceptionFilter();
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const response = { headersSent: true, status, json };

    filter.catch(new NotFoundException('too late'), createHost({ response }));

    expect(status).not.toHaveBeenCalled();
    expect(json).not.toHaveBeenCalled();
  });

  it('includes requestId on unhandled errors', () => {
    const filter = new HttpExceptionFilter();
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const response = { headersSent: false, status, json };

    filter.catch(
      new Error('boom'),
      createHost({
        response,
        request: {
          header: (name: string) =>
            name.toLowerCase() === 'x-request-id' ? 'from-header' : undefined,
        },
      }),
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      requestId: 'from-header',
    });
  });
});
