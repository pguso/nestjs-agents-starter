import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ArgumentsHost,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter.js';

function createHost(response: {
  headersSent: boolean;
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
}) {
  return {
    switchToHttp: () => ({
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;
}

describe('HttpExceptionFilter', () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  it('maps NotFoundException to JSON status and body', () => {
    const filter = new HttpExceptionFilter();
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const response = { headersSent: false, status, json };

    filter.catch(
      new NotFoundException('Order missing'),
      createHost(response),
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Order missing',
      }),
    );
  });

  it('does not write when headers were already sent', () => {
    const filter = new HttpExceptionFilter();
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const response = { headersSent: true, status, json };

    filter.catch(new NotFoundException('too late'), createHost(response));

    expect(status).not.toHaveBeenCalled();
    expect(json).not.toHaveBeenCalled();
  });
});
