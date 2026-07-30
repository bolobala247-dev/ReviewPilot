# Implementation Plan — Phase 7: Review Orchestrator

Redesign the `ReviewOrchestrator` to be a strict sequential coordinator that delegates to the approved components without performing any business logic itself.

---

## Current State Analysis

The existing [orchestrator.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/application/orchestrator.ts) has several issues that conflict with Phase 7 requirements:

| Issue                         | Current Behavior                                          | Required Behavior                                                                    |
| ----------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Concurrency**               | Worker pool with `concurrency` config (L55–99)            | Strict sequential processing                                                         |
| **Internal retry**            | Wraps provider calls with `retry()` (L74)                 | No retry — let errors propagate as `AppError`                                        |
| **Per-file AI calls**         | Loops over files, calling provider once per file (L58–96) | Single prompt for entire PR, single provider call                                    |
| **Template loading via `fs`** | Reads filesystem in `loadPromptTemplates()` (L127–141)    | Templates injected or loaded once; no `fs` in orchestrator                           |
| **Error swallowing**          | Catches per-file errors and silently skips (L90–94)       | GitHub/Provider errors propagate as `AppError`; Parser failures produce empty report |
| **`parseDiff` passthrough**   | Calls `parseDiff` which coerces patches to `''` (L36)     | `FileDiff.patch` is now `?: string \| undefined`; passthrough may need adjustment    |

---

## Design

### Sequential Workflow

```
ReviewRequest
    │
    ▼
① GitHubAdapter.fetchPullRequest(owner, repo, prNumber)
    │ → AppError on failure (propagates)
    ▼
② filterFiles(files, ignorePatterns, maxFileSizeBytes)
    │ → { keep: FileDiff[], skip: string[] }
    ▼
③ buildPrompt({ prTitle, files: keep, systemTemplate, userTemplate })
    │ → { systemPrompt, userPrompt, truncated }
    ▼
④ provider.review({ systemPrompt, userPrompt, temperature })
    │ → AIResponse (AppError on failure, propagates)
    ▼
⑤ parseResponse(response.content, defaultFilename)
    │ → ReviewComment[] (never throws; [] on failure)
    ▼
⑥ Assemble ReviewReport
    │
    ▼
Return ReviewReport
```

### Error Contract

| Failure Point      | Behavior                                                                           |
| ------------------ | ---------------------------------------------------------------------------------- |
| GitHub fails       | `AppError` propagates to caller                                                    |
| Provider fails     | `AppError` propagates to caller                                                    |
| Parser fails       | Returns `ReviewReport` with `comments: []` and `summary` describing parser failure |
| Empty PR (0 files) | Returns `ReviewReport` with `comments: []`, `reviewedFiles: []`                    |
| Empty AI response  | `parseResponse` returns `[]`; report has no comments                               |

---

## Proposed Changes

### Application Layer

#### [MODIFY] [orchestrator.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/application/orchestrator.ts)

Complete rewrite of the `run()` method:

- **Remove** `import { retry }` — no retry inside orchestrator.
- **Remove** concurrency worker pool — sequential single-pass workflow.
- **Remove** per-file AI provider calls — single `buildPrompt` call for the entire PR, single `provider.review` call.
- **Keep** `loadPromptTemplates()` private method for template loading (already exists, acceptable for V1).
- **Keep** `filterFiles()` for ignore patterns / max file size filtering.

Constructor signature remains frozen:

```typescript
constructor(
  private provider: IAIProvider,
  private github: GitHubAdapter,
  private config: AppConfig,
)
```

`run()` method simplified logic:

1. `startTime = Date.now()`
2. Log workflow start (`{ repo, pr, provider }`)
3. `prData = await this.github.fetchPullRequest(...)` — propagates `AppError`
4. `{ keep, skip } = filterFiles(prData.files, ...)` — pure, no side effects
5. If `keep.length === 0` → return empty `ReviewReport` immediately
6. `{ systemPrompt, userPrompt } = buildPrompt({ prTitle, files: keep, ... })`
7. `response = await this.provider.review({ systemPrompt, userPrompt, temperature })` — propagates `AppError`
8. `comments = parseResponse(response.content, keep[0]?.filename ?? 'unknown')` — never throws
9. Assemble and return `ReviewReport`
10. Log workflow end (`{ reviewedCount, commentsCount, durationMs }`)

Logging (safe fields only):

- Workflow start: `{ repo, pr, provider }`
- Files filtered: `{ totalFiles, keepCount, skipCount }`
- Workflow end: `{ reviewedCount, commentsCount, durationMs }`

---

#### [MODIFY] [diff-parser.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/application/diff-parser.ts)

Minor update to `parseDiff` and `filterFiles`:

- `parseDiff`: Stop coercing `patch` to empty string (`file.patch || ''` → `file.patch`). Respect the frozen `FileDiff.patch?: string | undefined` contract.
- `filterFiles`: Check `file.patch === undefined || file.patch.trim().length === 0` for skip logic (handle optional patch properly).

---

### Tests Layer

#### [MODIFY] [orchestrator.test.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/tests/unit/orchestrator.test.ts)

Expand from 1 to ~7 test cases:

| Test Case                       | Description                                                                                   |
| ------------------------------- | --------------------------------------------------------------------------------------------- |
| **Successful review**           | GitHub returns files, provider returns valid JSON, report has comments                        |
| **GitHub failure**              | `fetchPullRequest` throws `AppError` → orchestrator propagates it                             |
| **Provider failure**            | `provider.review` throws `AppError` → orchestrator propagates it                              |
| **Parser failure**              | `parseResponse` returns `[]` (malformed AI response) → empty comments, report still returned  |
| **Empty PR**                    | GitHub returns 0 files → report with `comments: []`, `reviewedFiles: []`, provider NOT called |
| **Empty AI response**           | Provider returns `content: ""` → `parseResponse` returns `[]` → empty comments                |
| **Deterministic orchestration** | Same inputs produce identical `ReviewReport` (excluding `timestamp`)                          |

---

## Files to Modify

- **[MODIFY]** `src/application/orchestrator.ts` — Rewrite `run()` to sequential single-pass workflow
- **[MODIFY]** `src/application/diff-parser.ts` — Fix `parseDiff` patch coercion for optional `patch`
- **[MODIFY]** `tests/unit/orchestrator.test.ts` — Expand to 7 comprehensive test cases

---

## Risks & Mitigations

| Risk                                                    | Impact                                                                                                               | Mitigation                                                                                                                                                                                 |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Single prompt for entire PR may exceed token limits** | Large PRs could produce prompts exceeding AI provider context window                                                 | `buildPrompt` already has `PromptLimits` safeguards (`maxFiles`, `maxTotalChars`) and sets `truncated: true`. The orchestrator can log a warning if truncated, but does not need to split. |
| **No retry means transient failures propagate**         | A single 429 or 5xx from the provider will fail the entire review                                                    | This is intentional per Phase 7 requirements. The caller (CLI or future CI integration) is responsible for retry at a higher level.                                                        |
| **Removing per-file review changes review granularity** | Previous orchestrator reviewed files individually; now a single combined prompt may produce different review quality | This aligns with the approved V1 design where `buildPrompt` builds a PR-level prompt. The system prompt already instructs the AI to return per-file comments with `file` fields.           |
