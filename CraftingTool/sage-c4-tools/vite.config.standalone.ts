import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { viteSingleFile } from 'vite-plugin-singlefile';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
    plugins: [
        react(),
        tsconfigPaths(),
        viteSingleFile({
            removeViteModuleLoader: true,
            useRecommendedBuildConfig: true
        })
    ],
    base: './',
    build: {
        outDir: 'dist-standalone',
        assetsDir: 'assets',
        rollupOptions: {
            input: resolve(__dirname, 'standalone.html'),
            output: {
                inlineDynamicImports: true,
                manualChunks: undefined,
            }
        },
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true
            }
        },
        reportCompressedSize: false,
        chunkSizeWarningLimit: 5000,
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './app'),
            './contexts/DataContext': resolve(__dirname, './app/contexts/StandaloneDataContext.tsx'),
            '../contexts/DataContext': resolve(__dirname, './app/contexts/StandaloneDataContext.tsx'),
            'react-router': resolve(__dirname, './app/stubs/react-router-stub.tsx'),
            'react-router-dom': resolve(__dirname, './app/stubs/react-router-stub.tsx')
        }
    },
    define: {
        'process.env': {},
        'process.env.NODE_ENV': '"production"'
    }
}); 