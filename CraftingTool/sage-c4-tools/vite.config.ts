import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ command }) => {
  const isProduction = command === 'build';

  return {
    plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
    base: isProduction ? './' : '/',
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      rollupOptions: {
        output: {
          manualChunks: undefined, // Single chunk for standalone
        }
      }
    }
  };
});
