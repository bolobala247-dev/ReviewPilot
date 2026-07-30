import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseCliArgs, CliValidationError, runCli } from '../../src/cli';
import { renderPlainText } from '@infrastructure/renderer';
import { ReviewReport, ReviewSeverity } from '@domain/types';

describe('CLI Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseCliArgs', () => {
    it('should parse valid CLI arguments correctly', () => {
      const args = [
        'node',
        'reviewpilot',
        'review',
        '--repo',
        'octocat/hello-world',
        '--pr',
        '42',
        '--provider',
        'openai',
      ];

      const res = parseCliArgs(args);
      expect(res.owner).toBe('octocat');
      expect(res.repo).toBe('hello-world');
      expect(res.prNumber).toBe(42);
      expect(res.provider).toBe('openai');
    });

    it('should throw CliValidationError (exit code 2) for invalid --repo format', () => {
      const args = [
        'node',
        'reviewpilot',
        'review',
        '--repo',
        'invalid-repo-without-slash',
        '--pr',
        '42',
      ];
      expect(() => parseCliArgs(args)).toThrow(CliValidationError);
      try {
        parseCliArgs(args);
      } catch (err: unknown) {
        expect((err as CliValidationError).exitCode).toBe(2);
      }
    });

    it('should throw CliValidationError (exit code 2) for invalid --pr number', () => {
      const args = ['node', 'reviewpilot', 'review', '--repo', 'owner/repo', '--pr', 'invalid-pr'];
      expect(() => parseCliArgs(args)).toThrow(CliValidationError);
      try {
        parseCliArgs(args);
      } catch (err: unknown) {
        expect((err as CliValidationError).exitCode).toBe(2);
      }
    });

    it('should throw CliValidationError (exit code 2) for invalid provider name', () => {
      const args = [
        'node',
        'reviewpilot',
        'review',
        '--repo',
        'owner/repo',
        '--pr',
        '10',
        '--provider',
        'unsupported-ai',
      ];
      expect(() => parseCliArgs(args)).toThrow(CliValidationError);
      try {
        parseCliArgs(args);
      } catch (err: unknown) {
        expect((err as CliValidationError).exitCode).toBe(2);
        expect((err as CliValidationError).message).toContain('Invalid provider "unsupported-ai"');
      }
    });
  });

  describe('renderPlainText', () => {
    const sampleReport: ReviewReport = {
      repo: 'octocat/hello-world',
      prNumber: 10,
      prTitle: 'Add awesome feature',
      comments: [
        {
          file: 'src/app.ts',
          line: 15,
          severity: ReviewSeverity.CRITICAL,
          message: 'Potential memory leak',
          suggestion: 'delete instance;',
        },
      ],
      summary: 'Reviewed 1 file.',
      reviewedFiles: ['src/app.ts'],
      skippedFiles: [],
      metadata: {
        provider: 'openai',
        model: 'gpt-4o',
        totalTokens: 100,
        durationMs: 250,
        timestamp: '2026-07-30T00:00:00.000Z',
        parseSucceeded: true,
        parserStatus: 'success',
      },
    };

    it('should render plain-text review report correctly', () => {
      const output = renderPlainText(sampleReport);
      expect(output).toContain('ReviewPilot — Code Review Report');
      expect(output).toContain('octocat/hello-world');
      expect(output).toContain('Add awesome feature');
      expect(output).toContain('[CRITICAL] Potential memory leak');
      expect(output).toContain('Suggestion: delete instance;');
    });

    it('should render "No findings." when comments list is empty', () => {
      const emptyReport: ReviewReport = {
        ...sampleReport,
        comments: [],
      };
      const output = renderPlainText(emptyReport);
      expect(output).toContain('No findings.');
      expect(output).not.toContain('Findings');
    });

    it('should display parser status FAILED when metadata indicates parse failure', () => {
      const failedReport: ReviewReport = {
        ...sampleReport,
        comments: [],
        metadata: {
          ...sampleReport.metadata,
          parseSucceeded: false,
          parserStatus: 'failed',
        },
      };
      const output = renderPlainText(failedReport);
      expect(output).toContain('Parser Status:  FAILED (AI response could not be parsed)');
    });

    it('should generate deterministic plain-text output', () => {
      const out1 = renderPlainText(sampleReport);
      const out2 = renderPlainText(sampleReport);
      expect(out1).toBe(out2);
    });
  });

  describe('runCli', () => {
    it('should return exit code 2 on invalid arguments', async () => {
      const exitCode = await runCli([
        'node',
        'reviewpilot',
        'review',
        '--repo',
        'bad-repo',
        '--pr',
        '1',
      ]);
      expect(exitCode).toBe(2);
    });
  });
});
