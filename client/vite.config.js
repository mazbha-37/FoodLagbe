import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('leaflet')) return 'vendor-leaflet';
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
          if (id.includes('socket.io-client')) return 'vendor-socket';
          if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('/zod/')) return 'vendor-forms';
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('react-router')) return 'vendor-react';
          if (id.includes('@reduxjs') || id.includes('react-redux')) return 'vendor-redux';
          if (id.includes('lucide-react') || id.includes('react-hot-toast') || id.includes('date-fns')) return 'vendor-ui';
        },
      },
    },
  },
})
