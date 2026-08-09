/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { z, type ZodSchema } from 'zod';
import type { Env } from '../../env';
import type {
  AiProvider,
  AiEnrichmentResult,
  AiProviderConfig,
  SummaryResult,
  ClassificationResult,
  ExtractResult,
  ImageExtractResult,
} from './ai.interface';
import { AppError } from '../../shared/errors';
import {
  ExtractResultSchema,
  ExtractResultJsonSchema,
  SummaryResultSchema,
  SummaryResultJsonSchema,
  ClassificationResultSchema,
  ClassificationResultJsonSchema,
  ImageExtractResultSchema,
  ImageExtractResultJsonSchema,
} from './ai.schema';

const OPENROUTER_FREE_MODEL = 'openrouter/free';

const OpenRouterImageResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string() }).passthrough(),
      }),
    )
    .min(1),
  usage: z
    .object({
      prompt_tokens: z.number().nonnegative().optional(),
      completion_tokens: z.number().nonnegative().optional(),
    })
    .optional(),
});

export class OpenRouterAdapter implements AiProvider {
  name = 'openrouter';

  constructor(private readonly env: Env) {}

  private async callAi<T>(
    prompt: string,
    schema: ZodSchema<T>,
    jsonSchemaDefinition: object,
    model: string,
    attempt = 1,
    priorInputUnits = 0,
    priorOutputUnits = 0,
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
    let currentInputUnits = Math.max(1, Math.ceil(prompt.length / 4));
    let currentOutputUnits = 0;

    try {
      const response = await fetch(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/anmolsansi/Recollect-Flow',
            'X-Title': 'RecollectFlow',
          },
          body: JSON.stringify({
            model,
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
        throw new AppError(
          503,
          'PROVIDER_HTTP_ERROR',
          `OpenRouter request failed with HTTP ${response.status}`,
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
      currentInputUnits =
        data.usage?.prompt_tokens || Math.max(1, Math.ceil(prompt.length / 4));
      currentOutputUnits =
        data.usage?.completion_tokens ||
        Math.max(1, Math.ceil(rawJson.length / 4));

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
        new AppError(
          503,
          'AI_REQUEST_FAILED',
          'Failed to execute OpenRouter AI request',
        ),
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
    const model = config.model || OPENROUTER_FREE_MODEL;
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

  async extractImage(
    dataUrl: string,
    _contentType: string,
    prompt: string,
    config?: AiProviderConfig,
  ): Promise<AiEnrichmentResult<ImageExtractResult>> {
    const apiKey = this.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new AppError(
        500,
        'PROVIDER_CONFIG_ERROR',
        'OpenRouter API key is not configured',
      );
    }

    const modelName = config?.model || OPENROUTER_FREE_MODEL;
    const startTime = Date.now();
    const estimatedInput = Math.max(1, Math.ceil(prompt.length / 4));

    try {
      const response = await fetch(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/anmolsansi/Recollect-Flow',
            'X-Title': 'RecollectFlow',
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  { type: 'image_url', image_url: { url: dataUrl } },
                ],
              },
            ],
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'image_extract_schema',
                strict: true,
                schema: ImageExtractResultJsonSchema,
              },
            },
          }),
        },
      );

      if (!response.ok) {
        throw new AppError(
          503,
          'PROVIDER_HTTP_ERROR',
          `OpenRouter request failed with HTTP ${response.status}`,
        );
      }

      const data = OpenRouterImageResponseSchema.parse(await response.json());

      const rawJson = data.choices[0]!.message.content;
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
      const validated = ImageExtractResultSchema.parse(parsed);

      return {
        result: validated,
        provider: this.name,
        model: modelName,
        latencyMs: Date.now() - startTime,
        inputUnits: data.usage?.prompt_tokens || estimatedInput,
        outputUnits:
          data.usage?.completion_tokens ||
          Math.max(1, Math.ceil(rawJson.length / 4)),
        requestCount: 1,
        status: 'success',
      };
    } catch (error) {
      throw Object.assign(
        new AppError(
          503,
          'AI_REQUEST_FAILED',
          'Failed to execute OpenRouter AI request for image',
        ),
        {
          provider: this.name,
          model: modelName,
          latencyMs: Date.now() - startTime,
          inputUnits: estimatedInput,
          outputUnits: 0,
          requestCount: 1,
          status: 'failed',
          errorCode: error instanceof AppError ? error.code : 'UNKNOWN_ERROR',
        },
      );
    }
  }
}
