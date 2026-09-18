/**
 * Resolve the HTTP bind address.
 * Non-production defaults to loopback so stub/dev auth is not LAN-exposed by accident.
 * Production defaults to all interfaces; set HOST explicitly (e.g. Compose → 0.0.0.0).
 */
export function resolveListenHost(env: {
  HOST?: string;
  NODE_ENV?: string;
}): string {
  const explicit = env.HOST?.trim();
  if (explicit) {
    return explicit;
  }

  return env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
}
