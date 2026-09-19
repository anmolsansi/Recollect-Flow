# BG-07 Browser Download Verification

## Task identity

- Build-guide task: **BG-07 — Make the browser Download link work**
- Linear: OPE-327
- GitHub: #41
- Base branch: `main`
- Base revision: `cb660e359abe36949040bca5d843b7a3d9d660d3`
- Work branch: `agent/ope-327-bg-07-browser-download`
- Dependency: BG-06 is complete and merged.

## Baseline

BG-06 already owns and has merged the attachment-content authorization decision. The content route uses `requireAttachmentContentRead`, which accepts a capture bearer, admin bearer, or verified signed admin session cookie. Upload routes remain capture/admin bearer scoped, and attachment deletion keeps its narrower existing boundary.

The Web Inbox already renders an ordinary same-origin anchor:

```text
/api/v1/attachments/:id/content
```

BG-07 therefore does not redesign authentication and does not replace the anchor with JavaScript token handling. The remaining work is proof across the real browser boundary plus response/lifecycle regressions.

## Security boundary

BG-07 must not:

- append bearer or admin credentials to URLs;
- expose the admin token to browser JavaScript;
- expose an R2 key or bucket URL;
- make cookie-only upload or delete requests newly valid;
- weaken missing, expired, deleted, purged or unavailable-object behavior;
- introduce public/shared caching for private attachment bytes.

The browser acceptance environment uses only synthetic local credentials and isolated local persistence. No production deployment, remote migration or live external delivery is part of this task.

## Evidence plan

The task will combine four evidence layers:

1. route-level attachment tests for bytes, headers, lifecycle and safe failure behavior;
2. release-smoke regression requiring the signed-cookie path to pass instead of tolerating it as unavailable;
3. a real headless browser story that starts the actual Worker and Vite app, logs in through the real form, clicks the real Download link and checks downloaded files;
4. full repository CI plus local migration validation.

The browser story must exercise PDF, PNG and generic text fixtures, compare saved byte length and SHA-256, retain a valid session across reload, and deny new private reads after logout or invalid session state.

## Authoritative checklist mapping

The 100-step BG-07 checklist is treated as the acceptance inventory, not as a reason to manufacture 100 unrelated code changes. The implementation microtasks in GitHub #41 group those steps by executable boundary:

- task context and contract: BG-07.001–.010;
- route integration and metadata: BG-07.011–.030;
- private caching and session behavior: BG-07.031–.050;
- exact byte proof: BG-07.051–.060;
- reload/logout/invalid session behavior: BG-07.061–.070;
- object lifecycle and safe failures: BG-07.071–.080;
- regression/browser evidence: BG-07.081–.090;
- review, verification and closeout: BG-07.091–.100.

A checklist item is marked complete only when repository evidence actually supports it. BG-06 evidence is reused for already-proved authorization facts instead of reimplementing them.

## Status

Implementation started. No BG-07 completion claim is made until the browser story, repository checks and authoritative checklist reconciliation are green.
