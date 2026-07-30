# ReviewPilot Evaluation Benchmark

Benchmark framework for evaluating **ReviewPilot** against real-world GitHub Pull Requests. It measures review quality (precision, hallucinations, coverage) and cost (tokens, time) across AI providers (OpenAI, Gemini, Anthropic).

> **Status**: Framework and dataset only. Automated benchmark execution is **not implemented yet** — runs are performed manually via the CLI (see below).

---

## Folder Structure

```
evaluation/
├── README.md          # This document
├── prs.json           # Benchmark dataset: curated PR test cases
├── prs.schema.json    # JSON Schema validating prs.json
└── results/           # Manual run outputs + scored metrics (git-tracked)
    └── <case-id>/<provider>-<model>-<date>.md
```

---

## PR Test Case Schema

`prs.json` is validated by [`prs.schema.json`](./prs.schema.json). Top level:

| Field     | Type   | Description                        |
| --------- | ------ | ---------------------------------- |
| `version` | string | Dataset semver (e.g. `1.0.0`)      |
| `cases`   | array  | List of PR test cases (see below)  |

Each entry in `cases`:

| Field                | Type    | Required | Description                                                                                       |
| -------------------- | ------- | -------- | ------------------------------------------------------------------------------------------------- |
| `id`                 | string  | ✅       | Unique kebab-case identifier, used to name result files (e.g. `express-bug-fix-small`)            |
| `repository`         | string  | ✅       | GitHub repository in `owner/repo` format                                                          |
| `pullRequest`        | integer | ✅       | Pull Request number                                                                                |
| `category`           | enum    | ✅       | `bug-fix`, `feature`, `refactor`, `security`, `performance`, `documentation`, `test`, `dependency-upgrade`, `config` |
| `changedFiles`       | integer | ✅       | Number of files changed in the PR                                                                  |
| `expectedDifficulty` | enum    | ✅       | `easy`, `medium`, `hard` — expected difficulty for an AI reviewer                                  |
| `notes`              | string  | ✅       | Human context: what the PR does, issues the reviewer should catch, hallucination traps             |
| `languages`          | array   | ➖       | Primary languages in the diff                                                                      |
| `knownIssues`        | array   | ➖       | Ground-truth findings (`file`, `line`, `severity`, `description`) used to score Missing Findings. Severity uses the domain enum: `CRITICAL`, `WARNING`, `SUGGESTION`, `PRAISE` |

### Example

```json
{
  "id": "express-bug-fix-small",
  "repository": "expressjs/express",
  "pullRequest": 5555,
  "category": "bug-fix",
  "changedFiles": 2,
  "expectedDifficulty": "easy",
  "languages": ["javascript"],
  "notes": "Small, focused bug fix. Reviewer should confirm correctness and check for missing edge-case tests.",
  "knownIssues": []
}
```

---

## How to Add a New Benchmark Case

