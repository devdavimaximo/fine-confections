import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  // three + R3F vêm num chunk só, carregado enquanto o preloader desenha o monograma
  build: { chunkSizeWarningLimit: 1000 },
});
