# Api

<!-- OPE-227 START -->

## OPE-227 AI capacity status

`GET /api/v1/usage` is admin-only. It returns safe capacity metadata: policy version, current quota windows, consumed/reserved/remaining dimensions, 70%/90%/hard utilization states, circuit-breaker state and next probe time, capacity-deferred job counts, and last successful provider-operation timestamps. It must not return prompts, raw item content, provider responses, credentials, or token values.

Hosted AI execution remains behind the existing privacy policy. OPE-227 adds a mandatory zero-cost capacity admission step before non-mock enrichment, vision extraction, or optional digest wording. Capacity errors use stable codes including `QUOTA_PAUSED`, `PROVIDER_UNAVAILABLE`, and `NO_ELIGIBLE_PROVIDER`.
<!-- OPE-227 END -->
