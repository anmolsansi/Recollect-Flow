import { Hono } from 'hono';

import type { AppContext } from '../env';
import { requireAdminToken } from '../shared/auth';
import { AppError } from '../shared/errors';
import { D1PolicyRepository } from './policy.repository';
import type { PolicyRepository } from './policy.repository';
import { privacyChangeSchema } from './policy.schema';
import { PolicyService } from './policy.service';

export function policyRoutes(
  repositoryFactory: (env: Cloudflare.Env) => PolicyRepository = (env) =>
    new D1PolicyRepository(env.DB),
) {
  const router = new Hono<AppContext>();

  router.patch('/items/:id/privacy', requireAdminToken, async (context) => {
    const body = await context.req.json().catch(() => {
      throw new AppError(400, 'INVALID_JSON', 'Invalid JSON body.');
    });
    const parsed = privacyChangeSchema.safeParse(body);
    if (!parsed.success) {
      const fields = Object.fromEntries(
        parsed.error.issues.map((issue) => [
          issue.path.join('.') || 'body',
          issue.message,
        ]),
      );
      throw new AppError(422, 'VALIDATION_ERROR', 'Validation failed.', fields);
    }

    const policy = new PolicyService();
    const decision = policy.route({
      privacyLevel: parsed.data.privacy_level,
      modality: 'text',
      requestedProvider: parsed.data.ai_provider,
      credentialSource: parsed.data.credential_source,
      hostedProcessingConsent: parsed.data.hosted_processing_consent,
      zeroDataRetentionEnforced: parsed.data.zero_data_retention_enforced,
      dataCollectionDenied: parsed.data.data_collection_denied,
    });
    await repositoryFactory(context.env).changePrivacy(
      context.req.param('id'),
      parsed.data,
      decision,
      new Date().toISOString(),
    );

    return context.json({
      data: {
        item_id: context.req.param('id'),
        privacy_level: parsed.data.privacy_level,
        derived_data_action: parsed.data.derived_data_action,
        provider_eligibility: decision.provider,
        fallback_providers: decision.fallbackProviders,
        credential_source: decision.credentialSource,
        hosted_processing_consent: decision.hostedProcessingConsent,
        zero_data_retention_required: decision.zeroDataRetentionRequired,
        data_collection_denied: decision.dataCollectionDenied,
        policy_version: decision.policyVersion,
      },
      meta: { request_id: context.get('requestId') },
    });
  });

  return router;
}
