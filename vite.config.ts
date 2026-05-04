/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Path alias: import from "@/components/..." instead of "../../components/..."
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    // jsdom gives React a fake DOM to render into during tests
    environment: "jsdom",
    // Run setup before each test file (loads jest-dom matchers)
    setupFiles: ["./src/test/setup.ts"],
    // Allow describe/it/expect without explicit imports
    globals: true,
  },
});