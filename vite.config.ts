import path from "node:path";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const strictCsp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: http://127.0.0.1:19090",
  "connect-src 'self' http://127.0.0.1:19090",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join("; ");

const devCsp = strictCsp
  .replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")
  .replace(
    "connect-src 'self' http://127.0.0.1:19090",
    "connect-src 'self' http://127.0.0.1:19090 ws://127.0.0.1:*",
  );

export default defineConfig(({ command }) => ({
  plugins: [
    ...(command === "build" ? [babel({ presets: [reactCompilerPreset()] })] : []),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  server: {
    headers: {
      "Content-Security-Policy": devCsp,
    },
  },
  preview: {
    headers: {
      "Content-Security-Policy": strictCsp,
    },
  },
}));
