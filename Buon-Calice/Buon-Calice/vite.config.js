import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
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