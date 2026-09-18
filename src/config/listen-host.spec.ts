import { describe, expect, it } from 'vitest';
import { resolveListenHost } from './listen-host.js';

describe('resolveListenHost', () => {
  it('defaults to loopback outside production', () => {
    expect(resolveListenHost({ NODE_ENV: 'development' })).toBe('127.0.0.1');
    expect(resolveListenHost({})).toBe('127.0.0.1');
  });

  it('defaults to all interfaces in production', () => {
    expect(resolveListenHost({ NODE_ENV: 'production' })).toBe('0.0.0.0');
  });

  it('honors an explicit HOST', () => {
    expect(
      resolveListenHost({ HOST: '0.0.0.0', NODE_ENV: 'development' }),
    ).toBe('0.0.0.0');
    expect(
      resolveListenHost({ HOST: '127.0.0.1', NODE_ENV: 'production' }),
    ).toBe('127.0.0.1');
  });
});
