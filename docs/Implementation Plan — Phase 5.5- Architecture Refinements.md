# Implementation Plan — Phase 5.5: Architecture Refinements

Apply targeted architecture refinements to improve maintainability, reduce coupling, and refine error handling while strictly preserving the approved 3-layer Clean Architecture.

---

## User Review Required

> [!IMPORTANT]
>
> - **Package Renaming**: Rename package in `package.json` to `reviewpilot` (or `@reviewpilot/core`).
> - **Shared `AIResponse` DTO**: Standardize `AIResponse` interface in `src/domain/ports.ts`:
>   ```typescript
>   export interface AIResponse {
>     content: string;
>     model: string;
>     tokensUsed?: number;
>   }
>   ```
> - **`FileDiff` Patch Optionality**: Update `FileDiff.patch?: string`. `GitHubAdapter` preserves original `undefined` for binary/patchless files. `PromptBuilder` formats missing patches as `(no patch available)`.
> - **Language Utility Extraction**: Create `src/infrastructure/language.ts` (`getFileLanguage(filename: string): string`) to keep `GitHubAdapter` strictly focused on GitHub API communication.
> - **Safe Error Type Narrowing**: Replace `as { status?: number }` casts in `GitHubAdapter` with runtime type guards (e.g. `RequestError` from `@octokit/request-error` or `isHttpError(err)` helper).

---

## Proposed Changes

### Configuration & Package

#### [MODIFY] [package.json](file:///Users/dabeeovina/Documents/AI-mcp-tool/package.json)

- Rename `"name": "reviewpilot"`.
- Ensure `"engines": { "node": ">=22" }` and `"packageManager": "pnpm@10.0.0"`.

---

### Domain Layer

#### [MODIFY] [types.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/domain/types.ts)

- Update `FileDiff`:
  ```typescript
  export interface FileDiff {
    filename: string;
    language: string;
    patch?: string;
    additions: number;
    deletions: number;
  }
  ```

#### [MODIFY] [ports.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/domain/ports.ts)

- Standardize `AIResponse` DTO:
  ```typescript
  export interface AIResponse {
    content: string;
    model: string;
    tokensUsed?: number;
  }

  export interface IAIProvider {
    readonly name: string;
    review(request: AIReviewRequest): Promise<AIResponse>;
  }
  ```

---

### Infrastructure Layer

#### [NEW] [language.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/infrastructure/language.ts)

- Export `getFileLanguage(filename: string): string` pure utility function.

#### [MODIFY] [github.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/infrastructure/github.ts)

- Import `getFileLanguage` from `./language`.
- Preserve `patch: file.patch ?? undefined` (instead of coercing to `''`).
- Narrow Octokit errors safely using `RequestError` or helper.

#### [MODIFY] [providers/openai.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/infrastructure/providers/openai.ts)

#### [MODIFY] [providers/gemini.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/infrastructure/providers/gemini.ts)

#### [MODIFY] [providers/anthropic.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/infrastructure/providers/anthropic.ts)

- Return `AIResponse` DTO.
- Remove `as any` type casts in error handlers using type guard helpers.

---

### Application Layer

#### [MODIFY] [diff-parser.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/application/diff-parser.ts)

#### [MODIFY] [prompt-builder.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/application/prompt-builder.ts)

#### [MODIFY] [orchestrator.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/application/orchestrator.ts)

- Handle optional `file.patch?: string` safely in `diff-parser.ts` and `prompt-builder.ts`.
- Update orchestrator for `AIResponse`.

---

### Tests Layer

#### [MODIFY] [github.test.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/tests/unit/github.test.ts)

#### [MODIFY] [providers.test.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/tests/unit/providers.test.ts)

- Verify edge cases:
  - Binary file (`patch` undefined preserved in `FileDiff`)
  - Renamed files
  - Pagination at 100 and 101 files
  - Provider returning no token usage (`tokensUsed` undefined or `0`)
  - Empty AI response

---

## Verification Plan

### Automated Tests & Tooling Checks

- `pnpm run typecheck`: Validates strict TypeScript compilation without type assertions.
- `pnpm run lint`: Validates zero ESLint errors or warnings.
- `pnpm run format`: Validates Prettier compliance.
- `pnpm test`: Runs all unit tests.
