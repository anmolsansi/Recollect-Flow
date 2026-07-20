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
        'ollama',
        'workers_ai',
      ]);
    }
  });

  it('routes public text to Workers AI', () => {
    expect(
      service.route({ privacyLevel: 'public', modality: 'text' }).provider,
    ).toBe('workers_ai');
  });

  it('allows Gemini only for approved public multimodal input', () => {
    expect(
      service.route({
        privacyLevel: 'public',
        modality: 'image',
        requestedProvider: 'gemini',
      }).provider,
    ).toBe('gemini');
    expect(
      service.route({
        privacyLevel: 'personal',
        modality: 'image',
        requestedProvider: 'gemini',
      }).provider,
    ).toBe('none');
  });

  it('routes personal content locally and fails unknown closed', () => {
    expect(
      service.route({ privacyLevel: 'personal', modality: 'text' }).provider,
    ).toBe('ollama');
    expect(
      service.route({ privacyLevel: 'unknown', modality: 'text' }).provider,
    ).toBe('none');
  });

  it('requires explicit approval before sensitive local processing', () => {
    expect(
      service.route({ privacyLevel: 'sensitive', modality: 'text' }).provider,
    ).toBe('none');
    expect(
      service.route({
        privacyLevel: 'sensitive',
        modality: 'text',
        requestedProvider: 'ollama',
        localProcessingApproved: true,
      }).provider,
    ).toBe('ollama');
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
        privacyLevel: 'personal',
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
    });
    expect(changes[0]?.[2].provider).toBe('ollama');
  });
});
