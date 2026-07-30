import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { loadConfig } from '@infrastructure/config';
import { createProvider } from '@infrastructure/providers';
import { GitHubAdapter } from '@infrastructure/github';
import { ReviewOrchestrator } from '@application/orchestrator';
import { ReviewComment } from '@domain/types';
import { logger } from '@infrastructure/logger';

const BenchmarkCaseSchema = z.object({
  id: z.string(),
  repository: z.string().regex(/^[^/]+\/[^/]+$/, 'repository must be in owner/repo format'),
  pullRequest: z.number().int().positive(),
  category: z.string(),
  changedFiles: z.number().int().positive(),
  expectedDifficulty: z.string(),
  notes: z.string(),
});

const BenchmarkDatasetSchema = z.object({
  version: z.string(),
  cases: z.array(BenchmarkCaseSchema.passthrough()),
});

export type BenchmarkCase = z.infer<typeof BenchmarkCaseSchema>;

export interface BenchmarkResult {
  caseId: string;
  repository: string;
  pullRequest: number;
  status: 'success' | 'failed';
  provider: string;
  model: string;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  findings: ReviewComment[];
  skippedFiles: string[];
  timestamp: string;
  error?: string;
}

export function loadBenchmarkCases(datasetPath: string): BenchmarkCase[] {
  const raw = fs.readFileSync(datasetPath, 'utf8');
  const dataset = BenchmarkDatasetSchema.parse(JSON.parse(raw));
  return dataset.cases;
}

export function resultFileName(repository: string, pullRequest: number): string {
  return `${repository.replace('/', '-')}-${pullRequest}.json`;
}

function writeResult(resultsDir: string, result: BenchmarkResult): string {
  const filePath = path.join(resultsDir, resultFileName(result.repository, result.pullRequest));
  fs.mkdirSync(resultsDir, { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  return filePath;
}

function printSummary(results: BenchmarkResult[]): void {
  const succeeded = results.filter((r) => r.status === 'success');
  const failed = results.filter((r) => r.status === 'failed');

  console.log('\n========== Benchmark Summary ==========\n');

  for (const r of results) {
    const label = `${r.repository}#${r.pullRequest}`;
    if (r.status === 'success') {
      console.log(
        `  ✅ ${label} — ${(r.durationMs / 1000).toFixed(1)}s, ` +
          `${r.findings.length} finding(s), ` +
          `tokens in/out: ${r.inputTokens}/${r.outputTokens}, ` +
          `skipped: ${r.skippedFiles.length}`,
      );
    } else {
      console.log(`  ❌ ${label} — FAILED: ${r.error}`);
    }
  }

  const totalDurationMs = succeeded.reduce((sum, r) => sum + r.durationMs, 0);
  const totalInput = succeeded.reduce((sum, r) => sum + r.inputTokens, 0);
  const totalOutput = succeeded.reduce((sum, r) => sum + r.outputTokens, 0);
  const totalFindings = succeeded.reduce((sum, r) => sum + r.findings.length, 0);

  console.log('\n----------------------------------------');
  console.log(`  Total cases:    ${results.length}`);
  console.log(`  Succeeded:      ${succeeded.length}`);
  console.log(`  Failed:         ${failed.length}`);
  console.log(`  Total findings: ${totalFindings}`);
  console.log(`  Total duration: ${(totalDurationMs / 1000).toFixed(1)}s`);
  console.log(`  Total tokens:   ${totalInput} in / ${totalOutput} out`);
  console.log('========================================\n');
}

export async function runBenchmarks(
  datasetPath: string,
  resultsDir: string,
): Promise<BenchmarkResult[]> {
  const cases = loadBenchmarkCases(datasetPath);
  console.log(`Loaded ${cases.length} benchmark case(s) from ${datasetPath}\n`);

  const config = loadConfig();
  const provider = createProvider(config.ai);
  const github = new GitHubAdapter(config.github);
  const orchestrator = new ReviewOrchestrator(provider, github, config);

  console.log(`Provider: ${config.ai.provider} (${config.ai.model})\n`);

  const results: BenchmarkResult[] = [];

  for (const benchCase of cases) {
    const [owner, repo] = benchCase.repository.split('/') as [string, string];
    const label = `${benchCase.repository}#${benchCase.pullRequest}`;
    console.log(`▶ Running ${benchCase.id} (${label})...`);

    const startTime = Date.now();
    let result: BenchmarkResult;

    try {
      const report = await orchestrator.review({
        owner,
        repo,
        prNumber: benchCase.pullRequest,
        provider: config.ai.provider,
      });

      result = {
        caseId: benchCase.id,
        repository: benchCase.repository,
        pullRequest: benchCase.pullRequest,
        status: 'success',
        provider: report.metadata.provider,
        model: report.metadata.model,
        durationMs: report.metadata.durationMs,
        inputTokens: report.metadata.inputTokens ?? 0,
        outputTokens: report.metadata.outputTokens ?? 0,
        findings: report.comments,
        skippedFiles: report.skippedFiles,
        timestamp: report.metadata.timestamp,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ caseId: benchCase.id, error: message }, 'Benchmark case failed');

      result = {
        caseId: benchCase.id,
        repository: benchCase.repository,
        pullRequest: benchCase.pullRequest,
        status: 'failed',
        provider: config.ai.provider,
        model: config.ai.model,
        durationMs: Date.now() - startTime,
        inputTokens: 0,
        outputTokens: 0,
        findings: [],
        skippedFiles: [],
        timestamp: new Date().toISOString(),
        error: message,
      };
    }

    const filePath = writeResult(resultsDir, result);
    console.log(`  ${result.status === 'success' ? '✅' : '❌'} Saved ${filePath}\n`);
    results.push(result);
  }

  printSummary(results);
  return results;
}

if (require.main === module) {
  const datasetPath = path.resolve(process.cwd(), 'evaluation/prs.json');
  const resultsDir = path.resolve(process.cwd(), 'evaluation/results');

  runBenchmarks(datasetPath, resultsDir)
    .then((results) => {
      const hasFailure = results.some((r) => r.status === 'failed');
      process.exit(hasFailure ? 1 : 0);
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ Benchmark runner aborted: ${message}`);
      process.exit(1);
    });
}
