# Implementation Plan — Phase 4: Prompt Builder (`buildPrompt`)

Implement a pure, deterministic **Prompt Builder** in `src/application/prompt-builder.ts` with no side-effects or direct filesystem access. Comprehensive Vitest tests will be added in `tests/unit/prompt-builder.test.ts`.

---

## User Review Required

> [!IMPORTANT]
>
> - **Pure Function Guarantee**: `buildPrompt` will accept template content and input objects as parameters. No filesystem IO or API calls will occur inside `buildPrompt`.
> - **Template Placeholders Supported**:
>   - `{{prTitle}}`: Pull Request title
>   - `{{filename}}`: Filename (supports Unicode and paths)
>   - `{{language}}`: Language identifier (e.g. `typescript`, `python`)
>   - `{{additions}}`: Number of added lines
>   - `{{deletions}}`: Number of deleted lines
>   - `{{patch}}`: Diff patch content (formatted safely)
> - **Determinism & Safety**: Same inputs will strictly generate identical outputs bit-for-bit. Handles empty patches, large patches, and Unicode filenames gracefully.

---

## Proposed Changes

### Application Layer

#### [MODIFY] [prompt-builder.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/application/prompt-builder.ts)

- Implement `BuildPromptOptions` interface:
  ```typescript
  export interface BuildPromptOptions {
    file: FileDiff;
    systemTemplate: string;
    userTemplate: string;
    prTitle?: string;
  }
  ```
- Support overload / signature allowing `buildPrompt(file, systemTemplate, userTemplate, prTitle?)` or `buildPrompt(options: BuildPromptOptions)`.
- Implement internal pure helper functions:
  - `interpolate(template: string, vars: Record<string, string>): string`
  - `sanitizePatch(patch: string): string`
- Return `{ systemPrompt: string; userPrompt: string }`.

---

### Tests Layer

#### [MODIFY] [prompt-builder.test.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/tests/unit/prompt-builder.test.ts)

- Expand Vitest unit test suite to cover:
  1. **Single file prompt construction**: Standard file diff with templates.
  2. **PR title inclusion**: Correct interpolation of `{{prTitle}}`.
  3. **Empty patch**: Formatting when `file.patch` is empty string.
  4. **Multiple files / repeated calls**: Verifying bit-for-bit deterministic output across multiple invocations.
  5. **Unicode filenames**: Filenames containing non-ASCII characters (e.g., `src/chữ_việt.ts`, `docs/日本語.md`, emojis).
  6. **Very large patches**: Handling multi-megabyte patch strings without truncation or corruption.
  7. **Markdown code block escaping**: Ensuring code blocks within patches do not break host template markdown syntax.

---

## Verification Plan

### Automated Tests & Tooling Checks

- `pnpm run typecheck`: Validates strict TypeScript compilation.
- `pnpm run lint`: Ensures zero ESLint errors and warnings.
- `pnpm run format`: Ensures Prettier code style compliance.
- `pnpm test`: Runs all unit tests including expanded `prompt-builder.test.ts`.
