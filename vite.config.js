import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        catalog: resolve(process.cwd(), 'index.html'),
        admin: resolve(process.cwd(), 'admin.html')
      }
    }
  }
});
