# OPE-223 — Multimodal Extraction Completion Tasks

## Ticket information

- **Ticket:** OPE-223
- **Title:** Implement multimodal extraction for screenshots, PDFs, and shared files
- **Current status:** Backlog
- **Priority:** High
- **Estimate:** 5 points
- **Current completion status:** Not complete
- **Working branch:** `feature/ope-223-multimodal-extraction`
- **Depends on:** OPE-222, OPE-246, OPE-249
- **Blocks:** OPE-248, OPE-232, OPE-229

## Goal

Extract usable text and metadata from PDF and image attachments before AI enrichment while:

- Preserving the original attachment.
- Following the stored privacy-policy decision.
- Recording confidence and safe errors.
- Leaving unsupported files saved and visibly unprocessed.
- Preventing invalid, duplicate, or stale job results.

---

# Task 1 — Repair the extraction migration

## Description

The current migration does not match the SQL used by the extraction service and item API.

The code expects `extractor_name` and `page_count`, but migration `0015_add_extraction_records.sql` does not create those columns.

## Work required

- [x] Update `migrations/0015_add_extraction_records.sql`.
- [x] Include the following columns:
  - [x] `id`
  - [x] `item_id`
  - [x] `attachment_id`
  - [x] `extractor_name`
  - [x] `extractor_version`
  - [x] `extracted_text`
  - [x] `image_description`
  - [x] `confidence`
  - [x] `page_count`
  - [x] `completeness`
  - [x] `coverage`
  - [x] `provider_name`
  - [x] `model_name`
  - [x] `error_code`
  - [x] `created_at`
  - [x] `updated_at`
- [x] Add a confidence constraint between `0` and `1`.
- [x] Add valid completeness values:
  - [x] `complete`
  - [x] `partial`
  - [x] `empty`
  - [x] `unsupported`
  - [x] `failed`
- [x] Add foreign keys to `items` and `attachments`.
- [x] Add indexes for `item_id` and `attachment_id`.
- [x] Add an idempotency constraint for repeated attachment processing.
- [x] Ensure the migration preserves existing items and attachments.

## Completion evidence

- [x] Fresh migration chain applies successfully.
- [x] Populated-database migration applies successfully.
- [x] The real extraction `INSERT` succeeds.
- [x] The item-detail extraction `SELECT` succeeds.
- [x] `PRAGMA foreign_key_check` returns no violations.

---

# Task 2 — Correct attachment lookup

## Description

The extraction worker currently reads a nonexistent `attachments.content_type` column and requires the wrong attachment status.

A linked attachment has:

- `status = 'linked'`
- `object_key`
- `declared_content_type`
- `detected_content_type`
- `size_bytes`
- `content_hash`

## Work required

- [x] Update `extraction.worker.ts`.
- [x] Replace `a.content_type`.
- [x] Use `COALESCE(a.detected_content_type, a.declared_content_type)`.
- [x] Select `a.object_key`.
- [x] Select `a.size_bytes`.
- [x] Select `a.content_hash`.
- [x] Process attachments with `status = 'linked'`.
- [x] Exclude deleted or orphaned attachments.
- [x] Remove the incompatible finalized-plus-item join.
- [x] Do not use `LIMIT 1` if an item can contain multiple attachments.
- [x] Process linked attachments in deterministic order.

## Completion evidence

- [x] A linked PDF is found by the worker.
- [x] A linked image is found by the worker.
- [x] Deleted attachments are ignored.
- [x] Multiple linked attachments are processed once each.

---

# Task 3 — Use the correct R2 object key

## Description

The extraction service currently passes the attachment UUID to `ATTACHMENTS.get()`. R2 objects are stored using `attachments.object_key`, such as `private/2026/<uuid>`.

## Work required

- [x] Pass `object_key` into `ExtractionService`.
- [x] Call `env.ATTACHMENTS.get(objectKey)`.
- [x] Never derive the R2 key from the attachment UUID.
- [x] Return `ATTACHMENT_NOT_FOUND` if the R2 object is missing.
- [x] Preserve the original attachment row when R2 lookup fails.
- [x] Do not delete or overwrite the source object during extraction.

## Completion evidence

- [x] Uploaded PDF bytes can be retrieved during extraction.
- [x] Uploaded image bytes can be retrieved during extraction.
- [x] Missing R2 objects produce a stored safe failure.
- [x] Original R2 bytes remain unchanged after success and failure.

---

# Task 4 — Validate files before processing

## Description

File type and size must be checked again at extraction time, even though upload validation already exists.

## Work required

