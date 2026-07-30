# Implementation Plan — Phase 8: CLI

Build a thin CLI entry point for ReviewPilot that parses arguments, wires dependencies, invokes `ReviewOrchestrator.review()`, and renders plain-text output with appropriate exit codes.

---

## Current State Analysis

The existing [cli.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/cli.ts) has several issues that conflict with Phase 8 requirements:

| Issue                   | Current                                                      | Required                                              |
| ----------------------- | ------------------------------------------------------------ | ----------------------------------------------------- |
| **Command format**      | `--owner <owner> --repo <repo>` (two flags)                  | `--repo owner/repo` (single flag, `owner/repo` split) |
| **Program name**        | `ai-review`                                                  | `reviewpilot` with `review` subcommand                |
| **Output**              | `renderMarkdown(report)` — produces markdown with badges     | Plain text, comments grouped by file                  |
| **Exit codes**          | Only `process.exit(1)` on error                              | `0` success, `1` app error, `2` invalid args          |
| **Argument validation** | No `owner/repo` format validation                            | Must validate `owner/repo` contains exactly one `/`   |
| **`bootstrap` export**  | Exported for tests but tightly couples config + construction | Keep but refine for testability                       |

---

## Design

### Command Interface

```
reviewpilot review --repo owner/repo --pr 123 [--provider openai] [--verbose]
```

| Flag                  | Required | Description                                            |
| --------------------- | -------- | ------------------------------------------------------ |
| `--repo <owner/repo>` | Yes      | GitHub repository in `owner/repo` format               |
| `--pr <number>`       | Yes      | Pull Request number                                    |
| `--provider <name>`   | No       | AI provider override (`openai`, `gemini`, `anthropic`) |
| `--verbose`           | No       | Log startup configuration (non-sensitive fields only)  |

### Argument Parsing

- Use `commander` (already a dependency) with a `review` subcommand.
- Validate `--repo` contains exactly one `/` character; exit with code `2` if invalid.
- Validate `--pr` is a positive integer; exit with code `2` if invalid.

### Dependency Wiring

Sequential, no framework:

1. `loadConfig(overrides)` — merges CLI args → env vars → defaults
2. `createProvider(config.ai)` — instantiate AI provider
3. `new GitHubAdapter(config.github)` — instantiate GitHub adapter
4. `new ReviewOrchestrator(provider, github, config)` — construct orchestrator

### Workflow

```
Parse args → Validate → loadConfig → wire deps → orchestrator.review(request) → renderPlainText(report) → exit(0)
                                                        ↓ AppError
                                                  print error → exit(1)
         ↓ invalid args
   print usage → exit(2)
```

### Plain-Text Output Format

```
═══════════════════════════════════════
  ReviewPilot — Code Review Report
═══════════════════════════════════════

  Repository:     owner/repo
  Pull Request:   #123 — PR Title Here
  Provider:       openai (gpt-4o)
  Duration:       1234ms
  Files Reviewed: 3
  Files Skipped:  1
  Total Comments: 5

───────────────────────────────────────
  Findings
───────────────────────────────────────

  src/main.ts

    Line 15 [CRITICAL] Null dereference vulnerability
      Suggestion: if (obj) obj.do();

    Line 42 [WARNING] Unused variable

  src/utils.ts

    Line 8 [SUGGESTION] Consider using const

───────────────────────────────────────

  ✨ Review complete.
```

### Exit Codes

| Code | Condition                                                           |
| ---- | ------------------------------------------------------------------- |
| `0`  | Review completed successfully (even if `parserStatus === 'failed'`) |
| `1`  | `AppError` or unexpected error during execution                     |
| `2`  | Invalid or missing CLI arguments                                    |

---

## Proposed Changes

### Infrastructure Layer

#### [MODIFY] [renderer.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/infrastructure/renderer.ts)

- Add `renderPlainText(report: ReviewReport): string` — a pure function producing plain-text output formatted as above.
- **Keep** existing `renderMarkdown` function unchanged (may be useful for future file output or CI integrations).
- Group comments by file.
- Display severity as `[CRITICAL]`, `[WARNING]`, `[SUGGESTION]`, `[PRAISE]`.
- Include suggestion text indented below the comment when present.

---

### Entry Point

#### [MODIFY] [cli.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/cli.ts)

Complete rewrite:

- **Program**: `reviewpilot` with `review` subcommand via `commander`.
- **Argument parsing**: `--repo owner/repo` (split on `/`), `--pr <number>`, `--provider <name>`, `--verbose`.
- **Validation**: Check `owner/repo` format and positive integer PR number. Print usage hint and `process.exit(2)` on validation failure.
- **Verbose mode**: When `--verbose` is passed, log non-sensitive config fields (provider, model, log level) before invoking orchestrator.
- **Output**: Call `renderPlainText(report)` and write to `process.stdout`.
- **Error handling**: Catch `AppError` / generic `Error`, print error message to `process.stderr`, `process.exit(1)`.
- **Keep** `bootstrap()` function (refine to accept parsed CLI overrides).

---

### Tests Layer

#### [NEW] [cli.test.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/tests/unit/cli.test.ts)

Test the argument parsing and validation logic extracted into testable functions:

| Test Case                         | Description                                                           |
| --------------------------------- | --------------------------------------------------------------------- |
| **Valid `owner/repo` parsing**    | `"octocat/hello-world"` → `{ owner: "octocat", repo: "hello-world" }` |
| **Invalid repo format**           | `"noslash"`, `"too/many/slashes"` → validation error                  |
| **Valid PR number**               | `"123"` → `123`                                                       |
| **Invalid PR number**             | `"abc"`, `"-1"`, `"0"` → validation error                             |
| **Successful review output**      | `renderPlainText` produces expected plain-text structure              |
| **Orchestrator failure handling** | `AppError` → error message to stderr, exit code `1`                   |
| **Deterministic output**          | Same `ReviewReport` always produces identical plain text              |

#### [MODIFY] [renderer.test.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/tests/unit/renderer.test.ts) (or add tests inline in cli.test.ts)

- Test `renderPlainText` with various `ReviewReport` shapes: zero comments, multiple files, suggestions, all severity levels.

---

## Files to Modify / Create

- **[MODIFY]** `src/cli.ts` — Rewrite with `review` subcommand, argument validation, plain-text output, exit codes
- **[MODIFY]** `src/infrastructure/renderer.ts` — Add `renderPlainText(report): string`
- **[NEW]** `tests/unit/cli.test.ts` — Argument parsing, validation, and output tests

---

## Risks & Mitigations

| Risk                               | Impact                                                                         | Mitigation                                                                                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`process.exit()` in tests**      | Vitest process terminates during test execution                                | Extract argument validation and output rendering into pure testable functions; only call `process.exit()` in the `main()` entrypoint which is not directly unit-tested |
| **`--repo owner/repo` edge cases** | GitHub orgs/repos may contain hyphens, dots, underscores                       | Split strictly on first `/` only; no additional character restrictions beyond requiring exactly one `/`                                                                |
| **Commander parse errors**         | Commander may print its own error messages and exit before our validation runs | Use `commander`'s `.exitOverride()` to catch parse errors and map them to exit code `2`                                                                                |
