# BG-03 — 100-Action Checklist Reconciliation

Status: **99/100 reconciled; BG-03.100 waits for the final documentation-complete CI and merge gate**

Tracking: GitHub #27 · Linear OPE-323 · PR #28 · branch `agent/ope-323-bg-03-release-smoke-edit-version`

Evidence source: [`BG-03_RELEASE_SMOKE_EDIT_VERSION.md`](BG-03_RELEASE_SMOKE_EDIT_VERSION.md). Implementation gate: GitHub Actions CI run #121 on `2b9d8b0dd32b482aa454d821564a67db3c5f5321`.

Statuses mean:

- **Satisfied** — directly implemented, inspected, or proved.
- **Satisfied (reused)** — existing repository evidence remains applicable and BG-03 did not change that contract.
- **N/A satisfied** — the requested condition was checked but no repository artifact exists to change.
- **Pending gate** — intentionally cannot be closed until the final task gate is green.

## BG-03 / 01 — Establish task context

| ID        | Status    | Reconciliation                                                                                                                 |
| --------- | --------- | ------------------------------------------------------------------------------------------------------------------------------ |
| BG-03.001 | Satisfied | Read BG-03 build-guide what/why, file pointers and proof boundary before implementation.                                       |
| BG-03.002 | Satisfied | BG-02 issue #25 and PR #26 are complete/merged; its evidence explicitly unlocks BG-03.                                         |
| BG-03.003 | Satisfied | Base recorded as `main` `f43580786e4106c4983e30f1bb351e3150d16bf3`; work branch recorded above.                                |
| BG-03.004 | Satisfied | Located verifier, policy schema/routes/repository, item-detail contract, existing item regressions and CI gate.                |
| BG-03.005 | Satisfied | Reused the September audit for the missing-version 422 and existing backend tests for concurrency/FTS behavior.                |
| BG-03.006 | Satisfied | Authoritative contract confirmed: positive integer `edit_version`, detail envelope, returned next version, `VERSION_CONFLICT`. |
| BG-03.007 | Satisfied | Verification environment is synthetic local HTTP plus Node 22 GitHub Actions; no production execution.                         |
| BG-03.008 | Satisfied | Existing admin/capture action boundaries preserved; no production authorization was inferred or broadened.                     |
| BG-03.009 | Satisfied | Regression server uses only generated/synthetic captures, IDs, bytes and tokens.                                               |
| BG-03.010 | Satisfied | GitHub #27, Linear OPE-323, PR #28 and repository evidence files track the task.                                               |

## BG-03 / 02 — Version contract

| ID        | Status    | Reconciliation                                                                                         |
| --------- | --------- | ------------------------------------------------------------------------------------------------------ |
| BG-03.011 | Satisfied | Audited all four verifier privacy PATCH calls.                                                         |
| BG-03.012 | Satisfied | `privacyChangeSchema` requires `edit_version` as integer min 1 and preserves existing policy controls. |
| BG-03.013 | Satisfied | Item detail response located at `data.item`.                                                           |
| BG-03.014 | Satisfied | Authoritative field confirmed as `data.item.edit_version`.                                             |
| BG-03.015 | Satisfied | Minimum confirmed as positive integer, `>= 1`.                                                         |
| BG-03.016 | Satisfied | Privacy success response returns `data.edit_version` plus policy result fields.                        |
| BG-03.017 | Satisfied | Stale mutation vocabulary confirmed as HTTP 409 `VERSION_CONFLICT`.                                    |
| BG-03.018 | Satisfied | `derived_data_action` remains required and limited to `reprocess` or `purge`.                          |
| BG-03.019 | Satisfied | Sequence inventoried as Public, Personal/no-consent, Personal/consent, Sensitive.                      |
| BG-03.020 | Satisfied | Current mutation/detail/conflict contract recorded in primary BG-03 evidence.                          |

## BG-03 / 03 — Detail reader

| ID        | Status    | Reconciliation                                                                                            |
| --------- | --------- | --------------------------------------------------------------------------------------------------------- |
| BG-03.021 | Satisfied | Added reusable `readCurrentItem()` and `readItemState()` helpers.                                         |
| BG-03.022 | Satisfied | Detail GET uses the existing admin Authorization header.                                                  |
| BG-03.023 | Satisfied | Item ID is URL-encoded and response item ID must match the requested synthetic item.                      |
| BG-03.024 | Satisfied | `jsonRequest()` requires the expected HTTP status before state is consumed.                               |
| BG-03.025 | Satisfied | JSON is parsed safely; non-JSON failure text is bounded.                                                  |
| BG-03.026 | Satisfied | Reader explicitly accesses `detail.data.item`.                                                            |
| BG-03.027 | Satisfied | Reader requires integer `edit_version >= 1`.                                                              |
| BG-03.028 | Satisfied | Missing/non-object `data.item` fails immediately with scenario-labelled error.                            |
| BG-03.029 | Satisfied | Malformed version regression uses version `0` and proves nonzero exit before any privacy mutation.        |
| BG-03.030 | Satisfied | Helper returns only item ID, version, privacy level and source/canonical evidence needed by the verifier. |

