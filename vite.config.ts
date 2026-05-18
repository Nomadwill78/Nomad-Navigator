/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables for the current mode (development / production)
  // These are available as import.meta.env.VITE_* in the client bundle.
  // We intentionally do NOT inject them via define() to avoid
  // embedding raw secret strings in the compiled output.
  const env = loadEnv(mode, process.cwd(), '');
  void env; // env loaded — access via import.meta.env.VITE_* in source files

  return {
    plugins: [react()],

    // ⚠️  Security: Do NOT use define() to embed API keys.
    // Use import.meta.env.VITE_GEMINI_API_KEY in your source files instead.
    // Vite will replace those references at build time using the .env.local values.
    define: {},

    // Vitest configuration
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/tests/setup.ts'],
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      coverage: {
        reporter: ['text', 'json', 'html'],
      },
    },
  };
});
