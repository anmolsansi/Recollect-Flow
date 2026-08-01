# OPE-223 — Multimodal Extraction Completion Evidence

## Status

- **Linear:** Done
- **Branch:** `feature/ope-223-multimodal-extraction`
- **Local implementation:** Complete
- **Production deployment:** Not performed as part of this ticket implementation

## Acceptance criteria

### Validate file type and size before processing

- Uses `MAX_ATTACHMENT_BYTES` instead of a hardcoded extraction limit.
- Rejects oversized R2 objects before reading their bodies.
- Verifies the D1 and R2 sizes match.
- Rejects declared/detected MIME mismatches.
- Revalidates PDF, PNG, JPEG, and WebP signatures before extraction.
- Verifies the stored SHA-256 checksum.
- Records stable failure codes without deleting or changing the attachment.

### Extract embedded PDF text

- Uses `unpdf`'s serverless PDF.js build, which is compatible with Cloudflare Workers.
- Normalizes whitespace and preserves page separation.
- Processes at most 50 pages and 250,000 extracted characters.
- Reports partial coverage when either limit is reached.
- Records page count and deterministic confidence.
- Records empty, corrupt, encrypted, oversized, and invalid-signature outcomes.
- Releases PDF resources after extraction.

### Extract screenshots through an approved vision provider

- Passes the complete durable job-policy snapshot to provider routing.
- Only advertises providers that implement image extraction.
- Does not expose Cloudflare as vision-capable until that adapter is implemented.
- Validates visible text, description, and confidence with strict schemas.
- Stores provider and model evidence with successful extraction records.
- Records policy denial separately from provider failure.

### Preserve and expose attachment outcomes

- Extraction records retain the original `attachment_id` foreign key.
- Original R2 objects and attachment rows are not overwritten or deleted.
- Unsupported attachments remain linked and receive an `unsupported` extraction record.
- Item details return every extraction in `extractions` while retaining the legacy singular `extraction` field.

### Enforce leases and enrichment ordering

- Extraction writes, enrichment scheduling, and extract-job completion are submitted in one D1 batch.
- Every extraction write is conditional on the current lease owner and unexpired lease.
- Stale or stolen leases cannot persist extraction records or enqueue enrichment.
- Chained enrichment jobs copy the complete durable policy snapshot.

### Production surface

- Test-only PDF and vision upload routes are no longer mounted in the deployed application.
- `nodejs_compat` is enabled and generated Worker types are synchronized with Wrangler configuration.

## Automated evidence

- `npm run check`
  - 85 Node tests passed.
  - 31 Worker/D1/R2 tests passed.
  - Formatting, ESLint, and TypeScript passed.
- `npx wrangler types --check` passed.
- `npx wrangler deploy --dry-run` passed.
- `npx wrangler check startup` passed.
- Worker bundle: 2,764.67 KiB raw / 638.50 KiB gzip.
- Local startup profile window: 68.5 ms.

The OPE-223 tests cover normalized PDFs, empty PDFs, corrupt PDFs, oversized files, invalid signatures, MIME mismatches, screenshot extraction, provider failure, sensitive-policy denial, provider capability routing, policy propagation, stale leases, unsupported visibility, multi-attachment API output, and the complete R2-to-D1 PDF worker path.

## Release verification still required

Before treating the feature as production-accepted, deploy the branch through the normal release process and run one real PDF capture and one real screenshot capture using production R2, D1, and approved provider credentials. This is release evidence, not missing local implementation.