1. **Pick a real PR** — preferably merged and stable (closed PRs won't change under you). Aim for variety across `category`, `expectedDifficulty`, size, and language.
2. **Read the PR yourself** and record ground truth:
   - What issues *should* a competent reviewer flag? Add them to `knownIssues`.
   - What intentional patterns might *trick* an AI into false positives? Document them in `notes`.
3. **Append the entry** to the `cases` array in [`prs.json`](./prs.json), following the schema. Use a unique kebab-case `id`.
4. **Validate** against the schema, e.g.:
   ```bash
   npx ajv-cli validate -s evaluation/prs.schema.json -d evaluation/prs.json --spec=draft2020
   ```
5. Keep the dataset balanced: roughly ⅓ easy / ⅓ medium / ⅓ hard, and no single category dominating.

---

## How to Execute Benchmarks Manually

Automated execution is not implemented yet. For each case × provider:

1. **Configure the provider** in `.env` (`AICR_AI_PROVIDER`, `AICR_AI_MODEL`, `AICR_AI_API_KEY`).
2. **Run the review**, timing it:
   ```bash
   time pnpm dev review --repo expressjs/express --pr 5555 --provider openai --verbose
   ```
3. **Save the output** to `results/<case-id>/<provider>-<model>-<YYYY-MM-DD>.md`, e.g.:
   ```
   results/express-bug-fix-small/openai-gpt-4o-2026-07-30.md
   ```
4. **Record run metadata** at the top of the result file:
   - provider, model, temperature
   - wall-clock review time (from `time`)
   - input/output tokens (from provider usage logs — run with `--verbose`)
5. **Score the run** manually against the metrics below, and record scores in a `## Metrics` section of the result file.

Repeat with each provider (`openai`, `gemini`, `anthropic`) using identical settings otherwise (same temperature, same dataset revision).

---

## Evaluation Metrics

Each run is scored on the following metrics. A **finding** is one review comment produced by ReviewPilot.

| Metric                | Definition                                                                                       | Formula / Scale                                        | Direction   |
| --------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------ | ----------- |
| **Precision**         | Share of findings that are factually correct and applicable to the actual diff                    | `correct findings / total findings`                    | Higher ✅   |
| **Hallucination Rate**| Share of findings referencing non-existent code, wrong lines/files, or invented behavior          | `hallucinated findings / total findings`               | Lower ✅    |
| **Duplicate Findings**| Findings that restate another finding on the same issue (same root cause, same location)          | absolute count                                         | Lower ✅    |
| **Missing Findings**  | Ground-truth `knownIssues` the reviewer failed to report                                          | `missed knownIssues / total knownIssues`               | Lower ✅    |
| **Usefulness**        | Human judgment: would a maintainer act on this review?                                            | 1–5 rubric (see below)                                 | Higher ✅   |
| **Review Time**       | Wall-clock time of the full CLI run                                                               | seconds                                                | Lower ✅    |
| **Input Tokens**      | Total prompt tokens sent to the provider across all files                                         | count (from provider usage response)                   | Lower ✅    |
| **Output Tokens**     | Total completion tokens returned by the provider                                                  | count (from provider usage response)                   | Lower ✅    |

### Usefulness Rubric (1–5)

| Score | Meaning                                                                       |
| ----- | ----------------------------------------------------------------------------- |
| 5     | Review catches real issues with actionable suggestions; a maintainer would merge the advice as-is |
| 4     | Mostly actionable; minor noise or vague phrasing                               |
| 3     | Mixed: some value, but noise requires filtering                                |
| 2     | Mostly generic/noisy; little actionable content                                |
| 1     | Misleading or entirely generic; worse than no review                           |

### Scoring Rules

- Classify every finding as exactly one of: **correct**, **incorrect (non-hallucinated)**, **hallucinated**, or **duplicate**. Duplicates are excluded from the Precision denominator.
- A finding "matches" a `knownIssue` if it identifies the same root cause — exact line numbers may differ by a small offset.
- `PRAISE`-severity comments are excluded from Precision/Hallucination scoring but count toward Usefulness.

---

## How to Compare Providers

1. **Fix all variables except the provider**: same dataset revision, same temperature (`AICR_AI_TEMPERATURE=0.1`), same concurrency, same prompts.
2. **Run every case at least twice per provider** to smooth out non-determinism; average the metrics.
3. **Aggregate per provider** across all cases:
   - Quality: mean Precision, mean Hallucination Rate, total Missing Findings, mean Usefulness
   - Cost: total Input + Output Tokens, mean Review Time
4. **Break down by dimension** — compare providers per `category` and per `expectedDifficulty`, since a provider may excel on easy bug fixes but degrade on hard security reviews.
5. **Summarize** in a comparison table, e.g.:

   | Provider  | Model  | Precision | Halluc. Rate | Missing | Usefulness | Avg Time | Tokens (in/out) |
   | --------- | ------ | --------- | ------------ | ------- | ---------- | -------- | ---------------- |
   | openai    | gpt-4o | —         | —            | —       | —          | —        | —                |
   | gemini    | —      | —         | —            | —       | —          | —        | —                |
   | anthropic | —      | —         | —            | —       | —          | —        | —                |

6. **Decision guidance**: prefer the provider with the best Precision-to-Hallucination trade-off first; use tokens/time as a tiebreaker. A cheap provider with high hallucination rate erodes reviewer trust and is a net negative.

---

## Evaluation Criteria (What "Good" Looks Like)

A ReviewPilot run on a benchmark case is considered **passing** when:

- **Precision ≥ 0.8** — at least 4 of 5 findings are correct
- **Hallucination Rate ≤ 0.1** — hallucinations are rare exceptions
- **Missing Findings = 0** for `easy` cases; ≤ 1 for `medium`; documented tolerance for `hard`
- **Usefulness ≥ 4** on the rubric
- Duplicates do not exceed **10%** of total findings

These thresholds are the initial baseline (`v1.0.0` of the dataset) and should be revisited as the dataset grows.

---

## Roadmap

- [ ] Phase 10.2 — Automated benchmark runner (`pnpm bench`) executing all cases from `prs.json`
- [ ] Automated result diffing against `knownIssues` ground truth
- [ ] Token/cost capture from provider usage APIs into structured JSON results
- [ ] CI regression gate: fail when Precision drops below baseline
