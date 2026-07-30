import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  OpenAIAdapter,
  GeminiAdapter,
  AnthropicAdapter,
  createProvider,
} from '@infrastructure/providers';
import { ErrorCode, AppError } from '@domain/errors';
import { AIConfig } from '@infrastructure/config';

// 1. Mock OpenAI
const mockOpenAICreate = vi.fn();
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockOpenAICreate,
        },
      },
    })),
  };
});

// 2. Mock Gemini (@google/generative-ai)
const mockGenerateContent = vi.fn();
vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      }),
    })),
  };
});

// 3. Mock Anthropic (@anthropic-ai/sdk)
const mockAnthropicCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: mockAnthropicCreate,
      },
    })),
  };
});

describe('AI Provider Layer', () => {
  const sampleRequest = {
    systemPrompt: 'System instruction',
    userPrompt: 'User prompt code',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OpenAIAdapter', () => {
    it('should throw CONFIG_ERROR if API key is missing or empty', () => {
      expect(() => new OpenAIAdapter({ apiKey: '', model: 'gpt-4o' })).toThrow(AppError);
    });

    it('should complete review successfully using the first choice', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [
          { message: { content: '{"comments": []}' } },
          { message: { content: '{"comments": ["ignored second choice"]}' } },
        ],
        usage: { total_tokens: 150 },
      });

      const adapter = new OpenAIAdapter({ apiKey: 'sk-fake-key', model: 'gpt-4o' });
      const res = await adapter.review(sampleRequest);

      expect(res.content).toBe('{"comments": []}');
      expect(res.tokensUsed).toBe(150);
      expect(res.model).toBe('gpt-4o');
    });

    it('should handle missing token usage gracefully', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: 'raw response text' } }],
        usage: undefined,
      });

      const adapter = new OpenAIAdapter({ apiKey: 'sk-fake-key', model: 'gpt-4o' });
      const res = await adapter.review(sampleRequest);

      expect(res.content).toBe('raw response text');
      expect(res.tokensUsed).toBe(0);
    });

    it('should handle empty response content', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      const adapter = new OpenAIAdapter({ apiKey: 'sk-fake-key', model: 'gpt-4o' });
      const res = await adapter.review(sampleRequest);

      expect(res.content).toBe('');
    });

    it('should map 401 error to AUTH_FAILED', async () => {
      mockOpenAICreate.mockRejectedValue({ status: 401, message: 'Invalid Key' });

      const adapter = new OpenAIAdapter({ apiKey: 'sk-fake-key', model: 'gpt-4o' });
      try {
        await adapter.review(sampleRequest);
        expect.fail('Should have thrown AppError');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe(ErrorCode.AUTH_FAILED);
      }
    });

    it('should map 429 error to RATE_LIMIT', async () => {
      mockOpenAICreate.mockRejectedValue({ status: 429, message: 'Rate Limit' });

      const adapter = new OpenAIAdapter({ apiKey: 'sk-fake-key', model: 'gpt-4o' });
      try {
        await adapter.review(sampleRequest);
        expect.fail('Should have thrown AppError');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe(ErrorCode.RATE_LIMIT);
      }
    });

    it('should map connection timeout to TIMEOUT', async () => {
      mockOpenAICreate.mockRejectedValue({ name: 'APIConnectionTimeoutError', message: 'Timeout' });

      const adapter = new OpenAIAdapter({ apiKey: 'sk-fake-key', model: 'gpt-4o' });
      try {
        await adapter.review(sampleRequest);
        expect.fail('Should have thrown AppError');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe(ErrorCode.TIMEOUT);
      }
    });
  });

  describe('GeminiAdapter', () => {
    it('should throw CONFIG_ERROR if API key is missing', () => {
      expect(() => new GeminiAdapter({ apiKey: '  ', model: 'gemini-1.5-pro' })).toThrow(AppError);
    });

    it('should complete review successfully', async () => {
      mockGenerateContent.mockResolvedValue({
        response: Promise.resolve({
          text: () => '{"gemini": "result"}',
          usageMetadata: { totalTokenCount: 200 },
        }),
      });

      const adapter = new GeminiAdapter({ apiKey: 'fake-gemini-key', model: 'gemini-1.5-pro' });
      const res = await adapter.review(sampleRequest);

      expect(res.content).toBe('{"gemini": "result"}');
      expect(res.tokensUsed).toBe(200);
      expect(res.model).toBe('gemini-1.5-pro');
    });

    it('should handle timeout in GeminiAdapter', async () => {
      mockGenerateContent.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 500)),
      );

      const adapter = new GeminiAdapter({
        apiKey: 'fake-gemini-key',
        model: 'gemini-1.5-pro',
        timeoutMs: 50,
      });

      try {
        await adapter.review(sampleRequest);
        expect.fail('Should have thrown AppError for timeout');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe(ErrorCode.TIMEOUT);
      }
    });
  });

  describe('AnthropicAdapter', () => {
    it('should throw CONFIG_ERROR if API key is missing', () => {
      expect(
        () => new AnthropicAdapter({ apiKey: '', model: 'claude-3-5-sonnet-20240620' }),
      ).toThrow(AppError);
    });

    it('should handle multiple text content blocks seamlessly', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [
          { type: 'text', text: 'First block.' },
          { type: 'text', text: 'Second block.' },
        ],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      const adapter = new AnthropicAdapter({
        apiKey: 'fake-anthropic-key',
        model: 'claude-3-5-sonnet-20240620',
      });
      const res = await adapter.review(sampleRequest);

      expect(res.content).toBe('First block.\nSecond block.');
      expect(res.tokensUsed).toBe(150);
    });

    it('should handle missing token usage in Anthropic', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Single text' }],
        usage: undefined,
      });

      const adapter = new AnthropicAdapter({
        apiKey: 'fake-anthropic-key',
        model: 'claude-3-5-sonnet-20240620',
      });
      const res = await adapter.review(sampleRequest);

      expect(res.content).toBe('Single text');
      expect(res.tokensUsed).toBe(0);
    });
  });

  describe('createProvider Factory', () => {
    it('should create OpenAIAdapter for provider "openai"', () => {
      const config: AIConfig = {
        provider: 'openai',
        apiKey: 'sk-test',
        model: 'gpt-4o',
        temperature: 0.1,
        timeoutMs: 30000,
      };
      const provider = createProvider(config);
      expect(provider.name).toBe('openai');
    });

    it('should create GeminiAdapter for provider "gemini"', () => {
      const config: AIConfig = {
        provider: 'gemini',
        apiKey: 'gemini-test-key',
        model: 'gemini-1.5-pro',
        temperature: 0.1,
        timeoutMs: 30000,
      };
      const provider = createProvider(config);
      expect(provider.name).toBe('gemini');
    });

    it('should create AnthropicAdapter for provider "anthropic"', () => {
      const config: AIConfig = {
        provider: 'anthropic',
        apiKey: 'anthropic-test-key',
        model: 'claude-3-5-sonnet-20240620',
        temperature: 0.1,
        timeoutMs: 30000,
      };
      const provider = createProvider(config);
      expect(provider.name).toBe('anthropic');
    });

    it('should throw CONFIG_ERROR for unsupported provider', () => {
      const config = {
        provider: 'unknown-provider',
        apiKey: 'test-key',
        model: 'test-model',
        temperature: 0.1,
        timeoutMs: 30000,
      } as unknown as AIConfig;

      expect(() => createProvider(config)).toThrow(AppError);
    });

    it('should throw CONFIG_ERROR if API key is missing', () => {
      const config: AIConfig = {
        provider: 'openai',
        apiKey: '',
        model: 'gpt-4o',
        temperature: 0.1,
        timeoutMs: 30000,
      };

      expect(() => createProvider(config)).toThrow(AppError);
    });
  });
});
