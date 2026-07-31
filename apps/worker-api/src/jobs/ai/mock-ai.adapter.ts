/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ZodSchema } from 'zod';
import type {
  AiProvider,
  AiEnrichmentResult,
  AiProviderConfig,
  SummaryResult,
  ClassificationResult,
  ExtractResult,
} from './ai.interface';

export class MockAiAdapter implements AiProvider {
  constructor(public readonly name: string) {}

  async summarize(
    _text: string,
    _config?: AiProviderConfig,
  ): Promise<AiEnrichmentResult<SummaryResult>> {
    return {
      result: {
        summary: 'Mock summary',
        topics: ['mock_topic'],
      },
      provider: this.name,
      model: 'mock-model',
      latencyMs: 10,
      inputUnits: 10,
      outputUnits: 10,
      status: 'success',
    };
  }

  async classify(
    _text: string,
    _config?: AiProviderConfig,
  ): Promise<AiEnrichmentResult<ClassificationResult>> {
    return {
      result: {
        category: 'mock_category',
        importance: 5,
      },
      provider: this.name,
      model: 'mock-model',
      latencyMs: 10,
      inputUnits: 10,
      outputUnits: 10,
      status: 'success',
    };
  }

  async extractData(
    text: string,
    _config?: AiProviderConfig,
  ): Promise<AiEnrichmentResult<ExtractResult>> {
    if (text.includes('TRIGGER_REPAIR_ERROR')) {
      throw Object.assign(new Error('Mock repair error'), {
        provider: this.name,
        model: 'mock-model',
        latencyMs: 50,
        errorCode: 'JSON_PARSE_ERROR',
      });
    }

    if (text.includes('TRIGGER_PROVIDER_FAILURE')) {
      throw Object.assign(new Error('Mock provider failure'), {
        provider: this.name,
        model: 'mock-model',
        latencyMs: 50,
        errorCode: 'PROVIDER_OUTAGE',
      });
    }

    return {
      result: {
        title: 'Mock Title',
        summary: 'Mock summary',
        topics: ['mock_topic'],
        people: [],
        companies: [],
        importance: 5,
        whyItMatters: 'Mock matters',
        suggestedAction: 'Mock action',
      },
      provider: this.name,
      model: 'mock-model',
      latencyMs: 10,
      inputUnits: 10,
      outputUnits: 10,
      status: 'success',
    };
  }
  async extractStructured<T>(
    prompt: string,
    _schema: ZodSchema<T>,
    _jsonSchemaDefinition: object,
    _config: AiProviderConfig,
  ): Promise<AiEnrichmentResult<T>> {
    let mockResult: Record<string, unknown> = {};
    if (prompt.includes('Synthesize these')) {
      mockResult = {
        summary: 'Mock summary',
        topicGroups: [{ topic: 'Mock Topic', items: ['Mock Title'] }],
        topItems: ['Mock Title'],
        suggestedActions: ['Mock Action'],
        dormantIdeas: ['Mock Idea'],
      };
    }

    return {
      result: mockResult as T,
      provider: this.name,
      model: 'mock-model',
      latencyMs: 10,
      inputUnits: 10,
      outputUnits: 10,
      status: 'success',
    };
  }
}
