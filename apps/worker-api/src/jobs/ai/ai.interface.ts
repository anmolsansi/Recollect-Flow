import type { ZodSchema } from 'zod';

export interface AiEnrichmentResult<T> {
  result: T;
  provider: string;
  model: string;
  latencyMs: number;
  inputUnits: number;
  outputUnits: number;
  requestCount?: number;
  status: 'success' | 'failed';
  errorCode?: string;
}

export interface SummaryResult {
  title?: string;
  summary: string;
  topics: string[];
}

export interface ClassificationResult {
  category: string;
  importance: number;
}

export interface ActionItem {
  id: string;
  description: string;
  status: 'pending' | 'completed';
}

export interface ExtractResult {
  title?: string;
  summary: string;
  topics: string[];
  people: string[];
  companies: string[];
  project?: string;
  importance: number;
  whyItMatters: string;
  suggestedAction?: string;
}

export interface ImageExtractResult {
  visible_text: string;
  description: string;
  confidence: number;
}

export interface AiProviderConfig {
  provider: string;
  model?: string;
}

export interface AiProvider {
  name: string;
  extractStructured<T>(
    prompt: string,
    schema: ZodSchema<T>,
    jsonSchemaDefinition: object,
    config: AiProviderConfig,
  ): Promise<AiEnrichmentResult<T>>;

  summarize(
    text: string,
    config?: AiProviderConfig,
  ): Promise<AiEnrichmentResult<SummaryResult>>;
  classify(
    text: string,
    config?: AiProviderConfig,
  ): Promise<AiEnrichmentResult<ClassificationResult>>;
  extractData(
    text: string,
    config?: AiProviderConfig,
  ): Promise<AiEnrichmentResult<ExtractResult>>;
  extractImage?(
    dataUrl: string,
    contentType: string,
    prompt: string,
    config?: AiProviderConfig,
  ): Promise<AiEnrichmentResult<ImageExtractResult>>;
  embed?(
    text: string,
    config?: AiProviderConfig,
  ): Promise<AiEnrichmentResult<number[]>>;
}
