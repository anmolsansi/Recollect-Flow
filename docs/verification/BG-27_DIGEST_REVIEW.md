# BG-27 digest review and uncertain-delivery verification

## Baseline and authorization

- Repository: `anmolsansi/Recollect-Flow`.
- Starting main commit: `a455e37a7c75275194acf4623d6e78a1bb5cccfa`, merged BG-26 PR #93.
- Task: [BG-27 issue #94](https://github.com/anmolsansi/Recollect-Flow/issues/94).
- Work branch: `feat/bg-27-digest-review-reconciliation`.
- Scope: isolated source, synthetic regression tests and Web Inbox admin controls only.
- Not authorized: production deployment, live Telegram sending, real-user-message inspection or provider-account modifications.

## Existing proof reused

The existing digest service already generated previews without queueing delivery on
the manual generate route. Existing review and retry/reconcile schemas separate
operator review, queued delivery, definite failure and ambiguous `unknown`
states. Existing renderer neutralizes non-public titles and rechecks deletion.
Existing Telegram tests covered 429 retry-after and ambiguous timeout. BG-27
extends these controls instead of inventing a second `/send` API.

## Implementation changes introduced

- Admin-only recent digest list and live current-state preview in digest routes.
- Preview item links use current eligibility and neutral labels for non-public data.
- Web Inbox review page distinguishes preview, review, queueing and delivery states.
- An atomic same-period, cross-generation insertion guard rejects a second
  Telegram delivery when a non-skipped delivery exists.
- Expired leases are quarantined as unknown, not replayed. Unreadable Telegram
  responses and post-acceptance persistence exceptions are also uncertain.
- UI makes unknown reconciliation explicit and requires observed message ID to
  record sent. Definite failure is the only manual Retry state.
- Digest run-list and detail responses use no-store cache headers.

## Required evidence before completion

- Focused D1 tests for regenerate-vs-deliver guard, expired-lease quarantine,
  private review list, unsent previews and failure/reconciliation paths.
- Telegram client unit regression for ambiguous response body.
- Privacy and deletion recheck, neutral labels and safe item links.
- Browser acceptance for review, queue, unknown versus failure, keyboard/mobile,
  stale/auth state and logged-out deep links.
- Full formatting, lint, TypeScript, Node, D1 and Web suites.
- Exact-head CI, PR diff/security review and canonical 100-step checklist reconciliation.
- Final merge and exact merged-main CI.

## Verified evidence and boundaries

- `npm run check` passed in PR #95 CI run
  [38952178305](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38952178305)
  before the browser acceptance phase, covering Prettier, lint, TypeScript,
  D1/Node tests, contracts and Web tests/build on SHA
  `75e855ba850a61c8fd00302b31438c271c3fba11`.
  That run ultimately failed one browser test's session-navigation assumption.
- The isolated local Chrome/Worker/D1 suite in run
  [38952848999](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38952848999)
  passed six BG-27 stages: empty state, no-send preview, review separation,
  regeneration, unknown reconciliation UI and narrow mobile layout. The final
  logged-out stage failed because the scripted Logout did not clear its
  session. The acceptance script now clears the **isolated test browser**
  cookies directly and navigates back to a protected item route. The last
  fix was subsequently verified by final-head CI and merged-main CI.
- The D1 test suite includes definite 429 retry timing, ambiguity, expired
  leases quarantined to `unknown`, cross-version duplicate prevention,
  current-state preview/no-send and both synthetic `sent` and `failed`
  reconciliation, with server-side authorization. All provider responses in
  tests are synthetic, not live Telegram traffic.
- Linked task: [Linear OPE-342](https://linear.app/openclaw-neutron/issue/OPE-342/bg-27-digest-review-and-uncertain-telegram-delivery-recovery).

## Final engineering acceptance and merge

- BG-27 GitHub [issue #94](https://github.com/anmolsansi/Recollect-Flow/issues/94)
  is closed, with all 50 paired units complete. The canonical BG-27 checklist
  contains 100/100 checked steps with isolated proof and scope exceptions.
- The final work-branch head was
  `8ece4f074d8035034cb0d5454a007b86ce0ef73d`. Exact-head
  [CI #38954383637](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38954383637)
  passed, including the logged-out browser boundary.
- [PR #95](https://github.com/anmolsansi/Recollect-Flow/pull/95) merged
  43 task-branch microcommits into `main` as a normal merge commit:
  `bde4a3b70f0cb419e24c6a2dc72b82e44fac2f7b`.
- The exact merged-main
  [CI #38955041759](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38955041759)
  passed, closing the BG-27 isolated engineering acceptance.
- [Linear OPE-342](https://linear.app/openclaw-neutron/issue/OPE-342/bg-27-digest-review-and-uncertain-telegram-delivery-recovery)
  is Done. BG-28 may proceed under its own authorization and gates.

**Release-trial boundary:** No production deploy, real Telegram send,
live-provider destination inspection or production-origin deep-link trial was
performed. BG-27.065's live destination inspection was explicitly N/A for this
isolated gate. Synthetic confirmed, rejected and unknown outcomes are tests,
not proof of live delivery. These external checks remain separately authorized
release-trial work and are not inherited by BG-28.
