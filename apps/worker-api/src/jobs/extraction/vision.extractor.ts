import type {
  Extractor,
  ExtractionInput,
  ExtractionResult,
} from './extraction.types';
import type { Env } from '../../env';
import { AiProviderRegistry } from '../ai/ai-provider.registry';
import { AppError } from '../../shared/errors';
import { Buffer } from 'node:buffer';

export class VisionExtractor implements Extractor {
  name = 'vision-model' as const;
  version = '1.0';
  private aiRegistry: AiProviderRegistry;

  constructor(private readonly env: Env) {
    this.aiRegistry = new AiProviderRegistry(env);
  }

  supports(contentType: string): boolean {
    return ['image/png', 'image/jpeg', 'image/webp'].includes(contentType);
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    return Buffer.from(buffer).toString('base64');
  }

  async extract(input: ExtractionInput): Promise<ExtractionResult> {
    try {
      const base64Image = this.arrayBufferToBase64(input.fileBuffer);
      const dataUrl = `data:${input.contentType};base64,${base64Image}`;
      const prompt =
        'Extract and return all the text visible in this image. If there is no text, briefly describe the image content.';

      const result = await this.aiRegistry.extractImage(
        dataUrl,
        input.contentType,
        prompt,
        input.routing,
      );

      return {
        extractorName: this.name,
        extractorVersion: this.version,
        extractedText: result.result.visible_text,
        imageDescription: result.result.description,
        confidence: result.result.confidence,
        pageCount: 1,
        completeness: 'complete',
        coverage: 'full',
        providerName: result.provider,
        modelName: result.model,
      };
    } catch (error) {
      return {
        extractorName: this.name,
        extractorVersion: this.version,
        completeness: 'failed',
        coverage: 'none',
        errorCode:
          error instanceof AppError && error.code === 'NO_ELIGIBLE_PROVIDER'
            ? 'POLICY_DENIED'
            : 'PROVIDER_FAILURE',
      };
    }
  }
}
