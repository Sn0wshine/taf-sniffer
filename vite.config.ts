import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    define: {
      __TAF_SNIFFER_DEBUG_GEMINI_KEY__: JSON.stringify(env.VITE_DEBUG_GEMINI_KEY || env.GEMINI_API_KEY || ""),
      __TAF_SNIFFER_ANDROID_PROXY_BASE__: JSON.stringify(env.VITE_ANDROID_PROXY_BASE || ""),
    },
    server: {
      proxy: {
        "/api": "http://127.0.0.1:8787",
      },
    },
  };
});
