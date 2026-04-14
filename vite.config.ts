import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 部署於 /Accounting/ 下；本地 dev 則用 '/'
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/Accounting/' : '/',
  server: { port: 5173 },
}));