## BG-03 / 04 — Public mutation

| ID        | Status    | Reconciliation                                                                          |
| --------- | --------- | --------------------------------------------------------------------------------------- |
| BG-03.031 | Satisfied | Existing UUID run marker produces a unique synthetic capture.                           |
| BG-03.032 | Satisfied | Verifier GETs initial item detail before the first privacy change.                      |
| BG-03.033 | Satisfied | Public payload remains explicit.                                                        |
| BG-03.034 | Satisfied | Public payload retains `derived_data_action: reprocess`.                                |
| BG-03.035 | Satisfied | Public PATCH receives the initial authoritative `edit_version`.                         |
| BG-03.036 | Satisfied | Public PATCH is sent through version-aware `changePrivacy()`.                           |
| BG-03.037 | Satisfied | Public PATCH must return HTTP 200.                                                      |
| BG-03.038 | Satisfied | OpenRouter eligibility and Gemini fallback assertions remain.                           |
| BG-03.039 | Satisfied | Successful Public mutation is followed by a detail refetch.                             |
| BG-03.040 | Satisfied | Refetched version must match server mutation response and is retained as current state. |

## BG-03 / 05 — Consent sequence

| ID        | Status    | Reconciliation                                                                        |
| --------- | --------- | ------------------------------------------------------------------------------------- |
| BG-03.041 | Satisfied | Personal without-consent payload remains explicit.                                    |
| BG-03.042 | Satisfied | It receives the refetched current item version.                                       |
| BG-03.043 | Satisfied | No-consent mutation is executed in the happy-path regression.                         |
| BG-03.044 | Satisfied | Result must have `provider_eligibility: none`.                                        |
| BG-03.045 | Satisfied | `changePrivacy()` refetches after the successful no-consent mutation.                 |
| BG-03.046 | Satisfied | Compliant Personal case remains separate from the no-consent case.                    |
| BG-03.047 | Satisfied | Hosted consent, ZDR enforcement and data-collection denial remain explicit controls.  |
| BG-03.048 | Satisfied | Compliant Personal mutation uses the current refetched version.                       |
| BG-03.049 | Satisfied | OpenRouter eligibility plus ZDR/data-collection control assertions remain.            |
| BG-03.050 | Satisfied | Successful compliant Personal mutation refetches and retains the next server version. |

## BG-03 / 06 — Sensitive sequence

| ID        | Status    | Reconciliation                                                                                                             |
| --------- | --------- | -------------------------------------------------------------------------------------------------------------------------- |
| BG-03.051 | Satisfied | Sensitive privacy case remains explicit.                                                                                   |
| BG-03.052 | Satisfied | Sensitive payload retains `derived_data_action: purge`.                                                                    |
| BG-03.053 | Satisfied | Sensitive PATCH receives the refetched current version.                                                                    |
| BG-03.054 | Satisfied | Sensitive mutation executes in the full regression.                                                                        |
| BG-03.055 | Satisfied | Hosted provider remains denied with `provider_eligibility: none`.                                                          |
| BG-03.056 | Satisfied | Mutation response is inspected for the derived-data action/policy outcome; permanent canonical purge remains out of scope. |
| BG-03.057 | Satisfied | Final detail is compared with initial raw source URL/canonical URL/raw text evidence.                                      |
| BG-03.058 | Satisfied | Final item ID must equal the initial canonical item ID.                                                                    |
| BG-03.059 | Satisfied | Final authoritative version is read by the post-Sensitive refetch and included in verifier summary output.                 |
| BG-03.060 | Satisfied | Final routing/policy version and privacy state remain asserted and reported.                                               |

## BG-03 / 07 — Conflict behavior

| ID        | Status             | Reconciliation                                                                                                            |
| --------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| BG-03.061 | Satisfied          | Initial version is deliberately retained as stale after Public succeeds.                                                  |
| BG-03.062 | Satisfied          | Isolated stale PATCH is sent after the Public mutation.                                                                   |
| BG-03.063 | Satisfied          | It must return HTTP 409 with `VERSION_CONFLICT`.                                                                          |
| BG-03.064 | Satisfied          | Refetch proves version/privacy/evidence did not change after the stale request.                                           |
| BG-03.065 | Satisfied          | No stale/current conflict path contains an automatic overwrite retry.                                                     |
| BG-03.066 | Satisfied          | Scenario-labelled HTTP diagnostic reports expected vs actual status/body on conflict failure.                             |
| BG-03.067 | Satisfied          | Expected stale conflict is a distinct named scenario, separate from ordinary successful mutations.                        |
| BG-03.068 | Satisfied          | Regression advances successful server versions by three, making local `+1` arithmetic observably wrong.                   |
| BG-03.069 | Satisfied (reused) | Existing D1 item regression proves privacy changes are not confused by FTS trigger writes; BG-03 changes no backend code. |
| BG-03.070 | Satisfied          | Happy-path request versions `1, 1, 4, 7, 10` prove successive authoritative refetches are used.                           |

