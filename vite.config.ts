import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// GitHub Pages project site: https://nikitapage10.github.io/TRACKQUEST/
const base = process.env.GITHUB_PAGES === '1' ? '/TRACKQUEST/' : '/';

export default defineConfig({
  base,
  plugins: [react()],
  preview: {
    host: true,
    allowedHosts: true,
  },
  server: {
    host: true,
    allowedHosts: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
