import fs from 'fs';
import path from 'path';
import { BenchmarkResult } from './benchmark-runner';
import { ReviewComment } from '@domain/types';

const TEMPLATE_RELATIVE_PATH = 'evaluation/templates/evaluation-template.md';

function formatFinding(finding: ReviewComment, index: number): string {
  const lines = [
    `### Finding ${index + 1}`,
    '',
    `- **File**: \`${finding.file}\``,
    `- **Line**: ${finding.line}`,
    `- **Severity**: ${finding.severity}`,
    `- **Message**: ${finding.message}`,
  ];
  if (finding.suggestion) {
    lines.push(`- **Suggestion**: ${finding.suggestion}`);
  }
  lines.push(
    '- **Reviewer classification**: `[ ]` correct · `[ ]` incorrect · `[ ]` hallucinated · `[ ]` duplicate',
  );
  return lines.join('\n');
}

function formatFindings(findings: ReviewComment[]): string {
  if (findings.length === 0) {
    return '_No findings reported. Verify manually whether the empty review is correct (true negative) or issues were missed (score under Recall)._';
  }
  return findings.map(formatFinding).join('\n\n');
}

export function renderEvaluationTemplate(template: string, result: BenchmarkResult): string {
  return template
    .split('{{REPOSITORY}}')
    .join(result.repository)
    .split('{{PULL_REQUEST}}')
    .join(String(result.pullRequest))
    .split('{{PROVIDER}}')
    .join(result.provider)
    .split('{{MODEL}}')
    .join(result.model)
    .split('{{TIMESTAMP}}')
    .join(result.timestamp)
    .split('{{DURATION}}')
    .join(`${(result.durationMs / 1000).toFixed(1)}s`)
    .split('{{TOKENS}}')
    .join(`${result.inputTokens} / ${result.outputTokens}`)
    .split('{{FINDINGS}}')
    .join(formatFindings(result.findings));
}

export function generateEvaluationTemplates(resultsDir: string, templatePath: string): string[] {
  const template = fs.readFileSync(templatePath, 'utf8');
  const resultFiles = fs
    .readdirSync(resultsDir)
    .filter((f) => f.endsWith('.json'))
    .sort();

  if (resultFiles.length === 0) {
    console.log(`No benchmark result JSON files found in ${resultsDir}. Run "pnpm bench" first.`);
    return [];
  }

  const generated: string[] = [];

  for (const resultFile of resultFiles) {
    const resultPath = path.join(resultsDir, resultFile);
    const evalPath = resultPath.replace(/\.json$/, '.eval.md');

    if (fs.existsSync(evalPath)) {
      console.log(`⏭  Skipped ${path.basename(evalPath)} (already exists, not overwriting)`);
      continue;
    }

    let result: BenchmarkResult;
    try {
      result = JSON.parse(fs.readFileSync(resultPath, 'utf8')) as BenchmarkResult;
    } catch {
      console.log(`⚠️  Skipped ${resultFile} (invalid JSON)`);
      continue;
    }

    if (result.status === 'failed') {
      console.log(`⏭  Skipped ${resultFile} (benchmark run failed: ${result.error ?? 'unknown'})`);
      continue;
    }

    fs.writeFileSync(evalPath, renderEvaluationTemplate(template, result), 'utf8');
    console.log(`✅ Generated ${path.basename(evalPath)}`);
    generated.push(evalPath);
  }

  console.log(`\nGenerated ${generated.length} evaluation template(s). Fill in scores manually.`);
  return generated;
}

if (require.main === module) {
  const resultsDir = path.resolve(process.cwd(), 'evaluation/results');
  const templatePath = path.resolve(process.cwd(), TEMPLATE_RELATIVE_PATH);

  try {
    generateEvaluationTemplates(resultsDir, templatePath);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ Template generation failed: ${message}`);
    process.exit(1);
  }
}
