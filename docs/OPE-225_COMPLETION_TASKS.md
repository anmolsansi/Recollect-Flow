# OPE-225 Completion Tasks

> **Ticket:** OPE-225 — Add D1 FTS5 indexing and knowledge search API  
> **Linear status:** Backlog  
> **Priority / estimate:** High / 5 points  
> **Milestone:** M4 — Search and resurfacing  
> **Current implementation state:** Not started on `main` as of 2026-08-01  
> **Dependencies:** OPE-216 and OPE-222 are complete

## Goal

Make saved knowledge searchable with D1 FTS5 alone. Search must continue to work when every AI provider is disabled or unavailable, must never return deleted or unauthorized content, and must support predictable combined filters and deterministic cursor pagination.

## Required API contract

Implement an admin-authenticated `GET /api/v1/search` endpoint with these query parameters:

| Parameter                           | Contract                                                                                                                                                                |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `q`                                 | Optional keyword query, trimmed and capped at 256 characters. Missing or blank means filter-only browsing; punctuation-only input must not generate invalid FTS syntax. |
| `source`                            | Optional exact `items.source_type` filter. Accept only existing source types.                                                                                           |
| `project`                           | Optional exact project filter after trimming and normalization.                                                                                                         |
| `lifecycle_status`                  | Optional exact lifecycle status filter. Do not use an ambiguous generic `status` field.                                                                                 |
| `processing_status`                 | Optional exact processing status filter.                                                                                                                                |
| `importance_min` / `importance_max` | Optional integers from 0–100; reject an inverted range.                                                                                                                 |
| `captured_from` / `captured_to`     | Optional ISO-8601 timestamps; reject an inverted range.                                                                                                                 |
| `limit`                             | Integer from 1–100; default 25.                                                                                                                                         |
| `cursor`                            | Opaque, versioned, base64url cursor returned by the previous page. Do not expose or accept a numeric offset.                                                            |

The response must use the global `{ data, meta }` envelope. Each result should include the item ID, title, source type/app, project, topics, importance, lifecycle and processing statuses, privacy level, captured date, coverage, a safe highlighted snippet representation, and the next cursor when another page exists.

## Task 1 — Lock the search and visibility contract

**Description:** Define one unambiguous request, response, ordering, and authorization contract before writing SQL.

**Exactly what needs to be done:**

- Add Zod request and response schemas in `apps/worker-api/src/search/search.schema.ts`.
- Reject unknown query parameters, invalid enums, invalid timestamps, overlong queries, malformed cursors, and inverted ranges with the existing `VALIDATION_ERROR` envelope.
- Make the route admin-only with `requireAdminToken`. Capture and local-worker tokens must not authorize search.
- Keep privacy visibility server-owned. Do not add a client-controlled `include_sensitive` bypass. Under the current personal admin contract, an authenticated admin can read all non-deleted privacy levels; any future non-admin principal must receive an explicit server-side allowlist.
- Define ordering:
  - keyword search: FTS rank ascending, then `captured_at DESC`, then `id ASC`;
  - filter-only search: `captured_at DESC`, then `id ASC`.
- Encode the order keys, a cursor version, and a fingerprint of the normalized query/filters in the cursor. Reject a cursor reused with different filters.

**Complete when:** Schemas and contract tests prove every valid/invalid parameter path, auth scope, deterministic ordering, and cursor mismatch behavior.

## Task 2 — Add the forward-only FTS5 migration

**Description:** Create a durable lexical index covering every field required by Linear without changing raw source data.

**Exactly what needs to be done:**

- Add `migrations/0016_add_item_search_fts.sql`.
- Create a standalone FTS5 virtual table such as `item_search_fts` with:
  - `item_id UNINDEXED`
  - `title`
  - `raw_text`
  - `user_note`
  - `summary`
  - `topics`
  - `project`
  - `people`
  - `companies`
- Use the `unicode61` tokenizer with documented normalization. Configure prefix indexes that support the agreed partial-word behavior without falling back to `%LIKE%` scans.
- Backfill every existing item where `deleted_at IS NULL` during the migration.
- Convert `topics_json`, `people`, and `companies` JSON arrays into searchable plain text. Guard legacy malformed JSON with `json_valid(...)` so migration or trigger execution cannot fail on one bad row.
- Keep the migration forward-only. Do not place destructive rollback SQL in `migrations/`.

