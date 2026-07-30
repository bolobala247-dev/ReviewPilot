# AI Code Review Orchestrator (ReviewPilot)

Provider-agnostic CLI tool for automatically reviewing GitHub Pull Requests using LLMs (OpenAI, Gemini, Anthropic) built with Node.js, TypeScript, and Clean Architecture principles.

---

## 🚀 Project Overview

**ReviewPilot** is a lightweight, scalable, and provider-agnostic AI Code Review Orchestrator. It automatically fetches GitHub Pull Request diffs, parses modified files, applies policy filters, and fans out structured code review prompts across major AI providers (OpenAI, Google Gemini, Anthropic Claude).

### Key Features

- **Provider-Agnostic**: Effortlessly switch between OpenAI, Gemini, and Anthropic.
- **Clean Architecture**: Decoupled Domain, Application, and Infrastructure layers following SOLID principles.
- **Bounded Concurrency**: Parallelized file diff processing with token budget awareness.
- **Resilience**: Built-in exponential backoff with jitter for HTTP rate limits and timeouts.
- **Structured Findings**: Generates formatted Markdown review reports highlighting severity, line numbers, and actionable code suggestions.

---

## 🏗 Architecture

The system follows **Clean Architecture** (Ports & Adapters). Dependencies point inward — core domain logic remains independent of external frameworks or LLM SDKs.

```
       +-------------------------------------------------------+
       |                  External Systems                     |
       |       (GitHub API, OpenAI, Gemini, Anthropic)         |
       +---------------------------+---------------------------+
                                   |
                                   v
       +-------------------------------------------------------+
       |                 Infrastructure Layer                  |
       |  (GitHubAdapter, AI Adapters, Config, Logger, Retry)  |
       +---------------------------+---------------------------+
                                   |
                                   v
       +-------------------------------------------------------+
       |                   Application Layer                   |
       | (ReviewOrchestrator, DiffParser, PromptBuilder, etc.) |
       +---------------------------+---------------------------+
                                   |
                                   v
       +-------------------------------------------------------+
       |                     Domain Layer                      |
       |     (Types, Enums, AppError, IAIProvider Port)        |
       +-------------------------------------------------------+
```

---

## 📁 Folder Structure

```
.
├── src/
│   ├── domain/               # Enterprise rules: Entities, Value Objects, Ports, Errors
│   │   ├── types.ts          # Core domain types & ReviewSeverity enum
│   │   ├── errors.ts         # AppError class & ErrorCode enum
│   │   └── ports.ts          # IAIProvider port interface contract
│   │
│   ├── application/          # Application rules & pure helper functions
│   │   ├── orchestrator.ts   # ReviewOrchestrator core use-case workflow
│   │   ├── diff-parser.ts    # Unified diff parsing & file size filtering
│   │   ├── prompt-builder.ts # Prompt template interpolation
│   │   └── response-parser.ts# Structured JSON & fallback response parser
│   │
│   ├── infrastructure/       # Frameworks, drivers & adapters
│   │   ├── github.ts         # GitHub Octokit API adapter
│   │   ├── providers/        # LLM Provider Adapters (OpenAI, Gemini, Anthropic)
│   │   │   ├── openai.ts
│   │   │   ├── gemini.ts
│   │   │   ├── anthropic.ts
│   │   │   └── index.ts      # Provider creation factory function
│   │   ├── config.ts         # Env loading & Zod schema validation
│   │   ├── retry.ts          # Exponential backoff utility
│   │   ├── logger.ts         # Pino structured logger
│   │   └── renderer.ts       # Markdown report renderer
│   │
│   └── cli.ts                # CLI entry point & manual bootstrap setup
│
├── prompts/                  # Prompt templates (system & per-file review)
│   ├── system.md
│   └── review-file.md
│
├── tests/                    # Vitest unit test suites
│   └── unit/
│       ├── diff-parser.test.ts
│       ├── prompt-builder.test.ts
│       ├── response-parser.test.ts
│       └── orchestrator.test.ts
│
├── docs/                     # Design documents & architecture specifications
├── .editorconfig             # Editor formatting configuration
├── .eslintrc.js              # ESLint rules
├── .prettierrc               # Prettier code style
├── vitest.config.ts          # Vitest configuration & path aliases
├── tsconfig.json             # TypeScript strict compiler configuration
└── package.json              # Project dependencies & scripts
```

