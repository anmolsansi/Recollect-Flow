import { describe, expect, it } from 'vitest';

import {
  ALLOWED_DATA_MATRIX,
  PolicyService,
} from '../src/policy/policy.service';
import { createApp } from '../src/app';
import type { PolicyRepository } from '../src/policy/policy.repository';
import type { CaptureRepository } from '../src/captures/capture.repository';
import type { AttachmentRepository } from '../src/attachments/attachment.repository';
import type { Env } from '../src/env';

describe('PolicyService', () => {
  const service = new PolicyService();

  it('publishes an explicit matrix for every privacy level and provider', () => {
    for (const level of [
      'unknown',
      'public',
      'personal',
      'sensitive',
    ] as const) {
      expect(Object.keys(ALLOWED_DATA_MATRIX[level]).sort()).toEqual([
        'gemini',
        'none',
        'openrouter',
      ]);
    }
  });

  it('routes Public content to OpenRouter with Gemini fallback', () => {
    const decision = service.route({
      privacyLevel: 'public',
      modality: 'text',
    });
    expect(decision.provider).toBe('openrouter');
    expect(decision.fallbackProviders).toEqual(['gemini']);
    expect(decision.credentialSource).toBe('app_managed');
  });

  it('uses Gemini when OpenRouter is unavailable for Public content', () => {
    expect(
      service.route({
        privacyLevel: 'public',
        modality: 'image',
        availableProviders: ['gemini', 'none'],
      }).provider,
    ).toBe('gemini');
  });

  it('requires explicit consent and compliant settings for app-managed Personal routing', () => {
    expect(
      service.route({
        privacyLevel: 'personal',
        modality: 'text',
        requestedProvider: 'openrouter',
        credentialSource: 'app_managed',
      }).provider,
    ).toBe('none');
    const approved = service.route({
      privacyLevel: 'personal',
      modality: 'text',
      requestedProvider: 'openrouter',
      credentialSource: 'app_managed',
      hostedProcessingConsent: true,
      zeroDataRetentionEnforced: true,
      dataCollectionDenied: true,
    });
    expect(approved.provider).toBe('openrouter');
    expect(approved.fallbackProviders).toEqual([]);
    expect(approved.zeroDataRetentionRequired).toBe(true);
    expect(approved.dataCollectionDenied).toBe(true);
  });

  it('allows an explicitly consented user-provided provider for Personal content', () => {
    const approved = service.route({
      privacyLevel: 'personal',
      modality: 'text',
      requestedProvider: 'gemini',
      credentialSource: 'user_provided',
      hostedProcessingConsent: true,
    });
    expect(approved.provider).toBe('gemini');
    expect(approved.credentialSource).toBe('user_provided');
    expect(approved.fallbackProviders).toEqual([]);
  });

  it('fails Unknown and Sensitive content closed', () => {
    for (const privacyLevel of ['unknown', 'sensitive'] as const) {
      expect(
        service.route({
          privacyLevel,
          modality: 'text',
          requestedProvider: 'openrouter',
          credentialSource: 'user_provided',
          hostedProcessingConsent: true,
          zeroDataRetentionEnforced: true,
          dataCollectionDenied: true,
        }).provider,
      ).toBe('none');
    }
  });

  it('never sends restricted categories to hosted providers', () => {
    expect(
      service.route({
        privacyLevel: 'public',
        modality: 'text',
        containsRestrictedCategory: true,
      }).provider,
    ).toBe('none');
  });

  it('fails closed on quota and availability failures', () => {
    expect(
      service.route({
        privacyLevel: 'public',
        modality: 'text',
        hostedQuotaAvailable: false,
      }).provider,
    ).toBe('none');
    expect(
      service.route({
        privacyLevel: 'sensitive',
        modality: 'text',
        availableProviders: ['none'],
      }).provider,
    ).toBe('none');
  });
});

describe('PATCH /api/v1/items/:id/privacy', () => {
  it('requires admin auth and records reprocessing intent', async () => {
    const changes: Parameters<PolicyRepository['changePrivacy']>[] = [];
    const repository: PolicyRepository = {
      async changePrivacy(...args) {
        changes.push(args);
      },
    };
    const app = createApp(
      () => ({}) as CaptureRepository,
      () => ({}) as AttachmentRepository,
      () => repository,
    );
    const env = {
      DB: {} as D1Database,
      ATTACHMENTS: {} as R2Bucket,
      AI: {} as Ai,
      NOTION_DATABASE_ID: '3a21b726-4ada-80a3-bfe1-ef808e3c293f',
      MAX_ATTACHMENT_BYTES: '25000000',
      UPLOAD_TTL_SECONDS: '3600',
      CAPTURE_TOKEN: 'capture-secret',
      ADMIN_TOKEN: 'admin-secret',
      NOTION_ACCESS_TOKEN: 'notion-secret',
      TELEGRAM_BOT_TOKEN: 'telegram-secret',
      TELEGRAM_CHAT_ID: 'private-chat-id',
    } satisfies Env;
    const request = {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer admin-secret',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        privacy_level: 'personal',
        derived_data_action: 'reprocess',
        ai_provider: 'openrouter',
        credential_source: 'app_managed',
        hosted_processing_consent: true,
        zero_data_retention_enforced: true,
        data_collection_denied: true,
      }),
    };

    const unauthorized = await app.request(
      '/api/v1/items/item-1/privacy',
      { ...request, headers: { 'Content-Type': 'application/json' } },
      env,
    );
    expect(unauthorized.status).toBe(403);

    const response = await app.request(
      '/api/v1/items/item-1/privacy',
      request,
      env,
    );
    expect(response.status).toBe(200);
    expect(changes).toHaveLength(1);
    expect(changes[0]?.[0]).toBe('item-1');
    expect(changes[0]?.[1]).toEqual({
      privacy_level: 'personal',
      derived_data_action: 'reprocess',
      ai_provider: 'openrouter',
      credential_source: 'app_managed',
      hosted_processing_consent: true,
      zero_data_retention_enforced: true,
      data_collection_denied: true,
    });
    expect(changes[0]?.[2].provider).toBe('openrouter');
    expect(changes[0]?.[2].zeroDataRetentionRequired).toBe(true);
    expect(changes[0]?.[2].dataCollectionDenied).toBe(true);
  });
});
