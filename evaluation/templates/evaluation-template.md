# AI Review Evaluation — {{REPOSITORY}}#{{PULL_REQUEST}}

> Manual evaluation of one benchmark run. Fill in every reviewer field by hand — scoring is never automated.

## Benchmark Result

| Field            | Value              |
| ---------------- | ------------------ |
| Repository       | {{REPOSITORY}}     |
| Pull Request     | #{{PULL_REQUEST}}  |
| Provider         | {{PROVIDER}}       |
| Model            | {{MODEL}}          |
| Run Timestamp    | {{TIMESTAMP}}      |
| Duration         | {{DURATION}}       |
| Tokens (in/out)  | {{TOKENS}}         |

## Findings

{{FINDINGS}}

## Reviewer Scores

Score each metric from **1 (worst) to 5 (best)**:

| Metric        | Score (1–5) | Comments |
| ------------- | ----------- | -------- |
| Precision     |             |          |
| Recall        |             |          |
| Hallucination |             |          |
| Duplicate     |             |          |
| Usefulness    |             |          |

Scoring guide:

- **Precision** — 5: every finding is correct and applicable; 1: mostly wrong findings
- **Recall** — 5: all real issues in the changed lines were caught; 1: obvious issues missed
- **Hallucination** — 5: no invented code/lines/behavior; 1: review is largely fabricated
- **Duplicate** — 5: every issue reported exactly once; 1: heavy repetition of the same issue
- **Usefulness** — 5: a maintainer would act on this review as-is; 1: worse than no review

## Overall Notes

_Free-form assessment: standout findings, notable misses, provider-specific behavior, verdict._

---

Reviewer: ____________  Date: ____________
