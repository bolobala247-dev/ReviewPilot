import { Command } from 'commander';
import { loadConfig } from './infrastructure/config';
import { createProvider } from './infrastructure/providers';
import { GitHubAdapter } from './infrastructure/github';
import { ReviewOrchestrator } from './application/orchestrator';
import { renderMarkdown } from './infrastructure/renderer';
import { logger } from './infrastructure/logger';

export function bootstrap(providerOverride?: string) {
  const config = loadConfig(providerOverride ? { provider: providerOverride } : {});
  const provider = createProvider(config);
  const github = new GitHubAdapter(config.github);
  const orchestrator = new ReviewOrchestrator(provider, github, config);
  return { orchestrator, config };
}

async function main() {
  const program = new Command();

  program
    .name('ai-review')
    .description('Provider-agnostic AI Code Review Orchestrator for GitHub PRs')
    .requiredOption('-o, --owner <owner>', 'GitHub repository owner/org')
    .requiredOption('-r, --repo <repo>', 'GitHub repository name')
    .requiredOption('-p, --pr <number>', 'Pull Request number', (val) => parseInt(val, 10))
    .option('--provider <provider>', 'AI provider (openai, gemini, anthropic)')
    .parse(process.argv);

  const options = program.opts();

  try {
    const { orchestrator } = bootstrap(options.provider);
    const report = await orchestrator.run({
      owner: options.owner,
      repo: options.repo,
      prNumber: options.pr,
      provider: options.provider || 'openai',
    });

    const markdownOutput = renderMarkdown(report);
    console.log(markdownOutput);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Execution failed');
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
