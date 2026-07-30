# ReviewPilot

> AI-powered code review orchestrator for GitHub Pull Requests — provider-agnostic, CLI-first, built with Clean Architecture.

> Công cụ điều phối review code bằng AI cho GitHub Pull Request — không phụ thuộc nhà cung cấp AI, chạy qua CLI, xây dựng theo Clean Architecture.

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A522-green.svg)
![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-ready-2088FF.svg)
![Tests](https://img.shields.io/badge/tests-77%20passing-brightgreen.svg)

---

## 📖 Introduction

🇺🇸 **English**

ReviewPilot fetches a GitHub Pull Request, filters the changed files, builds a structured review prompt, sends it to an AI provider (OpenAI, Google Gemini, or Anthropic Claude), parses the structured JSON response, and prints a plain-text review report to the console.

It exists to answer a practical problem: manual code review is slow and inconsistent, while raw LLM output is unstructured and hard to trust. ReviewPilot adds the missing orchestration layer — deterministic fetching, filtering, prompting, parsing, validation, and reporting — around any of the three major LLM APIs behind a single interface.

Target users:

- Developers who want a quick AI second opinion on a PR from the terminal.
- Teams that want automated review comments on every PR via GitHub Actions.
- Engineers comparing AI providers on real review workloads using the built-in benchmark framework.

---

🇻🇳 **Tiếng Việt**

ReviewPilot lấy dữ liệu một Pull Request trên GitHub, lọc các file thay đổi, dựng prompt review có cấu trúc, gửi tới một nhà cung cấp AI (OpenAI, Google Gemini, hoặc Anthropic Claude), phân tích phản hồi JSON có cấu trúc, và in báo cáo review dạng plain-text ra console.

Dự án giải quyết một vấn đề thực tế: review code thủ công thì chậm và thiếu nhất quán, còn output thô của LLM thì không có cấu trúc và khó tin cậy. ReviewPilot bổ sung tầng điều phối còn thiếu — fetch, lọc, dựng prompt, parse, kiểm tra và báo cáo một cách xác định — bao quanh cả ba API LLM lớn sau một interface duy nhất.

Đối tượng sử dụng:

- Developer muốn AI review nhanh một PR ngay từ terminal.
- Team muốn tự động comment review lên mọi PR qua GitHub Actions.
- Kỹ sư muốn so sánh các nhà cung cấp AI trên khối lượng review thực tế bằng benchmark framework có sẵn.

---

## ✨ Features

🇺🇸 **English**

- [x] **AI-powered PR review** — fetches the PR diff and produces structured findings with severity, line number, and suggestion.
- [x] **GitHub Pull Request support** — PR metadata and paginated file diffs via Octokit.
- [x] **Multiple AI providers** — OpenAI, Google Gemini, Anthropic Claude behind one `IAIProvider` port.
- [x] **Plain-text CLI report** — findings grouped by file, tagged `[CRITICAL]` / `[WARNING]` / `[SUGGESTION]` / `[PRAISE]`.
- [x] **Prompt builder** — Markdown templates in `prompts/` with hallucination-reduction rules, file/character budget, and built-in fallback templates.
- [x] **Structured response parser** — strict JSON parsing with code-fence stripping, deduplication, severity normalization, and safe empty fallback.
- [x] **File filtering** — skips empty patches, oversized diffs, and glob-style ignore patterns; skipped files are listed in the report.
- [x] **Type-safe configuration** — environment variables validated by a Zod schema at startup.
- [x] **Error handling** — typed `AppError` with error codes (`RATE_LIMIT`, `AUTH_FAILED`, `TIMEOUT`, …) and per-provider HTTP error mapping.
- [x] **Request timeouts** — configurable per-request timeout for every provider (default 30 s).
- [x] **Structured logging** — Pino logger with pretty output in development and configurable level.
- [x] **Execution metrics** — per-stage durations, token counts, and estimated USD cost shown in `--verbose` mode.
- [x] **GitHub Actions integration** — reusable workflow that posts the report as a PR comment with duplicate-comment prevention, dry-run mode, and graceful failure.
- [x] **Benchmark framework** — dataset-driven benchmark runner and manual quality-evaluation templates under `evaluation/`.

---

🇻🇳 **Tiếng Việt**

- [x] **Review PR bằng AI** — lấy diff của PR và tạo các phát hiện có cấu trúc gồm mức độ nghiêm trọng, số dòng và gợi ý sửa.
- [x] **Hỗ trợ GitHub Pull Request** — metadata PR và diff các file (có phân trang) qua Octokit.
- [x] **Nhiều nhà cung cấp AI** — OpenAI, Google Gemini, Anthropic Claude sau một port `IAIProvider` duy nhất.
- [x] **Báo cáo CLI dạng plain-text** — phát hiện gộp theo file, gắn nhãn `[CRITICAL]` / `[WARNING]` / `[SUGGESTION]` / `[PRAISE]`.
- [x] **Prompt builder** — template Markdown trong `prompts/` kèm quy tắc giảm ảo giác (hallucination), giới hạn số file/ký tự, và template dự phòng tích hợp sẵn.
- [x] **Parser phản hồi có cấu trúc** — parse JSON nghiêm ngặt, loại bỏ code-fence, khử trùng lặp, chuẩn hóa severity, và fallback an toàn về danh sách rỗng.
- [x] **Lọc file** — bỏ qua patch rỗng, diff quá lớn, và pattern ignore kiểu glob; file bị bỏ qua được liệt kê trong báo cáo.
- [x] **Cấu hình type-safe** — biến môi trường được kiểm tra bằng Zod schema ngay khi khởi động.
- [x] **Xử lý lỗi** — `AppError` có kiểu với mã lỗi (`RATE_LIMIT`, `AUTH_FAILED`, `TIMEOUT`, …) và ánh xạ lỗi HTTP theo từng provider.
- [x] **Timeout cho request** — timeout cấu hình được cho mọi provider (mặc định 30 giây).
- [x] **Logging có cấu trúc** — Pino logger, output đẹp khi phát triển, level cấu hình được.
- [x] **Số liệu thực thi** — thời gian từng giai đoạn, số token, và chi phí USD ước tính hiển thị ở chế độ `--verbose`.
- [x] **Tích hợp GitHub Actions** — reusable workflow đăng báo cáo thành comment trên PR, chống comment trùng lặp, có chế độ dry-run và graceful failure.
- [x] **Benchmark framework** — trình chạy benchmark theo dataset và template đánh giá chất lượng thủ công trong `evaluation/`.

---

## 🏗 Architecture

🇺🇸 **English**

ReviewPilot follows **Clean Architecture** (Ports & Adapters). Dependencies point inward: the domain knows nothing about frameworks; the application layer depends only on domain types and ports; the infrastructure layer implements the adapters.

```
                        CLI (src/cli.ts)
                             │
                             ▼
                      ReviewOrchestrator
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
  GitHubAdapter        PromptBuilder         AIProvider
  (Octokit)            (templates +          (OpenAI / Gemini /
        │               budgets)              Anthropic adapter)
        ▼                                         │
   DiffParser                                     ▼
   (filtering)                             ResponseParser
                                           (strict JSON)
                                                  │
                                                  ▼
                                              Renderer
                                           (plain-text report)
```

| Layer              | Location              | Responsibility                                                                                                                                                                                                               |
| ------------------ | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Domain**         | `src/domain/`         | Enterprise types (`ReviewComment`, `ReviewReport`, `ReviewSeverity`, `ExecutionMetrics`), the `IAIProvider` port, and the `AppError` / `ErrorCode` error model. No external dependencies.                                    |
| **Application**    | `src/application/`    | Use-case logic: `ReviewOrchestrator` (workflow), `diff-parser` (normalize + filter files), `prompt-builder` (template interpolation + budgets), `response-parser` (JSON validation + dedupe). Pure functions where possible. |
| **Infrastructure** | `src/infrastructure/` | Adapters and drivers: GitHub (Octokit), the three AI provider SDK adapters, Zod config loading, Pino logger, cost estimator, language detection, retry utility, and the plain-text renderer.                                 |

A single review is **one AI request per PR**: all kept file diffs are combined into one prompt (up to 50 files / 200,000 characters, truncated beyond that).

---

🇻🇳 **Tiếng Việt**

ReviewPilot theo **Clean Architecture** (Ports & Adapters). Phụ thuộc luôn hướng vào trong: domain không biết gì về framework; tầng application chỉ phụ thuộc vào domain types và ports; tầng infrastructure hiện thực các adapter.

| Tầng               | Vị trí                | Trách nhiệm                                                                                                                                                                                                            |
| ------------------ | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Domain**         | `src/domain/`         | Các kiểu nghiệp vụ (`ReviewComment`, `ReviewReport`, `ReviewSeverity`, `ExecutionMetrics`), port `IAIProvider`, và mô hình lỗi `AppError` / `ErrorCode`. Không có phụ thuộc bên ngoài.                                 |
| **Application**    | `src/application/`    | Logic use-case: `ReviewOrchestrator` (điều phối workflow), `diff-parser` (chuẩn hóa + lọc file), `prompt-builder` (nội suy template + giới hạn), `response-parser` (kiểm tra JSON + khử trùng lặp). Ưu tiên hàm thuần. |
| **Infrastructure** | `src/infrastructure/` | Adapter và driver: GitHub (Octokit), 3 adapter SDK của các provider AI, nạp config bằng Zod, Pino logger, ước tính chi phí, nhận diện ngôn ngữ, tiện ích retry, và renderer plain-text.                                |

Mỗi lần review là **một request AI duy nhất cho cả PR**: toàn bộ diff của các file hợp lệ được gộp vào một prompt (tối đa 50 file / 200.000 ký tự, vượt quá sẽ bị cắt bớt).

---

## 📦 Installation

🇺🇸 **English**

**Requirements**

| Tool    | Version |
| ------- | ------- |
| Node.js | `>= 22` |
| pnpm    | `>= 10` |

**Steps**

```bash
# 1. Clone
git clone https://github.com/bolobala247-dev/ReviewPilot.git
cd ReviewPilot

# 2. Install dependencies
pnpm install

# 3. Build (TypeScript → dist/, with path-alias rewriting)
pnpm build
```

> Note: there is no global `reviewpilot` binary. Run the CLI through `pnpm dev` (ts-node) or `pnpm start` / `node dist/cli.js` (compiled). Run it from the repository root so the templates in `prompts/` are found.

---

🇻🇳 **Tiếng Việt**

**Yêu cầu**

| Công cụ | Phiên bản |
| ------- | --------- |
| Node.js | `>= 22`   |
| pnpm    | `>= 10`   |

**Các bước**

```bash
# 1. Clone
git clone https://github.com/bolobala247-dev/ReviewPilot.git
cd ReviewPilot

# 2. Cài dependencies
pnpm install

# 3. Build (TypeScript → dist/, có rewrite path alias)
pnpm build
```

> Lưu ý: chưa có binary `reviewpilot` cài global. Chạy CLI qua `pnpm dev` (ts-node) hoặc `pnpm start` / `node dist/cli.js` (bản build). Hãy chạy từ thư mục gốc của repo để tìm thấy template trong `prompts/`.

---

## ⚙️ Configuration

🇺🇸 **English**

Configuration is loaded from environment variables (a `.env` file is read automatically via `dotenv`) and validated with Zod at startup. Invalid configuration fails fast with a `CONFIG_ERROR`.

| Variable                  | Required | Default                                   | Description                                                                                                     |
| ------------------------- | -------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `AICR_AI_API_KEY`         | ✅       | —                                         | API key for the selected AI provider.                                                                           |
| `AICR_GITHUB_TOKEN`       | ✅       | —                                         | GitHub token with permission to read the target PR.                                                             |
| `AICR_AI_PROVIDER`        | ⬜       | `openai`                                  | One of `openai`, `gemini`, `anthropic`.                                                                         |
| `AICR_AI_MODEL`           | ⬜       | see note                                  | Model name. Defaults: `gpt-4o` (openai), `gemini-3.6-flash` (gemini), `claude-3-5-sonnet-20240620` (anthropic). |
| `AICR_AI_TEMPERATURE`     | ⬜       | `0.1`                                     | Sampling temperature, `0`–`2`.                                                                                  |
| `AICR_AI_TIMEOUT`         | ⬜       | `30000`                                   | Per-request provider timeout in milliseconds (min `1000`).                                                      |
| `AICR_MAX_FILE_SIZE`      | ⬜       | `100000`                                  | Max patch size per file in bytes; larger files are skipped.                                                     |
| `AICR_IGNORE_PATTERNS`    | ⬜       | `*.lock,*.min.js,dist/**,node_modules/**` | Comma-separated glob patterns of files to skip.                                                                 |
| `AICR_LOG_LEVEL`          | ⬜       | `info`                                    | One of `debug`, `info`, `warn`, `error`.                                                                        |
| `AICR_REVIEW_CONCURRENCY` | ⬜       | `5`                                       | Validated (`1`–`10`) but **currently unused** — reserved for future per-file parallelism.                       |

> ⚠️ **Model default caveat**: the provider-specific model default is resolved from the `AICR_AI_PROVIDER` environment variable only. If you select a provider solely via the `--provider` CLI flag, set `AICR_AI_MODEL` explicitly — otherwise the default stays `gpt-4o`.

Complete `.env` example (see `.env.example`):

```env
# Required
AICR_AI_API_KEY=sk-your_provider_api_key
AICR_GITHUB_TOKEN=ghp_your_github_token

# Optional (defaults shown)
AICR_AI_PROVIDER=openai
AICR_AI_MODEL=gpt-4o
AICR_AI_TEMPERATURE=0.1
AICR_AI_TIMEOUT=30000
AICR_MAX_FILE_SIZE=100000
AICR_IGNORE_PATTERNS=*.lock,*.min.js,dist/**,node_modules/**
AICR_LOG_LEVEL=info
```

---

🇻🇳 **Tiếng Việt**

Cấu hình được nạp từ biến môi trường (file `.env` được đọc tự động qua `dotenv`) và kiểm tra bằng Zod khi khởi động. Cấu hình sai sẽ dừng ngay với lỗi `CONFIG_ERROR`.

| Biến                      | Bắt buộc | Mặc định                                  | Mô tả                                                                                                          |
| ------------------------- | -------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `AICR_AI_API_KEY`         | ✅       | —                                         | API key của provider AI đã chọn.                                                                               |
| `AICR_GITHUB_TOKEN`       | ✅       | —                                         | GitHub token có quyền đọc PR mục tiêu.                                                                         |
| `AICR_AI_PROVIDER`        | ⬜       | `openai`                                  | Một trong `openai`, `gemini`, `anthropic`.                                                                     |
| `AICR_AI_MODEL`           | ⬜       | xem ghi chú                               | Tên model. Mặc định: `gpt-4o` (openai), `gemini-3.6-flash` (gemini), `claude-3-5-sonnet-20240620` (anthropic). |
| `AICR_AI_TEMPERATURE`     | ⬜       | `0.1`                                     | Nhiệt độ sampling, `0`–`2`.                                                                                    |
| `AICR_AI_TIMEOUT`         | ⬜       | `30000`                                   | Timeout mỗi request tới provider, tính bằng ms (tối thiểu `1000`).                                             |
| `AICR_MAX_FILE_SIZE`      | ⬜       | `100000`                                  | Kích thước patch tối đa mỗi file (byte); file lớn hơn bị bỏ qua.                                               |
| `AICR_IGNORE_PATTERNS`    | ⬜       | `*.lock,*.min.js,dist/**,node_modules/**` | Danh sách glob pattern (phân cách bằng dấu phẩy) các file cần bỏ qua.                                          |
| `AICR_LOG_LEVEL`          | ⬜       | `info`                                    | Một trong `debug`, `info`, `warn`, `error`.                                                                    |
| `AICR_REVIEW_CONCURRENCY` | ⬜       | `5`                                       | Được validate (`1`–`10`) nhưng **hiện chưa dùng** — dự phòng cho tính năng xử lý song song theo file.          |

> ⚠️ **Lưu ý về model mặc định**: model mặc định theo provider chỉ được suy ra từ biến môi trường `AICR_AI_PROVIDER`. Nếu bạn chỉ chọn provider qua cờ `--provider` trên CLI, hãy đặt `AICR_AI_MODEL` tường minh — nếu không model mặc định vẫn là `gpt-4o`.

---

## 🚀 Usage

🇺🇸 **English**

The CLI exposes a single command: `review`.

```bash
# Development (ts-node)
pnpm dev review --repo owner/repo --pr 123

# Compiled
pnpm start review --repo owner/repo --pr 123 --provider gemini

# Verbose mode: debug logs + execution metrics
pnpm start review -r owner/repo -p 123 --provider anthropic -v
```

| Argument                | Alias | Required | Description                                                           |
| ----------------------- | ----- | -------- | --------------------------------------------------------------------- |
| `--repo <owner/repo>`   | `-r`  | ✅       | GitHub repository in `owner/repo` format.                             |
| `--pr <number>`         | `-p`  | ✅       | Pull Request number (positive integer).                               |
| `--provider <provider>` | —     | ⬜       | Override the AI provider: `openai`, `gemini`, or `anthropic`.         |
| `--verbose`             | `-v`  | ⬜       | Debug-level logging plus an execution-metrics block after the report. |

**Exit codes**: `0` success · `1` runtime error (GitHub/provider/config) · `2` invalid arguments.

**GitHub Actions**: the repository ships a reusable workflow ([`.github/workflows/reviewpilot-review.yml`](.github/workflows/reviewpilot-review.yml)) and a caller ([`.github/workflows/pr-review.yml`](.github/workflows/pr-review.yml)) that reviews every PR and posts the report as a single, updated-in-place PR comment. Add the `AICR_AI_API_KEY` repository secret to enable it. Inputs: `pr_number`, `provider`, `model`, `dry_run` (report to job summary only). Failures produce a warning without blocking the PR check.

**Benchmarks**: `pnpm bench` runs the dataset in `evaluation/prs.json` and writes per-case JSON results; `pnpm bench:eval` generates manual quality-evaluation Markdown templates. See [`evaluation/README.md`](evaluation/README.md).

---

🇻🇳 **Tiếng Việt**

CLI có duy nhất một lệnh: `review`.

```bash
# Khi phát triển (ts-node)
pnpm dev review --repo owner/repo --pr 123

# Bản build
pnpm start review --repo owner/repo --pr 123 --provider gemini

# Chế độ verbose: log debug + số liệu thực thi
pnpm start review -r owner/repo -p 123 --provider anthropic -v
```

| Tham số                 | Viết tắt | Bắt buộc | Mô tả                                                     |
| ----------------------- | -------- | -------- | --------------------------------------------------------- |
| `--repo <owner/repo>`   | `-r`     | ✅       | Repository GitHub theo định dạng `owner/repo`.            |
| `--pr <number>`         | `-p`     | ✅       | Số Pull Request (số nguyên dương).                        |
| `--provider <provider>` | —        | ⬜       | Ghi đè provider AI: `openai`, `gemini`, hoặc `anthropic`. |
| `--verbose`             | `-v`     | ⬜       | Log mức debug kèm khối số liệu thực thi sau báo cáo.      |

**Mã thoát**: `0` thành công · `1` lỗi runtime (GitHub/provider/config) · `2` tham số không hợp lệ.

**GitHub Actions**: repo có sẵn reusable workflow ([`.github/workflows/reviewpilot-review.yml`](.github/workflows/reviewpilot-review.yml)) và workflow gọi ([`.github/workflows/pr-review.yml`](.github/workflows/pr-review.yml)) — review mọi PR và đăng báo cáo thành một comment duy nhất, cập nhật tại chỗ. Thêm secret `AICR_AI_API_KEY` cho repo để kích hoạt. Inputs: `pr_number`, `provider`, `model`, `dry_run` (chỉ ghi báo cáo vào job summary). Khi lỗi chỉ hiện cảnh báo, không chặn PR check.

**Benchmark**: `pnpm bench` chạy dataset trong `evaluation/prs.json` và ghi kết quả JSON theo từng case; `pnpm bench:eval` sinh template Markdown để đánh giá chất lượng thủ công. Xem [`evaluation/README.md`](evaluation/README.md).

---

## 🖥 Example Output

🇺🇸 **English** — actual format produced by the plain-text renderer:

```
═══════════════════════════════════════
  ReviewPilot — Code Review Report
═══════════════════════════════════════

  Repository:     octocat/hello-world
  Pull Request:   #42 — Add request validation middleware
  Provider:       openai (gpt-4o)
  Duration:       8421ms
  Files Reviewed: 3
  Files Skipped:  1
  Total Comments: 2

───────────────────────────────────────
  Findings
───────────────────────────────────────

  src/server.ts

    Line 42 [CRITICAL] User input is interpolated directly into the SQL query string.
      Suggestion: Use parameterized queries instead of string concatenation.

  src/utils/date.ts

    Line 17 [SUGGESTION] Invalid Date inputs are not handled before calling toISOString().

───────────────────────────────────────
  ✨ Review complete.
```

With `--verbose`, an execution-metrics block follows the report:

```
📊 Execution Metrics
───────────────────────────────────────
  Prompt chars:         14382
  Response chars:       912
  Input tokens:         3610
  Output tokens:        228
  Total tokens:         3838
  Estimated cost:       $0.011305
  GitHub fetch:         642ms
  Prompt build:         3ms
  Provider call:        7521ms
  Response parse:       1ms
  Report render:        0ms
  Total execution:      8421ms
───────────────────────────────────────
```

---

🇻🇳 **Tiếng Việt** — đây chính là định dạng thật của renderer plain-text (ví dụ ở trên). Khi bật `--verbose`, khối **📊 Execution Metrics** hiển thị thêm: số ký tự prompt/response, token vào/ra, chi phí ước tính (USD), và thời gian từng giai đoạn (fetch GitHub, dựng prompt, gọi provider, parse, render, tổng).

---

## 🤖 Supported Providers

🇺🇸 **English**

| Provider         | Adapter                         | Default model                | Token usage source                                        |
| ---------------- | ------------------------------- | ---------------------------- | --------------------------------------------------------- |
| OpenAI           | `openai` SDK (Chat Completions) | `gpt-4o`                     | `usage.prompt_tokens` / `completion_tokens`               |
| Google Gemini    | `@google/generative-ai`         | `gemini-3.6-flash`           | `usageMetadata.promptTokenCount` / `candidatesTokenCount` |
| Anthropic Claude | `@anthropic-ai/sdk` (Messages)  | `claude-3-5-sonnet-20240620` | `usage.input_tokens` / `output_tokens`                    |

All adapters implement the same `IAIProvider` port, enforce the configured timeout, and map HTTP errors to typed `AppError` codes (`AUTH_FAILED`, `RATE_LIMIT`, `TIMEOUT`, `PROVIDER_ERROR`).

Switching providers:

```bash
# Per run (remember to also set AICR_AI_MODEL — see the configuration caveat)
pnpm start review -r owner/repo -p 123 --provider anthropic

# Via environment (also selects the provider-specific default model)
AICR_AI_PROVIDER=gemini pnpm start review -r owner/repo -p 123
```

---

🇻🇳 **Tiếng Việt**

Cả ba adapter đều hiện thực chung port `IAIProvider`, áp dụng timeout đã cấu hình, và ánh xạ lỗi HTTP sang mã `AppError` có kiểu (`AUTH_FAILED`, `RATE_LIMIT`, `TIMEOUT`, `PROVIDER_ERROR`).

Cách đổi provider:

```bash
# Theo từng lần chạy (nhớ đặt thêm AICR_AI_MODEL — xem lưu ý ở phần Cấu hình)
pnpm start review -r owner/repo -p 123 --provider anthropic

# Qua biến môi trường (đồng thời chọn model mặc định theo provider)
AICR_AI_PROVIDER=gemini pnpm start review -r owner/repo -p 123
```

---

## 📁 Repository Structure

🇺🇸 **English**

```
.
├── .github/workflows/          # GitHub Actions: reusable review workflow + PR caller
├── .husky/                     # Git hooks (pre-commit: lint-staged + typecheck)
├── docs/                       # Design documents & per-phase implementation plans
├── evaluation/                 # Benchmark framework
│   ├── prs.json                # PR test-case dataset
│   ├── prs.schema.json         # JSON Schema for the dataset
│   ├── results/                # Benchmark run outputs (<repo>-<pr>.json)
│   ├── templates/              # Manual quality-evaluation Markdown template
│   └── README.md               # Metrics, scoring rules, pass criteria
├── prompts/                    # Review prompt templates (system.md, review-file.md)
├── src/
│   ├── domain/                 # Types, ReviewSeverity, AppError, IAIProvider port
│   ├── application/            # Orchestrator, diff-parser, prompt-builder, response-parser
│   ├── infrastructure/
│   │   ├── providers/          # OpenAI / Gemini / Anthropic adapters + factory
│   │   ├── config.ts           # Env loading + Zod validation
│   │   ├── github.ts           # Octokit PR adapter
│   │   ├── cost.ts             # Model pricing table + cost estimator
│   │   ├── language.ts         # Filename → language detection
│   │   ├── logger.ts           # Pino logger
│   │   ├── renderer.ts         # Plain-text report renderer
│   │   └── retry.ts            # Exponential-backoff utility
│   ├── evaluation/             # Benchmark runner + eval-template generator
│   └── cli.ts                  # CLI entry point (commander)
├── tests/unit/                 # Vitest unit tests (8 suites, 77 tests)
├── tsconfig.json               # Strict TS config with @domain/@application/@infrastructure aliases
└── vitest.config.ts            # Test runner + alias resolution
```

---

🇻🇳 **Tiếng Việt**

| Thư mục               | Vai trò                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------- |
| `.github/workflows/`  | GitHub Actions: reusable workflow review + workflow gọi cho PR.                         |
| `.husky/`             | Git hooks (pre-commit: lint-staged + typecheck).                                        |
| `docs/`               | Tài liệu thiết kế và kế hoạch triển khai từng phase.                                    |
| `evaluation/`         | Benchmark framework: dataset PR, JSON Schema, kết quả chạy, template đánh giá thủ công. |
| `prompts/`            | Template prompt review (`system.md`, `review-file.md`).                                 |
| `src/domain/`         | Kiểu dữ liệu, enum severity, mô hình lỗi, port `IAIProvider`.                           |
| `src/application/`    | Orchestrator, diff-parser, prompt-builder, response-parser.                             |
| `src/infrastructure/` | Adapter GitHub/AI, config, logger, renderer, cost, retry, language.                     |
| `src/evaluation/`     | Trình chạy benchmark + trình sinh template đánh giá.                                    |
| `tests/unit/`         | Unit test bằng Vitest (8 suite, 77 test).                                               |

---

## 🛠 Development

🇺🇸 **English**

| Task           | Command                                | Notes                                       |
| -------------- | -------------------------------------- | ------------------------------------------- |
| Run CLI in dev | `pnpm dev review -r owner/repo -p 123` | ts-node with path aliases.                  |
| Build          | `pnpm build`                           | `tsc && tsc-alias` → `dist/`.               |
| Run built CLI  | `pnpm start review …`                  | `node dist/cli.js`.                         |
| Typecheck      | `pnpm typecheck`                       | `tsc --noEmit`.                             |
| Test           | `pnpm test`                            | Vitest, single run.                         |
| Test (watch)   | `pnpm test:watch`                      | Vitest watch mode.                          |
| Coverage       | `pnpm test:coverage`                   | Vitest coverage report.                     |
| Lint           | `pnpm lint` / `pnpm lint:fix`          | ESLint.                                     |
| Format         | `pnpm format` / `pnpm format:fix`      | Prettier check / write.                     |
| Benchmarks     | `pnpm bench`                           | Runs `evaluation/prs.json` dataset.         |
| Eval templates | `pnpm bench:eval`                      | Generates manual evaluation Markdown files. |

A Husky pre-commit hook runs `lint-staged` (Prettier + ESLint on staged `.ts` files) followed by a full `tsc --noEmit` typecheck.

---

🇻🇳 **Tiếng Việt**

| Việc              | Lệnh                                   | Ghi chú                               |
| ----------------- | -------------------------------------- | ------------------------------------- |
| Chạy CLI khi dev  | `pnpm dev review -r owner/repo -p 123` | ts-node với path alias.               |
| Build             | `pnpm build`                           | `tsc && tsc-alias` → `dist/`.         |
| Chạy bản build    | `pnpm start review …`                  | `node dist/cli.js`.                   |
| Kiểm tra kiểu     | `pnpm typecheck`                       | `tsc --noEmit`.                       |
| Test              | `pnpm test`                            | Vitest, chạy một lần.                 |
| Test (watch)      | `pnpm test:watch`                      | Chế độ watch của Vitest.              |
| Coverage          | `pnpm test:coverage`                   | Báo cáo coverage.                     |
| Lint              | `pnpm lint` / `pnpm lint:fix`          | ESLint.                               |
| Format            | `pnpm format` / `pnpm format:fix`      | Prettier kiểm tra / ghi.              |
| Benchmark         | `pnpm bench`                           | Chạy dataset `evaluation/prs.json`.   |
| Template đánh giá | `pnpm bench:eval`                      | Sinh file Markdown đánh giá thủ công. |

Hook pre-commit của Husky chạy `lint-staged` (Prettier + ESLint trên file `.ts` đã stage) rồi typecheck toàn bộ bằng `tsc --noEmit`.

---

## 🧭 Design Principles

🇺🇸 **English**

- **Clean Architecture** — external services (GitHub, LLM SDKs) are volatile; keeping them behind adapters means the review workflow is testable without any network access, and a new provider is a new adapter, not a rewrite.
- **Dependency Inversion** — `ReviewOrchestrator` receives `IAIProvider` and `GitHubAdapter` through its constructor. The application layer depends on the port, never on an SDK.
- **Ports & Adapters** — one small port (`IAIProvider.review()`), three interchangeable adapters selected by a factory (`createProvider`).
- **Simple orchestrator** — the workflow is a straight line (fetch → filter → prompt → call → parse → report) written as one readable method with per-stage timing, not a pipeline framework.
- **No unnecessary abstractions** — parsers, builders, and filters are plain functions; there is no event bus, no DI container, no plugin system. Abstractions were added only at the volatility boundary (AI providers).
- **Fail-safe parsing** — an unparseable AI response never crashes the run; it degrades to an empty finding list with `parserStatus: failed` surfaced in the report.

---

🇻🇳 **Tiếng Việt**

- **Clean Architecture** — các dịch vụ bên ngoài (GitHub, SDK LLM) thay đổi thường xuyên; đặt chúng sau adapter giúp test workflow review mà không cần mạng, và thêm provider mới chỉ là thêm một adapter, không phải viết lại.
- **Dependency Inversion** — `ReviewOrchestrator` nhận `IAIProvider` và `GitHubAdapter` qua constructor. Tầng application phụ thuộc vào port, không bao giờ phụ thuộc SDK.
- **Ports & Adapters** — một port nhỏ (`IAIProvider.review()`), ba adapter thay thế được cho nhau, chọn qua factory (`createProvider`).
- **Orchestrator đơn giản** — workflow là một đường thẳng (fetch → lọc → prompt → gọi → parse → báo cáo) viết trong một method dễ đọc kèm đo thời gian từng giai đoạn, không dùng pipeline framework.
- **Không trừu tượng hóa thừa** — parser, builder, filter đều là hàm thuần; không có event bus, không DI container, không plugin system. Chỉ trừu tượng hóa tại ranh giới dễ biến động (provider AI).
- **Parse an toàn** — phản hồi AI không parse được sẽ không làm crash; nó suy giảm về danh sách phát hiện rỗng với `parserStatus: failed` hiển thị trong báo cáo.

---

## ⚠️ Limitations

🇺🇸 **English**

- **GitHub only** — no GitLab/Bitbucket support.
- **CLI + GitHub Actions only** — no webhook server or long-running service.
- **Single aggregated AI call** — the whole PR goes into one prompt; very large PRs are truncated (50 files / 200,000 characters), not chunked. `AICR_REVIEW_CONCURRENCY` is accepted but not yet used.
- **No inline PR comments** — the GitHub Actions integration posts one summary comment; findings are not attached to specific diff lines.
- **No automatic retries** — a retry utility exists but is not wired into the provider adapters; a rate-limit or timeout fails the run (gracefully, in CI).
- **Plain-text output only** — no Markdown/JSON/SARIF export from the CLI.
- **No streaming** — the full provider response is awaited before parsing.
- **No incremental review** — every run reviews the full PR diff, not just new commits.
- **Token estimation caveat** — cost is estimated from a static pricing table; unknown models fall back to provider-default pricing or `$0`.
- **Benchmark dataset placeholders** — the PR numbers in `evaluation/prs.json` are seed placeholders and must be curated before running real benchmarks.
- **No plugin system.**

---

🇻🇳 **Tiếng Việt**

- **Chỉ hỗ trợ GitHub** — chưa hỗ trợ GitLab/Bitbucket.
- **Chỉ có CLI + GitHub Actions** — không có webhook server hay service chạy nền.
- **Một AI call gộp duy nhất** — cả PR đi vào một prompt; PR quá lớn bị cắt bớt (50 file / 200.000 ký tự) chứ không chia nhỏ. `AICR_REVIEW_CONCURRENCY` được chấp nhận nhưng chưa dùng.
- **Không có comment inline trên PR** — tích hợp GitHub Actions chỉ đăng một comment tổng hợp; phát hiện không gắn vào từng dòng diff.
- **Không tự động retry** — tiện ích retry tồn tại nhưng chưa nối vào adapter provider; rate-limit hoặc timeout sẽ làm lần chạy thất bại (thất bại êm trong CI).
- **Chỉ xuất plain-text** — CLI chưa xuất Markdown/JSON/SARIF.
- **Không streaming** — chờ toàn bộ phản hồi provider rồi mới parse.
- **Không review tăng dần** — mỗi lần chạy review toàn bộ diff của PR, không chỉ các commit mới.
- **Ước tính chi phí có giới hạn** — dựa trên bảng giá tĩnh; model lạ dùng giá mặc định của provider hoặc `$0`.
- **Dataset benchmark là placeholder** — số PR trong `evaluation/prs.json` cần được chọn lọc lại trước khi chạy benchmark thật.
- **Không có plugin system.**

---

## 🗺 Roadmap

🇺🇸 **English** / 🇻🇳 **Tiếng Việt**

- ✅ Clean Architecture skeleton (TypeScript strict, pnpm, Vitest, ESLint, Prettier, Husky)
- ✅ GitHub integration (Octokit PR fetching, error mapping)
- ✅ Prompt builder (templates, budgets, fallback)
- ✅ AI providers: OpenAI · Gemini · Anthropic
- ✅ Structured response parser
- ✅ Review orchestrator (end-to-end workflow)
- ✅ CLI (`review` command, validation, exit codes)
- ✅ Benchmark framework (`evaluation/`, dataset schema, runner)
- ✅ Prompt optimization (focus/ignore/grounding rules)
- ✅ Manual AI quality evaluation templates
- ✅ Cost & performance metrics (`--verbose`)
- ✅ GitHub Actions integration (reusable workflow, comment upsert, dry-run)
- ⬜ Release v1.0
- ⬜ Inline PR line comments · Comment inline theo dòng trên PR
- ⬜ Token-budget-aware diff chunking · Chia nhỏ diff theo ngân sách token
- ⬜ Retry wiring for provider calls · Nối retry vào các lời gọi provider
- ⬜ Webhook receiver · Bộ nhận webhook
- ⬜ Model Context Protocol (MCP) adapter

---

## 🤝 Contributing

🇺🇸 **English**

1. **Fork** the repository and clone your fork.
2. **Branch** from `develop`: `git checkout -b feat/short-description`.
3. **Commit** using Conventional Commits (`feat(scope): …`, `fix(scope): …`). The pre-commit hook enforces formatting, linting, and a clean typecheck; please keep `pnpm test` green.
4. **Open a Pull Request** against `develop` with a clear description of the change and its motivation.

---

🇻🇳 **Tiếng Việt**

1. **Fork** repo và clone bản fork của bạn.
2. **Tạo nhánh** từ `develop`: `git checkout -b feat/mo-ta-ngan`.
3. **Commit** theo Conventional Commits (`feat(scope): …`, `fix(scope): …`). Hook pre-commit sẽ kiểm tra format, lint và typecheck; hãy giữ `pnpm test` luôn xanh.
4. **Mở Pull Request** vào `develop` kèm mô tả rõ thay đổi và lý do.

---

## 📄 License

🇺🇸 **English**

This project is intended to be released under the **MIT License**. A `LICENSE` file has not been added to the repository yet — it will be included before the v1.0 release.

---

🇻🇳 **Tiếng Việt**

Dự án dự kiến phát hành theo giấy phép **MIT**. File `LICENSE` hiện chưa có trong repo — sẽ được bổ sung trước khi phát hành v1.0.