**Complete when:** The migration succeeds on both a fresh database and a database populated through migration 0015, and all eight searchable fields can produce a match.

## Task 3 — Keep the index synchronized with D1 triggers

**Description:** Ensure captures, enrichment, reprocessing, manual edits, deletion, and restoration cannot silently drift from the FTS table.

**Exactly what needs to be done:**

- Add an `AFTER INSERT` trigger on `items` that indexes only rows with `deleted_at IS NULL`.
- Add an `AFTER UPDATE OF` trigger covering every indexed field plus `deleted_at`.
- On any relevant update, delete the old FTS row for `item_id` and insert the new searchable projection only when the item is not deleted.
- Add an `AFTER DELETE` defensive trigger even though the current retention model normally soft-deletes items.
- Make trigger operations idempotent by removing any existing FTS row before inserting its replacement.
- Verify that initial capture makes raw text/user note searchable before AI enrichment finishes.
- Verify that successful OPE-222 enrichment and later reprocessing replace title, summary, topics, project, people, and companies in the index.
- Verify that soft deletion removes the item immediately and restoration reindexes it.

**Complete when:** D1 integration tests mutate items through capture, enrichment/reprocessing, soft-delete, and restore paths without direct test-only index writes, and search reflects every change.

## Task 4 — Implement safe FTS query compilation

**Description:** Convert user input into bounded FTS5 syntax without allowing syntax errors, operator injection, or accidental broad scans.

**Exactly what needs to be done:**

- Add `apps/worker-api/src/search/search.service.ts`.
- Normalize Unicode and whitespace consistently with the migration contract.
- Tokenize punctuation safely and bind the generated `MATCH` expression as a parameter; never interpolate raw `q` into SQL.
- Escape or quote FTS metacharacters and reserved operators.
- Implement partial-word matching by applying a bounded prefix operator to normalized tokens. Do not implement suffix/infix matching with `%LIKE%` over the item table.
- Define punctuation behavior explicitly, including values such as `C++`, `Node.js`, apostrophes, quotes, hyphens, and emoji.
- Treat absent/blank `q` as filter-only browsing. If a nonblank query produces no searchable tokens, return an empty result rather than malformed SQL or an unbounded browse.
- Cap token count and token length to protect D1 CPU and query limits.

**Complete when:** Unit tests cover punctuation, quotes/operators, Unicode, whitespace, partial words, blank queries, punctuation-only queries, and maximum limits without SQL/FTS errors.

## Task 5 — Build one parameterized search query with combinable filters

**Description:** Apply keyword ranking, metadata filters, privacy, deletion, and pagination in one database query path.

**Exactly what needs to be done:**

- Join `item_search_fts` to `items` by `item_id` so FTS provides candidates while `items` remains the authorization and metadata source of truth.
- Always include `items.deleted_at IS NULL` in the final query, even though deleted rows should also be absent from FTS.
- Apply source, project, lifecycle, processing, importance, and captured-date filters with bound parameters.
- Apply the server-derived privacy allowlist in SQL before limit/pagination, not by filtering results in JavaScript.
- Use `bm25(item_search_fts)` for keyword ranking and the defined tie-breakers.
- Fetch `limit + 1` rows to determine whether a next page exists.
- Keep the filter-only branch FTS-independent so it works with blank `q` while preserving the same visibility and deletion rules.
- Return safe error codes and logs containing only query dimensions, result count, duration, and request ID—never query text or result content.

**Complete when:** Pairwise and representative all-filter tests show filters combine with `AND` semantics and pagination never leaks rows removed by authorization or deletion filters.

## Task 6 — Add stable keyset pagination

**Description:** Replace offset pagination with deterministic continuation that remains usable for large result sets.

**Exactly what needs to be done:**

- Create a small cursor encoder/decoder module under `apps/worker-api/src/search/`.
- For keyword queries, store rank, captured timestamp, item ID, query fingerprint, and cursor version.
- For filter-only queries, store captured timestamp, item ID, query fingerprint, and cursor version.
- Add the corresponding keyset comparison to SQL using the exact same sort order as the first page.
- Include a first-page cutoff timestamp in the cursor so newly captured rows do not appear halfway through an existing traversal.
- Reject unsupported cursor versions, invalid base64/JSON, missing fields, non-finite ranks, and filter/query mismatches.
- Do not rely on offset internally or return duplicate/omitted rows when multiple items share the same rank and timestamp.

