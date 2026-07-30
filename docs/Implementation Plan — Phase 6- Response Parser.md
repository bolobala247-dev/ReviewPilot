# Implementation Plan — Phase 6: Response Parser

Redesign the Response Parser to robustly convert raw `AIResponse.content` into `ReviewComment[]` objects with graceful handling of malformed, partial, and edge-case AI outputs.

---

## Current State Analysis

The existing [response-parser.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/application/response-parser.ts) already provides a working foundation:

- **`parseResponse(rawContent: string, filename: string): ReviewComment[]`** — parses JSON, strips markdown fences, extracts comments, falls back to raw text.
- **`stripMarkdownCodeBlocks`** — removes ` ```json ` / ` ``` ` wrappers.
- **`extractCommentsFromObject`** — validates each comment object and maps to `ReviewComment`.
- **`parseSeverity`** — fuzzy-matches severity strings to `ReviewSeverity` enum.

The existing test suite ([response-parser.test.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/tests/unit/response-parser.test.ts)) covers only 3 basic cases: valid JSON, markdown-fenced JSON, and non-JSON fallback.

---

## Design Decisions

> [!IMPORTANT]
> **Scope boundary**: The parser receives `rawContent: string` (from `AIResponse.content`) and a `filename: string`. It returns `ReviewComment[]`. It does **not** construct `ReviewReport` — that responsibility remains in the [orchestrator](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/application/orchestrator.ts#L109-L124), which assembles `ReviewReport` from accumulated comments, metadata, and PR context.

### Why not return `ReviewReport`?

The `ReviewReport` type includes fields that the parser has no access to: `repo`, `prNumber`, `prTitle`, `reviewedFiles`, `skippedFiles`, `metadata.provider`, `metadata.model`, `metadata.totalTokens`, `metadata.durationMs`, `metadata.timestamp`. These are orchestration-level concerns. Making the parser return `ReviewReport` would either:

- Require passing all orchestration context into the parser (violating single responsibility), or
- Return a partially-populated `ReviewReport` with empty/default fields (misleading API).

The current contract `parseResponse(rawContent, filename) → ReviewComment[]` is clean and correct.

---

## Proposed Changes

### Application Layer

#### [MODIFY] [response-parser.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/src/application/response-parser.ts)

Refactor to improve robustness while preserving the existing public API signature:

**`parseResponse(rawContent: string, filename: string): ReviewComment[]`**

Parsing strategy (multi-layer, in order of preference):

1. **Direct JSON parse** — `JSON.parse(stripMarkdownCodeBlocks(rawContent))`
2. **Embedded JSON extraction** — Find the first `{...}` or `[...]` block containing a `"comments"` key
3. **Graceful fallback** — Return a single `WARNING`-severity comment containing the raw text

Internal pure helper functions (refactored for clarity and testability):

| Function                                                                  | Responsibility                                                                                 |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `stripMarkdownCodeBlocks(text: string): string`                           | Remove ` ```json ` / ` ``` ` wrappers, handle whitespace                                       |
| `extractComments(obj: unknown, filename: string): ReviewComment[]`        | Safely extract and validate comment objects from parsed JSON                                   |
| `validateComment(item: unknown, filename: string): ReviewComment \| null` | Validate a single comment object with safe field extraction — returns `null` for invalid items |
| `parseSeverity(val: unknown): ReviewSeverity`                             | Fuzzy-match severity strings with fallback to `SUGGESTION`                                     |
| `deduplicateComments(comments: ReviewComment[]): ReviewComment[]`         | Remove exact-duplicate comments (same file + line + message)                                   |

Key improvements:

- **Deduplication**: Remove duplicate findings (same `file` + `line` + `message` triple).
- **Safe validation**: `validateComment` validates each field individually using runtime type checks — never crashes on unexpected shapes.
- **Unicode safety**: All string operations use standard `String()` coercion and `trim()` — no assumptions about encoding.
- **No new error types**: Parser never throws. Returns empty array or fallback comment for all failure modes. Debug-level logging for parse failures.

---

### Tests Layer

#### [MODIFY] [response-parser.test.ts](file:///Users/dabeeovina/Documents/AI-mcp-tool/tests/unit/response-parser.test.ts)

Expand from 3 to ~15 test cases:

| Test Case                              | Description                                                 |
| -------------------------------------- | ----------------------------------------------------------- |
| Valid JSON response                    | Standard `{ comments: [...] }` object                       |
| Markdown-fenced JSON                   | ` ```json { ... } ``` ` wrapper                             |
| Empty response (`""`)                  | Returns empty `ReviewComment[]`                             |
| Whitespace-only response               | Returns empty `ReviewComment[]`                             |
| `null` / `undefined` coerced to string | Returns empty array gracefully                              |
| Malformed JSON (truncated)             | Falls back to raw-text comment                              |
| Partially valid response               | Some comments valid, some invalid — keeps only valid ones   |
| Missing `comments` key                 | Handles `{ findings: [...] }` or bare array `[...]`         |
| Duplicated findings                    | Same file+line+message deduplicated                         |
| Unicode in messages and suggestions    | Preserves emoji, CJK, accented characters                   |
| Missing severity field                 | Defaults to `SUGGESTION`                                    |
| Unknown severity string                | Fuzzy-matches (`"error"` → `CRITICAL`, `"good"` → `PRAISE`) |
| Large response (1000+ comments)        | Parses without performance degradation                      |
| Extra whitespace and newlines          | Handles leading/trailing whitespace in all fields           |
| Deterministic parsing                  | Same input always produces identical output                 |

---

## Files to Modify

- **[MODIFY]** `src/application/response-parser.ts` — Refactor with deduplication, improved validation helpers
- **[MODIFY]** `tests/unit/response-parser.test.ts` — Expand to ~15 comprehensive test cases

No other files are modified. The parser's public API (`parseResponse(rawContent, filename) → ReviewComment[]`) is unchanged, so the orchestrator requires no updates.

---

## Risks & Mitigations

| Risk                                                    | Impact                                                                                   | Mitigation                                                                                                   |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Regex extraction matches wrong JSON block**           | Could parse unrelated JSON embedded in AI response                                       | Match only blocks containing `"comments"` key; prefer the first valid match                                  |
| **Deduplication drops intentionally-repeated comments** | Unlikely but possible if AI legitimately flags the same line twice with the same message | Deduplicate on exact triple (`file` + `line` + `message`); different messages on the same line are preserved |
| **Performance on very large responses**                 | Could slow down if AI returns thousands of comments                                      | Linear-time parsing; no recursive structures. Acceptable for V1                                              |
