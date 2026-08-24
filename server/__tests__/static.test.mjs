import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { serveStatic } from "../static.mjs";

function mockRes() {
  return {
    status: null,
    headers: null,
    body: null,
    writeHead(status, headers) {
      this.status = status;
      this.headers = headers;
    },
    end(body) {
      this.body = body;
    },
  };
}

describe("serveStatic — sécurité", () => {
  it("refuse la traversée de répertoire (..)", () => {
    const res = mockRes();
    expect(serveStatic("/../../package.json", res)).toBe(false);
    expect(res.status).toBeNull();
  });

  it("refuse les fichiers cachés (dotfiles)", () => {
    const res = mockRes();
    expect(serveStatic("/.env", res)).toBe(false);
    expect(serveStatic("/.gitignore", res)).toBe(false);
  });

  it("refuse node_modules", () => {
    const res = mockRes();
    expect(serveStatic("/node_modules/vite/package.json", res)).toBe(false);
  });

  it("refuse une extension sans type MIME connu même si le fichier existe", () => {
    const res = mockRes();
    expect(existsSync(join(process.cwd(), "README.md"))).toBe(true);
    expect(serveStatic("/README.md", res)).toBe(false);
  });
});

describe("serveStatic — service du build", () => {
  it("sert dist/index.html sur / quand le build existe", () => {
    if (!existsSync(join(process.cwd(), "dist", "index.html"))) return;
    const res = mockRes();
    expect(serveStatic("/", res)).toBe(true);
    expect(res.status).toBe(200);
    expect(String(res.headers["Content-Type"])).toContain("text/html");
    expect(String(res.body)).toContain("<div id=\"root\">");
  });

  it("retourne false pour un fichier inexistant sans écrire de réponse", () => {
    const res = mockRes();
    expect(serveStatic("/assets/n-existe-pas.js", res)).toBe(false);
    expect(serveStatic("/assets/n-existe-pas.png", res)).toBe(false);
    expect(res.status).toBeNull();
  });
});