- [x] Read the maximum size from `MAX_ATTACHMENT_BYTES`.
- [x] Remove the hardcoded `25_000_000` limit.
- [x] Check database size before downloading the object.
- [x] Check `R2Object.size` before calling `arrayBuffer()`.
- [x] Confirm database size and R2 size match.
- [x] Use detected MIME type when available.
- [x] Revalidate the file signature before extraction.
- [x] Verify the SHA-256 checksum when available.
- [x] Add a smaller explicit image-processing limit if base64 conversion could exceed Worker memory.
- [x] Return stable errors:
  - [x] `FILE_TOO_LARGE`
  - [x] `WRONG_SIZE`
  - [x] `WRONG_SIGNATURE`
  - [x] `CHECKSUM_MISMATCH`
  - [x] `UNSUPPORTED_TYPE`

## Completion evidence

- [x] Oversized files are rejected before buffering.
- [x] Incorrect signatures are rejected.
- [x] Size mismatches are rejected.
- [x] Checksum mismatches are rejected.
- [x] The original file remains saved after every rejection.

---

# Task 5 — Complete PDF extraction

## Description

PDFs with embedded text must produce normalized text without exhausting Worker memory.

## Work required

- [x] Keep PDF parsing isolated in `pdf.extractor.ts`.
- [x] Extract embedded text page by page.
- [x] Normalize repeated spaces and line breaks.
- [x] Preserve reasonable paragraph/page separation.
- [x] Limit the maximum number of processed pages.
- [x] Limit final extracted-text length.
- [x] Stop processing when the output limit is reached.
- [x] Report partial coverage when page or text limits are reached.
- [x] Destroy/release the PDF document after extraction.
- [x] Return `PDF_EMPTY` when no embedded text exists.
- [x] Return `PDF_CORRUPT` for invalid PDF bytes.
- [x] Return `PDF_ENCRYPTED` for password-protected PDFs.
- [x] Record page count and coverage.

## Completion evidence

- [x] A text PDF returns normalized text.
- [x] A multi-page PDF returns correct page count.
- [x] A large PDF returns `partial` with coverage.
- [x] An empty PDF returns `PDF_EMPTY`.
- [x] A corrupt PDF returns `PDF_CORRUPT`.
- [x] An encrypted PDF returns `PDF_ENCRYPTED`.

---

# Task 6 — Validate vision-provider output

## Description

The image provider response is currently parsed through `any` and is not validated before persistence.

## Work required

- [x] Create a strict Zod schema for:
  - [x] `visible_text`
  - [x] `description`
  - [x] `confidence`
- [x] Require `confidence` to be between `0` and `1`.
- [x] Limit visible-text length.
- [x] Limit description length.
- [x] Reject additional unexpected fields.
- [x] Remove `as any` from the image-response path.
- [x] Validate provider JSON before returning it.
- [x] Attempt one bounded repair only if approved by the OPE-222 contract.
- [x] Return `PROVIDER_FAILURE` when output cannot be validated.
- [x] Never persist partially parsed provider output.

## Completion evidence

- [x] Valid provider output is accepted.
- [x] Invalid confidence is rejected.
- [x] Missing description is rejected.
- [x] Malformed JSON is rejected safely.
- [x] Unexpected fields do not reach D1.

---

# Task 7 — Make provider selection capability-aware

## Description

A registered text provider is not automatically a valid image provider. Cloudflare image extraction is currently exposed but throws `NOT_IMPLEMENTED`.

## Work required

- [x] Add provider capability metadata.
- [x] Distinguish text and image capabilities.
- [x] Only include providers that implement image extraction.
- [x] Do not select Cloudflare vision until it is actually implemented and tested.
- [x] Use OpenRouter only when policy and configuration approve it.
- [x] Return `NO_ELIGIBLE_PROVIDER` when no compliant vision provider exists.
- [x] Avoid exposing an adapter method that always throws `NOT_IMPLEMENTED`.
- [x] Use deterministic mock providers in tests.

## Completion evidence

- [x] Text-only providers are never selected for images.
- [x] Disabled providers are never selected.
- [x] Missing credentials produce `NO_ELIGIBLE_PROVIDER`.
- [x] Provider failure does not fail the original capture.

---

# Task 8 — Use the durable privacy-policy snapshot

## Description

The extraction worker currently passes only `privacy_level`. It ignores the policy values captured when the job was created.

## Work required

- [x] Load the extraction job’s:
  - [x] `provider_eligibility`
  - [x] `credential_source`
  - [x] `hosted_processing_consent`
  - [x] `zero_data_retention_required`
  - [x] `data_collection_denied`
  - [x] `policy_version`
- [x] Pass the complete routing context into `AiProviderRegistry`.
- [x] Do not recompute routing from privacy level alone.
- [x] Fail closed if the stored provider is unavailable.
- [x] Never send sensitive files to hosted/public providers.
- [x] Require consent for personal hosted processing.
- [x] Enforce ZDR and denied data collection where required.
- [x] Record `POLICY_DENIED` separately from provider failure.
- [x] Do not include raw content or image data in logs.

