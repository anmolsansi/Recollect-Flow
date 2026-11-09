<!-- prettier-ignore-start -->

# BG-32.067 — Private response caching verification

Status: **PASS, owner-confirmed live private-response headers; scope-qualified**. No production change or full release acceptance claim.

## Owner-reported live header results (November 9, 2026)

**Outcome: PASS for the scoped BG-32.067 private response caching inspection.** The owner ran the previously supplied same-origin, read-only three-GET Console check in their authenticated Opera session and shared the resulting sanitized `console.table`. These are **owner-supplied live response-header observations**, not headers independently captured by the assistant. The earlier independent QUIC transport error remains a separate tooling limitation.

| GET route | HTTP | Cache-Control | Content-Type | Content-Length | X-Content-Type-Options |
| --- | ---: | --- | --- | --- | --- |
| `/api/v1/admin/session` | 200 | `private, no-store` | `application/json` | absent | `nosniff` |
| `/api/v1/items/302e4bea-3225-4708-8b41-9c5661bf4d17` | 200 | `private, no-store` | `application/json` | absent | `nosniff` |
| `/api/v1/attachments/2a8afecc-eab3-4f43-a3aa-e430013435fd/content` | 200 | `private, no-store` | `application/pdf` | `639` | `nosniff` |

The user also reported `Array(3)`, consistent with the script collecting three results, not an additional error. Missing `Content-Length` on the JSON responses is not a failure because these can be transferred without a fixed length. All three private paths return the correct **response** cache policy. The exact PDF length matches the existing synthetic fixture; its original SHA-256 was verified separately in Step 3.

**Scope limits:** The owner-shared table does not include `CF-Cache-Status`, CDN cache diagnostics, a full HAR, or a new anonymous private-file denial. Those checks are not inferred. This task inspected private-response cache headers and their type/nosniff expectations, with prior source, release smoke and authorization evidence kept distinct. No tokens, cookies, private bodies, or original PDF bytes were shared.

**Decision:** Check BG-32.067; BG-32 / 07 operational inspection becomes **10/10 inspected** when the checklist change merges. This is **not** full BG-32/V1 acceptance. No production deployment, settings edit, R2/D1 mutation, provider activation, or destructive recovery was done.

## Read-only evidence already verified

1. PR #148 is merged. Before this owner header proof the operational inspection checklist had 9 of 10 BG-32 / 07 actions checked.
2. The exact approved and deployed source revision `81e82806700519b90b6fbd5c1ebb233ed5def9d2` has `apps/worker-api/src/index.ts` `handleFetch()` applying `Cache-Control: private, no-store` and `X-Content-Type-Options: nosniff` to **all `/api/*` responses**, including authenticated reads, errors and attachment bytes.
3. The same frozen source has `apps/worker-api/src/attachments/attachment.routes.ts` returning attachment bytes from private R2 with `Content-Type`, `Content-Length`, safe `Content-Disposition`, `Cache-Control: private, no-store` and `X-Content-Type-Options: nosniff`. Its signed-cookie attachment tests assert these response headers, and `scripts/verify-production-release.mjs` contains explicit live-release assertions for the private PDF.
4. November 3 BG-31 core release notes report passed live private original verification, and November 6 owner's same-browser test confirmed 639-byte SHA-matching synthetic PDF. The currently observed Cloudflare Worker version prefix is `ff5ba1ce`, matching the approved release version. These are historical/code and functional observations, **not freshly captured response headers**.
5. A new independent, anonymous standard-browser attempt on November 9 to GET `/api/v1/health` and `/api/v1/attachments/2a8afecc-eab3-4f43-a3aa-e430013435fd/content` failed at connection setup with `net::ERR_QUIC_PROTOCOL_ERROR`. No response, HTTP status or headers were observed. This does **not** prove the application has a cache defect or that the Worker processed the requests.

## Owner-browser verification procedure (retained for reproducibility)

In the **already authenticated** Opera session:

1. Open `https://recollect-flow.openclawneutron.workers.dev/`. The latest Opera navigation showed the **Admin Access** form, so if that still appears, sign in privately with your already prepared credential on your own device first. Never paste or send it to the assistant. Do not open DevTools on the Cloudflare dashboard or GitHub tab.
2. Open Opera DevTools with `Option + Command + I`, go to **Console**, then paste the self-contained snippet below. It sends only three same-origin, read-only GETs using your existing browser session, prints only a short response-header report and does not print or read credentials, cookies, PDF contents, other private content or response bodies. It does not change data.
3. Copy the resulting `console.table` values, with no cookie/Authorization headers, into the BG-32 issue evidence.

```js
(async () => {
  if (location.origin !== 'https://recollect-flow.openclawneutron.workers.dev') {
    throw new Error('Open the signed-in Recollect-Flow page first.');
  }
  const cases = [
    ['admin-session', '/api/v1/admin/session', 'application/json'],
    ['private-item', '/api/v1/items/302e4bea-3225-4708-8b41-9c5661bf4d17', 'application/json'],
    ['private-pdf', '/api/v1/attachments/2a8afecc-eab3-4f43-a3aa-e430013435fd/content', 'application/pdf'],
  ];
  const results = [];
  for (const [name, path, expectedType] of cases) {
    try {
      const res = await fetch(path, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        redirect: 'manual',
      });
      const cacheControl = res.headers.get('cache-control') ?? '';
      const contentType = res.headers.get('content-type') ?? '';
      const length = res.headers.get('content-length') ?? '';
      const nosniff = res.headers.get('x-content-type-options') ?? '';
      results.push({
        route: name,
        status: res.status,
        cacheControl,
        contentType,
        contentLength: length || '(not present)',
        nosniff,
        privateNoStore: /\\bprivate\\b/i.test(cacheControl) && /\\bno-store\\b/i.test(cacheControl),
        correctType: contentType.toLowerCase().includes(expectedType),
        pdfLength639: name === 'private-pdf' ? length === '639' : 'n/a',
      });
      try { await res.body?.cancel(); } catch {}
    } catch (err) {
      results.push({ route: name, failure: err?.name ?? 'FetchError' });
    }
  }
  console.table(results);
})();
```

Required results: all three calls return HTTP `200`, `privateNoStore = true`, `correctType = true`, `nosniff = nosniff`, and for PDF `pdfLength639 = true`. The app should not serve the private bytes publicly, per the separate previously verified anonymous-denial and permission checks. A 401/403 during an expired session is not a pass for the authenticated request. If the browser blocks console pastes or the session is expired, stop without trying credential workarounds.

**Do not capture/upload a full HAR** because HAR files can contain credentials, cookies, private request URLs and response bodies. Share only the sanitized table. Do not rerun production migrations, redeploy or enable logging/third-party dispatch.

## Decision

**BG-32.067 is ready to mark checked** based on the owner-supplied live response-header table recorded above. After this documentation-only PR merges, Step 4 is 10/10 *inspections performed*, not full BG-32 release approval.

Broader backups, independent off-device storage, isolated restore, integration gates, BG-29.078, OPE-247 and full V1 acceptance remain separate and not approved.

<!-- prettier-ignore-end -->
