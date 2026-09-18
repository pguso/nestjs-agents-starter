import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      // Zod ships `@__PURE__` comments Rollup cannot parse; safe to ignore.
      onwarn(warning, warn) {
        if (
          warning.code === 'ANNOTATION_INVALID' ||
          warning.message.includes('annotation that Rollup cannot interpret')
        ) {
          return;
        }
        warn(warning);
      },
    },
  },
});
