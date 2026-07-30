# Project Skeleton Implementation Plan — AI Code Review Orchestrator V1

Set up a clean, production-ready TypeScript project skeleton following the approved **V1 Design Document** and strict engineering tooling standards (`pnpm`, `Vitest`, `ESLint`, `Prettier`, `Husky`, `lint-staged`, `.editorconfig`, path aliases).

---

## User Review Required

> [!IMPORTANT]
>
> - **Switching to `pnpm` & `Vitest`**: Replaces `npm` and `jest` in alignment with the requested setup.
> - **Skeleton Only**: All files in `src/` will contain minimal compile-ready type signatures and exported signatures without full business logic or fake implementations.
> - **Tooling**: Includes full configuration for ESLint (v9 flat config or standard), Prettier, Husky git hooks (`pre-commit`), `lint-staged`, and TypeScript path aliases (`@domain/*`, `@application/*`, `@infrastructure/*`).

---

## Proposed Changes

### Root Configuration & Tooling

#### [NEW] [package.json](file:///Users/dabeeovina/Documents/AI-mcp-tool/package.json)

- Updated with `pnpm` package manager specification.
- Scripts: `build`, `dev`, `test`, `test:coverage`, `lint`, `format`, `typecheck`, `prepare` (Husky).
- Dependencies: `@anthropic-ai/sdk`, `@google/generative-ai`, `@octokit/rest`, `commander`, `dotenv`, `openai`, `pino`, `zod`.
- Dev Dependencies: `typescript`, `vitest`, `eslint`, `prettier`, `husky`, `lint-staged`, `pino-pretty`, `@types/node`.

#### [NEW] [tsconfig.json](file:///Users/dabeeovina/Documents/AI-mcp-tool/tsconfig.json)

- Configured with Strict Mode enabled, target `ES2022`, module resolution `Bundler` or `NodeNext`.
- Path aliases:
  - `@domain/*` → `./src/domain/*`
  - `@application/*` → `./src/application/*`
  - `@infrastructure/*` → `./src/infrastructure/*`

#### [NEW] [.editorconfig](file:///Users/dabeeovina/Documents/AI-mcp-tool/.editorconfig)

- Editor configuration for consistent indent style (2 spaces), UTF-8 encoding, trim trailing whitespace, insert final newline.

#### [NEW] [eslint.config.mjs](file:///Users/dabeeovina/Documents/AI-mcp-tool/eslint.config.mjs)

- Modern flat ESLint configuration for TypeScript.

#### [NEW] [.prettierrc](file:///Users/dabeeovina/Documents/AI-mcp-tool/.prettierrc) & [.prettierignore](file:///Users/dabeeovina/Documents/AI-mcp-tool/.prettierignore)

- Standard Prettier code style configuration (single quotes, trailing commas, semi, 2 spaces).

#### [NEW] [vitest.config.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/vitest.config.ts)

- Vitest test runner configuration resolving TypeScript path aliases.

#### [NEW] [.lintstagedrc.json](file:///Users/dabeeovina/Documents/AI-mcp-tool/.lintstagedrc.json) & [.husky/pre-commit](file:///Users/dabeeovina/Documents/AI-mcp-tool/.husky/pre-commit)

- Pre-commit hook executing `lint-staged` (runs `prettier`, `eslint`, and `vitest related`).

#### [NEW] [.env.example](file:///Users/dabeeovina/Documents/AI-mcp-tool/.env.example)

- Blueprint for environment variables (`AICR_AI_API_KEY`, `AICR_GITHUB_TOKEN`, etc.).

---

### Source Code Skeleton (`src/`)

#### [NEW] [src/domain/types.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/domain/types.ts)

- Pure type definitions for `ReviewSeverity`, `FileDiff`, `ReviewComment`, `ReviewReport`, and `ReviewRequest`.

#### [NEW] [src/domain/errors.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/domain/errors.ts)

- `ErrorCode` enum and lightweight `AppError` class definition.

#### [NEW] [src/domain/ports.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/domain/ports.ts)

- `IAIProvider` interface contract and DTO types (`AIReviewRequest`, `AIReviewResponse`).

#### [NEW] [src/application/diff-parser.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/application/diff-parser.ts)

- Pure functions `parseDiff()` and `filterFiles()` signatures.

#### [NEW] [src/application/prompt-builder.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/application/prompt-builder.ts)

- Pure function `buildPrompt()` signature.

#### [NEW] [src/application/response-parser.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/application/response-parser.ts)

- Pure function `parseResponse()` signature.

#### [NEW] [src/application/orchestrator.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/application/orchestrator.ts)

- `ReviewOrchestrator` class skeleton.

#### [NEW] [src/infrastructure/github.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/infrastructure/github.ts)

- `GitHubAdapter` class skeleton.

#### [NEW] [src/infrastructure/providers/openai.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/infrastructure/providers/openai.ts)

#### [NEW] [src/infrastructure/providers/gemini.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/infrastructure/providers/gemini.ts)

#### [NEW] [src/infrastructure/providers/anthropic.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/infrastructure/providers/anthropic.ts)

#### [NEW] [src/infrastructure/providers/index.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/infrastructure/providers/index.ts)

- AI adapter skeletons implementing `IAIProvider` and the `createProvider()` switch function signature.

#### [NEW] [src/infrastructure/config.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/infrastructure/config.ts)

- Zod schema definition and `loadConfig()` function signature.

#### [NEW] [src/infrastructure/retry.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/infrastructure/retry.ts)

- `retry()` function signature.

#### [NEW] [src/infrastructure/logger.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/infrastructure/logger.ts)

- Pino logger export.

#### [NEW] [src/infrastructure/renderer.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/infrastructure/renderer.ts)

- `renderMarkdown()` function signature.

#### [NEW] [src/cli.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/cli.ts)

- `bootstrap()` function and CLI setup shell.

---

### Tests Skeleton (`tests/`)

#### [NEW] [tests/unit/diff-parser.test.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/tests/unit/diff-parser.test.ts)

#### [NEW] [tests/unit/prompt-builder.test.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/tests/unit/prompt-builder.test.ts)

#### [NEW] [tests/unit/response-parser.test.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/tests/unit/response-parser.test.ts)

#### [NEW] [tests/unit/orchestrator.test.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/tests/unit/orchestrator.test.ts)

- Skeleton Vitest test files.

---

## Verification Plan

### Automated Tests & Tooling Checks

- `pnpm install`: Installs dependencies via `pnpm`.
- `pnpm run typecheck`: Runs `tsc --noEmit` to verify type safety across all skeleton files and path aliases.
- `pnpm run lint`: Runs ESLint check across `src/` and `tests/`.
- `pnpm run format`: Runs Prettier format check.
- `pnpm run test`: Runs Vitest test runner.
