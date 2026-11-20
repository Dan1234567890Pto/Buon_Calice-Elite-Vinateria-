import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mkcert from 'vite-plugin-mkcert'

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        mkcert()
    ],
    server: {
        https: true,
        port: 5173,
        watch: {
            usePolling: true,
            ignored: ['**/.vs/**', '**/node_modules/**', '**/.git/**']
        }
    },
    build: {
        outDir: 'wwwroot',
        emptyOutDir: true
    }
})