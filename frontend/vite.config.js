import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
    server: {
    port: 5174,
    strictPort: true  // Si 5173 está ocupado, lanza error en vez de cambiar puerto
  }
})
