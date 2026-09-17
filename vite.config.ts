import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_ANDROID_PROXY_BASE");

  return {
    plugins: [react()],
    // Aucune variable d’environnement exposée automatiquement au client.
    // Seule l’URL publique ci-dessous est transmise explicitement.
    envPrefix: [],
    define: {
      __TAF_SNIFFER_ANDROID_PROXY_BASE__: JSON.stringify(env.VITE_ANDROID_PROXY_BASE || ""),
    },
    server: {
      proxy: {
        "/api": "http://127.0.0.1:8787",
      },
    },
  };
});
