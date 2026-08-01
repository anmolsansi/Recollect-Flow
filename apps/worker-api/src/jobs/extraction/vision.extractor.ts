import type {
  Extractor,
  ExtractionInput,
  ExtractionResult,
} from './extraction.types';
import type { Env } from '../../env';
import { PolicyService } from '../../policy/policy.service';
import type { PrivacyLevel } from '../../policy/policy.service';
import { AiProviderRegistry } from '../ai/ai-provider.registry';

export class VisionExtractor implements Extractor {
  name = 'vision-model' as const;
  version = '1.0';
  private policyService = new PolicyService();
  private aiRegistry: AiProviderRegistry;

  constructor(private readonly env: Env) {
    this.aiRegistry = new AiProviderRegistry(env);
  }

  supports(contentType: string): boolean {
    return ['image/png', 'image/jpeg', 'image/webp'].includes(contentType);
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    return btoa(binary);
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
        input.privacyLevel as PrivacyLevel,
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = error as any;
      return {
        extractorName: this.name,
        extractorVersion: this.version,
        completeness: 'failed',
        coverage: 'none',
        errorCode:
          err?.code === 'NO_ELIGIBLE_PROVIDER'
            ? 'POLICY_DENIED'
            : 'PROVIDER_FAILURE',
      };
    }
  }
}
