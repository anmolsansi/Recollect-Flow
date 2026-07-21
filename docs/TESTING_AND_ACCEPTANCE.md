# Complete testing and acceptance strategy

## Test pyramid

| Layer            | Scope                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------- |
| Unit             | URL normalization, schemas, privacy routing, ranking, digest selection, citation validation |
| Component        | R2/Notion/provider adapters, retry, parser, prompt/result validation                        |
| Integration      | D1 migrations/constraints, capture-to-D1, R2 lifecycle, FTS, job leasing, exports           |
| End-to-end       | Real capture, review, search, edit, archive/delete, digest, restore, RAG                    |
| Resilience       | Notion down, AI quota, Mac off, invalid HTML/model output, duplicate requests               |
| Security         | Tokens/scopes, traversal, SSRF, oversized/malformed files, injection, deletion freshness    |
| Performance/cost | Latency, rows read, storage, rate limits, quotas, index and RAG timings                     |

## Mandatory V1 end-to-end scenarios

1. Share normal website; find by title/reason.
2. Share same request twice; one item and stable replay response.
3. Share same canonical URL under different keys; preserve events/notes and conservative duplicate reference.
4. Share inaccessible Instagram URL; URL-only coverage and no invented transcript.
5. Share screenshot; find known visible text.
6. Share text PDF; search an internal phrase without AI.
7. Share private note; prove it never reaches an unapproved external provider.
8. Disable AI and Notion; capture and retrieve raw item.
9. Exhaust AI threshold; new optional jobs remain pending and bill stays $0.
10. Return invalid model JSON; no corrupt derived fields.
11. Edit derived field; routine retry cannot overwrite it.
12. Notion 429/outage; recovery creates no duplicate page.
13. Delete/restore during grace; then confirmed purge removes all required surfaces.
14. Export and restore into clean database; verify counts/checksums/search.
15. Rotate capture/admin/local-worker credentials without data migration.

## Fixture matrix

Every input type × privacy class. Include long/tracking/Unicode URLs, invalid schemes, empty text, duplicates/near-duplicates, large images, wrong MIME/signature, duplicate files, malformed/password/scanned PDFs, redirect loops, login pages, deleted sources, prompt-injection text, conflicting sources, old/stale sources, quota/provider/network failures, Notion rate limits, and local-worker lease loss.

## Performance and free-tier tests

- Capture P50/P95 excluding upload under expected personal traffic.
- Upload near configured limit and mobile interruption behavior.
- FTS/filter results at 10,000 and 100,000 items.
- D1 rows-read/write counts for every core query.
- Notion throughput within documented limit.
- Job backlog recovery and stale lease timing.
- R2 orphan cleanup and storage threshold behavior.
- Hard quotas for AI, embedding, vector, reranking, and generation.

## RAG evaluation suite

Minimum 50 versioned questions before V1.5 approval: exact, paraphrase, comparison, synthesis, timeline, conflict, duplicate, stale, partial, and unanswerable; ≥20% unanswerable/partial; ≥10% changing/conflicting. Store expected source/chunk IDs, answerability, required facts, forbidden claims, required citations/limitations, privacy mode.

Report Recall@K and ranking separately from answer groundedness/citations. Include duplicate concentration, conflict preservation, privacy routing, deletion freshness, cost, and P50/P95. Compare candidate provider/model/prompt/index against prior configuration and holdout failures.

## V1 acceptance checklist

- [ ] URL, text, screenshot, PDF/file share from iPhone without copy/paste.
- [ ] Raw item retrievable while AI/Notion disabled.
- [ ] Idempotent retry creates no accidental duplicate.
- [ ] Authorized private attachment opens; anonymous access fails.
- [ ] Webpage and text PDF become searchable.
- [ ] Instagram URL-only state is honest.
- [ ] Structured AI validates and preserves user edits.
- [ ] Sensitive fixture always selects no AI.
- [ ] Seeded and real items are recoverable through search.
- [ ] Notion retry creates no duplicate page.
- [ ] Daily digest links exact items and hides sensitive text.
- [ ] Actual bill is $0 and hard thresholds pass.
- [ ] Export/restore rehearsal succeeds.
- [ ] Setup, rotation, recovery, and troubleshooting runbooks exist.
- [ ] Two-week real-device trial and P0 friction fixes complete.

## V1.5 acceptance checklist

- [ ] V1 accepted; ≥100 useful captures; gold set approved.
- [ ] Recall@5/ranking thresholds met.
- [ ] Sampled factual claims resolve to chunks/items.
- [ ] Partial/unanswerable cases correctly qualified/refused.
- [ ] Conflicting sources remain separate and cited.
- [ ] Restricted fixtures use local path only.
- [ ] Edits/deletes/restrictions invalidate index/cache/answers.
- [ ] Vector/generation outage degrades to lexical/evidence-only.
- [ ] Actual personal-scale spend remains $0.
- [ ] Owner records explicit go/no-go.

## Definition of done for every ticket

Document requirements/edge cases; exact contracts/paths; validate input and errors; success/failure unit tests; real integration test for external service/database; request/job IDs with no sensitive logs; no paid/unbounded path; docs/runbook/traceability/Linear updated; actual user workflow exercised when applicable; premium ticket intake has zero FAILs.
