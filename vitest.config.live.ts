import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

/**
 * Optional live smoke against a real provider.
 * Run: LIVE_LLM_TEST=1 npm run test:live
 * Requires a valid .env (or exported AI_* / provider keys).
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.live-spec.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
