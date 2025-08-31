import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'react-vendor': ['react', 'react-dom'],
          
          // UI Libraries
          'ui-vendor': ['lucide-react', '@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          
          // Date utilities
          'date-vendor': ['date-fns'],
          
          // Markdown (large dependency, used conditionally)
          'markdown-vendor': ['react-markdown', 'remark-gfm'],
          
          // State management and utilities
          'utils-vendor': ['zustand', 'clsx', 'tailwind-merge', 'uuid']
        }
      }
    },
    // Increase chunk size warning limit slightly for vendor chunks
    chunkSizeWarningLimit: 600
  }
})
