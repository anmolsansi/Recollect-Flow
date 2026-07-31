/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ZodSchema } from 'zod';
import type { Env } from '../../env';
import type {
  AiProvider,
  AiEnrichmentResult,
  AiProviderConfig,
  SummaryResult,
  ClassificationResult,
  ExtractResult,
} from './ai.interface';
import { AppError } from '../../shared/errors';
import {
  ExtractResultSchema,
  ExtractResultJsonSchema,
  SummaryResultSchema,
  SummaryResultJsonSchema,
  ClassificationResultSchema,
  ClassificationResultJsonSchema,
} from './ai.schema';

export class OpenRouterAdapter implements AiProvider {
  name = 'openrouter';

  constructor(private readonly env: Env) {}

  private async callAi<T>(
    prompt: string,
    schema: ZodSchema<T>,
    jsonSchemaDefinition: object,
    model: string,
    attempt = 1,
  ): Promise<AiEnrichmentResult<T>> {
    const apiKey = this.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new AppError(
        500,
        'PROVIDER_CONFIG_ERROR',
        'OpenRouter API key is not configured',
      );
    }

    const startTime = Date.now();
    let rawResponse: string | null = null;

    try {
      const response = await fetch(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/anmolsansi/Recollect-Flow', // OpenRouter requires referer
            'X-Title': 'RecollectFlow',
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'result_schema',
                strict: true,
                schema: jsonSchemaDefinition,
              },
            },
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new AppError(
          503,
          'PROVIDER_HTTP_ERROR',
          `OpenRouter HTTP error ${response.status}: ${errorText}`,
        );
      }

      const data = (await response.json()) as any;
      if (!data.choices || data.choices.length === 0) {
        throw new AppError(
          503,
          'AI_BAD_RESPONSE',
          'Invalid response format from OpenRouter',
        );
      }

      const rawJson = data.choices[0].message.content;
      rawResponse = rawJson;

      const inputUnits = data.usage?.prompt_tokens || 0;
      const outputUnits = data.usage?.completion_tokens || 0;

      // Repair JSON attempt (simple regex matching if wrapped in backticks)
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
        inputUnits,
        outputUnits,
        status: 'success',
      };
    } catch (error) {
      // 1-time deterministic repair attempt
      if (attempt === 1 && rawResponse) {
        try {
          const repairPrompt = `Fix the following malformed JSON so it strictly matches the requested schema.\n\nBroken JSON:\n${rawResponse}`;
          return await this.callAi(
            repairPrompt,
            schema,
            jsonSchemaDefinition,
            model,
            2,
          );
        } catch {
          // ignore repair error and throw original
        }
      }

      const latencyMs = Date.now() - startTime;
      throw Object.assign(
        new AppError(
          503,
          'AI_REQUEST_FAILED',
          'Failed to execute OpenRouter AI request',
        ),
        {
          provider: this.name,
          model,
          latencyMs,
          status: 'failed',
          errorCode:
            error instanceof SyntaxError
              ? 'JSON_PARSE_ERROR'
              : (error as AppError).code || 'UNKNOWN_ERROR',
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
    const model = config.model || 'meta-llama/llama-3-8b-instruct:free';
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
    _text: string,
    _config?: AiProviderConfig,
  ): Promise<AiEnrichmentResult<number[]>> {
    throw new AppError(
      500,
      'NOT_IMPLEMENTED',
      'OpenRouter does not strictly provide an embedding endpoint in the unified chat interface yet.',
    );
  }
}
