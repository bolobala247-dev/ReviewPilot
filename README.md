# AI Code Review Orchestrator (ReviewPilot V1 Skeleton)

Provider-agnostic CLI tool for automatically reviewing GitHub Pull Requests using LLMs (OpenAI, Gemini, Anthropic) built with TypeScript and Clean Architecture principles.

## Tech Stack & Tooling

- **Language**: TypeScript
- **Package Manager**: pnpm
- **Test Runner**: Vitest
- **Linting & Formatting**: ESLint & Prettier
- **Git Hooks**: Husky & lint-staged

## Project Structure

```
src/
├── domain/          # Entities, value objects, ports, and errors
├── application/     # Orchestrator use-case & pure helper functions
├── infrastructure/  # AI & SCM adapters, logger, config, renderer
├── cli.ts           # CLI entry point & bootstrap setup
prompts/             # Prompt templates (system & per-file review)
tests/               # Vitest unit test suites
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Typecheck
pnpm run typecheck

# Run linter & formatter
pnpm run lint
pnpm run format

# Run tests
pnpm test
```
