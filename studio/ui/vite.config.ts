import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The API lives on the Deno server (default port 4310); during `vite dev` requests are proxied to it.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { outDir: "dist", emptyOutDir: true },
  server: { port: 5173, proxy: { "/api": { target: "http://127.0.0.1:4310", changeOrigin: false, headers: { host: "127.0.0.1:4310" } } } },
});
