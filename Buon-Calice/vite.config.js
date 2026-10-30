import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), basicSsl()],
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