---

## ⚡ Getting Started

### Prerequisites

- **Node.js**: `>= 22.0.0`
- **Package Manager**: `pnpm >= 10.0.0`

### Installation

```bash
# Clone repository
git clone https://github.com/bolobala247-dev/ReviewPilot.git
cd ReviewPilot

# Install dependencies using pnpm
pnpm install
```

### Environment Configuration

Copy `.env.example` to `.env` and fill in your API credentials:

```bash
cp .env.example .env
```

```env
# Required API Credentials
AICR_AI_API_KEY=sk-your_openai_or_provider_key
AICR_GITHUB_TOKEN=ghp_your_github_token

# Optional Configurations (defaults shown)
AICR_AI_PROVIDER=openai
AICR_AI_MODEL=gpt-4o
AICR_AI_TEMPERATURE=0.1
AICR_REVIEW_CONCURRENCY=5
AICR_MAX_FILE_SIZE=100000
AICR_IGNORE_PATTERNS=*.lock,*.min.js,dist/**,node_modules/**
AICR_LOG_LEVEL=info
```

### Running a Review

```bash
# Run CLI via ts-node in development
pnpm dev --owner octocat --repo Hello-World --pr 42 --provider openai

# Build production bundle
pnpm run build

# Run compiled JS
pnpm start --owner octocat --repo Hello-World --pr 42 --provider gemini
```

---

## 📜 Available Scripts

| Script                   | Command                                         | Description                                   |
| ------------------------ | ----------------------------------------------- | --------------------------------------------- |
| `pnpm run build`         | `tsc`                                           | Compiles TypeScript source to `./dist`        |
| `pnpm run dev`           | `ts-node -r tsconfig-paths/register src/cli.ts` | Runs CLI directly in TypeScript mode          |
| `pnpm run start`         | `node dist/cli.js`                              | Runs compiled production CLI                  |
| `pnpm run typecheck`     | `tsc --noEmit`                                  | Validates TypeScript types across the project |
| `pnpm run test`          | `vitest run`                                    | Runs unit tests with Vitest                   |
| `pnpm run test:watch`    | `vitest`                                        | Runs Vitest in interactive watch mode         |
| `pnpm run test:coverage` | `vitest run --coverage`                         | Generates test coverage report                |
| `pnpm run lint`          | `eslint .`                                      | Lints code using ESLint                       |
| `pnpm run lint:fix`      | `eslint . --fix`                                | Automatically fixes linting errors            |
| `pnpm run format`        | `prettier --check .`                            | Checks code formatting with Prettier          |
| `pnpm run format:fix`    | `prettier --write .`                            | Formats all files using Prettier              |

---

## 🗺 Roadmap

- [x] **V1 MVP Skeleton**: Clean Architecture setup, TypeScript strict flags, pnpm, Vitest, ESLint, Prettier, Husky.
- [x] **V1 Multi-Provider**: Support for OpenAI, Google Gemini, and Anthropic Claude.
- [ ] **V2 Webhook Receiver**: Automatic GitHub webhook handler (`pull_request.opened` / `synchronize`).
- [ ] **V2 Diff Chunking**: Token-budget-aware diff chunking for large file changes.
- [ ] **V2 Direct PR Commenting**: Post inline review comments directly to GitHub PR lines via Octokit.
- [ ] **V2 Model Context Protocol (MCP)**: Native MCP tool adapter for local/custom LLM servers.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
