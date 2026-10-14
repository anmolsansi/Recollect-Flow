# Operational control inventory (BG-23)

Inventory baseline: `b6f5113`, October 14, 2026. Source of requirements: OPE-247, ADR-008/033 and `OPERATIONS_RUNBOOK.md`. BG21/BG22's open release checks remain inherited qualifications; the owner authorized continuing this inventory and BG24 implementation.

## Actors and existing surfaces

All paths below are relative to `/api/v1`. Normal capture/review remains on `/`, `/capture`, `/capture/file` and `/items/:id`. There is currently no operations page or operator navigation link. Later BG26-28 own those screens; this document is their exact scope/contract input.

| Actor             | Authority                                                                | Existing surface                                                     |
| ----------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Owner/admin       | Protected inspection and explicitly authorized operator mutations        | Admin bearer; signed browser session (writes require allowed Origin) |
| Capture client    | Create captures, upload originals and retrieve original attachment bytes | Capture bearer; Shortcut capture remains capture-only                |
| Local worker      | Lease, heartbeat, report results/failures, release owned jobs            | Local-worker bearer; not an admin credential                         |
| External services | Notion projection, Telegram delivery, optional AI                        | Worker-owned integrations; never canonical-delete authority          |

Classify every control as **read-only**, **reversible**, **external**, or **destructive**. A POST inspection may still store a result/audit or call Notion, so it is not automatically a pure read. An absent UI does not imply a missing API. No generic dashboard, new aggregate API, external send or production operation is implemented by this inventory.

Unless a download is identified, results use `{data, meta: {request_id}}`; rejections use `{error: {code, message}, meta}`. Reads never perform a retry/purge/restore implicitly. Current helper `apps/web/src/api.ts` expects JSON envelopes; use authenticated download navigation/fetch for exports and originals instead.
