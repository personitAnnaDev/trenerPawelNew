import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Let Vite/Rollup handle chunking automatically
    // Manual chunking was causing initialization order issues with @react-pdf/renderer
    chunkSizeWarningLimit: 1500,
    // P0-SEC-003: Drop all console.* statements in production builds
    // This prevents information leakage through browser dev tools
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  optimizeDeps: {
    // Force pre-bundling of base64-js as ES module (fixes CommonJS/ESM conflict)
    include: ['base64-js']
  }
}));
