# Implementation Plan — Phase 5: AI Provider Layer

Implement production-ready, strongly-typed AI Provider Adapters (`OpenAIAdapter`, `GeminiAdapter`, `AnthropicAdapter`) implementing the `IAIProvider` interface, along with the `createProvider(config)` factory function and unit tests with SDK mocks.

---

## User Review Required

> [!IMPORTANT]
>
> - **Pure Provider Abstraction**: Provider adapters only handle raw SDK communication. They do not parse responses, render markdown, build prompts, or execute retry loops.
> - **Privacy & Safe Logging**: Logs strictly log `{ provider, model, durationMs, tokensUsed }`. Prompts, code diffs, responses, and API keys are **never** passed to logger calls.
> - **Error Mapping to `AppError`**:
>   - Missing API key / Invalid provider → `AppError(ErrorCode.CONFIG_ERROR, ...)`
>   - 401 / Authentication Error → `AppError(ErrorCode.AUTH_FAILED, ..., isRetryable: false)`
>   - 429 / Rate Limit → `AppError(ErrorCode.RATE_LIMIT, ..., isRetryable: true)`
>   - 5xx / SDK Exception → `AppError(ErrorCode.PROVIDER_ERROR, ..., isRetryable: true)`

---

## Proposed Changes

### Infrastructure Layer

#### [MODIFY] [openai.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/infrastructure/providers/openai.ts)

- Validate `apiKey` on construction.
- Call `openai.chat.completions.create`.
- Return `{ content: string, tokensUsed: number, model: string }`.
- Time duration with `performance.now()` / `Date.now()`.
- Map errors to `AppError`.

#### [MODIFY] [gemini.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/infrastructure/providers/gemini.ts)

- Validate `apiKey` on construction.
- Use `GoogleGenerativeAI` (`getGenerativeModel` + `generateContent`).
- Return raw response string, model, and total tokens.
- Map errors to `AppError`.

#### [MODIFY] [anthropic.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/infrastructure/providers/anthropic.ts)

- Validate `apiKey` on construction.
- Call `anthropic.messages.create`.
- Extract raw text content from message response blocks.
- Map errors to `AppError`.

#### [MODIFY] [index.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/infrastructure/providers/index.ts)

- Implement `createProvider(config: AppConfig): IAIProvider`.
- Simple `switch` statement over `config.ai.provider` (`'openai'`, `'gemini'`, `'anthropic'`).

---

### Tests Layer

#### [NEW] [providers.test.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/tests/unit/providers.test.ts)

- Comprehensive Vitest unit tests with mocks for `openai`, `@google/generative-ai`, and `@anthropic-ai/sdk`.
- Test Cases:
  1. **OpenAIAdapter**: Successful completion, 401 Auth Error, 429 Rate Limit, network/SDK exception.
  2. **GeminiAdapter**: Successful generation, 401 Auth Error, 429 Rate Limit, SDK exception.
  3. **AnthropicAdapter**: Successful message creation, 401 Auth Error, 429 Rate Limit, SDK exception.
  4. **`createProvider` Factory**:
     - Correct instantiation for `'openai'`, `'gemini'`, `'anthropic'`.
     - Throws `CONFIG_ERROR` for missing API key.
     - Throws `CONFIG_ERROR` for unsupported provider string.

---

## Verification Plan

### Automated Tests & Tooling Checks

- `pnpm run typecheck`: Validates strict TypeScript compilation (zero `any`).
- `pnpm run lint`: Validates zero ESLint errors or warnings.
- `pnpm run format`: Ensures Prettier formatting compliance.
- `pnpm test`: Runs all unit tests including new `providers.test.ts`.
