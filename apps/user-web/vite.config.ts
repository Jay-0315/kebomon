import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router', 'lucide-react'],
  },

  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: 'all',
    headers: {
      'X-Frame-Options': 'ALLOWALL',
    },
    hmr: {
      host: 'localhost',
      port: 5173,
      protocol: 'ws',
      clientPort: 5173,
    },
    warmup: {
      clientFiles: ['./src/app/App.tsx', './src/app/components/*.tsx', './src/app/context/*.tsx'],
    },
    // Docker on Windows: inotify doesn't propagate → polling 필요
    watch: {
      usePolling: true,
      interval: 800,
    },
  },
})
