import { Command } from 'commander';
import { loadConfig, AppConfig } from '@infrastructure/config';
import { createProvider } from '@infrastructure/providers';
import { GitHubAdapter } from '@infrastructure/github';
import { ReviewOrchestrator } from '@application/orchestrator';
import { renderPlainText } from '@infrastructure/renderer';
import { logger } from '@infrastructure/logger';
import { AIProvider } from '@domain/ports';

export interface ParsedCliArgs {
  owner: string;
  repo: string;
  prNumber: number;
  provider?: AIProvider | undefined;
  verbose?: boolean | undefined;
}

export class CliValidationError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number = 2,
  ) {
    super(message);
    this.name = 'CliValidationError';
  }
}

export function parseCliArgs(args: string[]): ParsedCliArgs {
  const program = new Command();

  let parsedOptions: {
    repo?: string;
    pr?: string;
    provider?: string;
    verbose?: boolean;
  } = {};

  program.name('reviewpilot').description('AI Code Review Orchestrator for GitHub Pull Requests');

  program
    .command('review')
    .description('Run AI code review on a GitHub Pull Request')
    .requiredOption('-r, --repo <owner/repo>', 'GitHub repository in owner/repo format')
    .requiredOption('-p, --pr <number>', 'Pull Request number')
    .option('--provider <provider>', 'AI provider (openai, gemini, anthropic)')
    .option('-v, --verbose', 'Enable verbose logging')
    .action((options) => {
      parsedOptions = options;
    });

  program.exitOverride();

  try {
    program.parse(args);
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    throw new CliValidationError(error.message ?? 'Invalid command arguments', 2);
  }

  if (!parsedOptions.repo || typeof parsedOptions.repo !== 'string') {
    throw new CliValidationError('Option --repo <owner/repo> is required', 2);
  }

  const repoParts = parsedOptions.repo.split('/');
  if (repoParts.length !== 2 || !repoParts[0] || !repoParts[1]) {
    throw new CliValidationError(
      'Invalid --repo format. Must be owner/repo (e.g. octocat/hello-world)',
      2,
    );
  }

  const owner = repoParts[0];
  const repo = repoParts[1];

  const prNumber = parseInt(parsedOptions.pr ?? '', 10);
  if (isNaN(prNumber) || prNumber <= 0) {
    throw new CliValidationError('Invalid --pr number. Must be a positive integer', 2);
  }

  let provider: AIProvider | undefined;
  if (parsedOptions.provider) {
    const validProviders: AIProvider[] = ['openai', 'gemini', 'anthropic'];
    if (!validProviders.includes(parsedOptions.provider as AIProvider)) {
      throw new CliValidationError(
        `Invalid provider "${parsedOptions.provider}". Allowed: openai, gemini, anthropic`,
        2,
      );
    }
    provider = parsedOptions.provider as AIProvider;
  }

  return {
    owner,
    repo,
    prNumber,
    provider,
    verbose: Boolean(parsedOptions.verbose),
  };
}

export function bootstrap(parsedArgs: ParsedCliArgs): {
  orchestrator: ReviewOrchestrator;
  config: AppConfig;
} {
  const configOverrides: Record<string, unknown> = {};
  if (parsedArgs.provider) {
    configOverrides.provider = parsedArgs.provider;
  }

  const config = loadConfig(configOverrides);
  const provider = createProvider(config.ai);
  const github = new GitHubAdapter(config.github);
  const orchestrator = new ReviewOrchestrator(provider, github, config);

  return { orchestrator, config };
}

export async function runCli(args: string[]): Promise<number> {
  try {
    const parsedArgs = parseCliArgs(args);

    if (parsedArgs.verbose) {
      logger.level = 'debug';
    }

    const { orchestrator, config } = bootstrap(parsedArgs);

    if (parsedArgs.verbose) {
      console.log('✓ Configuration loaded');
      console.log(`✓ AI Provider: ${config.ai.provider}`);
      console.log(`✓ GitHub token detected: ${config.github.token ? 'YES' : 'NO'}`);
      console.log(`✓ AI API key detected: ${config.ai.apiKey ? 'YES' : 'NO'}`);
    }

    const report = await orchestrator.review({
      owner: parsedArgs.owner,
      repo: parsedArgs.repo,
      prNumber: parsedArgs.prNumber,
      provider: parsedArgs.provider ?? 'openai',
    });

    const output = renderPlainText(report);
    console.log(output);
    return 0;
  } catch (error: unknown) {
    if (error instanceof CliValidationError) {
      console.error(`❌ Argument Error: ${error.message}`);
      return error.exitCode;
    }

    const err = error as Error;
    logger.error({ error: err.message }, 'Application error during review execution');
    console.error(`❌ Error: ${err.message}`);
    return 1;
  }
}

if (require.main === module) {
  runCli(process.argv).then((exitCode) => {
    process.exit(exitCode);
  });
}
