# Operations

<!-- OPE-227 START -->

## OPE-227 zero-cost AI capacity operations

V1 fails closed to explicitly approved free-tier provider/model combinations. OpenRouter uses one shared free-model request pool across text and vision, with the configured account tier defaulting to the conservative standard tier. Cloudflare Workers AI is guarded by an operator-configurable daily Neuron ceiling that cannot exceed the approved free allocation. Unknown/paid model identifiers are rejected before a network call.

Capacity utilization is interpreted as: below 70% normal, at least 70% warning, at least 90% high warning, and 100% hard stop. A hard stop does not block capture, D1 persistence, FTS search, review, or Notion processing that does not require a new hosted AI call. Capacity-deferred AI jobs remain `pending` with future `available_at` and do not consume their terminal processing retry allowance. Manual retry never bypasses capacity admission.

Provider circuit breakers are scoped by provider and operation. Three consecutive qualifying provider failures open the breaker. Cooldown starts at five minutes and increases exponentially up to one hour. At probe time only one Worker may hold the 60-second half-open probe lease. A successful probe closes/resets the breaker; a failed probe reopens it. Privacy rejection, quota exhaustion, invalid input, owner-disabled providers, and zero-cost guard rejection are not counted as provider outages.

Operator checks: inspect `GET /api/v1/usage`; confirm no hard-window exhaustion before forcing retries; verify `next_probe_at` before outage recovery; use the standard/qualified OpenRouter tier only after revalidating the account condition; and revalidate provider free-tier limits/model availability before production release or provider-policy changes.
<!-- OPE-227 END -->
