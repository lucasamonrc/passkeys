import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    outDir: "../public",
  },
  server: {
    port: 3001,
    proxy: {
      "^/api.*": {
        target: "http://localhost:3000",
        changeOrigin: false,
        secure: false,
        ws: true,
      },
    },
  },
});
