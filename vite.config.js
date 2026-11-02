import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        tools: fileURLToPath(new URL('./index.html', import.meta.url)),
        mermaid: fileURLToPath(new URL('./mermaid/index.html', import.meta.url)),
      },
    },
  },
});
