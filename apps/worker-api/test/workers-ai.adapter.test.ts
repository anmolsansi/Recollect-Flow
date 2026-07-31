import { describe, expect, it, vi } from 'vitest';

import { WorkersAiAdapter } from '../src/jobs/ai/workers-ai.adapter';

const validExtraction = JSON.stringify({
  title: 'Validated title',
  summary: 'Validated summary',
  topics: ['validation'],
  people: [],
  companies: [],
  project: 'OPE-222',
  importance: 80,
  whyItMatters: 'Invalid output must not reach storage.',
  suggestedAction: 'Keep schema validation strict.',
});

function adapterWithResponses(...responses: string[]) {
  const run = vi.fn();
  for (const response of responses) run.mockResolvedValueOnce({ response });
  const ai = Object.create(null) as Ai;
  ai.run = run as Ai['run'];
  const adapter = new WorkersAiAdapter({ AI: ai });
  return { adapter, run };
}

describe('WorkersAiAdapter structured validation', () => {
  it('repairs malformed JSON once and returns only validated output', async () => {
    const { adapter, run } = adapterWithResponses('{broken', validExtraction);

    const result = await adapter.extractData('source');

    expect(result.result.title).toBe('Validated title');
    expect(result.status).toBe('success');
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('returns a stable failure code when JSON repair fails', async () => {
    const { adapter, run } = adapterWithResponses('{broken', '{still-broken');

    await expect(adapter.extractData('source')).rejects.toMatchObject({
      errorCode: 'JSON_PARSE_ERROR',
      provider: 'cloudflare',
      status: 'failed',
    });
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('rejects schema-invalid output including extra fields', async () => {
    const invalid = JSON.stringify({
      ...JSON.parse(validExtraction),
      unexpected: 'must fail',
    });
    const { adapter } = adapterWithResponses(invalid, invalid);

    await expect(adapter.extractData('source')).rejects.toMatchObject({
      errorCode: 'SCHEMA_VALIDATION_ERROR',
    });
  });
});
