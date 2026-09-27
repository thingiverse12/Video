import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { host: '0.0.0.0', allowedHosts: true },
  preview: { host: '0.0.0.0', allowedHosts: true },
  build: {
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: { manualChunks: { 'vendor-three': ['three'], 'vendor-react': ['react', 'react-dom/client', 'react/jsx-runtime'] } },
    },
  },
});
