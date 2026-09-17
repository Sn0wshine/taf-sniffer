import { afterEach, describe, expect, it, vi } from "vitest";
import config from "../../vite.config.ts";

const serverSecret = "test-only-server-secret-not-a-real-key";
const legacySecret = "test-only-debug-secret-not-a-real-key";

afterEach(() => vi.unstubAllEnvs());

describe("confidentialité du build client", () => {
  it("n'expose ni la clé serveur ni l'ancienne clé de debug", () => {
    vi.stubEnv("GEMINI_API_KEY", serverSecret);
    vi.stubEnv("VITE_DEBUG_GEMINI_KEY", legacySecret);
    const resolved = config({ command: "build", mode: "test" });

    expect(resolved.define).not.toHaveProperty("__TAF_SNIFFER_DEBUG_GEMINI_KEY__");
    expect(JSON.stringify(resolved.define)).not.toContain(serverSecret);
    expect(JSON.stringify(resolved.define)).not.toContain(legacySecret);
    expect(resolved.envPrefix).toEqual([]);
  });

  it("conserve l'URL publique du proxy Android", () => {
    vi.stubEnv("VITE_ANDROID_PROXY_BASE", "https://proxy.example.invalid");
    const resolved = config({ command: "build", mode: "test" });

    expect(JSON.parse(resolved.define.__TAF_SNIFFER_ANDROID_PROXY_BASE__))
      .toBe("https://proxy.example.invalid");
  });
});