**Complete when:** A large-result-set test traverses every page exactly once, including tied ranks/timestamps, while insertions after page one do not alter that traversal.

## Task 7 — Return XSS-safe highlighted snippets

**Description:** Show why a result matched without returning executable markup derived from saved content.

**Exactly what needs to be done:**

- Use FTS5 `snippet(...)` or `highlight(...)` with non-HTML sentinel markers.
- Parse the marked value into structured segments such as `{ text, highlighted }`, or escape source text before allowing fixed `<mark>` tags. Raw item HTML must never become trusted response markup.
- Select the best matching indexed column automatically and cap snippet length.
- Provide a bounded plain-text fallback from title, summary, user note, or raw text for filter-only searches.
- Never include deleted content, attachment bytes, secrets, provider prompts, or unrelated full raw text in the snippet.

**Complete when:** Tests prove correct highlighting and safe output for stored `<script>` text, HTML entities, quotes, long content, missing fields, and matches across every indexed column.

## Task 8 — Mount the authenticated search route

**Description:** Expose the service through the existing Hono application and global error/response conventions.

**Exactly what needs to be done:**

- Add `apps/worker-api/src/search/search.routes.ts`.
- Mount it from `apps/worker-api/src/app.ts` at `/api/v1/search`.
- Apply `requireAdminToken` before parsing or executing the search.
- Return the existing request ID in `meta` and the opaque `next_cursor` only when another page exists.
- Preserve the repository’s stable error envelope; do not expose SQL, FTS expressions, stack traces, or database details.
- Allow dependency injection of the search service/database where needed for fast route tests.

**Complete when:** Route tests prove success, empty results, validation errors, unauthorized access, and internal-error redaction through the real app router.

## Task 9 — Implement and test index rebuild operations

**Description:** Provide a safe recovery path when index drift or corruption is suspected.

**Exactly what needs to be done:**

- Add a reviewed rebuild SQL script outside the forward migration directory, for example `scripts/rebuild-item-search-index.sql`.
- Rebuild from canonical `items` rows where `deleted_at IS NULL`; do not rebuild from old FTS contents or backups of derived index state.
- Make the rebuild repeatable and transactional where D1 permits. If D1 cannot wrap the chosen FTS operations atomically, document the maintenance window and temporary search-unavailable behavior.
- Add verification queries for:
  - searchable canonical item count versus distinct indexed item count;
  - missing non-deleted items;
  - orphaned/deleted indexed item IDs;
  - duplicate indexed item IDs.
- Document exact local and remote commands in `docs/OPERATIONS_RUNBOOK.md`. Remote execution must require an explicit operator decision and a pre-rebuild backup/export.
- Add an automated test that corrupts or clears the test index, runs the rebuild, runs it a second time, and verifies restored results with no duplicates or deleted rows.

**Complete when:** A clean local D1 rehearsal demonstrates drift detection, rebuild, repeatability, and post-rebuild search acceptance.

## Task 10 — Add the acceptance-level test matrix

**Description:** Prove the Linear acceptance criteria through D1/Worker behavior, not only schema-string assertions or mocks.

**Exactly what needs to be done:**

- Add `apps/worker-api/test/search.d1.spec.ts` using the real D1 test binding and applied migrations.
- Cover at minimum:
  - a newly captured raw item becomes searchable;
  - a reprocessed/enriched item replaces prior indexed values;
  - search succeeds when all AI providers are disabled/unavailable;
  - every indexed field can match;
  - punctuation and reserved FTS characters;
  - partial words and Unicode normalization;
  - missing, blank, and punctuation-only queries;
  - every individual filter plus representative combined filters;
  - invalid and inverted filter ranges;
  - stable multi-page traversal across a large data set with ties;
  - malformed, stale-version, and cross-query cursor rejection;
  - soft-deleted items and restored items;
  - privacy levels and unauthorized tokens;
  - safe highlighting for HTML/script-like content;
  - rebuild from drifted/empty index;
  - fresh and populated migration paths.
- Extend `apps/worker-api/test/migration-contract.test.ts` with table/trigger/rebuild invariants, but do not treat string assertions as a substitute for D1 behavior tests.
- Assert that search does not invoke any AI binding or provider adapter.

**Complete when:** Tests fail if triggers, privacy/deletion predicates, keyset tie-breakers, rebuild behavior, or AI independence are removed.

## Task 11 — Update API, operations, and build documentation

