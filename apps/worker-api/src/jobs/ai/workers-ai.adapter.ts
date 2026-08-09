import type { Env } from '../../env';
import type {
  AiProvider,
  AiEnrichmentResult,
  AiProviderConfig,
  SummaryResult,
  ClassificationResult,
  ExtractResult,
} from './ai.interface';
import {
  ExtractResultSchema,
  ExtractResultJsonSchema,
  SummaryResultSchema,
  SummaryResultJsonSchema,
  ClassificationResultSchema,
  ClassificationResultJsonSchema,
} from './ai.schema';
import { ZodError, type ZodSchema } from 'zod';
import { AppError } from '../../shared/errors';

export class WorkersAiAdapter implements AiProvider {
  name = 'cloudflare';

  constructor(private readonly env: Pick<Env, 'AI'>) {}

  private async callAi<T>(
    prompt: string,
    schema: ZodSchema<T>,
    jsonSchemaDefinition: object,
    model: string,
    attempt = 1,
    priorInputUnits = 0,
    priorOutputUnits = 0,
  ): Promise<AiEnrichmentResult<T>> {
    const startTime = Date.now();
    const currentInputUnits = Math.max(1, Math.ceil(prompt.length / 4));
    let currentOutputUnits = 0;
    let rawResponse: string | null = null;

    try {
      const response = await this.env.AI.run(
        model as '@cf/meta/llama-3.1-8b-instruct-fp8-fast',
        {
          messages: [{ role: 'user', content: prompt }],
          response_format: {
            type: 'json_schema',
            json_schema: jsonSchemaDefinition,
          },
        },
      );

      const rawJson =
        typeof response === 'object' &&
        response !== null &&
        'response' in response
          ? response.response
          : response;
      if (typeof rawJson !== 'string') {
        throw new AppError(
          503,
          'AI_BAD_RESPONSE',
          'Invalid response format from AI',
        );
      }
      rawResponse = rawJson;
      currentOutputUnits = Math.max(1, Math.ceil(rawResponse.length / 4));

      let cleanedJson = rawJson.trim();
      if (cleanedJson.startsWith('```json')) {
        cleanedJson = cleanedJson
          .replace(/^```json/, '')
          .replace(/```$/, '')
          .trim();
      } else if (cleanedJson.startsWith('```')) {
        cleanedJson = cleanedJson
          .replace(/^```/, '')
          .replace(/```$/, '')
          .trim();
      }

      const parsed = JSON.parse(cleanedJson);
      const validated = schema.parse(parsed);

      return {
        result: validated,
        provider: this.name,
        model,
        latencyMs: Date.now() - startTime,
        inputUnits: priorInputUnits + currentInputUnits,
        outputUnits: priorOutputUnits + currentOutputUnits,
        requestCount: attempt,
        status: 'success',
      };
    } catch (error) {
      if (attempt === 1 && rawResponse) {
        const repairPrompt = `Fix the following malformed JSON so it strictly matches the requested schema.\n\nBroken JSON:\n${rawResponse}`;
        return this.callAi(
          repairPrompt,
          schema,
          jsonSchemaDefinition,
          model,
          2,
          priorInputUnits + currentInputUnits,
          priorOutputUnits + currentOutputUnits,
        );
      }

      const latencyMs = Date.now() - startTime;
      throw Object.assign(
        new AppError(503, 'AI_REQUEST_FAILED', 'Failed to execute AI request'),
        {
          provider: this.name,
          model,
          latencyMs,
          inputUnits: priorInputUnits + currentInputUnits,
          outputUnits: priorOutputUnits + currentOutputUnits,
          requestCount: attempt,
          status: 'failed',
          errorCode:
            error instanceof SyntaxError
              ? 'JSON_PARSE_ERROR'
              : error instanceof ZodError
                ? 'SCHEMA_VALIDATION_ERROR'
                : error instanceof AppError
                  ? error.code
                  : 'AI_REQUEST_FAILED',
        },
      );
    }
  }

  async extractStructured<T>(
    prompt: string,
    schema: ZodSchema<T>,
    jsonSchemaDefinition: object,
    config: AiProviderConfig,
  ): Promise<AiEnrichmentResult<T>> {
    const model =
      config.model || '@cf/meta/llama-3.1-8b-instruct-fp8-fast';
    return this.callAi(prompt, schema, jsonSchemaDefinition, model);
  }

  async summarize(
    text: string,
    config?: AiProviderConfig,
  ): Promise<AiEnrichmentResult<SummaryResult>> {
    const prompt = `Summarize the following text and extract key topics.\n\n${text}`;
    return this.extractStructured(
      prompt,
      SummaryResultSchema,
      SummaryResultJsonSchema,
      config || { provider: this.name },
    );
  }

  async classify(
    text: string,
    config?: AiProviderConfig,
  ): Promise<AiEnrichmentResult<ClassificationResult>> {
    const prompt = `Classify the following text and assign an importance score from 0 to 100.\n\n${text}`;
    return this.extractStructured(
      prompt,
      ClassificationResultSchema,
      ClassificationResultJsonSchema,
      config || { provider: this.name },
    );
  }

  async extractData(
    text: string,
    config?: AiProviderConfig,
  ): Promise<AiEnrichmentResult<ExtractResult>> {
    const prompt = `Analyze the following text and extract structured information according to the requested schema. Provide a title, summary, topics, people, companies, project suggestion, importance score (0-100), why it matters, and a suggested action.\n\n${text}`;
    return this.extractStructured(
      prompt,
      ExtractResultSchema,
      ExtractResultJsonSchema,
      config || { provider: this.name },
    );
  }

  async embed(
    text: string,
    config?: AiProviderConfig,
  ): Promise<AiEnrichmentResult<number[]>> {
    const model = config?.model || '@cf/baai/bge-small-en-v1.5';
    const startTime = Date.now();
    const inputUnits = Math.max(1, Math.ceil(text.length / 4));
    try {
      const response = (await this.env.AI.run(
        model as '@cf/baai/bge-small-en-v1.5',
        { text: [text] },
      )) as { shape: number[]; data: number[][] };

      const vector = response.data?.[0];
      if (!vector) {
        throw new AppError(
          503,
          'AI_BAD_RESPONSE',
          'Invalid response from embedding model',
        );
      }

      return {
        result: vector,
        provider: this.name,
        model,
        latencyMs: Date.now() - startTime,
        inputUnits,
        outputUnits: Math.max(1, vector.length),
        requestCount: 1,
        status: 'success',
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      throw Object.assign(
        new AppError(
          503,
          'AI_REQUEST_FAILED',
          'Failed to execute embedding request',
        ),
        {
          provider: this.name,
          model,
          latencyMs,
          inputUnits,
          outputUnits: 0,
          requestCount: 1,
          status: 'failed',
          errorCode: (error as Error).message,
        },
      );
    }
  }
}
