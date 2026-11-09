# BG-32.067 — Private response caching verification

Status: **OPEN, awaiting owner-session live HTTP response headers**. No production change or acceptance claim.

## Read-only evidence already verified

1. PR #148 is merged. The operational inspection checklist has 9 of 10 BG-32 / 07 actions checked.
2. The exact approved and deployed source revision `81e82806700519b90b6fbd5c1ebb233ed5def9d2` has `apps/worker-api/src/index.ts` `handleFetch()` applying `Cache-Control: private, no-store` and `X-Content-Type-Options: nosniff` to **all `/api/*` responses**, including authenticated reads, errors and attachment bytes.
3. The same frozen source has `apps/worker-api/src/attachments/attachment.routes.ts` returning attachment bytes from private R2 with `Content-Type`, `Content-Length`, safe `Content-Disposition`, `Cache-Control: private, no-store` and `X-Content-Type-Options: nosniff`. Its signed-cookie attachment tests assert these response headers, and `scripts/verify-production-release.mjs` contains explicit live-release assertions for the private PDF.
4. November 3 BG-31 core release notes report passed live private original verification, and November 6 owner's same-browser test confirmed 639-byte SHA-matching synthetic PDF. The currently observed Cloudflare Worker version prefix is `ff5ba1ce`, matching the approved release version. These are historical/code and functional observations, **not freshly captured response headers**.
5. A new independent, anonymous standard-browser attempt on November 9 to GET `/api/v1/health` and `/api/v1/attachments/2a8afecc-eab3-4f43-a3aa-e430013435fd/content` failed at connection setup with `net::ERR_QUIC_PROTOCOL_ERROR`. No response, HTTP status or headers were observed. This does **not** prove the application has a cache defect or that the Worker processed the requests.

## Owner-browser verification, no secrets and no changes

In the **already authenticated** Opera session:

1. Open `https://recollect-flow.openclawneutron.workers.dev/`. Do not open DevTools on the Cloudflare dashboard or GitHub tab.
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

**Keep BG-32.067 unchecked** until actual live owner-session response headers are observed and recorded. If all checks pass, append the safe status/header values with UTC timestamp and request context to the BG-32 release-gate documentation, check `BG-32.067` and submit a documentation-only PR. Step 4 then becomes 10/10 *inspections performed*, not full BG-32 release approval.

Broader backups, independent off-device storage, isolated restore, integration gates, BG-29.078, OPE-247 and full V1 acceptance remain separate and not approved.
