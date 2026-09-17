# BG-05 — Fresh Migration Evidence

Verification candidate: `3179b1d1601142d8d071285d06aa3630e3f0742c`

Source: GitHub Actions CI run #150 on a fresh hosted runner.

The CI job ran `npm run db:migrate:local`, which resolves to `wrangler d1 migrations apply recollect-flow-prod --local`. Wrangler `4.116.0` selected local state under `.wrangler/state/v3/d1`; no remote database was used.

## Ordered migration chain

The runner discovered and successfully applied **18 migrations**:

1. `0001_initial.sql`
2. `0002_add_duplicate_of.sql`
3. `0003_add_attachments_table.sql`
4. `0004_add_policy_routing.sql`
5. `0005_update_hosted_ai_policy.sql`
6. `0006_add_capture_request_fingerprint.sql`
7. `0007_add_job_leases.sql`
8. `0008_add_sync_available_at.sql`
9. `0009_complete_jobs_and_notion_projection.sql`
10. `0010_add_enrichment_fields.sql`
11. `0014_allow_cloudflare_provider.sql`
12. `0015_add_extraction_records.sql`
13. `0016_add_item_search_fts.sql`
14. `0017_add_item_review_contract.sql`
15. `0018_add_item_duplicate_target.sql`
16. `0019_add_digest_jobs.sql`
17. `0020_add_ai_capacity_controls.sql`
18. `0021_add_recovery_workflows.sql`

Wrangler reported every migration with a final successful status and the step exited successfully.

## Schema/relationship proof

The same candidate's green automated gate includes `migration-contract.test.ts` with 14 passing tests and the D1 search/migration suites. Those persistent repository tests validate the schema contracts needed by the application, including the FTS/search migration behavior. BG-05 reuses those executable contracts instead of inventing an ad-hoc SQL inspection that would be less maintainable than the repository's existing migration tests.

## Result

The complete committed migration chain applies from empty local runner state. No production migration or remote database access occurred.
