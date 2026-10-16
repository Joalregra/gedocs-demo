import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.jsx',
            refresh: true,
        }),
        react(),
    ],
    test: {
        environment: 'jsdom',
        testTimeout: 20000,
        globals: true,
        setupFiles: './resources/js/tests/setup.js',
    },
});