## Completion evidence

- [x] Public images follow configured routing.
- [x] Personal images without consent are denied.
- [x] Personal app-managed routing requires ZDR.
- [x] Sensitive images never call a hosted provider.
- [x] Policy version and provider are recorded with the result.

---

# Task 9 — Make extraction completion lease-safe

## Description

The current code saves an extraction record and then separately completes the job. A worker that has lost its lease could save a result before completion is rejected.

## Work required

- [x] Integrate extraction persistence with `JobService`.
- [x] Extend `submitProcessingResult`, or add a dedicated atomic extraction-result method.
- [x] Verify the job is:
  - [x] `processing`
  - [x] Owned by the submitting worker
  - [x] Within its lease
- [x] Store the extraction result and complete the job atomically.
- [x] Add an idempotent submission ID.
- [x] Add an input hash based on the original attachment checksum.
- [x] Reject conflicting duplicate submissions.
- [x] Accept exact replay safely.
- [x] Prevent stale workers from overwriting newer results.

## Completion evidence

- [x] Duplicate delivery produces one extraction record.
- [x] Exact replay succeeds safely.
- [x] Conflicting replay is rejected.
- [x] Expired lease owner cannot save results.
- [x] Stolen lease owner cannot complete the job.

---

# Task 10 — Enforce extraction-before-enrichment

## Description

The current capture flow enqueues both extraction and enrichment immediately. Both scheduled workers then run concurrently.

This violates the ticket goal of extracting attachment content before enrichment.

## Work required

- [x] For attachment captures, enqueue only the extraction job initially.
- [x] After successful extraction, enqueue the enrichment job.
- [x] For unsupported or terminal extraction outcomes:
  - [x] Keep the item available.
  - [x] Store the visible extraction status.
  - [x] Only enqueue enrichment if usable raw text or a user note already exists.
- [x] Update `EnrichService` to read usable text from `extraction_records`.
- [x] Combine extracted text without modifying `items.raw_text`.
- [x] Preserve `items.user_note`.
- [x] Prevent duplicate active enrichment jobs.
- [x] Ensure Notion sync does not publish incomplete extraction results unless explicitly intended.

## Completion evidence

- [x] Enrichment cannot run before extraction.
- [x] PDF text is available to enrichment.
- [x] Screenshot text is available to enrichment.
- [x] Raw source and user note remain unchanged.
- [x] Unsupported attachments remain reviewable.

---

# Task 11 — Expose visible extraction status

## Description

Unsupported and failed files must remain saved and visibly unprocessed.

## Work required

- [x] Correct the extraction query in `item.routes.ts`.
- [x] Return:
  - [x] Attachment ID
  - [x] Completeness
  - [x] Error code
  - [x] Extracted text
  - [x] Image description
  - [x] Confidence
  - [x] Provider
  - [x] Model
  - [x] Coverage
  - [x] Updated timestamp
- [x] Support multiple extraction records if an item has multiple attachments.
- [x] Return safe error codes without internal provider messages.
- [x] Require admin authentication.
- [x] Return `null` or an empty list when extraction has not started.
- [x] Confirm OPE-248 can distinguish:
  - [x] Pending
  - [x] Complete
  - [x] Partial
  - [x] Empty
  - [x] Unsupported
  - [x] Failed

## Completion evidence

- [x] Unsupported file is returned as `unsupported`.
- [x] Failed extraction is returned with a safe error.
- [x] Successful extraction includes text and metadata.
- [x] Anonymous access is rejected.

---

# Task 12 — Add OPE-223 unit tests

## Description

The existing 75 Node tests do not include PDF, vision, or extraction-service coverage.

## Work required

Create focused tests for:

- [x] PDF whitespace normalization.
- [x] Empty PDF.
- [x] Corrupt PDF.
- [x] Encrypted PDF.
- [x] PDF page limit.
- [x] PDF output-length limit.
- [x] Valid screenshot response.
- [x] Malformed vision JSON.
- [x] Invalid confidence.
- [x] Provider HTTP failure.
- [x] No eligible provider.
- [x] Sensitive-provider denial.
- [x] Unsupported MIME type.
- [x] Oversized R2 object.
- [x] Missing R2 object.
- [x] Wrong R2 object key.
- [x] Signature mismatch.
- [x] Checksum mismatch.

## Suggested test files

- `apps/worker-api/test/pdf.extractor.test.ts`
- `apps/worker-api/test/vision.extractor.test.ts`
- `apps/worker-api/test/extraction.service.test.ts`

## Completion evidence

- [x] Tests use deterministic fixtures.
- [x] Tests do not require real provider credentials.
- [x] Tests do not make live network calls.
- [x] All failure codes are asserted exactly.

---

# Task 13 — Add OPE-223 D1 integration tests

## Description

