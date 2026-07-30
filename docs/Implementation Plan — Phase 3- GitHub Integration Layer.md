# Implementation Plan — Phase 3: GitHub Integration Layer (`GitHubAdapter`)

Implement a production-ready, strongly-typed **GitHub Integration Layer** in `src/infrastructure/github.ts` with Octokit, multi-page pagination support, custom `AppError` wrapping, pino logging, and comprehensive unit tests with Octokit mocking in `tests/unit/github.test.ts`.

---

## User Review Required

> [!IMPORTANT]
>
> - **Public API Surface**: `GitHubAdapter` exposes a single public method: `fetchPullRequest(owner: string, repo: string, prNumber: number): Promise<{ prTitle: string; files: FileDiff[] }>`.
> - **Error Wrapping**: Maps Octokit HTTP status codes to domain error codes:
>   - `404` → `AppError(ErrorCode.GITHUB_ERROR, "...", isRetryable: false)`
>   - `401 / 403` → `AppError(ErrorCode.AUTH_FAILED, "...", isRetryable: false)`
>   - `429` → `AppError(ErrorCode.RATE_LIMIT, "...", isRetryable: true)`
>   - Other/5xx → `AppError(ErrorCode.GITHUB_ERROR, "...", isRetryable: true)`
> - **Pagination**: Uses Octokit's `paginate` method (`octokit.paginate(octokit.pulls.listFiles, ...)`), fetching all pages of changed files seamlessly regardless of file count.
> - **No `any` Types**: Fully typed using Octokit REST response types and internal domain interfaces (`FileDiff`).

---

## Proposed Changes

### Infrastructure Layer

#### [MODIFY] [github.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/infrastructure/github.ts)

- Implement `GitHubAdapter` class.
- Inject `GitHubConfig` via constructor (`{ token: string }`).
- Implement private helper methods:
  - `fetchPRDetails(owner, repo, prNumber)`: Calls `octokit.pulls.get`.
  - `fetchPRFiles(owner, repo, prNumber)`: Calls `octokit.paginate(octokit.pulls.listFiles, ...)`.
  - `mapToFileDiff(file)`: Pure helper mapping GitHub file payload to `FileDiff`.
  - `detectLanguage(filename)`: Extension-to-language mapper.
  - `handleOctokitError(error, context)`: Maps Octokit errors to `AppError`.

---

### Tests Layer

#### [NEW] [github.test.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/tests/unit/github.test.ts)

- Comprehensive Vitest unit tests for `GitHubAdapter` with mocked Octokit.
- Test Cases:
  1. **Successful PR fetch**: Verifies PR title and mapped `FileDiff[]` array.
  2. **Missing PR (404)**: Verifies `AppError` with `ErrorCode.GITHUB_ERROR` and `isRetryable = false`.
  3. **Unauthorized Token (401/403)**: Verifies `AppError` with `ErrorCode.AUTH_FAILED` and `isRetryable = false`.
  4. **Rate Limit (429)**: Verifies `AppError` with `ErrorCode.RATE_LIMIT` and `isRetryable = true`.
  5. **Pagination**: Simulates multi-page API responses via `paginate`.
  6. **Empty PR**: Verifies handling of PRs with 0 changed files.
  7. **Retry Integration**: Verifies compatibility when wrapped in `retry()` utility.

---

## Verification Plan

### Automated Tests & Tooling Checks

- `pnpm run typecheck`: Ensures strict type safety without `any` types.
- `pnpm run lint`: Verifies zero ESLint errors and warnings.
- `pnpm run format`: Ensures Prettier formatting compliance.
- `pnpm test`: Runs all unit tests including new `github.test.ts`.
