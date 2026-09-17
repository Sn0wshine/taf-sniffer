# Taf Sniffer

> Open-source, local-first job search aggregator tailored for the French employment ecosystem.

[![CI](https://github.com/Sn0wshine/taf-sniffer/actions/workflows/ci.yml/badge.svg)](https://github.com/Sn0wshine/taf-sniffer/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Local-First](https://img.shields.io/badge/Architecture-Local--First-blue.svg)](docs/PRODUCT.md)

[🇫🇷 Lire en français](README.md)

Taf Sniffer is an open-source civic-tech job aggregator designed to bring transparency and privacy to job hunting in France (aggregating France Travail, Apec, and direct manual imports). It gathers listings into a unified list, compares compensation and requirements, and highlights critical evaluation criteria—while strictly safeguarding user data.

---

## Key Pillars

### 1. 🛡️ Local-First & Privacy-Preserving
All parsing, scoring, search filtering, and storage run locally on your machine. **No API key is required.** There is zero tracking, zero telemetry, and zero leakage of your personal data or saved job postings to third-party ad networks.

### 2. ⚖️ Explainable Deterministic Matching
Instead of black-box algorithms, listings are scored using a clear, deterministic ranking model based on your defined criteria (skills, location, salary expectations, contract type). Every score breakdown is transparent and auditable.

### 3. 🌐 Multi-Source Resilient Connectors
Connectors aggregate public job postings with built-in resilience and rate limiting. If any external source updates its layout or throttles requests, Taf Sniffer provides an instant manual import option so your workflow is never interrupted.

### 4. 🤖 Ethical & Optional AI Augmentation
AI is strictly optional. Users can plug in their own API keys (OpenAI, Gemini, or local models) to assist with complex semantic query expansion or salary normalization, but no core feature ever depends on a paid AI service.

---

## Quickstart

### Prerequisites
- Node.js 20+ and npm

### Installation & Run

```bash
# Clone the repository
git clone https://github.com/Sn0wshine/taf-sniffer.git
cd taf-sniffer

# Install dependencies
npm install

# Start local server
npm run start:local
```

Open [http://127.0.0.1:8787/](http://127.0.0.1:8787/) in your browser.

### Run Tests & Build

```bash
# Run unit test suite (Vitest)
npm test

# Build production bundle
npm run build
```

---

## Development & AI Assistant Guidelines

This repository enforces strict open-source software hygiene:
- Full test coverage with **Vitest** for scoring engines, scrapers, and data normalizers.
- Strict TypeScript configuration (`React 19`, `Vite`).
- **`AGENTS.md`**: A dedicated guide for AI coding assistants (including OpenAI Codex, Claude, etc.) defining strict coding conventions, local-first guardrails, and privacy policies.

---

## Community & Contributing

Contributions are warmly welcome!
- See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.
- Check [SECURITY.md](SECURITY.md) for security policies.
- Explore our [Roadmap](docs/ROADMAP.md) and [Product Principles](docs/PRODUCT.md).

## License

Released under the [MIT License](LICENSE).