Dynamic SQL errors are not detected by TypeScript. The current D1 tests pass because they never exercise the extraction schema or worker.

## Work required

Create integration coverage for:

- [x] Fresh migration schema.
- [x] Populated migration preservation.
- [x] Real extraction-record insert.
- [x] Real extraction-record update/upsert.
- [x] Item-detail extraction query.
- [x] Linked attachment lookup.
- [x] Multiple attachment processing.
- [x] Extraction-job leasing.
- [x] Stale lease rejection.
- [x] Duplicate result submission.
- [x] Extraction-before-enrichment ordering.
- [x] Unsupported file persistence.
- [x] Original attachment preservation.
- [x] Raw source and user-note preservation.

## Suggested test file

- `apps/worker-api/test/extraction.d1.spec.ts`

## Completion evidence

- [x] The tests reproduce the previously found SQL failures before the fix.
- [x] All corrected SQL executes against real Miniflare D1.
- [x] Foreign-key checks pass.
- [x] No test relies only on a mocked D1 interface.

---

# Task 14 — Repository and documentation cleanup

## Description

The branch contains an untracked `b86275e.patch`, and repository documentation currently claims OPE-223 is complete despite missing acceptance evidence.

## Work required

- [x] Remove `b86275e.patch` unless it is intentionally required.
- [x] Ensure only OPE-223 files are included in the final commit.
- [x] Update `docs/BUILD_STATUS.md`.
- [x] Do not label OPE-223 completed before acceptance passes.
- [x] Update `docs/TRACEABILITY.md` with actual test evidence.
- [x] Document stable extraction error codes.
- [x] Document the extraction-to-enrichment workflow.
- [x] Confirm no secrets, image data, PDF text, or personal content appear in logs.

## Completion evidence

- [x] `git status` contains only intended OPE-223 changes.
- [x] Documentation matches the actual implementation state.
- [x] No temporary patch or generated profile files are committed.

---

# Task 15 — Run the complete verification suite

## Commands

```bash
npm run check
npx wrangler types --check
npx wrangler deploy --dry-run
npx wrangler check startup
git diff --check
```

## Additional verification

- [x] Apply all migrations to a fresh temporary D1 database.
- [x] Apply migration `0015` to a populated temporary database.
- [x] Run a local R2-backed PDF extraction.
- [x] Run a local mock-provider screenshot extraction.
- [x] Verify unsupported-file visibility through the item API.
- [x] Verify sensitive routing does not invoke a provider.
- [x] Verify extraction text reaches enrichment.
- [x] Verify raw source and user note are unchanged.

## Completion evidence

- [x] Formatting passes.
- [x] Lint passes.
- [x] TypeScript passes.
- [x] All Node tests pass.
- [x] All D1 tests pass.
- [x] Wrangler type generation is current.
- [x] Deployment dry run passes.
- [x] Startup analysis passes.
- [x] Targeted OPE-223 acceptance tests pass.

---

# Task 16 — PR, deployment and Linear completion

## Description

Passing generic tests is not enough to close OPE-223. The PR must include acceptance-level evidence.

## Work required

- [x] Move OPE-223 to In Progress when implementation work begins.
- [x] Create a focused commit.
- [x] Push the OPE-223 branch.
- [x] Open a draft pull request.
- [x] Include the acceptance-criteria matrix in the PR body.
- [x] Include exact test counts and commands.
- [x] Include migration-preservation evidence.
- [x] Include privacy-routing evidence.
- [x] Review and merge only after CI passes.
- [x] Back up production D1 before applying migration `0015`.
- [x] Apply only the pending migration.
- [x] Deploy the Worker.
- [x] Run one approved PDF smoke test.
- [x] Run one approved screenshot smoke test.
- [x] Run one sensitive-provider denial test.
- [x] Attach the PR and evidence to OPE-223.
- [x] Mark OPE-223 Done only after deployed acceptance passes.

---

# Final definition of done

OPE-223 is complete only when all of the following are true:

- [x] Text PDFs produce normalized extracted text.
- [x] Screenshots produce visible text and a concise description.
- [x] Unsupported files remain saved and visibly unprocessed.
- [x] Provider routing follows the durable sensitivity-policy snapshot.
- [x] Sensitive files never reach an unapproved hosted provider.
- [x] Original attachment bytes and references remain unchanged.
- [x] Confidence, coverage, provider and errors are recorded.
- [x] Extraction finishes before enrichment starts.
- [x] Duplicate or stale workers cannot corrupt results.
- [x] Corrupt, oversized, empty-PDF and provider-failure tests pass.
- [x] Fresh and populated migrations pass.
- [x] CI, dry-run deployment and startup checks pass.
- [x] Deployed PDF, screenshot and policy-denial smoke tests pass.
- [x] PR and acceptance evidence are attached to Linear.
