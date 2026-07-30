# AI Code Review Orchestrator (V1 MVP)

Provider-agnostic CLI tool for automatically reviewing GitHub Pull Requests using LLMs (OpenAI, Gemini, Anthropic) built with TypeScript and Clean Architecture principles.

## Features

- 🤖 **Provider Agnostic**: Out of the box support for OpenAI, Gemini, and Anthropic.
- 📦 **Clean Architecture**: Decoupled domain, application, and infrastructure layers.
- ⚡ **Bounded Concurrency**: Configurable parallel review of files with token efficiency.
- 🔄 **Resilient**: Exponential backoff retry for transient API rate-limits and timeouts.
- 📝 **Markdown Output**: Generates structured, human-readable review reports.

## Prerequisites

- Node.js >= 18
- npm or yarn

## Installation

```bash
npm install
npm run build
```

## Setup Environment Variables

Copy `.env.example` to `.env` and fill in your API tokens:

```bash
cp .env.example .env
```

```env
AICR_GITHUB_TOKEN=ghp_your_github_token
AICR_AI_PROVIDER=openai
AICR_AI_API_KEY=sk-your_openai_api_key
```

## Usage

```bash
# Using ts-node directly
npx ts-node src/cli.ts --owner <owner> --repo <repo> --pr <pr_number> [--provider openai|gemini|anthropic]

# Or compiled JS
node dist/cli.js --owner octocat --repo Hello-World --pr 42 --provider openai
```

## Testing

```bash
npm test
```
