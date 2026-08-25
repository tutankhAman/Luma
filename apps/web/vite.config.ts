import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, ".") } },
  server: {
    port: 3000,
    proxy: {
      "/api": { changeOrigin: true, target: "http://localhost:4000" },
    },
  },
});