**Description:** Make the implemented contract and recovery procedure discoverable to clients and operators.

**Exactly what needs to be done:**

- Move `/api/v1/search` from planned to implemented in `docs/API_SPEC.md` and document exact parameters, ordering, cursor semantics, response fields, auth, visibility, and errors.
- Add index health checks and rebuild instructions to `docs/OPERATIONS_RUNBOOK.md`.
- Update `docs/BUILD_STATUS.md` only after automated checks and migration rehearsals pass.
- Record the migration number and schema fields in `docs/DATA_MODEL.md` or the repository’s canonical schema documentation.
- Document that OPE-225 is lexical retrieval only: no embeddings, vector database, reranker, or generation provider is required.

**Complete when:** A developer can implement a client and an operator can detect/rebuild index drift using only repository documentation.

## Task 12 — Run release verification and close the ticket

**Description:** Validate deployability and production behavior before marking OPE-225 complete.

**Exactly what needs to be done:**

1. Run the full local gates:

   ```bash
   npm run check
   npm run db:migrate:local
   npx wrangler types --check
   npx wrangler deploy --dry-run
   npx wrangler check startup
   ```

2. Rehearse both fresh and populated migration paths in isolated local D1 databases.
3. Review the final SQL query plan and verify large searches stay bounded by FTS plus indexed metadata filters rather than scanning raw text with `LIKE`.
4. After approval, back up production D1 and run `npm run db:migrate:remote`.
5. Deploy the Worker and smoke-test with the admin credential:
   - keyword search;
   - blank/filter-only search;
   - combined filters;
   - at least two cursor pages;
   - a newly captured item;
   - an enriched/reprocessed item;
   - a deleted item that must not appear;
   - a sensitive item visible only under the approved admin scope;
   - AI providers disabled or unavailable.
6. Capture safe evidence: migration name, deployment version, request IDs, result counts, and pass/fail outcomes. Do not record queries or content.
7. Update Linear with the PR, automated-test evidence, migration/rebuild evidence, and production smoke-test evidence before moving OPE-225 to Done.

**Complete when:** The deployed endpoint passes acceptance-level smoke tests and the only remaining work belongs to downstream tickets rather than OPE-225.

## Acceptance criteria traceability

| Linear acceptance criterion                                                     | Required evidence                                                                                  |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Newly captured and reprocessed items become searchable                          | Trigger integration tests plus deployed capture/reprocess smoke test                               |
| Search works when all AI providers are unavailable                              | D1 integration test with no provider binding/use plus deployed degraded-mode smoke test            |
| Filters can be combined predictably                                             | Schema tests and parameterized D1 tests covering combined `AND` semantics                          |
| Index rebuild is documented and tested                                          | Runbook commands, drift verification queries, repeatable rebuild integration test, local rehearsal |
| Punctuation, partial words, empty queries, large result sets, and deleted items | Explicit unit/D1 cases for each, including stable keyset traversal and deletion exclusion          |
| Highlighted snippets and stable pagination                                      | XSS-safe highlight tests and no-duplicate/no-omission cursor tests                                 |
| Sensitivity visibility                                                          | Admin authorization tests, token-scope denial tests, SQL-level visibility policy tests             |

## Out of scope

- Embeddings, vector search, hybrid ranking, answer generation, and citations belong to OPE-234 or later RAG work.
- Web Inbox search UI belongs to OPE-248.
- Digest ranking and delivery belong to OPE-226.
- A public or multi-tenant search authorization model is not introduced by this ticket; the current endpoint remains admin-only.

## Definition of done

- [x] Migration 0016 and synchronization triggers are applied and tested on fresh and populated D1 data.
- [x] All eight required fields are searchable with safe partial-word handling.
- [x] Capture, enrichment/reprocessing, deletion, restoration, and rebuild keep the index correct.
- [x] Search route is admin-authenticated and visibility is enforced in SQL.
- [x] Filters combine with documented `AND` semantics.
- [x] Pagination is cursor-based, deterministic, and tested at scale with ties.
- [x] Highlight snippets cannot inject executable markup.
- [x] Search runs with no AI provider dependency.
- [x] Rebuild and drift-detection procedures are documented and rehearsed.
- [x] Full checks, D1 migrations, Wrangler type generation check, dry deploy, and startup check pass.
- [x] Production migration/deployment smoke evidence is recorded.
- [x] PR is merged and Linear OPE-225 contains the evidence before being moved to Done.