## BG-03 / 08 — Script reliability

| ID        | Status    | Reconciliation                                                                                             |
| --------- | --------- | ---------------------------------------------------------------------------------------------------------- |
| BG-03.071 | Satisfied | Failed response body is parsed safely and retained only for bounded diagnostics.                           |
| BG-03.072 | Satisfied | Serialized diagnostics are capped at 800 characters.                                                       |
| BG-03.073 | Satisfied | Requests carry explicit scenario labels in failure messages.                                               |
| BG-03.074 | Satisfied | Child-process regressions prove assertion/request failures exit nonzero.                                   |
| BG-03.075 | Satisfied | Top-level awaited operations are not caught and converted into success.                                    |
| BG-03.076 | Satisfied | HTTP status failures carry request/scenario context; semantic assertions carry scenario-specific messages. |
| BG-03.077 | Satisfied | Existing UUID run marker remains stable for one execution and scopes synthetic IDs.                        |
| BG-03.078 | Satisfied | Diagnostics do not serialize request headers; echoed admin/capture token values are redacted.              |
| BG-03.079 | Satisfied | Verifier requires worker base URL, capture token and admin token before execution.                         |
| BG-03.080 | Satisfied | Target must parse as an absolute URL using `http:` or `https:`.                                            |

## BG-03 / 09 — Verification

| ID        | Status        | Reconciliation                                                                                                             |
| --------- | ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| BG-03.081 | Satisfied     | Persistent malformed-version child-process regression passes in CI.                                                        |
| BG-03.082 | Satisfied     | Full synthetic privacy sequence executes against the local regression server.                                              |
| BG-03.083 | Satisfied     | Happy path reaches all privacy and later attachment fixture stages; no missing-version 422 occurs.                         |
| BG-03.084 | Satisfied     | Deliberate stale mutation still returns HTTP 409 `VERSION_CONFLICT`.                                                       |
| BG-03.085 | Satisfied     | Final detail comparison requires raw source evidence and URLs to survive the sequence unchanged.                           |
| BG-03.086 | Satisfied     | Happy-path regression proves Public, stale conflict, both Personal cases, Sensitive and attachment fixture stages execute. |
| BG-03.087 | Satisfied     | Malformed-version and unexpected-current-conflict regressions both require nonzero process exit.                           |
| BG-03.088 | N/A satisfied | No shell wrapper exists around this verifier; direct Node process status is preserved and tested instead.                  |
| BG-03.089 | Satisfied     | Existing Public/Personal/Sensitive policy assertions remain independent of version mechanics.                              |
| BG-03.090 | Satisfied     | Corrected smoke evidence is recorded in `BG-03_RELEASE_SMOKE_EDIT_VERSION.md` and CI run #121.                             |

## BG-03 / 10 — Verify and close this task

| ID        | Status           | Reconciliation                                                                                                                       |
| --------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| BG-03.091 | Satisfied        | Completed implementation was compared with the build-guide outcome; BG-04 attachment/browser/setup work remains explicitly excluded. |
| BG-03.092 | Satisfied        | Focused 3-test verifier proof and full Node 22 CI #121 both passed.                                                                  |
| BG-03.093 | Satisfied        | Malformed version, deliberate stale conflict and unexpected current conflict remain truthful rejection cases.                        |
| BG-03.094 | Satisfied        | No API/schema/auth/database/privacy guarantees were weakened; final implementation diff is client/test wiring only.                  |
| BG-03.095 | Satisfied        | Test server closes in `finally`; temporary formatter workflow was removed; no live production resources were created.                |
| BG-03.096 | Satisfied        | Final implementation diff reviewed against base; incidental package ordering was removed and unrelated owner code preserved.         |
| BG-03.097 | Satisfied        | Primary evidence records base/head, environment, CI run, test counts, migrations and scope boundaries.                               |
| BG-03.098 | Satisfied        | No implementation blocker remains; final documentation-complete CI/merge is recorded as the only pending gate, not as passed work.   |
| BG-03.099 | Satisfied        | Verification index and task evidence are being updated only to implementation-verified status until the final gate passes.           |
| BG-03.100 | **Pending gate** | Run final CI on the documentation-complete head, merge PR #28, then record BG-03 complete and BG-04 unlocked.                        |

## Reconciliation result

**99 of 100 actions are satisfied/reconciled.** The only intentionally open action is BG-03.100, because the final documentation-complete branch head must pass CI before PR #28 can be merged and BG-04 can be unlocked.

No unchecked implementation behavior is being hidden behind the final gate.
