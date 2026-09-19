# RecollectFlow — Microtask Execution Checklist

Read the [build guide](RECOLLECTFLOW_BUILD_GUIDE.md) for the detailed feature explanations, design reasoning, examples, source references and completion boundaries. This companion preserves the original 100 microtasks for each of the 40 tasks, in priority order. Boxes remain planned work until task-specific evidence proves completion, at which point the corresponding checklist may be checked.

## BG-01 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#7-bg-01--freeze-a-reproducible-starting-point).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-01 / 01 — Establish task context

- [ ] `BG-01.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [ ] `BG-01.002` **Dependency:** Verify the baseline starting conditions; preserve any unresolved prerequisite as a blocker.
- [ ] `BG-01.003` **Baseline:** Record the actual checkout or release candidate used for BG-01.
- [ ] `BG-01.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [ ] `BG-01.005` **Evidence:** Check whether existing evidence already satisfies any BG-01 step; reference it instead of manufacturing work.
- [ ] `BG-01.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [ ] `BG-01.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [ ] `BG-01.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [ ] `BG-01.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [ ] `BG-01.010` **Tracking:** Open a BG-01 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-01 / 02 — Checkout identity

- [ ] `BG-01.011` Read current Git SHA.
- [ ] `BG-01.012` Record detached or branch state.
- [ ] `BG-01.013` Read tracked-file change summary.
- [ ] `BG-01.014` List untracked files safely.
- [ ] `BG-01.015` Identify owner-created local files.
- [ ] `BG-01.016` Preserve the previous audit.
- [ ] `BG-01.017` Compare against audited SHA.
- [ ] `BG-01.018` Read applicable repository instructions.
- [ ] `BG-01.019` Record checkout comparison result.
- [ ] `BG-01.020` Identify baseline drift requiring reproduction.

#### BG-01 / 03 — Toolchain

- [ ] `BG-01.021` Read CI Node version.
- [ ] `BG-01.022` Select compatible Node runtime.
- [ ] `BG-01.023` Record actual Node version.
- [ ] `BG-01.024` Read npm version.
- [ ] `BG-01.025` Confirm root package identity.
- [ ] `BG-01.026` Confirm workspace package membership.
- [ ] `BG-01.027` Confirm lockfile is present.
- [ ] `BG-01.028` Run lockfile-based dependency installation.
- [ ] `BG-01.029` Check unexpected lockfile changes.
- [ ] `BG-01.030` Record dependency installation outcome.

#### BG-01 / 04 — Test topology

- [ ] `BG-01.031` Read root check sequence.
- [ ] `BG-01.032` Locate Node test configuration.
- [ ] `BG-01.033` Locate D1 test configuration.
- [ ] `BG-01.034` Locate Web test command.
- [ ] `BG-01.035` Identify contract checking command.
- [ ] `BG-01.036` Identify migration checking command.
- [ ] `BG-01.037` Identify Worker bundling command.
- [ ] `BG-01.038` Identify browser startup commands.
- [ ] `BG-01.039` Distinguish tests from live probes.
- [ ] `BG-01.040` Map failures to execution layers.

#### BG-01 / 05 — Local configuration

- [ ] `BG-01.041` Choose isolated configuration location.
- [ ] `BG-01.042` Choose fresh persistence directory.
- [ ] `BG-01.043` Set dummy capture credential.
- [ ] `BG-01.044` Set dummy admin credential.
- [ ] `BG-01.045` Set dummy worker credential.
- [ ] `BG-01.046` Remove live messaging credentials.
- [ ] `BG-01.047` Select mocked AI implementations.
- [ ] `BG-01.048` Record nonsecret binding names.
- [ ] `BG-01.049` Check environment-file loading behavior.
- [ ] `BG-01.050` Prevent production setting inheritance.

#### BG-01 / 06 — Storage isolation

- [ ] `BG-01.051` Confirm local D1 target.
- [ ] `BG-01.052` Confirm local R2 target.
- [ ] `BG-01.053` Inspect pending migration filenames.
- [ ] `BG-01.054` Apply migrations locally.
- [ ] `BG-01.055` Record applied migration list.
- [ ] `BG-01.056` Start matching Worker configuration.
- [ ] `BG-01.057` Verify Worker persistence directory.
- [ ] `BG-01.058` Create synthetic baseline capture.
- [ ] `BG-01.059` Read synthetic capture back.
- [ ] `BG-01.060` Confirm production state was untouched.

#### BG-01 / 07 — Server processes

- [ ] `BG-01.061` Choose available API port.
- [ ] `BG-01.062` Choose available Web port.
- [ ] `BG-01.063` Configure matching API proxy.
- [ ] `BG-01.064` Start API process.
- [ ] `BG-01.065` Record owned process identifier.
- [ ] `BG-01.066` Start Web process.
- [ ] `BG-01.067` Record Web process identifier.
- [ ] `BG-01.068` Verify local health response.
- [ ] `BG-01.069` Verify Web reaches local API.
- [ ] `BG-01.070` Define owned-process cleanup command.

#### BG-01 / 08 — Baseline reproduction

- [ ] `BG-01.071` Run formatting check.
- [ ] `BG-01.072` Run root lint check.
- [ ] `BG-01.073` Run TypeScript check.
- [ ] `BG-01.074` Run Node suite.
- [ ] `BG-01.075` Run Worker D1 suite.
- [ ] `BG-01.076` Capture expired-window failure.
- [ ] `BG-01.077` Run remaining Web gates separately.
- [ ] `BG-01.078` Reproduce obsolete smoke payload.
- [ ] `BG-01.079` Classify environment-only failures.
- [ ] `BG-01.080` Preserve actual process exit codes.

#### BG-01 / 09 — Evidence hygiene

- [ ] `BG-01.081` Create baseline evidence directory.
- [ ] `BG-01.082` Save sanitized command logs.
- [ ] `BG-01.083` Record timestamps and timezone.
- [ ] `BG-01.084` Record fixture identifiers only.
- [ ] `BG-01.085` Scan logs for dummy-secret reflection.
- [ ] `BG-01.086` Remove accidental sensitive output.
- [ ] `BG-01.087` Record test counts accurately.
- [ ] `BG-01.088` Distinguish skipped from passed checks.
- [ ] `BG-01.089` List unreproduced audit findings.
- [ ] `BG-01.090` Prepare baseline failure ledger.

#### BG-01 / 10 — Verify and close this task

- [ ] `BG-01.091` **Review:** Compare the completed checklist with BG-01's stated outcome; identify uncovered behavior.
- [ ] `BG-01.092` **Verification:** Run or inspect the focused proof required by BG-01; reuse a valid existing run rather than repeating it gratuitously.
- [ ] `BG-01.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [ ] `BG-01.094` **Integrity:** Check that BG-01 has not weakened its stated data, privacy, scope or recovery guarantees.
- [ ] `BG-01.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [ ] `BG-01.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [ ] `BG-01.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [ ] `BG-01.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [ ] `BG-01.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [ ] `BG-01.100` **Gate:** Check the parent completion boundary and record whether BG-02 is unlocked.

## BG-02 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#8-bg-02--make-the-usage-test-independent-of-todays-date).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-02 / 01 — Establish task context

- [ ] `BG-02.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [ ] `BG-02.002` **Dependency:** Verify BG-01's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [ ] `BG-02.003` **Baseline:** Record the actual checkout or release candidate used for BG-02.
- [ ] `BG-02.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [ ] `BG-02.005` **Evidence:** Check whether existing evidence already satisfies any BG-02 step; reference it instead of manufacturing work.
- [ ] `BG-02.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [ ] `BG-02.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [ ] `BG-02.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [ ] `BG-02.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [ ] `BG-02.010` **Tracking:** Open a BG-02 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-02 / 02 — Clock trace

- [ ] `BG-02.011` Open failing usage test.
- [ ] `BG-02.012` Identify fixed fixture date.
- [ ] `BG-02.013` Locate reservation clock argument.
- [ ] `BG-02.014` Trace quota-window creation.
- [ ] `BG-02.015` Trace usage HTTP handler.
- [ ] `BG-02.016` Locate status clock default.
- [ ] `BG-02.017` Locate active-window SQL predicate.
- [ ] `BG-02.018` Identify runtime clock boundary.
- [ ] `BG-02.019` Record expiry comparison operator.
- [ ] `BG-02.020` Confirm expected active-window semantics.

#### BG-02 / 03 — Fixture design

- [ ] `BG-02.021` Choose deterministic reference instant.
- [ ] `BG-02.022` Choose matching minute window.
- [ ] `BG-02.023` Choose matching daily window.
- [ ] `BG-02.024` Choose pre-expiry query instant.
- [ ] `BG-02.025` Choose exact-expiry query instant.
- [ ] `BG-02.026` Choose post-expiry query instant.
- [ ] `BG-02.027` Keep synthetic usage text.
- [ ] `BG-02.028` Keep isolated provider scope.
- [ ] `BG-02.029` Preserve test authorization fixtures.
- [ ] `BG-02.030` Document expected window membership.

#### BG-02 / 04 — Clock mechanism

- [ ] `BG-02.031` Inspect existing clock utilities.
- [ ] `BG-02.032` Check workerd fake-clock support.
- [ ] `BG-02.033` Verify inner-runtime Date behavior.
- [ ] `BG-02.034` Distinguish timers from wall clock.
- [ ] `BG-02.035` Prefer existing injection seam.
- [ ] `BG-02.036` Define narrow clock interface if needed.
- [ ] `BG-02.037` Keep production default unchanged.
- [ ] `BG-02.038` Avoid public time override parameter.
- [ ] `BG-02.039` Ensure clock reset in cleanup.
- [ ] `BG-02.040` Record chosen clock mechanism.

#### BG-02 / 05 — Active-window regression

- [ ] `BG-02.041` Create reservation at controlled instant.
- [ ] `BG-02.042` Query through actual usage route.
- [ ] `BG-02.043` Assert successful admin response.
- [ ] `BG-02.044` Assert expected provider row.
- [ ] `BG-02.045` Assert expected shared scope.
- [ ] `BG-02.046` Assert expected quota dimensions.
- [ ] `BG-02.047` Assert reservation counters remain visible.
- [ ] `BG-02.048` Assert policy version remains correct.
- [ ] `BG-02.049` Assert warning thresholds remain correct.
- [ ] `BG-02.050` Assert no unrelated fixture rows.

#### BG-02 / 06 — Expiry regression

- [ ] `BG-02.051` Advance to before expiry.
- [ ] `BG-02.052` Assert window still appears.
- [ ] `BG-02.053` Advance to exact expiry.
- [ ] `BG-02.054` Assert expired window disappears.
- [ ] `BG-02.055` Advance beyond expiry.
- [ ] `BG-02.056` Assert no stale window returns.
- [ ] `BG-02.057` Check minute versus daily expiry.
- [ ] `BG-02.058` Check new-window reservation creation.
- [ ] `BG-02.059` Assert old consumption stays historical.
- [ ] `BG-02.060` Preserve repository expiry predicate.

#### BG-02 / 07 — Authorization preservation

- [ ] `BG-02.061` Query usage without identity.
- [ ] `BG-02.062` Assert anonymous denial.
- [ ] `BG-02.063` Query with capture token.
- [ ] `BG-02.064` Assert scope denial.
- [ ] `BG-02.065` Query with admin token.
- [ ] `BG-02.066` Assert admin success.
- [ ] `BG-02.067` Inspect serialized response fields.
- [ ] `BG-02.068` Assert dummy credential absent.
- [ ] `BG-02.069` Assert fixture source text absent.
- [ ] `BG-02.070` Assert provider key names absent.

#### BG-02 / 08 — Isolation and robustness

- [ ] `BG-02.071` Run usage file alone.
- [ ] `BG-02.072` Run usage file twice.
- [ ] `BG-02.073` Run alongside capacity tests.
- [ ] `BG-02.074` Check fake clock restoration.
- [ ] `BG-02.075` Check lease timer behavior.
- [ ] `BG-02.076` Check migrations still finish.
- [ ] `BG-02.077` Check timezone-independent instants.
- [ ] `BG-02.078` Check midnight reset fixture.
- [ ] `BG-02.079` Check no real provider request.
- [ ] `BG-02.080` Review unnecessary production edits.

#### BG-02 / 09 — Failure diagnosis

- [ ] `BG-02.081` Remove obsolete date assumption.
- [ ] `BG-02.082` Avoid empty-array fallback assertion.
- [ ] `BG-02.083` Keep meaningful provider assertions.
- [ ] `BG-02.084` Capture focused passing output.
- [ ] `BG-02.085` Run complete D1 suite.
- [ ] `BG-02.086` Compare unrelated failure counts.
- [ ] `BG-02.087` Record runtime version used.
- [ ] `BG-02.088` Record exact fixed test line.
- [ ] `BG-02.089` Record expiry regression evidence.
- [ ] `BG-02.090` Link evidence to candidate SHA.

#### BG-02 / 10 — Verify and close this task

- [ ] `BG-02.091` **Review:** Compare the completed checklist with BG-02's stated outcome; identify uncovered behavior.
- [ ] `BG-02.092` **Verification:** Run or inspect the focused proof required by BG-02; reuse a valid existing run rather than repeating it gratuitously.
- [ ] `BG-02.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [ ] `BG-02.094` **Integrity:** Check that BG-02 has not weakened its stated data, privacy, scope or recovery guarantees.
- [ ] `BG-02.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [ ] `BG-02.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [ ] `BG-02.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [ ] `BG-02.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [ ] `BG-02.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [ ] `BG-02.100` **Gate:** Check the parent completion boundary and record whether BG-03 is unlocked.

## BG-03 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#9-bg-03--carry-edit-versions-through-the-smoke-script).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-03 / 01 — Establish task context

- [ ] `BG-03.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [ ] `BG-03.002` **Dependency:** Verify BG-02's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [ ] `BG-03.003` **Baseline:** Record the actual checkout or release candidate used for BG-03.
- [ ] `BG-03.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [ ] `BG-03.005` **Evidence:** Check whether existing evidence already satisfies any BG-03 step; reference it instead of manufacturing work.
- [ ] `BG-03.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [ ] `BG-03.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [ ] `BG-03.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [ ] `BG-03.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [ ] `BG-03.010` **Tracking:** Open a BG-03 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-03 / 02 — Version contract

- [ ] `BG-03.011` Open smoke privacy mutations.
- [ ] `BG-03.012` Open current privacy schema.
- [ ] `BG-03.013` Locate detail item envelope.
- [ ] `BG-03.014` Identify edit_version field.
- [ ] `BG-03.015` Identify version minimum.
- [ ] `BG-03.016` Inspect success response shape.
- [ ] `BG-03.017` Inspect conflict error vocabulary.
- [ ] `BG-03.018` Inspect derived-action requirements.
- [ ] `BG-03.019` List successive privacy scenarios.
- [ ] `BG-03.020` Record current mutation contract.

#### BG-03 / 03 — Detail reader

- [ ] `BG-03.021` Add reusable detail request helper.
- [ ] `BG-03.022` Pass admin authentication safely.
- [ ] `BG-03.023` Request exact synthetic item.
- [ ] `BG-03.024` Check HTTP status first.
- [ ] `BG-03.025` Parse JSON response safely.
- [ ] `BG-03.026` Read data.item explicitly.
- [ ] `BG-03.027` Validate positive integer version.
- [ ] `BG-03.028` Reject missing item envelope.
- [ ] `BG-03.029` Reject malformed version values.
- [ ] `BG-03.030` Return only needed detail fields.

#### BG-03 / 04 — Public mutation

- [ ] `BG-03.031` Create unique synthetic capture.
- [ ] `BG-03.032` Read initial authoritative version.
- [ ] `BG-03.033` Build public privacy payload.
- [ ] `BG-03.034` Include explicit reprocess action.
- [ ] `BG-03.035` Include current edit version.
- [ ] `BG-03.036` Send first privacy PATCH.
- [ ] `BG-03.037` Verify expected success status.
- [ ] `BG-03.038` Verify policy result fields.
- [ ] `BG-03.039` Refetch authoritative item.
- [ ] `BG-03.040` Retain returned current version.

#### BG-03 / 05 — Consent sequence

- [ ] `BG-03.041` Build Personal without-consent case.
- [ ] `BG-03.042` Include current item version.
- [ ] `BG-03.043` Send no-consent mutation.
- [ ] `BG-03.044` Assert no-AI eligibility.
- [ ] `BG-03.045` Refetch item before next mutation.
- [ ] `BG-03.046` Build compliant Personal case.
- [ ] `BG-03.047` Include explicit consent controls.
- [ ] `BG-03.048` Send consent mutation.
- [ ] `BG-03.049` Assert required privacy controls.
- [ ] `BG-03.050` Refetch version after consent case.

#### BG-03 / 06 — Sensitive sequence

- [ ] `BG-03.051` Build Sensitive privacy case.
- [ ] `BG-03.052` Include explicit purge-derived action.
- [ ] `BG-03.053` Include current edit version.
- [ ] `BG-03.054` Send Sensitive mutation.
- [ ] `BG-03.055` Assert hosted provider denied.
- [ ] `BG-03.056` Inspect derived-data outcome.
- [ ] `BG-03.057` Verify source evidence preserved.
- [ ] `BG-03.058` Verify canonical ID unchanged.
- [ ] `BG-03.059` Read final version.
- [ ] `BG-03.060` Preserve final policy evidence.

#### BG-03 / 07 — Conflict behavior

- [ ] `BG-03.061` Prepare stale version deliberately.
- [ ] `BG-03.062` Send isolated conflicting mutation.
- [ ] `BG-03.063` Assert conflict response.
- [ ] `BG-03.064` Confirm current values unchanged.
- [ ] `BG-03.065` Prevent automatic overwrite retry.
- [ ] `BG-03.066` Report expected versus observed conflict.
- [ ] `BG-03.067` Keep conflict test independently marked.
- [ ] `BG-03.068` Avoid local version increment assumption.
- [ ] `BG-03.069` Check unrelated FTS writes.
- [ ] `BG-03.070` Verify successive versions remain authoritative.

#### BG-03 / 08 — Script reliability

- [ ] `BG-03.071` Preserve failed HTTP body safely.
- [ ] `BG-03.072` Limit diagnostic response length.
- [ ] `BG-03.073` Label failed scenario clearly.
- [ ] `BG-03.074` Set nonzero failure exit.
- [ ] `BG-03.075` Avoid swallowing rejected promises.
- [ ] `BG-03.076` Separate request and assertion failures.
- [ ] `BG-03.077` Keep test-run marker stable.
- [ ] `BG-03.078` Avoid logging Authorization headers.
- [ ] `BG-03.079` Validate required environment inputs.
- [ ] `BG-03.080` Reject missing target origin.

#### BG-03 / 09 — Verification

- [ ] `BG-03.081` Run version reader failure fixtures.
- [ ] `BG-03.082` Run local privacy sequence.
- [ ] `BG-03.083` Confirm original 422 disappears.
- [ ] `BG-03.084` Confirm stale version still rejects.
- [ ] `BG-03.085` Confirm source text survives sequence.
- [ ] `BG-03.086` Confirm all scenarios execute.
- [ ] `BG-03.087` Inspect script exit on failure.
- [ ] `BG-03.088` Check shell preserves exit status.
- [ ] `BG-03.089` Review policy assertions separately.
- [ ] `BG-03.090` Record corrected smoke evidence.

#### BG-03 / 10 — Verify and close this task

- [ ] `BG-03.091` **Review:** Compare the completed checklist with BG-03's stated outcome; identify uncovered behavior.
- [ ] `BG-03.092` **Verification:** Run or inspect the focused proof required by BG-03; reuse a valid existing run rather than repeating it gratuitously.
- [ ] `BG-03.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [ ] `BG-03.094` **Integrity:** Check that BG-03 has not weakened its stated data, privacy, scope or recovery guarantees.
- [ ] `BG-03.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [ ] `BG-03.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [ ] `BG-03.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [ ] `BG-03.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [ ] `BG-03.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [ ] `BG-03.100` **Gate:** Check the parent completion boundary and record whether BG-04 is unlocked.

## BG-04 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#10-bg-04--finish-the-smoke-story-and-repair-setup-instructions).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-04 / 01 — Establish task context

- [x] `BG-04.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [x] `BG-04.002` **Dependency:** Verify BG-03's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [x] `BG-04.003` **Baseline:** Record the actual checkout or release candidate used for BG-04.
- [x] `BG-04.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [x] `BG-04.005` **Evidence:** Check whether existing evidence already satisfies any BG-04 step; reference it instead of manufacturing work.
- [x] `BG-04.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [x] `BG-04.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [x] `BG-04.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [x] `BG-04.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [x] `BG-04.010` **Tracking:** Open a BG-04 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-04 / 02 — Scenario inventory

- [x] `BG-04.011` List existing smoke stages.
- [x] `BG-04.012` Mark formerly unreachable stages.
- [x] `BG-04.013` Map each stage to route.
- [x] `BG-04.014` Read current response envelopes.
- [x] `BG-04.015` Identify hardcoded policy version.
- [x] `BG-04.016` Identify hardcoded fallback list.
- [x] `BG-04.017` Separate eligibility from capability.
- [x] `BG-04.018` Identify attachment byte fixture.
- [x] `BG-04.019` Identify missing browser auth stage.
- [x] `BG-04.020` Record required smoke coverage.

#### BG-04 / 03 — Runner structure

- [x] `BG-04.021` Assign unique run marker.
- [x] `BG-04.022` Label each scenario explicitly.
- [x] `BG-04.023` Store stage start timestamp.
- [x] `BG-04.024` Record expected status per stage.
- [x] `BG-04.025` Record actual status per stage.
- [x] `BG-04.026` Preserve first failure cause.
- [x] `BG-04.027` Report completed earlier stages.
- [x] `BG-04.028` Exit nonzero on failure.
- [x] `BG-04.029` Avoid credential-bearing diagnostics.
- [x] `BG-04.030` Reject implicit production target.

#### BG-04 / 04 — Capture cases

- [x] `BG-04.031` Create URL fixture.
- [x] `BG-04.032` Replay identical capture request.
- [x] `BG-04.033` Compare canonical IDs.
- [x] `BG-04.034` Compare replay flag.
- [x] `BG-04.035` Create normalized duplicate URL.
- [x] `BG-04.036` Use fresh duplicate key.
- [x] `BG-04.037` Preserve second user reason.
- [x] `BG-04.038` Inspect capture event history.
- [x] `BG-04.039` Confirm no accidental extra item.
- [x] `BG-04.040` Verify raw retrieval without AI.

#### BG-04 / 05 — Privacy cases

- [x] `BG-04.041` Read current policy contract.
- [x] `BG-04.042` Update current version handling.
- [x] `BG-04.043` Check Public eligibility.
- [x] `BG-04.044` Check Personal without consent.
- [x] `BG-04.045` Check compliant Personal controls.
- [x] `BG-04.046` Check Sensitive no-AI result.
- [x] `BG-04.047` Verify no silent fallback.
- [x] `BG-04.048` Check malformed consent rejection.
- [x] `BG-04.049` Verify source remains intact.
- [x] `BG-04.050` Label adapter execution separately.

#### BG-04 / 06 — Attachment cases

- [x] `BG-04.051` Initialize synthetic upload.
- [x] `BG-04.052` Upload original bytes.
- [x] `BG-04.053` Finalize checksum validation.
- [x] `BG-04.054` Link finalized attachment.
- [x] `BG-04.055` Download with allowed bearer.
- [x] `BG-04.056` Compare byte length.
- [x] `BG-04.057` Compare SHA-256 checksum.
- [x] `BG-04.058` Reject anonymous download.
- [x] `BG-04.059` Label signature-only PDF purpose.
- [x] `BG-04.060` Add parseable PDF fixture separately.

#### BG-04 / 07 — Review and recovery cases

- [x] `BG-04.061` Prepare item edit scenario.
- [x] `BG-04.062` Fetch current edit version.
- [x] `BG-04.063` Verify stale edit rejection.
- [x] `BG-04.064` Verify successful derived edit.
- [x] `BG-04.065` Soft-delete synthetic item.
- [x] `BG-04.066` Check search exclusion.
- [x] `BG-04.067` Restore with current version.
- [x] `BG-04.068` Check search restoration.
- [x] `BG-04.069` Verify JSON export includes item.
- [x] `BG-04.070` Keep purge outside default smoke.

#### BG-04 / 08 — README startup

- [x] `BG-04.071` Replace nonexistent dev command.
- [x] `BG-04.072` Document separate API terminal.
- [x] `BG-04.073` Document separate Web terminal.
- [x] `BG-04.074` Document required local migrations.
- [x] `BG-04.075` Document dummy credential setup.
- [x] `BG-04.076` Document API listening port.
- [x] `BG-04.077` Document Vite proxy dependency.
- [x] `BG-04.078` Document isolated persistence path.
- [x] `BG-04.079` Verify commands from repository root.
- [x] `BG-04.080` Remove Serviq-specific setup assumptions.

#### BG-04 / 09 — Smoke boundaries

- [x] `BG-04.081` Label local versus remote runs.
- [x] `BG-04.082` Print safe target origin.
- [x] `BG-04.083` Require explicit remote selection.
- [x] `BG-04.084` Limit fixture cleanup scope.
- [x] `BG-04.085` Avoid arbitrary owner-item deletion.
- [x] `BG-04.086` Keep live delivery opt-in.
- [x] `BG-04.087` Run every supported local stage.
- [x] `BG-04.088` Record known later-stage defects.
- [x] `BG-04.089` Preserve true stage failures.
- [x] `BG-04.090` Record verifier coverage boundary.

#### BG-04 / 10 — Verify and close this task

- [x] `BG-04.091` **Review:** Compare the completed checklist with BG-04's stated outcome; identify uncovered behavior.
- [x] `BG-04.092` **Verification:** Run or inspect the focused proof required by BG-04; reuse a valid existing run rather than repeating it gratuitously.
- [x] `BG-04.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [x] `BG-04.094` **Integrity:** Check that BG-04 has not weakened its stated data, privacy, scope or recovery guarantees.
- [x] `BG-04.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [x] `BG-04.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [x] `BG-04.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [x] `BG-04.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [x] `BG-04.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [x] `BG-04.100` **Gate:** Check the parent completion boundary and record whether BG-05 is unlocked.

## BG-05 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#11-bg-05--close-priority-1-with-one-complete-gate).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-05 / 01 — Establish task context

- [x] `BG-05.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [x] `BG-05.002` **Dependency:** Verify BG-04's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [x] `BG-05.003` **Baseline:** Record the actual checkout or release candidate used for BG-05.
- [x] `BG-05.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [x] `BG-05.005` **Evidence:** Check whether existing evidence already satisfies any BG-05 step; reference it instead of manufacturing work.
- [x] `BG-05.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [x] `BG-05.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [x] `BG-05.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [x] `BG-05.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [x] `BG-05.010` **Tracking:** Open a BG-05 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-05 / 02 — Candidate identity

- [x] `BG-05.011` Record verification candidate SHA.
- [x] `BG-05.012` Confirm intended worktree state.
- [x] `BG-05.013` Confirm Node 22 selected.
- [x] `BG-05.014` Record dependency lockfile identity.
- [x] `BG-05.015` Confirm no unrelated source edits.
- [x] `BG-05.016` Confirm baseline fixes included.
- [x] `BG-05.017` Confirm smoke script revision.
- [x] `BG-05.018` Identify remaining application defects.
- [x] `BG-05.019` Separate expected reproductions from acceptance.
- [x] `BG-05.020` Create candidate gate record.

#### BG-05 / 03 — Formatting and lint

- [x] `BG-05.021` Run repository formatting check.
- [x] `BG-05.022` Capture actual command exit.
- [x] `BG-05.023` Inspect formatting failures if any.
- [x] `BG-05.024` Fix only task-owned formatting.
- [x] `BG-05.025` Run root lint command.
- [x] `BG-05.026` Inspect lint failures if any.
- [x] `BG-05.027` Avoid disabling relevant rules.
- [x] `BG-05.028` Confirm generated files unchanged.
- [x] `BG-05.029` Save compact lint results.
- [x] `BG-05.030` Record successful source revision.

#### BG-05 / 04 — Type contracts

- [x] `BG-05.031` Run root TypeScript check.
- [x] `BG-05.032` Inspect first type failure.
- [x] `BG-05.033` Resolve real contract mismatch.
- [x] `BG-05.034` Run shared contracts check.
- [x] `BG-05.035` Inspect API field compatibility.
- [x] `BG-05.036` Check Web import compatibility.
- [x] `BG-05.037` Verify no unsafe cast workaround.
- [x] `BG-05.038` Check generated binding compatibility.
- [x] `BG-05.039` Record contract check output.
- [x] `BG-05.040` Reconfirm candidate identity.

#### BG-05 / 05 — Automated suites

- [x] `BG-05.041` Run Node test suite.
- [x] `BG-05.042` Record Node file count.
- [x] `BG-05.043` Record Node test count.
- [x] `BG-05.044` Run Worker D1 suite.
- [x] `BG-05.045` Confirm dated usage regression passes.
- [x] `BG-05.046` Record D1 file count.
- [x] `BG-05.047` Record D1 test count.
- [x] `BG-05.048` Run Web test suite.
- [x] `BG-05.049` Record Web test count.
- [x] `BG-05.050` Report skipped tests separately.

#### BG-05 / 06 — Migration evidence

- [x] `BG-05.051` Choose empty local state.
- [x] `BG-05.052` List migration files in order.
- [x] `BG-05.053` Apply complete migration chain.
- [x] `BG-05.054` Check command exit status.
- [x] `BG-05.055` Read applied migration ledger.
- [x] `BG-05.056` Compare expected migration count.
- [x] `BG-05.057` Run foreign-key validation where supported.
- [x] `BG-05.058` Verify essential tables exist.
- [x] `BG-05.059` Verify FTS index exists.
- [x] `BG-05.060` Save fresh-migration evidence.

#### BG-05 / 07 — Artifact evidence

- [x] `BG-05.061` Build Web production assets.
- [x] `BG-05.062` Record build outcome.
- [x] `BG-05.063` Check artifact directory contents.
- [x] `BG-05.064` Run Worker deployment dry run.
- [x] `BG-05.065` Record bundle outcome.
- [x] `BG-05.066` Verify no deployment occurred.
- [x] `BG-05.067` Check binding names safely.
- [x] `BG-05.068` Record toolchain versions.
- [x] `BG-05.069` Associate artifacts with SHA.
- [x] `BG-05.070` Note later hosting work boundary.

#### BG-05 / 08 — Smoke evidence

- [x] `BG-05.071` Start isolated API state.
- [x] `BG-05.072` Run corrected smoke verifier.
- [x] `BG-05.073` Confirm supported stages complete.
- [x] `BG-05.074` Preserve nonzero failures honestly.
- [x] `BG-05.075` Record duplicate/replay result.
- [x] `BG-05.076` Record privacy sequence result.
- [x] `BG-05.077` Record attachment byte result.
- [x] `BG-05.078` Separate known browser-download reproduction.
- [x] `BG-05.079` Separate known URL-processing reproduction.
- [x] `BG-05.080` Shut down owned smoke processes.

#### BG-05 / 09 — Gate reconciliation

- [x] `BG-05.081` Compare all required commands.
- [x] `BG-05.082` Identify any missing check.
- [x] `BG-05.083` Rerun only unresolved check.
- [x] `BG-05.084` Reject unrelated passing substitutions.
- [x] `BG-05.085` Confirm no expected unit failure.
- [x] `BG-05.086` Confirm smoke limitation labels.
- [x] `BG-05.087` Record gate date and timezone.
- [x] `BG-05.088` Summarize remaining Priority 2 work.
- [x] `BG-05.089` Save one candidate evidence index.
- [x] `BG-05.090` Prepare Priority 1 completion decision.

#### BG-05 / 10 — Verify and close this task

- [x] `BG-05.091` **Review:** Compare the completed checklist with BG-05's stated outcome; identify uncovered behavior.
- [x] `BG-05.092` **Verification:** Run or inspect the focused proof required by BG-05; reuse a valid existing run rather than repeating it gratuitously.
- [x] `BG-05.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [x] `BG-05.094` **Integrity:** Check that BG-05 has not weakened its stated data, privacy, scope or recovery guarantees.
- [x] `BG-05.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [x] `BG-05.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [x] `BG-05.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [x] `BG-05.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [x] `BG-05.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [x] `BG-05.100` **Gate:** Check the parent completion boundary and record whether BG-06 is unlocked.

## BG-06 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#12-bg-06--define-who-may-read-an-attachment).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-06 / 01 — Establish task context

- [x] `BG-06.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [x] `BG-06.002` **Dependency:** Verify BG-05's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [x] `BG-06.003` **Baseline:** Record the actual checkout or release candidate used for BG-06.
- [x] `BG-06.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [x] `BG-06.005` **Evidence:** Check whether existing evidence already satisfies any BG-06 step; reference it instead of manufacturing work.
- [x] `BG-06.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [x] `BG-06.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [x] `BG-06.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [x] `BG-06.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [x] `BG-06.010` **Tracking:** Open a BG-06 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-06 / 02 — Middleware mapping

- [x] `BG-06.011` Locate attachment router creation.
- [x] `BG-06.012` Read wildcard attachment guard.
- [x] `BG-06.013` Read wildcard upload guard.
- [x] `BG-06.014` Read content route registration.
- [x] `BG-06.015` Read deletion second guard.
- [x] `BG-06.016` Read usage second guard.
- [x] `BG-06.017` Trace cookie validation helper.
- [x] `BG-06.018` Trace bearer validation helper.
- [x] `BG-06.019` Record actual middleware order.
- [x] `BG-06.020` Identify rejection before content lookup.

#### BG-06 / 03 — Permission inventory

- [x] `BG-06.021` List anonymous content request.
- [x] `BG-06.022` List invalid bearer request.
- [x] `BG-06.023` List capture bearer request.
- [x] `BG-06.024` List admin bearer request.
- [x] `BG-06.025` List admin cookie request.
- [x] `BG-06.026` List local-worker token request.
- [x] `BG-06.027` List expired cookie request.
- [x] `BG-06.028` List tampered cookie request.
- [x] `BG-06.029` List mixed cookie/header request.
- [x] `BG-06.030` Assign expected permission per identity.

#### BG-06 / 04 — Read boundary

- [x] `BG-06.031` Separate content reads from writes.
- [x] `BG-06.032` Identify intended attachment statuses.
- [x] `BG-06.033` Identify purged attachment handling.
- [x] `BG-06.034` Identify unlinked attachment handling.
- [x] `BG-06.035` Identify missing object behavior.
- [x] `BG-06.036` Keep object keys server-owned.
- [x] `BG-06.037` Preserve canonical ownership checks.
- [x] `BG-06.038` Specify safe error disclosure.
- [x] `BG-06.039` Specify private response caching.
- [x] `BG-06.040` Record content-read contract.

#### BG-06 / 05 — Credential precedence

- [x] `BG-06.041` Inspect existing precedence behavior.
- [x] `BG-06.042` Choose valid-cookie mixed-header rule.
- [x] `BG-06.043` Choose invalid-cookie valid-bearer rule.
- [x] `BG-06.044` Choose wrong-scope header behavior.
- [x] `BG-06.045` Preserve constant-time comparison helper.
- [x] `BG-06.046` Preserve signed-cookie verification helper.
- [x] `BG-06.047` Avoid client-supplied role trust.
- [x] `BG-06.048` Avoid raw token query parameters.
- [x] `BG-06.049` Avoid duplicated cryptographic code.
- [x] `BG-06.050` Document mixed-identity outcomes.

#### BG-06 / 06 — Guard design

- [x] `BG-06.051` Choose route-specific read guard.
- [x] `BG-06.052` Name guard by capability.
- [x] `BG-06.053` Define accepted credential forms.
- [x] `BG-06.054` Leave upload expansion separate.
- [x] `BG-06.055` Keep destructive admin guard.
- [x] `BG-06.056` Remove only conflicting path guard.
- [x] `BG-06.057` Ensure correct registration order.
- [x] `BG-06.058` Preserve existing error vocabulary.
- [x] `BG-06.059` Keep local-worker scope narrow.
- [x] `BG-06.060` Review route-by-route authorization change.

#### BG-06 / 07 — Positive fixtures

- [x] `BG-06.061` Create linked attachment fixture.
- [x] `BG-06.062` Issue capture bearer content request.
- [x] `BG-06.063` Assert allowed baseline access.
- [x] `BG-06.064` Issue admin bearer content request.
- [x] `BG-06.065` Assert admin access.
- [x] `BG-06.066` Create signed admin cookie.
- [x] `BG-06.067` Issue cookie-only content request.
- [x] `BG-06.068` Assert cookie reaches lookup.
- [x] `BG-06.069` Verify exact attachment selected.
- [x] `BG-06.070` Verify correct object bytes returned.

#### BG-06 / 08 — Negative fixtures

- [x] `BG-06.071` Request content anonymously.
- [x] `BG-06.072` Request content with invalid token.
- [x] `BG-06.073` Request content with worker token.
- [x] `BG-06.074` Request content with expired cookie.
- [x] `BG-06.075` Request content with tampered cookie.
- [x] `BG-06.076` Assert each required denial.
- [x] `BG-06.077` Request admin deletion with capture token.
- [x] `BG-06.078` Confirm deletion stays denied.
- [x] `BG-06.079` Check missing object after authorization.
- [x] `BG-06.080` Confirm no unintended object exposure.

#### BG-06 / 09 — Contract closure

- [x] `BG-06.081` Run focused auth route checks.
- [x] `BG-06.082` Run attachment route checks.
- [x] `BG-06.083` Check mixed-identity matrix.
- [x] `BG-06.084` Compare existing capture permissions.
- [x] `BG-06.085` Compare existing deletion permissions.
- [x] `BG-06.086` Record middleware ordering evidence.
- [x] `BG-06.087` Record unresolved status policy choices.
- [x] `BG-06.088` Link matrix to source locations.
- [x] `BG-06.089` Identify browser proof prerequisite.
- [x] `BG-06.090` Freeze read-authorization decision.

#### BG-06 / 10 — Verify and close this task

- [x] `BG-06.091` **Review:** Compare the completed checklist with BG-06's stated outcome; identify uncovered behavior.
- [x] `BG-06.092` **Verification:** Run or inspect the focused proof required by BG-06; reuse a valid existing run rather than repeating it gratuitously.
- [x] `BG-06.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [x] `BG-06.094` **Integrity:** Check that BG-06 has not weakened its stated data, privacy, scope or recovery guarantees.
- [x] `BG-06.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [x] `BG-06.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [x] `BG-06.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [x] `BG-06.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [x] `BG-06.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [x] `BG-06.100` **Gate:** Check the parent completion boundary and record whether BG-07 is unlocked.

## BG-07 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#13-bg-07--make-the-browser-download-link-work).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-07 / 01 — Establish task context

- [x] `BG-07.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [x] `BG-07.002` **Dependency:** Verify BG-06's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [x] `BG-07.003` **Baseline:** Record the actual checkout or release candidate used for BG-07.
- [x] `BG-07.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [x] `BG-07.005` **Evidence:** Check whether existing evidence already satisfies any BG-07 step; reference it instead of manufacturing work.
- [x] `BG-07.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [x] `BG-07.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [x] `BG-07.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [x] `BG-07.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [x] `BG-07.010` **Tracking:** Open a BG-07 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-07 / 02 — Route integration

- [x] `BG-07.011` Apply approved content guard.
- [x] `BG-07.012` Remove conflicting wildcard interception.
- [x] `BG-07.013` Preserve upload guard behavior.
- [x] `BG-07.014` Preserve deletion admin check.
- [x] `BG-07.015` Keep attachment ID lookup.
- [x] `BG-07.016` Keep private object binding.
- [x] `BG-07.017` Preserve lifecycle rejection rules.
- [x] `BG-07.018` Preserve error envelope shape.
- [x] `BG-07.019` Inspect route registration result.
- [x] `BG-07.020` Run focused cookie route test.

#### BG-07 / 03 — Response metadata

- [x] `BG-07.021` Read stored content type.
- [x] `BG-07.022` Validate safe response MIME.
- [x] `BG-07.023` Read stored filename.
- [x] `BG-07.024` Sanitize header-sensitive filename characters.
- [x] `BG-07.025` Set intended content disposition.
- [x] `BG-07.026` Preserve correct byte length.
- [x] `BG-07.027` Avoid user-controlled object keys.
- [x] `BG-07.028` Inspect download response headers.
- [x] `BG-07.029` Verify Unicode filename handling.
- [x] `BG-07.030` Verify missing metadata fails safely.

#### BG-07 / 04 — Private caching

- [x] `BG-07.031` Inspect existing cache headers.
- [x] `BG-07.032` Choose authenticated cache behavior.
- [x] `BG-07.033` Prevent public shared caching.
- [x] `BG-07.034` Check proxy cache interaction.
- [x] `BG-07.035` Avoid token-bearing cache keys.
- [x] `BG-07.036` Request content after logout.
- [x] `BG-07.037` Check anonymous response independence.
- [x] `BG-07.038` Check different attachment responses.
- [x] `BG-07.039` Verify no cached private replay.
- [x] `BG-07.040` Record response caching policy.

#### BG-07 / 05 — Browser session

- [x] `BG-07.041` Start actual Web application.
- [x] `BG-07.042` Open real login form.
- [x] `BG-07.043` Submit dummy admin credential.
- [x] `BG-07.044` Verify signed session cookie created.
- [x] `BG-07.045` Avoid direct token injection.
- [x] `BG-07.046` Navigate to attachment item.
- [x] `BG-07.047` Locate actual Download link.
- [x] `BG-07.048` Follow same-origin link.
- [x] `BG-07.049` Capture download outcome.
- [x] `BG-07.050` Verify no authentication error page.

#### BG-07 / 06 — Byte proof

- [x] `BG-07.051` Download valid PDF fixture.
- [x] `BG-07.052` Measure downloaded PDF size.
- [x] `BG-07.053` Compare PDF SHA-256.
- [x] `BG-07.054` Download image fixture.
- [x] `BG-07.055` Measure downloaded image size.
- [x] `BG-07.056` Compare image SHA-256.
- [x] `BG-07.057` Download supported generic file.
- [x] `BG-07.058` Compare generic file bytes.
- [x] `BG-07.059` Verify filename matches safe expectation.
- [x] `BG-07.060` Preserve original upload fixtures.

#### BG-07 / 07 — Session lifecycle

- [x] `BG-07.061` Reload attachment detail page.
- [x] `BG-07.062` Confirm session remains valid.
- [x] `BG-07.063` Download again after reload.
- [x] `BG-07.064` Log out through UI.
- [x] `BG-07.065` Repeat private download request.
- [x] `BG-07.066` Confirm new request denied.
- [x] `BG-07.067` Try tampered session cookie.
- [x] `BG-07.068` Confirm tampered request denied.
- [x] `BG-07.069` Try expired session cookie.
- [x] `BG-07.070` Confirm expired request denied.

#### BG-07 / 08 — Object lifecycle

- [x] `BG-07.071` Request missing attachment ID.
- [x] `BG-07.072` Verify controlled missing response.
- [x] `BG-07.073` Request purged attachment fixture.
- [x] `BG-07.074` Verify purged bytes unavailable.
- [x] `BG-07.075` Request disallowed unlinked fixture.
- [x] `BG-07.076` Verify lifecycle policy enforced.
- [x] `BG-07.077` Check traversal-shaped attachment ID.
- [x] `BG-07.078` Check unsafe filename fixture.
- [x] `BG-07.079` Verify no bucket URL leaked.
- [x] `BG-07.080` Verify raw credentials never exposed.

#### BG-07 / 09 — Regression evidence

- [x] `BG-07.081` Add cookie-authenticated download case.
- [x] `BG-07.082` Retain bearer download case.
- [x] `BG-07.083` Retain anonymous denial case.
- [x] `BG-07.084` Retain byte-equality assertion.
- [x] `BG-07.085` Run attachment suite.
- [x] `BG-07.086` Run browser download story.
- [x] `BG-07.087` Check PDF opens correctly.
- [x] `BG-07.088` Check image opens correctly.
- [x] `BG-07.089` Save safe response/hash evidence.
- [x] `BG-07.090` Record original bug resolution.

#### BG-07 / 10 — Verify and close this task

- [x] `BG-07.091` **Review:** Compare the completed checklist with BG-07's stated outcome; identify uncovered behavior.
- [x] `BG-07.092` **Verification:** Run or inspect the focused proof required by BG-07; reuse a valid existing run rather than repeating it gratuitously.
- [x] `BG-07.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [x] `BG-07.094` **Integrity:** Check that BG-07 has not weakened its stated data, privacy, scope or recovery guarantees.
- [x] `BG-07.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [x] `BG-07.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [x] `BG-07.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [x] `BG-07.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [x] `BG-07.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [x] `BG-07.100` **Gate:** Check the parent completion boundary and record whether BG-08 is unlocked.

## BG-08 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#14-bg-08--define-honest-url-acquisition-and-coverage).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

**BG-08 final reconciliation:** BG-08.001 through BG-08.100 are satisfied.
The URL acquisition contract merged through PR #45 at
`877172dbc10d7ba9771a6913f0758adf0a02e2f9`. Final pre-merge CI #219 passed on
the evidence-complete implementation head, and merged-main CI #220 passed the full
repository gate. The source inspection, frozen contract, privacy/ADR/API/use-case
propagation, security review, and final verification record are in
[`BG-08_URL_ACQUISITION_CONTRACT.md`](verification/BG-08_URL_ACQUISITION_CONTRACT.md).
No BG-09 fetcher or BG-10 persistence implementation is claimed. BG-09 is now
unlocked by the proved BG-08 parent gate.

#### BG-08 / 01 — Establish task context

- [x] `BG-08.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [x] `BG-08.002` **Dependency:** Verify BG-07's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [x] `BG-08.003` **Baseline:** Record the actual checkout or release candidate used for BG-08.
- [x] `BG-08.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [x] `BG-08.005` **Evidence:** Check whether existing evidence already satisfies any BG-08 step; reference it instead of manufacturing work.
- [x] `BG-08.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [x] `BG-08.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [x] `BG-08.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [x] `BG-08.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [x] `BG-08.010` **Tracking:** Open a BG-08 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-08 / 02 — Source concepts

- [x] `BG-08.011` Identify submitted original URL.
- [x] `BG-08.012` Identify conservative canonical URL.
- [x] `BG-08.013` Identify redirect final URL.
- [x] `BG-08.014` Identify user-supplied text.
- [x] `BG-08.015` Identify fetched page text.
- [x] `BG-08.016` Identify fetched metadata.
- [x] `BG-08.017` Identify generated summary.
- [x] `BG-08.018` Identify capture event provenance.
- [x] `BG-08.019` Separate each field authority.
- [x] `BG-08.020` Document immutability boundaries.

#### BG-08 / 03 — Outcome vocabulary

- [x] `BG-08.021` List acquired-text outcome.
- [x] `BG-08.022` List metadata-only outcome.
- [x] `BG-08.023` List unavailable-page outcome.
- [x] `BG-08.024` List forbidden-destination outcome.
- [x] `BG-08.025` List login-required outcome.
- [x] `BG-08.026` List timeout outcome.
- [x] `BG-08.027` List unsupported-content outcome.
- [x] `BG-08.028` List empty-extraction outcome.
- [x] `BG-08.029` Compare existing coverage enums.
- [x] `BG-08.030` Propose only necessary new values.

#### BG-08 / 04 — Privacy contract

- [x] `BG-08.031` Read approved privacy matrix.
- [x] `BG-08.032` Distinguish fetching from AI.
- [x] `BG-08.033` Identify external host disclosure.
- [x] `BG-08.034` Define Public fetch eligibility.
- [x] `BG-08.035` Define Unknown URL retention.
- [x] `BG-08.036` Define Personal fetch behavior.
- [x] `BG-08.037` Define Sensitive fetch behavior.
- [x] `BG-08.038` Preserve no-unapproved-hosted-processing rule.
- [x] `BG-08.039` Record unresolved policy choice explicitly.
- [x] `BG-08.040` Confirm default does not become Public.

#### BG-08 / 05 — Content eligibility

- [x] `BG-08.041` Define usable acquired text.
- [x] `BG-08.042` Define usable supplied text.
- [x] `BG-08.043` Define metadata-only interpretation limit.
- [x] `BG-08.044` Define title-only summary limit.
- [x] `BG-08.045` Prevent imagined article content.
- [x] `BG-08.046` Preserve supplied reason separately.
- [x] `BG-08.047` Preserve source attribution.
- [x] `BG-08.048` Define empty input completion.
- [x] `BG-08.049` Define minimum enrichment evidence.
- [x] `BG-08.050` Document deterministic no-AI path.

#### BG-08 / 06 — Fetch budgets

- [x] `BG-08.051` Inventory existing runtime limits.
- [x] `BG-08.052` Propose wall-clock timeout.
- [x] `BG-08.053` Propose redirect count bound.
- [x] `BG-08.054` Propose response byte bound.
- [x] `BG-08.055` Propose extracted character bound.
- [x] `BG-08.056` Define compressed-body handling.
- [x] `BG-08.057` Define cancellation behavior.
- [x] `BG-08.058` Define parser content-type allowlist.
- [x] `BG-08.059` Label proposed values clearly.
- [x] `BG-08.060` Record measurement acceptance criteria.

#### BG-08 / 07 — Failure classification

- [x] `BG-08.061` Separate transient network failures.
- [x] `BG-08.062` Separate permanent destination denials.
- [x] `BG-08.063` Separate login-required outcomes.
- [x] `BG-08.064` Separate unsupported formats.
- [x] `BG-08.065` Separate empty successful responses.
- [x] `BG-08.066` Define safe error codes.
- [x] `BG-08.067` Define retryable outcome set.
- [x] `BG-08.068` Define maximum retry policy reference.
- [x] `BG-08.069` Define owner next actions.
- [x] `BG-08.070` Preserve Saved semantics throughout.

#### BG-08 / 08 — Instagram story

- [x] `BG-08.071` Define URL-only save example.
- [x] `BG-08.072` Preserve personal reason.
- [x] `BG-08.073` Show honest source coverage.
- [x] `BG-08.074` Avoid watched-video wording.
- [x] `BG-08.075` Avoid invented transcript wording.
- [x] `BG-08.076` Explain screenshot alternative.
- [x] `BG-08.077` Explain supplied-text alternative.
- [x] `BG-08.078` Preserve platform access boundaries.
- [x] `BG-08.079` Keep login bypass excluded.
- [x] `BG-08.080` Write expected owner-visible result.

#### BG-08 / 09 — Contract propagation

- [x] `BG-08.081` Map outcome to storage.
- [x] `BG-08.082` Map outcome to item detail.
- [x] `BG-08.083` Map outcome to FTS behavior.
- [x] `BG-08.084` Map outcome to job state.
- [x] `BG-08.085` Map outcome to retries.
- [x] `BG-08.086` Map outcome to export.
- [x] `BG-08.087` Map outcome to purge.
- [x] `BG-08.088` Map outcome to tests.
- [x] `BG-08.089` Record approved versus proposed fields.
- [x] `BG-08.090` Prepare fetcher implementation contract.

#### BG-08 / 10 — Verify and close this task

- [x] `BG-08.091` **Review:** Compare the completed checklist with BG-08's stated outcome; identify uncovered behavior.
- [x] `BG-08.092` **Verification:** Run or inspect the focused proof required by BG-08; reuse a valid existing run rather than repeating it gratuitously.
- [x] `BG-08.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [x] `BG-08.094` **Integrity:** Check that BG-08 has not weakened its stated data, privacy, scope or recovery guarantees.
- [x] `BG-08.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [x] `BG-08.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [x] `BG-08.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [x] `BG-08.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [x] `BG-08.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [x] `BG-08.100` **Gate:** Check the parent completion boundary and record whether BG-09 is unlocked.

## BG-09 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#15-bg-09--build-a-bounded-source-fetcher).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

**BG-09 final reconciliation:** BG-09.001 through BG-09.100 are satisfied.
The bounded source fetcher merged through PR #49 at
`c46cc25fe61825a3c7137c88982f19c13b5c531c`. Pre-merge CI #245 passed on
`c167fa32fec36f56a8cc8da82befc693bc1c23ce`, and merged-main CI #246 passed
the complete repository gate. Destination admission, strict-public Worker egress,
manual redirect validation, total deadline, parser-visible byte limit, extracted
character limit, safe MIME/parser behavior, failure normalization, credential
isolation, and controlled workerd regression proof are recorded in
[`BG-09_BOUNDED_SOURCE_FETCHER.md`](verification/BG-09_BOUNDED_SOURCE_FETCHER.md).
No BG-10 persistence/job-chain work, BG-11 recovery UX, or BG-12/BG-13 aggregate
state repair is claimed. BG-10 is now unlocked by the proved BG-09 parent gate.

#### BG-09 / 01 — Establish task context

- [x] `BG-09.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [x] `BG-09.002` **Dependency:** Verify BG-08's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [x] `BG-09.003` **Baseline:** Record the actual checkout or release candidate used for BG-09.
- [x] `BG-09.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [x] `BG-09.005` **Evidence:** Check whether existing evidence already satisfies any BG-09 step; reference it instead of manufacturing work.
- [x] `BG-09.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [x] `BG-09.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [x] `BG-09.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [x] `BG-09.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [x] `BG-09.010` **Tracking:** Open a BG-09 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-09 / 02 — URL admission

- [x] `BG-09.011` Parse with platform URL parser.
- [x] `BG-09.012` Reject unsupported URL schemes.
- [x] `BG-09.013` Reject embedded username.
- [x] `BG-09.014` Reject embedded password.
- [x] `BG-09.015` Normalize hostname representation.
- [x] `BG-09.016` Normalize IPv4 representations.
- [x] `BG-09.017` Normalize IPv6 representations.
- [x] `BG-09.018` Define allowed port policy.
- [x] `BG-09.019` Reject malformed destinations early.
- [x] `BG-09.020` Keep original URL evidence unchanged.

#### BG-09 / 03 — Destination protection

- [x] `BG-09.021` Block loopback destinations.
- [x] `BG-09.022` Block private network destinations.
- [x] `BG-09.023` Block link-local destinations.
- [x] `BG-09.024` Block metadata service destinations.
- [x] `BG-09.025` Check encoded host bypasses.
- [x] `BG-09.026` Check DNS-resolution enforcement mechanism.
- [x] `BG-09.027` Check rebinding resistance.
- [x] `BG-09.028` Validate actual runtime egress behavior.
- [x] `BG-09.029` Choose constrained fallback if needed.
- [x] `BG-09.030` Document unsupported safety guarantees.

#### BG-09 / 04 — Redirect handling

- [x] `BG-09.031` Disable automatic unchecked redirects.
- [x] `BG-09.032` Read redirect Location safely.
- [x] `BG-09.033` Resolve relative redirect targets.
- [x] `BG-09.034` Validate every target independently.
- [x] `BG-09.035` Increment bounded redirect counter.
- [x] `BG-09.036` Detect redirect loop.
- [x] `BG-09.037` Reject forbidden redirected schemes.
- [x] `BG-09.038` Strip application authentication headers.
- [x] `BG-09.039` Preserve total request deadline.
- [x] `BG-09.040` Record final URL as derived evidence.

#### BG-09 / 05 — Time and byte limits

- [x] `BG-09.041` Start total deadline timer.
- [x] `BG-09.042` Apply per-operation cancellation.
- [x] `BG-09.043` Bound response stream bytes.
- [x] `BG-09.044` Validate advertised content length.
- [x] `BG-09.045` Handle missing content length.
- [x] `BG-09.046` Stop oversized chunked response.
- [x] `BG-09.047` Consider decompression expansion.
- [x] `BG-09.048` Bound parser input size.
- [x] `BG-09.049` Bound extracted output characters.
- [x] `BG-09.050` Cancel network work on rejection.

#### BG-09 / 06 — Response admission

- [x] `BG-09.051` Inspect HTTP status class.
- [x] `BG-09.052` Classify transient upstream status.
- [x] `BG-09.053` Classify inaccessible page status.
- [x] `BG-09.054` Inspect response content type.
- [x] `BG-09.055` Accept intended HTML/text formats.
- [x] `BG-09.056` Reject unintended binary parsing.
- [x] `BG-09.057` Detect login-only content fixture.
- [x] `BG-09.058` Detect empty response fixture.
- [x] `BG-09.059` Preserve safe response metadata.
- [x] `BG-09.060` Avoid retaining unnecessary headers.

#### BG-09 / 07 — Parser integration

- [x] `BG-09.061` Select runtime-compatible parser candidate.
- [x] `BG-09.062` Build parser trial bundle.
- [x] `BG-09.063` Run parser in workerd.
- [x] `BG-09.064` Remove script content.
- [x] `BG-09.065` Remove style content.
- [x] `BG-09.066` Reduce navigation boilerplate.
- [x] `BG-09.067` Extract safe title metadata.
- [x] `BG-09.068` Extract readable body text.
- [x] `BG-09.069` Preserve source provenance.
- [x] `BG-09.070` Avoid executing page JavaScript.

#### BG-09 / 08 — Error and privacy handling

- [x] `BG-09.071` Normalize timeout outcome.
- [x] `BG-09.072` Normalize oversized outcome.
- [x] `BG-09.073` Normalize parser failure outcome.
- [x] `BG-09.074` Normalize unsupported format outcome.
- [x] `BG-09.075` Normalize forbidden destination outcome.
- [x] `BG-09.076` Limit safe diagnostic details.
- [x] `BG-09.077` Redact signed query values.
- [x] `BG-09.078` Exclude credentials from outbound headers.
- [x] `BG-09.079` Treat page instructions as data.
- [x] `BG-09.080` Preserve capture after every failure.

#### BG-09 / 09 — Fetcher regression

- [x] `BG-09.081` Test normal page extraction.
- [x] `BG-09.082` Test relative redirect chain.
- [x] `BG-09.083` Test redirect loop rejection.
- [x] `BG-09.084` Test private target rejection.
- [x] `BG-09.085` Test misleading MIME rejection.
- [x] `BG-09.086` Test chunked overflow cancellation.
- [x] `BG-09.087` Test timeout cancellation.
- [x] `BG-09.088` Test malformed HTML handling.
- [x] `BG-09.089` Assert no secret reaches fetch.
- [x] `BG-09.090` Record runtime boundary evidence.

#### BG-09 / 10 — Verify and close this task

- [x] `BG-09.091` **Review:** Compare the completed checklist with BG-09's stated outcome; identify uncovered behavior.
- [x] `BG-09.092` **Verification:** Run or inspect the focused proof required by BG-09; reuse a valid existing run rather than repeating it gratuitously.
- [x] `BG-09.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [x] `BG-09.094` **Integrity:** Check that BG-09 has not weakened its stated data, privacy, scope or recovery guarantees.
- [x] `BG-09.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [x] `BG-09.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [x] `BG-09.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [x] `BG-09.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [x] `BG-09.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [x] `BG-09.100` **Gate:** Check the parent completion boundary and record whether BG-10 is unlocked.

## BG-10 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#16-bg-10--persist-url-evidence-and-chain-processing-safely).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-10 / 01 — Establish task context

- [ ] `BG-10.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [ ] `BG-10.002` **Dependency:** Verify BG-09's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [ ] `BG-10.003` **Baseline:** Record the actual checkout or release candidate used for BG-10.
- [ ] `BG-10.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [ ] `BG-10.005` **Evidence:** Check whether existing evidence already satisfies any BG-10 step; reference it instead of manufacturing work.
- [ ] `BG-10.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [ ] `BG-10.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [ ] `BG-10.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [ ] `BG-10.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [ ] `BG-10.010` **Tracking:** Open a BG-10 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-10 / 02 — Evidence schema

- [ ] `BG-10.011` Inspect attachment extraction constraints.
- [ ] `BG-10.012` Reject fake attachment workaround.
- [ ] `BG-10.013` Choose additive URL evidence shape.
- [ ] `BG-10.014` Define item ownership reference.
- [ ] `BG-10.015` Define source revision identity.
- [ ] `BG-10.016` Define fetch timestamp field.
- [ ] `BG-10.017` Define requested/final URL fields.
- [ ] `BG-10.018` Define parser version fields.
- [ ] `BG-10.019` Define outcome/coverage fields.
- [ ] `BG-10.020` Define content hash field.

#### BG-10 / 03 — Migration design

- [ ] `BG-10.021` Find next available migration number.
- [ ] `BG-10.022` Define text storage bounds.
- [ ] `BG-10.023` Define metadata storage fields.
- [ ] `BG-10.024` Add required foreign key.
- [ ] `BG-10.025` Add item lookup index.
- [ ] `BG-10.026` Define current evidence uniqueness.
- [ ] `BG-10.027` Preserve old attachment schema.
- [ ] `BG-10.028` Apply on fresh local database.
- [ ] `BG-10.029` Apply on populated prior database.
- [ ] `BG-10.030` Verify preserved source rows.

#### BG-10 / 04 — Job creation

- [ ] `BG-10.031` Locate capture scheduling branch.
- [ ] `BG-10.032` Add eligible URL acquisition job.
- [ ] `BG-10.033` Preserve raw-first response path.
- [ ] `BG-10.034` Reuse durable job repository.
- [ ] `BG-10.035` Preserve stable job identity.
- [ ] `BG-10.036` Carry privacy snapshot.
- [ ] `BG-10.037` Carry source revision.
- [ ] `BG-10.038` Exclude deleted capture targets.
- [ ] `BG-10.039` Avoid untracked background task.
- [ ] `BG-10.040` Verify duplicate share scheduling behavior.

#### BG-10 / 05 — Lease execution

- [ ] `BG-10.041` Lease through existing service.
- [ ] `BG-10.042` Check current owner identity.
- [ ] `BG-10.043` Check lease validity.
- [ ] `BG-10.044` Check current item deletion.
- [ ] `BG-10.045` Check purge freeze state.
- [ ] `BG-10.046` Check current privacy eligibility.
- [ ] `BG-10.047` Fetch eligible source only.
- [ ] `BG-10.048` Recheck eligibility before result.
- [ ] `BG-10.049` Reject superseded source revision.
- [ ] `BG-10.050` Avoid holding database transaction during fetch.

#### BG-10 / 06 — Result persistence

- [ ] `BG-10.051` Validate acquisition result shape.
- [ ] `BG-10.052` Persist immutable source evidence.
- [ ] `BG-10.053` Select accepted current evidence.
- [ ] `BG-10.054` Create eligible enrichment job atomically.
- [ ] `BG-10.055` Avoid duplicate downstream job.
- [ ] `BG-10.056` Persist safe limited outcome.
- [ ] `BG-10.057` Clear completed lease correctly.
- [ ] `BG-10.058` Preserve source capture fields.
- [ ] `BG-10.059` Record bounded audit event.
- [ ] `BG-10.060` Verify crash-replay convergence.

#### BG-10 / 07 — Enrichment and detail

- [ ] `BG-10.061` Read URL evidence explicitly.
- [ ] `BG-10.062` Combine only approved evidence.
- [ ] `BG-10.063` Preserve user-supplied reason.
- [ ] `BG-10.064` Preserve owner override priority.
- [ ] `BG-10.065` Keep generated fields separate.
- [ ] `BG-10.066` Expose current coverage in detail.
- [ ] `BG-10.067` Expose acquired text safely.
- [ ] `BG-10.068` Expose safe acquisition error.
- [ ] `BG-10.069` Preserve attachment detail compatibility.
- [ ] `BG-10.070` Escape rendered source text.

#### BG-10 / 08 — Search integration

- [ ] `BG-10.071` Identify FTS indexed fields.
- [ ] `BG-10.072` Add acquired source text projection.
- [ ] `BG-10.073` Update synchronization path.
- [ ] `BG-10.074` Update rebuild script if required.
- [ ] `BG-10.075` Test internal phrase retrieval.
- [ ] `BG-10.076` Test AI-disabled retrieval.
- [ ] `BG-10.077` Test evidence replacement removes stale terms.
- [ ] `BG-10.078` Test deletion removes searchable terms.
- [ ] `BG-10.079` Test restore recovers searchable terms.
- [ ] `BG-10.080` Inspect query-plan behavior.

#### BG-10 / 09 — Recovery integration

- [ ] `BG-10.081` Add URL evidence to export.
- [ ] `BG-10.082` Add evidence validation on restore.
- [ ] `BG-10.083` Restore ownership references.
- [ ] `BG-10.084` Apply newer purge receipts first.
- [ ] `BG-10.085` Delete URL evidence during purge.
- [ ] `BG-10.086` Add evidence integrity checks.
- [ ] `BG-10.087` Test crash after evidence write.
- [ ] `BG-10.088` Test duplicate result submission.
- [ ] `BG-10.089` Test clean-target round trip.
- [ ] `BG-10.090` Record complete acquisition chain proof.

#### BG-10 / 10 — Verify and close this task

- [ ] `BG-10.091` **Review:** Compare the completed checklist with BG-10's stated outcome; identify uncovered behavior.
- [ ] `BG-10.092` **Verification:** Run or inspect the focused proof required by BG-10; reuse a valid existing run rather than repeating it gratuitously.
- [ ] `BG-10.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [ ] `BG-10.094` **Integrity:** Check that BG-10 has not weakened its stated data, privacy, scope or recovery guarantees.
- [ ] `BG-10.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [ ] `BG-10.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [ ] `BG-10.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [ ] `BG-10.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [ ] `BG-10.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [ ] `BG-10.100` **Gate:** Check the parent completion boundary and record whether BG-11 is unlocked.

## BG-11 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#17-bg-11--handle-unavailable-urls-retries-and-old-captures).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-11 / 01 — Establish task context

- [ ] `BG-11.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [ ] `BG-11.002` **Dependency:** Verify BG-10's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [ ] `BG-11.003` **Baseline:** Record the actual checkout or release candidate used for BG-11.
- [ ] `BG-11.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [ ] `BG-11.005` **Evidence:** Check whether existing evidence already satisfies any BG-11 step; reference it instead of manufacturing work.
- [ ] `BG-11.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [ ] `BG-11.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [ ] `BG-11.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [ ] `BG-11.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [ ] `BG-11.010` **Tracking:** Open a BG-11 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-11 / 02 — Outcome mapping

- [ ] `BG-11.011` Read approved URL outcomes.
- [ ] `BG-11.012` Classify temporary DNS failure.
- [ ] `BG-11.013` Classify connection timeout.
- [ ] `BG-11.014` Classify upstream server failure.
- [ ] `BG-11.015` Classify missing page.
- [ ] `BG-11.016` Classify login-required page.
- [ ] `BG-11.017` Classify unsupported media.
- [ ] `BG-11.018` Classify destination policy denial.
- [ ] `BG-11.019` Classify empty usable content.
- [ ] `BG-11.020` Map each to retry policy.

#### BG-11 / 03 — Limited completion

- [ ] `BG-11.021` Preserve canonical URL item.
- [ ] `BG-11.022` Preserve original capture event.
- [ ] `BG-11.023` Preserve supplied reason.
- [ ] `BG-11.024` Save limited coverage outcome.
- [ ] `BG-11.025` Prevent invented source text.
- [ ] `BG-11.026` Prevent invented transcript.
- [ ] `BG-11.027` Avoid unnecessary enrichment job.
- [ ] `BG-11.028` Apply approved aggregate status.
- [ ] `BG-11.029` Expose safe limitation code.
- [ ] `BG-11.030` Verify bookmark remains searchable.

#### BG-11 / 04 — Automatic retries

- [ ] `BG-11.031` Read current retry bounds.
- [ ] `BG-11.032` Reuse existing backoff helper.
- [ ] `BG-11.033` Honor server retry timing.
- [ ] `BG-11.034` Preserve maximum attempt accounting.
- [ ] `BG-11.035` Avoid retrying unchanged login page.
- [ ] `BG-11.036` Avoid retrying forbidden destination.
- [ ] `BG-11.037` Retry eligible transient failure.
- [ ] `BG-11.038` Release lease on deferral.
- [ ] `BG-11.039` Keep raw retrieval available.
- [ ] `BG-11.040` Verify eventual terminal outcome.

#### BG-11 / 05 — Manual retry

- [ ] `BG-11.041` Inspect existing retry eligibility.
- [ ] `BG-11.042` Recheck current privacy.
- [ ] `BG-11.043` Recheck item deletion.
- [ ] `BG-11.044` Recheck purge freeze.
- [ ] `BG-11.045` Recheck acquisition destination.
- [ ] `BG-11.046` Recheck relevant capacity guard.
- [ ] `BG-11.047` Reject stale generation retry.
- [ ] `BG-11.048` Preserve bounded manual retry count.
- [ ] `BG-11.049` Return specific rejection reason.
- [ ] `BG-11.050` Verify eligible retry schedules one job.

#### BG-11 / 06 — Supplied evidence

- [ ] `BG-11.051` Define adding-text entry point.
- [ ] `BG-11.052` Validate supplied text length.
- [ ] `BG-11.053` Preserve supplied text provenance.
- [ ] `BG-11.054` Distinguish supplied from fetched text.
- [ ] `BG-11.055` Create new relevant processing generation.
- [ ] `BG-11.056` Preserve older source history.
- [ ] `BG-11.057` Avoid rewriting original share event.
- [ ] `BG-11.058` Preserve owner summary override.
- [ ] `BG-11.059` Update searchable evidence.
- [ ] `BG-11.060` Show truthful new coverage.

#### BG-11 / 07 — Old-item reprocessing

- [ ] `BG-11.061` Query candidate bare-URL failures.
- [ ] `BG-11.062` Preview candidate count.
- [ ] `BG-11.063` Preview safe candidate identifiers.
- [ ] `BG-11.064` Exclude deleted candidates.
- [ ] `BG-11.065` Exclude private ineligible candidates.
- [ ] `BG-11.066` Exclude active purge candidates.
- [ ] `BG-11.067` Bound reprocess batch size.
- [ ] `BG-11.068` Avoid auto-fetch on deployment.
- [ ] `BG-11.069` Resume batch without duplicates.
- [ ] `BG-11.070` Record per-item outcomes.

#### BG-11 / 08 — Source replacement races

- [ ] `BG-11.071` Hash newly acquired content.
- [ ] `BG-11.072` Compare prior accepted hash.
- [ ] `BG-11.073` Identify source revision change.
- [ ] `BG-11.074` Preserve old fetch timestamp.
- [ ] `BG-11.075` Define current evidence selection.
- [ ] `BG-11.076` Reject late superseded fetch.
- [ ] `BG-11.077` Avoid stale term reintroduction.
- [ ] `BG-11.078` Avoid duplicate enrichment generation.
- [ ] `BG-11.079` Preserve canonical duplicate ownership.
- [ ] `BG-11.080` Test overlapping re-fetch completion.

#### BG-11 / 09 — Owner experience

- [ ] `BG-11.081` Write login-required message.
- [ ] `BG-11.082` Write unavailable-source message.
- [ ] `BG-11.083` Write transient retry message.
- [ ] `BG-11.084` Show original source link.
- [ ] `BG-11.085` Show next eligible retry time.
- [ ] `BG-11.086` Hide meaningless Retry control.
- [ ] `BG-11.087` Explain supplying screenshot/text.
- [ ] `BG-11.088` Verify keyboard-accessible next action.
- [ ] `BG-11.089` Test recoverable failure then success.
- [ ] `BG-11.090` Record URL-only acceptance evidence.

#### BG-11 / 10 — Verify and close this task

- [ ] `BG-11.091` **Review:** Compare the completed checklist with BG-11's stated outcome; identify uncovered behavior.
- [ ] `BG-11.092` **Verification:** Run or inspect the focused proof required by BG-11; reuse a valid existing run rather than repeating it gratuitously.
- [ ] `BG-11.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [ ] `BG-11.094` **Integrity:** Check that BG-11 has not weakened its stated data, privacy, scope or recovery guarantees.
- [ ] `BG-11.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [ ] `BG-11.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [ ] `BG-11.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [ ] `BG-11.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [ ] `BG-11.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [ ] `BG-11.100` **Gate:** Check the parent completion boundary and record whether BG-12 is unlocked.

## BG-12 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#18-bg-12--define-one-aggregate-processing-state-rule).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-12 / 01 — Establish task context

- [ ] `BG-12.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [ ] `BG-12.002` **Dependency:** Verify BG-11's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [ ] `BG-12.003` **Baseline:** Record the actual checkout or release candidate used for BG-12.
- [ ] `BG-12.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [ ] `BG-12.005` **Evidence:** Check whether existing evidence already satisfies any BG-12 step; reference it instead of manufacturing work.
- [ ] `BG-12.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [ ] `BG-12.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [ ] `BG-12.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [ ] `BG-12.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [ ] `BG-12.010` **Tracking:** Open a BG-12 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-12 / 02 — State inventory

- [ ] `BG-12.011` Find item status writers.
- [ ] `BG-12.012` Find job status writers.
- [ ] `BG-12.013` Find extraction completion writers.
- [ ] `BG-12.014` Find enrichment completion writers.
- [ ] `BG-12.015` Find privacy reprocessing writers.
- [ ] `BG-12.016` Find manual retry writers.
- [ ] `BG-12.017` Find restoration writers.
- [ ] `BG-12.018` Find list status projection.
- [ ] `BG-12.019` Find detail status projection.
- [ ] `BG-12.020` Find status filter predicates.

#### BG-12 / 03 — Stored vocabulary

- [ ] `BG-12.021` Read database status constraint.
- [ ] `BG-12.022` Confirm pending enum.
- [ ] `BG-12.023` Confirm processing enum.
- [ ] `BG-12.024` Confirm complete enum.
- [ ] `BG-12.025` Confirm failed enum.
- [ ] `BG-12.026` Locate retry_wait projection.
- [ ] `BG-12.027` Keep retry_wait out of storage.
- [ ] `BG-12.028` Identify coverage field separately.
- [ ] `BG-12.029` Identify lifecycle field separately.
- [ ] `BG-12.030` Identify sync status separately.

#### BG-12 / 04 — Current-work identity

- [ ] `BG-12.031` Inspect input hash semantics.
- [ ] `BG-12.032` Inspect policy snapshot semantics.
- [ ] `BG-12.033` Inspect source revision semantics.
- [ ] `BG-12.034` Identify historical failed jobs.
- [ ] `BG-12.035` Identify superseded jobs.
- [ ] `BG-12.036` Identify current required stages.
- [ ] `BG-12.037` Identify optional stages.
- [ ] `BG-12.038` Determine generation sufficiency.
- [ ] `BG-12.039` Propose marker only if needed.
- [ ] `BG-12.040` Define migration/backfill interpretation.

#### BG-12 / 05 — Failure precedence

- [ ] `BG-12.041` Define required terminal failure.
- [ ] `BG-12.042` Define optional-stage failure treatment.
- [ ] `BG-12.043` Define parallel active work treatment.
- [ ] `BG-12.044` Define partial attachment failure.
- [ ] `BG-12.045` Define all-stages failed result.
- [ ] `BG-12.046` Define failed Notion independence.
- [ ] `BG-12.047` Define failed digest independence.
- [ ] `BG-12.048` Define mixed historical/current failure.
- [ ] `BG-12.049` Write deterministic precedence table.
- [ ] `BG-12.050` Review ambiguous existing fixtures.

#### BG-12 / 06 — Active and pending

- [ ] `BG-12.051` Define valid active lease.
- [ ] `BG-12.052` Define expired active lease.
- [ ] `BG-12.053` Define runnable pending job.
- [ ] `BG-12.054` Define future available_at job.
- [ ] `BG-12.055` Define capacity deferred job.
- [ ] `BG-12.056` Define privacy paused job.
- [ ] `BG-12.057` Define no-current-job situation.
- [ ] `BG-12.058` Define queued downstream stage.
- [ ] `BG-12.059` Define simultaneous pending/processing precedence.
- [ ] `BG-12.060` Keep next retry time separate.

#### BG-12 / 07 — Completion semantics

- [ ] `BG-12.061` Define all-required-stages success.
- [ ] `BG-12.062` Define intentional no-AI completion.
- [ ] `BG-12.063` Define URL-only limited completion.
- [ ] `BG-12.064` Define unsupported source completion.
- [ ] `BG-12.065` Preserve coverage limitation separately.
- [ ] `BG-12.066` Define empty extraction outcome.
- [ ] `BG-12.067` Define deleted-item visibility.
- [ ] `BG-12.068` Define restored-item reconciliation.
- [ ] `BG-12.069` Define successful reprocess outcome.
- [ ] `BG-12.070` Prevent historical failure poisoning.

#### BG-12 / 08 — Decision implementation

- [ ] `BG-12.071` Choose pure helper or SQL projection.
- [ ] `BG-12.072` Define helper input shape.
- [ ] `BG-12.073` Pass evaluation time explicitly.
- [ ] `BG-12.074` Sort nondeterministic inputs safely.
- [ ] `BG-12.075` Return supported stored status.
- [ ] `BG-12.076` Return explanation separately if needed.
- [ ] `BG-12.077` Avoid last-writer-wins logic.
- [ ] `BG-12.078` Avoid Notion state coupling.
- [ ] `BG-12.079` Document required-stage identity.
- [ ] `BG-12.080` Keep rule reusable across callers.

#### BG-12 / 09 — Rule fixtures

- [ ] `BG-12.081` Add terminal failure fixture.
- [ ] `BG-12.082` Add current active lease fixture.
- [ ] `BG-12.083` Add deferred pending fixture.
- [ ] `BG-12.084` Add no-AI fixture.
- [ ] `BG-12.085` Add mixed historical fixture.
- [ ] `BG-12.086` Add multi-attachment fixture.
- [ ] `BG-12.087` Add superseded failure fixture.
- [ ] `BG-12.088` Add expired lease fixture.
- [ ] `BG-12.089` Add deleted/restored fixture.
- [ ] `BG-12.090` Verify decision table matches expectations.

#### BG-12 / 10 — Verify and close this task

- [ ] `BG-12.091` **Review:** Compare the completed checklist with BG-12's stated outcome; identify uncovered behavior.
- [ ] `BG-12.092` **Verification:** Run or inspect the focused proof required by BG-12; reuse a valid existing run rather than repeating it gratuitously.
- [ ] `BG-12.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [ ] `BG-12.094` **Integrity:** Check that BG-12 has not weakened its stated data, privacy, scope or recovery guarantees.
- [ ] `BG-12.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [ ] `BG-12.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [ ] `BG-12.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [ ] `BG-12.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [ ] `BG-12.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [ ] `BG-12.100` **Gate:** Check the parent completion boundary and record whether BG-13 is unlocked.

## BG-13 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#19-bg-13--update-transitions-atomically-and-reject-stale-workers).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-13 / 01 — Establish task context

- [ ] `BG-13.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [ ] `BG-13.002` **Dependency:** Verify BG-12's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [ ] `BG-13.003` **Baseline:** Record the actual checkout or release candidate used for BG-13.
- [ ] `BG-13.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [ ] `BG-13.005` **Evidence:** Check whether existing evidence already satisfies any BG-13 step; reference it instead of manufacturing work.
- [ ] `BG-13.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [ ] `BG-13.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [ ] `BG-13.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [ ] `BG-13.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [ ] `BG-13.010` **Tracking:** Open a BG-13 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-13 / 02 — Transition coverage

- [ ] `BG-13.011` Locate lease acquisition transition.
- [ ] `BG-13.012` Locate heartbeat transition.
- [ ] `BG-13.013` Locate processing success transition.
- [ ] `BG-13.014` Locate processing failure transition.
- [ ] `BG-13.015` Locate capacity deferral transition.
- [ ] `BG-13.016` Locate manual retry transition.
- [ ] `BG-13.017` Locate privacy supersession transition.
- [ ] `BG-13.018` Locate extraction chaining transition.
- [ ] `BG-13.019` Locate restore transition.
- [ ] `BG-13.020` Map each to shared state rule.

#### BG-13 / 03 — Atomic mutation

- [ ] `BG-13.021` Inspect existing D1 batch pattern.
- [ ] `BG-13.022` Define post-transition job view.
- [ ] `BG-13.023` Update job record conditionally.
- [ ] `BG-13.024` Update materialized item status consistently.
- [ ] `BG-13.025` Include downstream job creation.
- [ ] `BG-13.026` Avoid completion-before-chaining gap.
- [ ] `BG-13.027` Preserve existing version semantics.
- [ ] `BG-13.028` Handle transaction failure explicitly.
- [ ] `BG-13.029` Avoid partial derived writes.
- [ ] `BG-13.030` Verify batch rollback behavior.

#### BG-13 / 04 — Lease guards

- [ ] `BG-13.031` Require current lease owner.
- [ ] `BG-13.032` Require processing job status.
- [ ] `BG-13.033` Require unexpired lease.
- [ ] `BG-13.034` Require current source generation.
- [ ] `BG-13.035` Require current privacy eligibility.
- [ ] `BG-13.036` Require nondeleted item.
- [ ] `BG-13.037` Require no purge freeze.
- [ ] `BG-13.038` Reject mismatched item ownership.
- [ ] `BG-13.039` Return controlled stale-result outcome.
- [ ] `BG-13.040` Prevent rejected-result audit ambiguity.

#### BG-13 / 05 — Success path

- [ ] `BG-13.041` Validate derived result contract.
- [ ] `BG-13.042` Persist allowed derived fields.
- [ ] `BG-13.043` Preserve owner override precedence.
- [ ] `BG-13.044` Preserve original source content.
- [ ] `BG-13.045` Complete relevant job.
- [ ] `BG-13.046` Clear lease ownership.
- [ ] `BG-13.047` Clear lease expiry.
- [ ] `BG-13.048` Create required downstream work.
- [ ] `BG-13.049` Recompute aggregate state.
- [ ] `BG-13.050` Verify correct success audit.

#### BG-13 / 06 — Failure and deferral

- [ ] `BG-13.051` Persist stable terminal error.
- [ ] `BG-13.052` Preserve raw evidence on failure.
- [ ] `BG-13.053` Clear failed lease.
- [ ] `BG-13.054` Recompute failed aggregate state.
- [ ] `BG-13.055` Preserve quota deferral attempts.
- [ ] `BG-13.056` Set approved available_at time.
- [ ] `BG-13.057` Restore pending deferred state.
- [ ] `BG-13.058` Keep pause reason visible.
- [ ] `BG-13.059` Prevent stale job state updates.
- [ ] `BG-13.060` Verify eventual retry transition.

#### BG-13 / 07 — Retry and restoration

- [ ] `BG-13.061` Verify manual retry eligibility.
- [ ] `BG-13.062` Preserve bounded attempt count.
- [ ] `BG-13.063` Requeue current generation only.
- [ ] `BG-13.064` Recompute pending item state.
- [ ] `BG-13.065` Avoid resurrecting deleted item.
- [ ] `BG-13.066` Restore lifecycle through existing route.
- [ ] `BG-13.067` Reconcile restored processing needs.
- [ ] `BG-13.068` Preserve prior user edits.
- [ ] `BG-13.069` Preserve duplicate target semantics.
- [ ] `BG-13.070` Check privacy snapshot freshness.

#### BG-13 / 08 — Backfill

- [ ] `BG-13.071` Identify inconsistent item states.
- [ ] `BG-13.072` Preview candidate identifiers.
- [ ] `BG-13.073` Compare stored versus derived state.
- [ ] `BG-13.074` Exclude ambiguous historic cases.
- [ ] `BG-13.075` Bound update batch size.
- [ ] `BG-13.076` Use guarded current-state update.
- [ ] `BG-13.077` Avoid changing raw fields.
- [ ] `BG-13.078` Avoid changing capture history.
- [ ] `BG-13.079` Repeat reconciliation idempotently.
- [ ] `BG-13.080` Record corrected and unresolved counts.

#### BG-13 / 09 — Concurrency proof

- [ ] `BG-13.081` Race two completions.
- [ ] `BG-13.082` Race failure with success.
- [ ] `BG-13.083` Race retry with old completion.
- [ ] `BG-13.084` Race privacy change with result.
- [ ] `BG-13.085` Race deletion with result.
- [ ] `BG-13.086` Race purge with result.
- [ ] `BG-13.087` Test stale owner rejection.
- [ ] `BG-13.088` Check list/detail agreement.
- [ ] `BG-13.089` Check filter agreement.
- [ ] `BG-13.090` Reproduce and close audit mismatch.

#### BG-13 / 10 — Verify and close this task

- [ ] `BG-13.091` **Review:** Compare the completed checklist with BG-13's stated outcome; identify uncovered behavior.
- [ ] `BG-13.092` **Verification:** Run or inspect the focused proof required by BG-13; reuse a valid existing run rather than repeating it gratuitously.
- [ ] `BG-13.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [ ] `BG-13.094` **Integrity:** Check that BG-13 has not weakened its stated data, privacy, scope or recovery guarantees.
- [ ] `BG-13.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [ ] `BG-13.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [ ] `BG-13.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [ ] `BG-13.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [ ] `BG-13.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [ ] `BG-13.100` **Gate:** Check the parent completion boundary and record whether BG-14 is unlocked.

## BG-14 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#20-bg-14--prove-the-repaired-workflow-in-a-browser).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-14 / 01 — Establish task context

- [ ] `BG-14.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [ ] `BG-14.002` **Dependency:** Verify BG-13's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [ ] `BG-14.003` **Baseline:** Record the actual checkout or release candidate used for BG-14.
- [ ] `BG-14.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [ ] `BG-14.005` **Evidence:** Check whether existing evidence already satisfies any BG-14 step; reference it instead of manufacturing work.
- [ ] `BG-14.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [ ] `BG-14.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [ ] `BG-14.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [ ] `BG-14.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [ ] `BG-14.010` **Tracking:** Open a BG-14 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-14 / 02 — Harness setup

- [ ] `BG-14.011` Locate existing browser harness.
- [ ] `BG-14.012` Choose isolated local state.
- [ ] `BG-14.013` Choose dummy auth configuration.
- [ ] `BG-14.014` Choose mock upstream responses.
- [ ] `BG-14.015` Start Worker on assigned port.
- [ ] `BG-14.016` Start Web with matching proxy.
- [ ] `BG-14.017` Record owned process identifiers.
- [ ] `BG-14.018` Verify readiness before browser launch.
- [ ] `BG-14.019` Create isolated browser profile.
- [ ] `BG-14.020` Ensure no production credential inheritance.

#### BG-14 / 03 — Fixture preparation

- [ ] `BG-14.021` Create text fixture.
- [ ] `BG-14.022` Create parseable PDF fixture.
- [ ] `BG-14.023` Create screenshot fixture.
- [ ] `BG-14.024` Create controlled URL fixture.
- [ ] `BG-14.025` Include internal searchable phrase.
- [ ] `BG-14.026` Include owner override fixture.
- [ ] `BG-14.027` Include failed processing fixture.
- [ ] `BG-14.028` Include canonical duplicate fixture.
- [ ] `BG-14.029` Record fixture IDs safely.
- [ ] `BG-14.030` Record original file hashes.

#### BG-14 / 04 — Real authentication

- [ ] `BG-14.031` Open actual login form.
- [ ] `BG-14.032` Enter dummy admin token.
- [ ] `BG-14.033` Submit through UI.
- [ ] `BG-14.034` Wait for authenticated Inbox.
- [ ] `BG-14.035` Verify session cookie behavior.
- [ ] `BG-14.036` Avoid mocked login response.
- [ ] `BG-14.037` Reload authenticated page.
- [ ] `BG-14.038` Check no token in URL.
- [ ] `BG-14.039` Check no token in storage.
- [ ] `BG-14.040` Verify unauthorized session handling.

#### BG-14 / 05 — Attachment story

- [ ] `BG-14.041` Open file item detail.
- [ ] `BG-14.042` Locate original Download control.
- [ ] `BG-14.043` Download original PDF.
- [ ] `BG-14.044` Compare PDF hash.
- [ ] `BG-14.045` Open image detail.
- [ ] `BG-14.046` Download original image.
- [ ] `BG-14.047` Compare image hash.
- [ ] `BG-14.048` Repeat after page reload.
- [ ] `BG-14.049` Check missing attachment error.
- [ ] `BG-14.050` Verify anonymous original denial.

#### BG-14 / 06 — URL and search

- [ ] `BG-14.051` Save controlled public URL.
- [ ] `BG-14.052` Trigger tracked acquisition work.
- [ ] `BG-14.053` Wait for accepted evidence.
- [ ] `BG-14.054` Search internal phrase.
- [ ] `BG-14.055` Confirm exact expected item.
- [ ] `BG-14.056` Inspect source coverage.
- [ ] `BG-14.057` Inspect acquired text.
- [ ] `BG-14.058` Test unavailable page fixture.
- [ ] `BG-14.059` Confirm limited coverage message.
- [ ] `BG-14.060` Confirm original URL preserved.

#### BG-14 / 07 — Failure and edits

- [ ] `BG-14.061` Trigger controlled processing failure.
- [ ] `BG-14.062` Inspect failed job state.
- [ ] `BG-14.063` Inspect aggregate item state.
- [ ] `BG-14.064` Verify valid next action.
- [ ] `BG-14.065` Retry recoverable condition.
- [ ] `BG-14.066` Wait for convergence.
- [ ] `BG-14.067` Edit derived title.
- [ ] `BG-14.068` Reprocess eligible item.
- [ ] `BG-14.069` Verify owner title survives.
- [ ] `BG-14.070` Verify raw evidence unchanged.

#### BG-14 / 08 — Lifecycle and access

- [ ] `BG-14.071` Soft-delete synthetic item.
- [ ] `BG-14.072` Verify normal search exclusion.
- [ ] `BG-14.073` Verify Deleted filter membership.
- [ ] `BG-14.074` Restore current item version.
- [ ] `BG-14.075` Verify search reappearance.
- [ ] `BG-14.076` Log out through UI.
- [ ] `BG-14.077` Request private content again.
- [ ] `BG-14.078` Confirm authenticated data denied.
- [ ] `BG-14.079` Check keyboard focus behavior.
- [ ] `BG-14.080` Check narrow-screen overflow.

#### BG-14 / 09 — Repeatability

- [ ] `BG-14.081` Capture failing assertion context.
- [ ] `BG-14.082` Save safe browser error log.
- [ ] `BG-14.083` Save relevant response outcomes.
- [ ] `BG-14.084` Save only useful screenshots.
- [ ] `BG-14.085` Clear only owned fixtures.
- [ ] `BG-14.086` Stop owned server processes.
- [ ] `BG-14.087` Close isolated browser profile.
- [ ] `BG-14.088` Run harness again cleanly.
- [ ] `BG-14.089` Confirm repeat-run independence.
- [ ] `BG-14.090` Index browser acceptance evidence.

#### BG-14 / 10 — Verify and close this task

- [ ] `BG-14.091` **Review:** Compare the completed checklist with BG-14's stated outcome; identify uncovered behavior.
- [ ] `BG-14.092` **Verification:** Run or inspect the focused proof required by BG-14; reuse a valid existing run rather than repeating it gratuitously.
- [ ] `BG-14.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [ ] `BG-14.094` **Integrity:** Check that BG-14 has not weakened its stated data, privacy, scope or recovery guarantees.
- [ ] `BG-14.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [ ] `BG-14.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [ ] `BG-14.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [ ] `BG-14.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [ ] `BG-14.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [ ] `BG-14.100` **Gate:** Check the parent completion boundary and record whether BG-15 is unlocked.

## BG-15 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#21-bg-15--define-browser-write-authentication).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-15 / 01 — Establish task context

- [ ] `BG-15.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [ ] `BG-15.002` **Dependency:** Verify BG-14's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [ ] `BG-15.003` **Baseline:** Record the actual checkout or release candidate used for BG-15.
- [ ] `BG-15.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [ ] `BG-15.005` **Evidence:** Check whether existing evidence already satisfies any BG-15 step; reference it instead of manufacturing work.
- [ ] `BG-15.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [ ] `BG-15.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [ ] `BG-15.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [ ] `BG-15.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [ ] `BG-15.010` **Tracking:** Open a BG-15 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-15 / 02 — Write inventory

- [ ] `BG-15.011` Identify browser capture POST.
- [ ] `BG-15.012` Identify upload initialization POST.
- [ ] `BG-15.013` Identify upload content PUT.
- [ ] `BG-15.014` Identify finalize POST.
- [ ] `BG-15.015` Identify optional cleanup operation.
- [ ] `BG-15.016` Identify project follow-up PATCH.
- [ ] `BG-15.017` Identify review-date PATCH.
- [ ] `BG-15.018` Identify privacy mutation.
- [ ] `BG-15.019` Identify session refresh path.
- [ ] `BG-15.020` Record existing credential requirements.

#### BG-15 / 03 — Route design

- [ ] `BG-15.021` Compare shared-route option.
- [ ] `BG-15.022` Compare wrapper necessity.
- [ ] `BG-15.023` Reuse canonical capture service.
- [ ] `BG-15.024` Reuse attachment lifecycle service.
- [ ] `BG-15.025` Avoid duplicated persistence logic.
- [ ] `BG-15.026` Define cookie-authenticated capability.
- [ ] `BG-15.027` Keep admin-only operations protected.
- [ ] `BG-15.028` Preserve capture token permissions.
- [ ] `BG-15.029` Preserve local-worker permissions.
- [ ] `BG-15.030` Document selected route contract.

#### BG-15 / 04 — Cookie requests

- [ ] `BG-15.031` Reuse signed-cookie validation.
- [ ] `BG-15.032` Check session expiry.
- [ ] `BG-15.033` Check valid issuance key.
- [ ] `BG-15.034` Reject malformed cookie.
- [ ] `BG-15.035` Reject tampered signature.
- [ ] `BG-15.036` Preserve HttpOnly behavior.
- [ ] `BG-15.037` Preserve secure production cookie.
- [ ] `BG-15.038` Define missing-session response.
- [ ] `BG-15.039` Keep JSON error envelope.
- [ ] `BG-15.040` Avoid JavaScript credential recovery.

#### BG-15 / 05 — Origin protection

- [ ] `BG-15.041` Identify expected application origin.
- [ ] `BG-15.042` Validate mutation Origin behavior.
- [ ] `BG-15.043` Define missing Origin cookie behavior.
- [ ] `BG-15.044` Define null Origin behavior.
- [ ] `BG-15.045` Define trusted proxy assumptions.
- [ ] `BG-15.046` Prevent arbitrary origin reflection.
- [ ] `BG-15.047` Select CSRF mechanism if needed.
- [ ] `BG-15.048` Test same-site alternate-origin request.
- [ ] `BG-15.049` Test disallowed browser origin.
- [ ] `BG-15.050` Document permitted mutation sources.

#### BG-15 / 06 — Bearer compatibility

- [ ] `BG-15.051` Permit legitimate no-Origin bearer client.
- [ ] `BG-15.052` Validate bearer scope first.
- [ ] `BG-15.053` Avoid trusting client name.
- [ ] `BG-15.054` Preserve Shortcut capture route.
- [ ] `BG-15.055` Preserve Shortcut upload behavior.
- [ ] `BG-15.056` Check mixed cookie/bearer precedence.
- [ ] `BG-15.057` Reject worker token on capture.
- [ ] `BG-15.058` Reject capture token on admin operations.
- [ ] `BG-15.059` Preserve constant-time comparison.
- [ ] `BG-15.060` Record backwards-compatible results.

#### BG-15 / 07 — Body handling

- [ ] `BG-15.061` Validate JSON content handling.
- [ ] `BG-15.062` Validate raw byte PUT handling.
- [ ] `BG-15.063` Bound body parsing where supported.
- [ ] `BG-15.064` Preserve upload checksum validation.
- [ ] `BG-15.065` Preserve strict schema errors.
- [ ] `BG-15.066` Return actionable validation fields.
- [ ] `BG-15.067` Reject malformed JSON safely.
- [ ] `BG-15.068` Reject wrong content type appropriately.
- [ ] `BG-15.069` Avoid logging submitted body.
- [ ] `BG-15.070` Check authorization occurs before work.

#### BG-15 / 08 — Web integration

- [ ] `BG-15.071` Keep credentials include setting.
- [ ] `BG-15.072` Reuse global auth-required event.
- [ ] `BG-15.073` Preserve pending capture operation.
- [ ] `BG-15.074` Preserve pending upload identifier.
- [ ] `BG-15.075` Show reauthentication action.
- [ ] `BG-15.076` Resume after valid session.
- [ ] `BG-15.077` Avoid duplicate upload initialization.
- [ ] `BG-15.078` Avoid duplicate capture submission.
- [ ] `BG-15.079` Clear session-only UI safely.
- [ ] `BG-15.080` Verify logout behavior.

#### BG-15 / 09 — Boundary tests

- [ ] `BG-15.081` Test cookie capture success.
- [ ] `BG-15.082` Test cookie upload success.
- [ ] `BG-15.083` Test anonymous capture denial.
- [ ] `BG-15.084` Test capture bearer compatibility.
- [ ] `BG-15.085` Test cross-origin mutation denial.
- [ ] `BG-15.086` Test session expiry mid-upload.
- [ ] `BG-15.087` Test scope-confused request denial.
- [ ] `BG-15.088` Scan browser storage for token.
- [ ] `BG-15.089` Scan URL for token.
- [ ] `BG-15.090` Record complete write permission matrix.

#### BG-15 / 10 — Verify and close this task

- [ ] `BG-15.091` **Review:** Compare the completed checklist with BG-15's stated outcome; identify uncovered behavior.
- [ ] `BG-15.092` **Verification:** Run or inspect the focused proof required by BG-15; reuse a valid existing run rather than repeating it gratuitously.
- [ ] `BG-15.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [ ] `BG-15.094` **Integrity:** Check that BG-15 has not weakened its stated data, privacy, scope or recovery guarantees.
- [ ] `BG-15.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [ ] `BG-15.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [ ] `BG-15.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [ ] `BG-15.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [ ] `BG-15.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [ ] `BG-15.100` **Gate:** Check the parent completion boundary and record whether BG-16 is unlocked.

## BG-16 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#22-bg-16--build-the-url-pasted-text-and-note-form).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-16 / 01 — Establish task context

- [ ] `BG-16.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [ ] `BG-16.002` **Dependency:** Verify BG-15's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [ ] `BG-16.003` **Baseline:** Record the actual checkout or release candidate used for BG-16.
- [ ] `BG-16.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [ ] `BG-16.005` **Evidence:** Check whether existing evidence already satisfies any BG-16 step; reference it instead of manufacturing work.
- [ ] `BG-16.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [ ] `BG-16.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [ ] `BG-16.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [ ] `BG-16.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [ ] `BG-16.010` **Tracking:** Open a BG-16 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-16 / 02 — Entry and layout

- [ ] `BG-16.011` Add Save something navigation.
- [ ] `BG-16.012` Choose capture route or panel.
- [ ] `BG-16.013` Provide back-to-Inbox action.
- [ ] `BG-16.014` Provide explicit cancel action.
- [ ] `BG-16.015` Define empty form state.
- [ ] `BG-16.016` Add URL mode control.
- [ ] `BG-16.017` Add pasted-text mode control.
- [ ] `BG-16.018` Add note mode control.
- [ ] `BG-16.019` Preserve deliberate mode switching.
- [ ] `BG-16.020` Prevent hidden stale field submission.

#### BG-16 / 03 — Payload fields

- [ ] `BG-16.021` Bind url input.
- [ ] `BG-16.022` Bind shared_text input.
- [ ] `BG-16.023` Bind user_reason input.
- [ ] `BG-16.024` Bind quick_category input.
- [ ] `BG-16.025` Bind privacy_level input.
- [ ] `BG-16.026` Generate captured_at value.
- [ ] `BG-16.027` Set source_app identifier.
- [ ] `BG-16.028` Set client name.
- [ ] `BG-16.029` Set real client version.
- [ ] `BG-16.030` Attach logical operation key.

#### BG-16 / 04 — Privacy experience

- [ ] `BG-16.031` Default privacy to Unknown.
- [ ] `BG-16.032` Explain Unknown processing behavior.
- [ ] `BG-16.033` Display Public option accurately.
- [ ] `BG-16.034` Display Personal option accurately.
- [ ] `BG-16.035` Display Sensitive option accurately.
- [ ] `BG-16.036` Avoid automatic Public promotion.
- [ ] `BG-16.037` Keep consent separate from classification.
- [ ] `BG-16.038` Preserve chosen privacy during retry.
- [ ] `BG-16.039` Show no-AI outcome honestly.
- [ ] `BG-16.040` Verify outgoing privacy value.

#### BG-16 / 05 — Validation

- [ ] `BG-16.041` Require URL for URL mode.
- [ ] `BG-16.042` Require nonblank note text.
- [ ] `BG-16.043` Require nonblank pasted text.
- [ ] `BG-16.044` Enforce URL length limit.
- [ ] `BG-16.045` Enforce text length limit.
- [ ] `BG-16.046` Enforce reason length limit.
- [ ] `BG-16.047` Reuse category enum.
- [ ] `BG-16.048` Validate source/client field bounds.
- [ ] `BG-16.049` Show server field errors.
- [ ] `BG-16.050` Focus first invalid input.

#### BG-16 / 06 — Submission

- [ ] `BG-16.051` Create immutable submitted payload.
- [ ] `BG-16.052` Disable same-form repeated submit.
- [ ] `BG-16.053` Use authenticated API helper.
- [ ] `BG-16.054` Preserve server idempotency protection.
- [ ] `BG-16.055` Show in-flight state.
- [ ] `BG-16.056` Handle network failure.
- [ ] `BG-16.057` Handle unauthorized response.
- [ ] `BG-16.058` Handle validation rejection.
- [ ] `BG-16.059` Preserve editable input on failure.
- [ ] `BG-16.060` Avoid waiting for optional processing.

#### BG-16 / 07 — Success semantics

- [ ] `BG-16.061` Read returned capture_id.
- [ ] `BG-16.062` Read replayed flag.
- [ ] `BG-16.063` Read duplicate_of field.
- [ ] `BG-16.064` Show new Saved message.
- [ ] `BG-16.065` Show Already Saved message.
- [ ] `BG-16.066` Show optional processing status.
- [ ] `BG-16.067` Link canonical detail page.
- [ ] `BG-16.068` Preserve separate capture-event meaning.
- [ ] `BG-16.069` Clear acknowledged submitted draft.
- [ ] `BG-16.070` Keep failed operation recoverable.

#### BG-16 / 08 — Duplicate and mode tests

- [ ] `BG-16.071` Submit URL fixture.
- [ ] `BG-16.072` Submit note fixture.
- [ ] `BG-16.073` Submit text fixture.
- [ ] `BG-16.074` Replay identical logical operation.
- [ ] `BG-16.075` Share canonical URL with new reason.
- [ ] `BG-16.076` Check immutable event history.
- [ ] `BG-16.077` Switch mode before submit.
- [ ] `BG-16.078` Check hidden URL not submitted.
- [ ] `BG-16.079` Check whitespace-only text rejection.
- [ ] `BG-16.080` Check Unicode reason preservation.

#### BG-16 / 09 — Usability

- [ ] `BG-16.081` Label every input.
- [ ] `BG-16.082` Associate errors with fields.
- [ ] `BG-16.083` Announce asynchronous success.
- [ ] `BG-16.084` Announce asynchronous failure.
- [ ] `BG-16.085` Preserve keyboard navigation.
- [ ] `BG-16.086` Keep submit visible on mobile.
- [ ] `BG-16.087` Wrap long URL text.
- [ ] `BG-16.088` Prevent error-driven layout overflow.
- [ ] `BG-16.089` Verify provider outage still saves.
- [ ] `BG-16.090` Record browser creation acceptance.

#### BG-16 / 10 — Verify and close this task

- [ ] `BG-16.091` **Review:** Compare the completed checklist with BG-16's stated outcome; identify uncovered behavior.
- [ ] `BG-16.092` **Verification:** Run or inspect the focused proof required by BG-16; reuse a valid existing run rather than repeating it gratuitously.
- [ ] `BG-16.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [ ] `BG-16.094` **Integrity:** Check that BG-16 has not weakened its stated data, privacy, scope or recovery guarantees.
- [ ] `BG-16.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [ ] `BG-16.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [ ] `BG-16.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [ ] `BG-16.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [ ] `BG-16.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [ ] `BG-16.100` **Gate:** Check the parent completion boundary and record whether BG-17 is unlocked.

## BG-17 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#23-bg-17--retain-stable-retries-and-define-draft-lifetime).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-17 / 01 — Establish task context

- [ ] `BG-17.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [ ] `BG-17.002` **Dependency:** Verify BG-16's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [ ] `BG-17.003` **Baseline:** Record the actual checkout or release candidate used for BG-17.
- [ ] `BG-17.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [ ] `BG-17.005` **Evidence:** Check whether existing evidence already satisfies any BG-17 step; reference it instead of manufacturing work.
- [ ] `BG-17.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [ ] `BG-17.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [ ] `BG-17.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [ ] `BG-17.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [ ] `BG-17.010` **Tracking:** Open a BG-17 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-17 / 02 — Operation model

- [ ] `BG-17.011` Define logical operation identifier.
- [ ] `BG-17.012` Store stable idempotency key.
- [ ] `BG-17.013` Store immutable submitted payload.
- [ ] `BG-17.014` Store original captured_at.
- [ ] `BG-17.015` Store selected privacy.
- [ ] `BG-17.016` Store optional file hash.
- [ ] `BG-17.017` Store file byte length.
- [ ] `BG-17.018` Store server attachment ID.
- [ ] `BG-17.019` Store acknowledged capture ID.
- [ ] `BG-17.020` Define operation stage enum.

#### BG-17 / 03 — Retry identity

- [ ] `BG-17.021` Generate key once.
- [ ] `BG-17.022` Reuse key after timeout.
- [ ] `BG-17.023` Reuse key after reconnect.
- [ ] `BG-17.024` Reuse key after reauthentication.
- [ ] `BG-17.025` Preserve payload across automatic retry.
- [ ] `BG-17.026` Detect changed submitted payload.
- [ ] `BG-17.027` Separate edited new draft.
- [ ] `BG-17.028` Reconcile ambiguous old operation.
- [ ] `BG-17.029` Prevent key reuse for changed bytes.
- [ ] `BG-17.030` Document deliberate new-operation action.

#### BG-17 / 04 — Draft separation

- [ ] `BG-17.031` Model editable form draft.
- [ ] `BG-17.032` Model immutable pending submission.
- [ ] `BG-17.033` Keep prior pending record visible.
- [ ] `BG-17.034` Allow deliberate new draft creation.
- [ ] `BG-17.035` Avoid overwriting pending metadata.
- [ ] `BG-17.036` Define cancel versus discard.
- [ ] `BG-17.037` Define success cleanup boundary.
- [ ] `BG-17.038` Define validation correction behavior.
- [ ] `BG-17.039` Preserve per-operation error state.
- [ ] `BG-17.040` Avoid cross-operation result mixing.

#### BG-17 / 05 — Persistence decision

- [ ] `BG-17.041` Specify in-memory mode limitations.
- [ ] `BG-17.042` Specify cross-reload requirement.
- [ ] `BG-17.043` Select browser persistence adapter.
- [ ] `BG-17.044` Version stored record schema.
- [ ] `BG-17.045` Define retained content fields.
- [ ] `BG-17.046` Define retained byte policy.
- [ ] `BG-17.047` Define restricted-content behavior.
- [ ] `BG-17.048` Define shared-device choice.
- [ ] `BG-17.049` Define expiry/retention duration.
- [ ] `BG-17.050` Document logout retention semantics.

#### BG-17 / 06 — Persistent implementation

- [ ] `BG-17.051` Open versioned browser store.
- [ ] `BG-17.052` Write submitted operation atomically.
- [ ] `BG-17.053` Read pending operations on startup.
- [ ] `BG-17.054` Validate restored record shape.
- [ ] `BG-17.055` Handle obsolete stored schema.
- [ ] `BG-17.056` Handle corrupt draft record.
- [ ] `BG-17.057` Avoid persisting credentials.
- [ ] `BG-17.058` Bound stored operation count.
- [ ] `BG-17.059` Bound stored bytes.
- [ ] `BG-17.060` Handle storage-quota failure visibly.

#### BG-17 / 07 — File recovery

- [ ] `BG-17.061` Distinguish filename from bytes.
- [ ] `BG-17.062` Persist bytes only under selected policy.
- [ ] `BG-17.063` Retain expected file hash.
- [ ] `BG-17.064` Request reselection when bytes missing.
- [ ] `BG-17.065` Hash reselected file.
- [ ] `BG-17.066` Reject changed file mismatch.
- [ ] `BG-17.067` Preserve previous server attachment reference.
- [ ] `BG-17.068` Resume eligible upload stage.
- [ ] `BG-17.069` Avoid silently starting new upload.
- [ ] `BG-17.070` Explain unrecoverable local file state.

#### BG-17 / 08 — Owner controls

- [ ] `BG-17.071` Show explicit Retry button.
- [ ] `BG-17.072` Show explicit Discard button.
- [ ] `BG-17.073` Explain ambiguous server outcome.
- [ ] `BG-17.074` Keep no-Saved offline wording.
- [ ] `BG-17.075` Show persistence failure warning.
- [ ] `BG-17.076` Clear confirmed successful retry content.
- [ ] `BG-17.077` Preserve unrelated queued entries.
- [ ] `BG-17.078` Prevent background infinite retry loop.
- [ ] `BG-17.079` Bound retry cadence.
- [ ] `BG-17.080` Handle browser session expiry.

#### BG-17 / 09 — Failure proof

- [ ] `BG-17.081` Drop response after server commit.
- [ ] `BG-17.082` Retry same key.
- [ ] `BG-17.083` Assert stable capture ID.
- [ ] `BG-17.084` Test offline before send.
- [ ] `BG-17.085` Test reload with durable mode.
- [ ] `BG-17.086` Test reload with nonpersistent disclosure.
- [ ] `BG-17.087` Test browser quota failure.
- [ ] `BG-17.088` Test changed-file reselection.
- [ ] `BG-17.089` Test two simultaneous pending operations.
- [ ] `BG-17.090` Record draft lifetime acceptance.

#### BG-17 / 10 — Verify and close this task

- [ ] `BG-17.091` **Review:** Compare the completed checklist with BG-17's stated outcome; identify uncovered behavior.
- [ ] `BG-17.092` **Verification:** Run or inspect the focused proof required by BG-17; reuse a valid existing run rather than repeating it gratuitously.
- [ ] `BG-17.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [ ] `BG-17.094` **Integrity:** Check that BG-17 has not weakened its stated data, privacy, scope or recovery guarantees.
- [ ] `BG-17.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [ ] `BG-17.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [ ] `BG-17.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [ ] `BG-17.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [ ] `BG-17.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [ ] `BG-17.100` **Gate:** Check the parent completion boundary and record whether BG-18 is unlocked.

## BG-18 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#24-bg-18--add-browser-file-upload-finalize-and-link).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-18 / 01 — Establish task context

- [ ] `BG-18.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [ ] `BG-18.002` **Dependency:** Verify BG-17's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [ ] `BG-18.003` **Baseline:** Record the actual checkout or release candidate used for BG-18.
- [ ] `BG-18.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [ ] `BG-18.005` **Evidence:** Check whether existing evidence already satisfies any BG-18 step; reference it instead of manufacturing work.
- [ ] `BG-18.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [ ] `BG-18.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [ ] `BG-18.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [ ] `BG-18.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [ ] `BG-18.010` **Tracking:** Open a BG-18 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-18 / 02 — File admission

- [ ] `BG-18.011` Add single-file selection control.
- [ ] `BG-18.012` Define supported V1 types.
- [ ] `BG-18.013` Read actual size ceiling.
- [ ] `BG-18.014` Distinguish decimal bytes from MiB.
- [ ] `BG-18.015` Reject oversized selection visibly.
- [ ] `BG-18.016` Reject unsupported obvious MIME.
- [ ] `BG-18.017` Preserve server signature authority.
- [ ] `BG-18.018` Label selected file accessibly.
- [ ] `BG-18.019` Show selected size safely.
- [ ] `BG-18.020` Avoid implying batch upload support.

#### BG-18 / 03 — Checksum preparation

- [ ] `BG-18.021` Read original file bytes safely.
- [ ] `BG-18.022` Compute SHA-256 checksum.
- [ ] `BG-18.023` Bound browser memory use.
- [ ] `BG-18.024` Preserve original byte length.
- [ ] `BG-18.025` Store hash with operation.
- [ ] `BG-18.026` Store filename with operation.
- [ ] `BG-18.027` Store MIME with operation.
- [ ] `BG-18.028` Handle read failure.
- [ ] `BG-18.029` Handle user cancellation.
- [ ] `BG-18.030` Avoid modifying original bytes.

#### BG-18 / 04 — Upload initialization

- [ ] `BG-18.031` Build strict init payload.
- [ ] `BG-18.032` Map upload source type.
- [ ] `BG-18.033` Include optional content_hash.
- [ ] `BG-18.034` Send authenticated init request.
- [ ] `BG-18.035` Check response status.
- [ ] `BG-18.036` Validate returned attachment ID.
- [ ] `BG-18.037` Retain upload URL.
- [ ] `BG-18.038` Retain expiry information if returned.
- [ ] `BG-18.039` Persist initialized operation stage.
- [ ] `BG-18.040` Avoid repeated initialization on uncertain response.

#### BG-18 / 05 — Byte transfer

- [ ] `BG-18.041` Use returned upload route.
- [ ] `BG-18.042` Send original bytes.
- [ ] `BG-18.043` Set appropriate content type.
- [ ] `BG-18.044` Let browser manage Content-Length.
- [ ] `BG-18.045` Show accurate or indeterminate progress.
- [ ] `BG-18.046` Handle transfer abort.
- [ ] `BG-18.047` Handle network disconnect.
- [ ] `BG-18.048` Handle unauthorized transfer response.
- [ ] `BG-18.049` Retain operation on failure.
- [ ] `BG-18.050` Verify upload success before finalization.

#### BG-18 / 06 — Finalization

- [ ] `BG-18.051` Build checksum finalize payload.
- [ ] `BG-18.052` Send authenticated finalize request.
- [ ] `BG-18.053` Validate successful lifecycle result.
- [ ] `BG-18.054` Preserve finalized attachment ID.
- [ ] `BG-18.055` Handle checksum mismatch.
- [ ] `BG-18.056` Handle size mismatch.
- [ ] `BG-18.057` Handle signature rejection.
- [ ] `BG-18.058` Handle expired upload.
- [ ] `BG-18.059` Handle lost finalize response.
- [ ] `BG-18.060` Reconcile status before repeating work.

#### BG-18 / 07 — Canonical linking

- [ ] `BG-18.061` Build capture payload with attachment_id.
- [ ] `BG-18.062` Preserve stable capture key.
- [ ] `BG-18.063` Preserve original capture timestamp.
- [ ] `BG-18.064` Preserve user reason.
- [ ] `BG-18.065` Preserve privacy selection.
- [ ] `BG-18.066` Map image/file source correctly.
- [ ] `BG-18.067` Map approved audio to file capture.
- [ ] `BG-18.068` Send canonical capture request.
- [ ] `BG-18.069` Show Saved only after confirmation.
- [ ] `BG-18.070` Retain canonical capture ID.

#### BG-18 / 08 — Resume and cleanup

- [ ] `BG-18.071` Resume from confirmed stage.
- [ ] `BG-18.072` Add scoped status API only if needed.
- [ ] `BG-18.073` Avoid deleting possibly linked object.
- [ ] `BG-18.074` Reinitialize expired upload deliberately.
- [ ] `BG-18.075` Update operation with replacement ID.
- [ ] `BG-18.076` Leave abandoned object to safe cleanup.
- [ ] `BG-18.077` Preserve retry state after link failure.
- [ ] `BG-18.078` Clear successful local operation.
- [ ] `BG-18.079` Keep unrelated uploads untouched.
- [ ] `BG-18.080` Document cleanup ownership boundary.

#### BG-18 / 09 — Upload regression

- [ ] `BG-18.081` Test valid PDF round trip.
- [ ] `BG-18.082` Test image round trip.
- [ ] `BG-18.083` Test interrupted byte PUT.
- [ ] `BG-18.084` Test interrupted finalize.
- [ ] `BG-18.085` Test lost capture response.
- [ ] `BG-18.086` Test same-key repeated retry.
- [ ] `BG-18.087` Test expired upload restart.
- [ ] `BG-18.088` Test bad signature rejection.
- [ ] `BG-18.089` Test over-limit admission.
- [ ] `BG-18.090` Assert one intended linked object.

#### BG-18 / 10 — Verify and close this task

- [ ] `BG-18.091` **Review:** Compare the completed checklist with BG-18's stated outcome; identify uncovered behavior.
- [ ] `BG-18.092` **Verification:** Run or inspect the focused proof required by BG-18; reuse a valid existing run rather than repeating it gratuitously.
- [ ] `BG-18.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [ ] `BG-18.094` **Integrity:** Check that BG-18 has not weakened its stated data, privacy, scope or recovery guarantees.
- [ ] `BG-18.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [ ] `BG-18.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [ ] `BG-18.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [ ] `BG-18.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [ ] `BG-18.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [ ] `BG-18.100` **Gate:** Check the parent completion boundary and record whether BG-19 is unlocked.

## BG-19 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#25-bg-19--complete-follow-up-fields-and-accessible-successerror-behavior).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-19 / 01 — Establish task context

- [ ] `BG-19.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [ ] `BG-19.002` **Dependency:** Verify BG-18's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [ ] `BG-19.003` **Baseline:** Record the actual checkout or release candidate used for BG-19.
- [ ] `BG-19.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [ ] `BG-19.005` **Evidence:** Check whether existing evidence already satisfies any BG-19 step; reference it instead of manufacturing work.
- [ ] `BG-19.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [ ] `BG-19.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [ ] `BG-19.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [ ] `BG-19.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [ ] `BG-19.010` **Tracking:** Open a BG-19 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-19 / 02 — Contract split

- [ ] `BG-19.011` Read capture schema fields.
- [ ] `BG-19.012` Read item update schema.
- [ ] `BG-19.013` Identify project follow-up field.
- [ ] `BG-19.014` Identify review_at field.
- [ ] `BG-19.015` Identify required edit_version.
- [ ] `BG-19.016` Keep capture payload strict.
- [ ] `BG-19.017` Avoid unsupported capture title field.
- [ ] `BG-19.018` Define follow-up operation boundary.
- [ ] `BG-19.019` Preserve original capture success.
- [ ] `BG-19.020` Record selected two-stage design.

#### BG-19 / 03 — Metadata updates

- [ ] `BG-19.021` Wait for canonical capture acknowledgment.
- [ ] `BG-19.022` Fetch authoritative item detail.
- [ ] `BG-19.023` Read actual current version.
- [ ] `BG-19.024` Build project update payload.
- [ ] `BG-19.025` Build review date update payload.
- [ ] `BG-19.026` Send versioned item update.
- [ ] `BG-19.027` Read updated item response.
- [ ] `BG-19.028` Verify metadata persisted.
- [ ] `BG-19.029` Preserve owner overrides.
- [ ] `BG-19.030` Link follow-up to captured item.

#### BG-19 / 04 — Partial success

- [ ] `BG-19.031` Handle follow-up validation failure.
- [ ] `BG-19.032` Handle follow-up network failure.
- [ ] `BG-19.033` Handle follow-up version conflict.
- [ ] `BG-19.034` Show Saved plus metadata warning.
- [ ] `BG-19.035` Retain metadata retry intent.
- [ ] `BG-19.036` Avoid recapturing original content.
- [ ] `BG-19.037` Refetch version before retry.
- [ ] `BG-19.038` Preserve current owner changes.
- [ ] `BG-19.039` Avoid automatic conflicting overwrite.
- [ ] `BG-19.040` Clear warning after confirmed update.

#### BG-19 / 05 — Duplicate protection

- [ ] `BG-19.041` Detect canonical duplicate response.
- [ ] `BG-19.042` Fetch existing project value.
- [ ] `BG-19.043` Fetch existing review date.
- [ ] `BG-19.044` Preserve existing metadata by default.
- [ ] `BG-19.045` Explain explicit edit action.
- [ ] `BG-19.046` Avoid silent reminder replacement.
- [ ] `BG-19.047` Preserve new share reason separately.
- [ ] `BG-19.048` Handle conflicting duplicate edits.
- [ ] `BG-19.049` Verify correct canonical target.
- [ ] `BG-19.050` Record duplicate metadata behavior.

#### BG-19 / 06 — Time conversion

- [ ] `BG-19.051` Read stored ISO instant.
- [ ] `BG-19.052` Convert instant to local fields.
- [ ] `BG-19.053` Avoid UTC string slicing.
- [ ] `BG-19.054` Parse local datetime selection.
- [ ] `BG-19.055` Convert selected instant to ISO.
- [ ] `BG-19.056` Preserve timezone offset meaning.
- [ ] `BG-19.057` Represent cleared date as null.
- [ ] `BG-19.058` Reject invalid dates.
- [ ] `BG-19.059` Test Asia/Kolkata round trip.
- [ ] `BG-19.060` Test daylight-saving boundary timezone.

#### BG-19 / 07 — Accessibility

- [ ] `BG-19.061` Label project input.
- [ ] `BG-19.062` Label review date input.
- [ ] `BG-19.063` Explain optional follow-up nature.
- [ ] `BG-19.064` Associate metadata errors.
- [ ] `BG-19.065` Announce partial success.
- [ ] `BG-19.066` Announce final metadata success.
- [ ] `BG-19.067` Preserve focus after async update.
- [ ] `BG-19.068` Ensure keyboard-only operation.
- [ ] `BG-19.069` Keep date picker accessible.
- [ ] `BG-19.070` Verify screen-reader status text.

#### BG-19 / 08 — Responsive behavior

- [ ] `BG-19.071` Test narrow phone viewport.
- [ ] `BG-19.072` Keep primary action visible.
- [ ] `BG-19.073` Wrap long source URLs.
- [ ] `BG-19.074` Wrap long server errors.
- [ ] `BG-19.075` Avoid horizontal form scrolling.
- [ ] `BG-19.076` Retain draft after login refresh.
- [ ] `BG-19.077` Keep metadata warning discoverable.
- [ ] `BG-19.078` Keep navigation usable.
- [ ] `BG-19.079` Test browser zoom.
- [ ] `BG-19.080` Check loading layout stability.

#### BG-19 / 09 — End-to-end proof

- [ ] `BG-19.081` Save note with project.
- [ ] `BG-19.082` Save note with reminder.
- [ ] `BG-19.083` Read stored reminder after reload.
- [ ] `BG-19.084` Fail follow-up deliberately.
- [ ] `BG-19.085` Retry metadata without duplicate capture.
- [ ] `BG-19.086` Save duplicate with existing reminder.
- [ ] `BG-19.087` Verify metadata remains protected.
- [ ] `BG-19.088` Exercise timezone editor correction.
- [ ] `BG-19.089` Exercise keyboard submission.
- [ ] `BG-19.090` Record complete capture-follow-up story.

#### BG-19 / 10 — Verify and close this task

- [ ] `BG-19.091` **Review:** Compare the completed checklist with BG-19's stated outcome; identify uncovered behavior.
- [ ] `BG-19.092` **Verification:** Run or inspect the focused proof required by BG-19; reuse a valid existing run rather than repeating it gratuitously.
- [ ] `BG-19.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [ ] `BG-19.094` **Integrity:** Check that BG-19 has not weakened its stated data, privacy, scope or recovery guarantees.
- [ ] `BG-19.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [ ] `BG-19.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [ ] `BG-19.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [ ] `BG-19.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [ ] `BG-19.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [ ] `BG-19.100` **Gate:** Check the parent completion boundary and record whether BG-20 is unlocked.

## BG-20 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#26-bg-20--choose-the-production-web-inbox-origin).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-20 / 01 — Establish task context

- [ ] `BG-20.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [ ] `BG-20.002` **Dependency:** Verify BG-19's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [ ] `BG-20.003` **Baseline:** Record the actual checkout or release candidate used for BG-20.
- [ ] `BG-20.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [ ] `BG-20.005` **Evidence:** Check whether existing evidence already satisfies any BG-20 step; reference it instead of manufacturing work.
- [ ] `BG-20.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [ ] `BG-20.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [ ] `BG-20.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [ ] `BG-20.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [ ] `BG-20.010` **Tracking:** Open a BG-20 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-20 / 02 — Hosting inventory

- [ ] `BG-20.011` Read documented Worker origin.
- [ ] `BG-20.012` Inspect current static hosting records.
- [ ] `BG-20.013` Inspect existing deployment configuration.
- [ ] `BG-20.014` Check current homepage response.
- [ ] `BG-20.015` Check existing Web hostname evidence.
- [ ] `BG-20.016` Identify DNS ownership.
- [ ] `BG-20.017` Identify TLS termination location.
- [ ] `BG-20.018` Identify API origin expectation.
- [ ] `BG-20.019` Identify preview host convention.
- [ ] `BG-20.020` Record verified versus unknown hosting.

#### BG-20 / 03 — Same-origin option

- [ ] `BG-20.021` Read relative API_BASE usage.
- [ ] `BG-20.022` Read admin cookie attributes.
- [ ] `BG-20.023` Identify Worker asset capability.
- [ ] `BG-20.024` Check current official configuration guidance.
- [ ] `BG-20.025` Assess same-origin asset serving.
- [ ] `BG-20.026` Assess API route precedence.
- [ ] `BG-20.027` Assess SPA fallback support.
- [ ] `BG-20.028` Assess private response isolation.
- [ ] `BG-20.029` Assess artifact compatibility.
- [ ] `BG-20.030` Record preferred hosting arrangement.

#### BG-20 / 04 — Alternative origin

- [ ] `BG-20.031` Identify actual separate-host requirement.
- [ ] `BG-20.032` Avoid unnecessary host split.
- [ ] `BG-20.033` Define proxy ownership if required.
- [ ] `BG-20.034` Define trusted forwarding headers.
- [ ] `BG-20.035` Define cookie domain/path behavior.
- [ ] `BG-20.036` Define CORS credential behavior.
- [ ] `BG-20.037` Define CSRF origin behavior.
- [ ] `BG-20.038` Define cross-origin download behavior.
- [ ] `BG-20.039` Define direct-link authentication flow.
- [ ] `BG-20.040` Record rejected unsafe shortcuts.

#### BG-20 / 05 — Canonical links

- [ ] `BG-20.041` Choose canonical Web origin.
- [ ] `BG-20.042` Validate URL scheme.
- [ ] `BG-20.043` Normalize trailing slash behavior.
- [ ] `BG-20.044` Update digest base URL plan.
- [ ] `BG-20.045` Keep preview links separate.
- [ ] `BG-20.046` Keep production links stable.
- [ ] `BG-20.047` Define exact item route format.
- [ ] `BG-20.048` Test logged-out deep link concept.
- [ ] `BG-20.049` Avoid secrets in item links.
- [ ] `BG-20.050` Record origin configuration owner.

#### BG-20 / 06 — Route precedence

- [ ] `BG-20.051` Define API prefix handling.
- [ ] `BG-20.052` Define unknown API JSON behavior.
- [ ] `BG-20.053` Define homepage handling.
- [ ] `BG-20.054` Define item deep-link handling.
- [ ] `BG-20.055` Define capture route handling.
- [ ] `BG-20.056` Define operator route handling.
- [ ] `BG-20.057` Define static asset handling.
- [ ] `BG-20.058` Define missing asset behavior.
- [ ] `BG-20.059` Define SPA fallback exclusions.
- [ ] `BG-20.060` Record route decision table.

#### BG-20 / 07 — Authentication boundary

- [ ] `BG-20.061` Separate public assets from data.
- [ ] `BG-20.062` Keep item APIs authenticated.
- [ ] `BG-20.063` Keep downloads authenticated.
- [ ] `BG-20.064` Keep exports authenticated.
- [ ] `BG-20.065` Validate secure-cookie issuance origin.
- [ ] `BG-20.066` Define session redirect behavior.
- [ ] `BG-20.067` Define untrusted proxy handling.
- [ ] `BG-20.068` Avoid access from page visibility alone.
- [ ] `BG-20.069` Preserve Shortcut bearer compatibility.
- [ ] `BG-20.070` Review origin change implications.

#### BG-20 / 08 — Release design

- [ ] `BG-20.071` Define build artifact ownership.
- [ ] `BG-20.072` Define Worker/Web version pairing.
- [ ] `BG-20.073` Define preview binding isolation.
- [ ] `BG-20.074` Define production secret ownership.
- [ ] `BG-20.075` Define canonical host update steps.
- [ ] `BG-20.076` Define rollback origin behavior.
- [ ] `BG-20.077` Define asset cache policy.
- [ ] `BG-20.078` Define HTML freshness policy.
- [ ] `BG-20.079` Identify hosting implementation tasks.
- [ ] `BG-20.080` Keep production mutation deferred.

#### BG-20 / 09 — Design proof

- [ ] `BG-20.081` Review existing-host evidence.
- [ ] `BG-20.082` Review same-origin request flow.
- [ ] `BG-20.083` Review direct item link flow.
- [ ] `BG-20.084` Review digest link flow.
- [ ] `BG-20.085` Review expired-session flow.
- [ ] `BG-20.086` Review unknown API behavior.
- [ ] `BG-20.087` Review private caching assumptions.
- [ ] `BG-20.088` Record unresolved configuration dependencies.
- [ ] `BG-20.089` Record selected official references.
- [ ] `BG-20.090` Freeze hosting design for implementation.

#### BG-20 / 10 — Verify and close this task

- [ ] `BG-20.091` **Review:** Compare the completed checklist with BG-20's stated outcome; identify uncovered behavior.
- [ ] `BG-20.092` **Verification:** Run or inspect the focused proof required by BG-20; reuse a valid existing run rather than repeating it gratuitously.
- [ ] `BG-20.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [ ] `BG-20.094` **Integrity:** Check that BG-20 has not weakened its stated data, privacy, scope or recovery guarantees.
- [ ] `BG-20.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [ ] `BG-20.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [ ] `BG-20.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [ ] `BG-20.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [ ] `BG-20.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [ ] `BG-20.100` **Gate:** Check the parent completion boundary and record whether BG-21 is unlocked.

## BG-21 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#27-bg-21--build-assets-route-deep-links-and-package-one-release).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-21 / 01 — Establish task context

- [ ] `BG-21.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [ ] `BG-21.002` **Dependency:** Verify BG-20's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [ ] `BG-21.003` **Baseline:** Record the actual checkout or release candidate used for BG-21.
- [ ] `BG-21.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [ ] `BG-21.005` **Evidence:** Check whether existing evidence already satisfies any BG-21 step; reference it instead of manufacturing work.
- [ ] `BG-21.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [ ] `BG-21.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [ ] `BG-21.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [ ] `BG-21.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [ ] `BG-21.010` **Tracking:** Open a BG-21 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-21 / 02 — Build inputs

- [ ] `BG-21.011` Identify Web build command.
- [ ] `BG-21.012` Identify static output directory.
- [ ] `BG-21.013` Confirm source revision.
- [ ] `BG-21.014` Remove stale artifact assumptions.
- [ ] `BG-21.015` Define build-before-package dependency.
- [ ] `BG-21.016` Include matching lockfile.
- [ ] `BG-21.017` Identify source-map policy.
- [ ] `BG-21.018` Confirm asset naming behavior.
- [ ] `BG-21.019` Check missing output failure.
- [ ] `BG-21.020` Record artifact input manifest.

#### BG-21 / 03 — Asset integration

- [ ] `BG-21.021` Read selected runtime configuration.
- [ ] `BG-21.022` Add supported asset binding.
- [ ] `BG-21.023` Point binding to built output.
- [ ] `BG-21.024` Preserve existing D1 binding.
- [ ] `BG-21.025` Preserve existing R2 binding.
- [ ] `BG-21.026` Preserve required secret boundaries.
- [ ] `BG-21.027` Keep preview resources separate.
- [ ] `BG-21.028` Validate configuration syntax.
- [ ] `BG-21.029` Build Worker with asset integration.
- [ ] `BG-21.030` Inspect deployment dry-run output.

#### BG-21 / 04 — API routing

- [ ] `BG-21.031` Route API prefix to Worker.
- [ ] `BG-21.032` Preserve authentication middleware.
- [ ] `BG-21.033` Preserve health response.
- [ ] `BG-21.034` Preserve JSON validation errors.
- [ ] `BG-21.035` Return JSON unknown-route errors.
- [ ] `BG-21.036` Prevent SPA fallback on API.
- [ ] `BG-21.037` Test unknown API GET.
- [ ] `BG-21.038` Test unknown API POST.
- [ ] `BG-21.039` Test unauthorized item request.
- [ ] `BG-21.040` Test malformed authenticated request.

#### BG-21 / 05 — SPA routing

- [ ] `BG-21.041` Serve root entry document.
- [ ] `BG-21.042` Serve direct item route.
- [ ] `BG-21.043` Serve capture route.
- [ ] `BG-21.044` Serve approved operator route.
- [ ] `BG-21.045` Support hard reload.
- [ ] `BG-21.046` Preserve browser history navigation.
- [ ] `BG-21.047` Handle unknown client path intentionally.
- [ ] `BG-21.048` Avoid serving stale HTML indefinitely.
- [ ] `BG-21.049` Preserve correct asset URLs.
- [ ] `BG-21.050` Test encoded item path behavior.

#### BG-21 / 06 — Asset caching

- [ ] `BG-21.051` Identify hashed asset files.
- [ ] `BG-21.052` Assign intended immutable caching.
- [ ] `BG-21.053` Define HTML freshness behavior.
- [ ] `BG-21.054` Exclude private APIs from cache.
- [ ] `BG-21.055` Exclude downloads from shared cache.
- [ ] `BG-21.056` Exclude exports from shared cache.
- [ ] `BG-21.057` Test missing asset status.
- [ ] `BG-21.058` Check content type per asset.
- [ ] `BG-21.059` Check deployment cache invalidation.
- [ ] `BG-21.060` Record cache policy evidence.

#### BG-21 / 07 — TLS and cookies

- [ ] `BG-21.061` Verify actual HTTPS origin.
- [ ] `BG-21.062` Verify Secure cookie issuance.
- [ ] `BG-21.063` Verify HttpOnly cookie property.
- [ ] `BG-21.064` Verify SameSite behavior.
- [ ] `BG-21.065` Verify login through chosen proxy.
- [ ] `BG-21.066` Reject untrusted forwarding assumptions.
- [ ] `BG-21.067` Verify session after hard reload.
- [ ] `BG-21.068` Verify logout on production-like origin.
- [ ] `BG-21.069` Verify private download after login.
- [ ] `BG-21.070` Verify private download after logout.

#### BG-21 / 08 — Release packaging

- [ ] `BG-21.071` Pair Worker and Web versions.
- [ ] `BG-21.072` Record schema compatibility requirements.
- [ ] `BG-21.073` Build artifact in CI.
- [ ] `BG-21.074` Avoid developer-only dist dependency.
- [ ] `BG-21.075` Record output hashes where useful.
- [ ] `BG-21.076` Define rollback artifact selection.
- [ ] `BG-21.077` Verify old/new asset compatibility.
- [ ] `BG-21.078` Fail packaging on missing build.
- [ ] `BG-21.079` Keep secrets out of frontend bundle.
- [ ] `BG-21.080` Publish only intended release artifact.

#### BG-21 / 09 — Preview acceptance

- [ ] `BG-21.081` Start production-like asset preview.
- [ ] `BG-21.082` Open root page.
- [ ] `BG-21.083` Open direct item link.
- [ ] `BG-21.084` Authenticate through actual form.
- [ ] `BG-21.085` Submit capture through preview.
- [ ] `BG-21.086` Download original through preview.
- [ ] `BG-21.087` Test unknown API JSON response.
- [ ] `BG-21.088` Test missing static asset.
- [ ] `BG-21.089` Reload client deep link.
- [ ] `BG-21.090` Record deployable routing proof.

#### BG-21 / 10 — Verify and close this task

- [ ] `BG-21.091` **Review:** Compare the completed checklist with BG-21's stated outcome; identify uncovered behavior.
- [ ] `BG-21.092` **Verification:** Run or inspect the focused proof required by BG-21; reuse a valid existing run rather than repeating it gratuitously.
- [ ] `BG-21.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [ ] `BG-21.094` **Integrity:** Check that BG-21 has not weakened its stated data, privacy, scope or recovery guarantees.
- [ ] `BG-21.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [ ] `BG-21.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [ ] `BG-21.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [ ] `BG-21.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [ ] `BG-21.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [ ] `BG-21.100` **Gate:** Check the parent completion boundary and record whether BG-22 is unlocked.

## BG-22 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#28-bg-22--close-priority-3-with-the-complete-browser-creation-story).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-22 / 01 — Establish task context

- [ ] `BG-22.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [ ] `BG-22.002` **Dependency:** Verify BG-21's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [ ] `BG-22.003` **Baseline:** Record the actual checkout or release candidate used for BG-22.
- [ ] `BG-22.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [ ] `BG-22.005` **Evidence:** Check whether existing evidence already satisfies any BG-22 step; reference it instead of manufacturing work.
- [ ] `BG-22.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [ ] `BG-22.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [ ] `BG-22.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [ ] `BG-22.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [ ] `BG-22.010` **Tracking:** Open a BG-22 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-22 / 02 — Candidate environment

- [ ] `BG-22.011` Identify production-like preview artifact.
- [ ] `BG-22.012` Record Worker/Web revision pair.
- [ ] `BG-22.013` Select isolated bindings.
- [ ] `BG-22.014` Select synthetic fixture set.
- [ ] `BG-22.015` Open fresh browser profile.
- [ ] `BG-22.016` Verify no persisted login.
- [ ] `BG-22.017` Confirm preview health.
- [ ] `BG-22.018` Confirm asset routing active.
- [ ] `BG-22.019` Confirm API is not stubbed.
- [ ] `BG-22.020` Record browser/runtime versions.

#### BG-22 / 03 — Creation matrix

- [ ] `BG-22.021` Save public URL through form.
- [ ] `BG-22.022` Save pasted text through form.
- [ ] `BG-22.023` Save private note through form.
- [ ] `BG-22.024` Save image through upload.
- [ ] `BG-22.025` Save PDF through upload.
- [ ] `BG-22.026` Record canonical IDs.
- [ ] `BG-22.027` Confirm durable success messages.
- [ ] `BG-22.028` Confirm source types.
- [ ] `BG-22.029` Confirm captured reasons.
- [ ] `BG-22.030` Confirm chosen privacy values.

#### BG-22 / 04 — Search and inspection

- [ ] `BG-22.031` Search URL internal phrase.
- [ ] `BG-22.032` Search pasted text phrase.
- [ ] `BG-22.033` Search note phrase.
- [ ] `BG-22.034` Search screenshot known text.
- [ ] `BG-22.035` Search PDF internal phrase.
- [ ] `BG-22.036` Open each exact item.
- [ ] `BG-22.037` Inspect current coverage.
- [ ] `BG-22.038` Inspect original source evidence.
- [ ] `BG-22.039` Inspect per-stage status.
- [ ] `BG-22.040` Verify no unrelated search result.

#### BG-22 / 05 — Original and edit

- [ ] `BG-22.041` Download image original.
- [ ] `BG-22.042` Compare image checksum.
- [ ] `BG-22.043` Download PDF original.
- [ ] `BG-22.044` Compare PDF checksum.
- [ ] `BG-22.045` Edit derived title.
- [ ] `BG-22.046` Edit project metadata.
- [ ] `BG-22.047` Edit reminder metadata.
- [ ] `BG-22.048` Refresh item page.
- [ ] `BG-22.049` Verify persisted values.
- [ ] `BG-22.050` Verify source evidence unchanged.

#### BG-22 / 06 — Retry and duplicates

- [ ] `BG-22.051` Drop capture response after commit.
- [ ] `BG-22.052` Retain submitted operation.
- [ ] `BG-22.053` Retry original key.
- [ ] `BG-22.054` Confirm canonical ID stability.
- [ ] `BG-22.055` Share canonical URL again intentionally.
- [ ] `BG-22.056` Use new reason/key.
- [ ] `BG-22.057` Inspect both capture events.
- [ ] `BG-22.058` Confirm metadata not silently overwritten.
- [ ] `BG-22.059` Confirm no duplicate attachment bytes.
- [ ] `BG-22.060` Record duplicate/retry outcomes.

#### BG-22 / 07 — Provider outage

- [ ] `BG-22.061` Disable approved test AI path.
- [ ] `BG-22.062` Disable test Notion path.
- [ ] `BG-22.063` Save another raw item.
- [ ] `BG-22.064` Retrieve raw item immediately.
- [ ] `BG-22.065` Search supplied phrase.
- [ ] `BG-22.066` Inspect deferred optional state.
- [ ] `BG-22.067` Restore test provider availability.
- [ ] `BG-22.068` Resume eligible processing.
- [ ] `BG-22.069` Verify owner edits survive.
- [ ] `BG-22.070` Verify no false capture failure.

#### BG-22 / 08 — Authentication recovery

- [ ] `BG-22.071` Expire session during upload.
- [ ] `BG-22.072` Preserve operation stage.
- [ ] `BG-22.073` Reauthenticate through real form.
- [ ] `BG-22.074` Resume confirmed upload stage.
- [ ] `BG-22.075` Finish canonical capture.
- [ ] `BG-22.076` Verify one linked object.
- [ ] `BG-22.077` Open direct item URL logged out.
- [ ] `BG-22.078` Complete login navigation.
- [ ] `BG-22.079` Open direct link after browser restart.
- [ ] `BG-22.080` Confirm correct item destination.

#### BG-22 / 09 — Release-candidate closure

- [ ] `BG-22.081` Run full repository gate.
- [ ] `BG-22.082` Check migration compatibility evidence.
- [ ] `BG-22.083` Check Worker bundle evidence.
- [ ] `BG-22.084` Check Web build evidence.
- [ ] `BG-22.085` Inspect browser console errors.
- [ ] `BG-22.086` Inspect safe failed network requests.
- [ ] `BG-22.087` Verify mobile viewport usability.
- [ ] `BG-22.088` Close owned preview processes.
- [ ] `BG-22.089` Save scenario result matrix.
- [ ] `BG-22.090` Record remaining production qualifications.

#### BG-22 / 10 — Verify and close this task

- [ ] `BG-22.091` **Review:** Compare the completed checklist with BG-22's stated outcome; identify uncovered behavior.
- [ ] `BG-22.092` **Verification:** Run or inspect the focused proof required by BG-22; reuse a valid existing run rather than repeating it gratuitously.
- [ ] `BG-22.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [ ] `BG-22.094` **Integrity:** Check that BG-22 has not weakened its stated data, privacy, scope or recovery guarantees.
- [ ] `BG-22.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [ ] `BG-22.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [ ] `BG-22.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [ ] `BG-22.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [ ] `BG-22.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [ ] `BG-22.100` **Gate:** Check the parent completion boundary and record whether BG-23 is unlocked.

## BG-23 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#29-bg-23--make-an-operational-control-inventory).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-23 / 01 — Establish task context

- [ ] `BG-23.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [ ] `BG-23.002` **Dependency:** Verify BG-22's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [ ] `BG-23.003` **Baseline:** Record the actual checkout or release candidate used for BG-23.
- [ ] `BG-23.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [ ] `BG-23.005` **Evidence:** Check whether existing evidence already satisfies any BG-23 step; reference it instead of manufacturing work.
- [ ] `BG-23.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [ ] `BG-23.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [ ] `BG-23.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [ ] `BG-23.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [ ] `BG-23.010` **Tracking:** Open a BG-23 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-23 / 02 — Requirement inventory

- [ ] `BG-23.011` Read OPE-247 scope.
- [ ] `BG-23.012` Read operational runbook incidents.
- [ ] `BG-23.013` List mandatory read controls.
- [ ] `BG-23.014` List mandatory write controls.
- [ ] `BG-23.015` List external actions.
- [ ] `BG-23.016` List destructive actions.
- [ ] `BG-23.017` Identify currently absent controls.
- [ ] `BG-23.018` Separate UI from API availability.
- [ ] `BG-23.019` Separate V1 from later scope.
- [ ] `BG-23.020` Record inventory baseline SHA.

#### BG-23 / 03 — Usage controls

- [ ] `BG-23.021` Locate usage endpoint.
- [ ] `BG-23.022` Identify quota dimensions.
- [ ] `BG-23.023` Identify breaker metadata.
- [ ] `BG-23.024` Identify deferred-job counts.
- [ ] `BG-23.025` Identify last-success timestamps.
- [ ] `BG-23.026` Identify reset timing fields.
- [ ] `BG-23.027` Identify unavailable dimensions.
- [ ] `BG-23.028` Identify provider-account measurement gaps.
- [ ] `BG-23.029` Choose usage presentation surface.
- [ ] `BG-23.030` Define operator interpretation notes.

#### BG-23 / 04 — Failure controls

- [ ] `BG-23.031` Locate job inspection route.
- [ ] `BG-23.032` Locate manual retry route.
- [ ] `BG-23.033` Locate Notion recreation route.
- [ ] `BG-23.034` Locate digest inspection routes.
- [ ] `BG-23.035` Locate purge inspection route.
- [ ] `BG-23.036` Locate backup list route.
- [ ] `BG-23.037` Locate integrity result route.
- [ ] `BG-23.038` Identify eligibility fields.
- [ ] `BG-23.039` Identify missing aggregate query.
- [ ] `BG-23.040` Record safe action per failure.

#### BG-23 / 05 — Control contracts

- [ ] `BG-23.041` Specify required credential per control.
- [ ] `BG-23.042` Specify required version field.
- [ ] `BG-23.043` Specify required confirmation phrase.
- [ ] `BG-23.044` Specify idempotency behavior.
- [ ] `BG-23.045` Specify success response.
- [ ] `BG-23.046` Specify rejection response.
- [ ] `BG-23.047` Specify expected audit event.
- [ ] `BG-23.048` Specify retry eligibility.
- [ ] `BG-23.049` Specify content disclosure limit.
- [ ] `BG-23.050` Specify cancellation semantics.

#### BG-23 / 06 — Surface selection

- [ ] `BG-23.051` Keep normal review in Web.
- [ ] `BG-23.052` Choose small operations page scope.
- [ ] `BG-23.053` Keep advanced restore procedure explicit.
- [ ] `BG-23.054` Avoid duplicate backend logic.
- [ ] `BG-23.055` Identify command-only operations.
- [ ] `BG-23.056` Document command input format.
- [ ] `BG-23.057` Document command result interpretation.
- [ ] `BG-23.058` Mark unimplemented UI honestly.
- [ ] `BG-23.059` Record owner-facing navigation need.
- [ ] `BG-23.060` Freeze minimum V1 operator surface.

#### BG-23 / 07 — Safety classification

- [ ] `BG-23.061` Mark read-only inspection actions.
- [ ] `BG-23.062` Mark reversible edits.
- [ ] `BG-23.063` Mark external projection actions.
- [ ] `BG-23.064` Mark external delivery actions.
- [ ] `BG-23.065` Mark permanent purge actions.
- [ ] `BG-23.066` Mark clean-target restore actions.
- [ ] `BG-23.067` Define target identification display.
- [ ] `BG-23.068` Define confirmation copy.
- [ ] `BG-23.069` Define partial-success copy.
- [ ] `BG-23.070` Define unsupported-action behavior.

#### BG-23 / 08 — Incident mapping

- [ ] `BG-23.071` Map capture failure to diagnosis.
- [ ] `BG-23.072` Map AI pause to quota state.
- [ ] `BG-23.073` Map Notion failure to recovery.
- [ ] `BG-23.074` Map digest unknown to reconciliation.
- [ ] `BG-23.075` Map backup failure to verification.
- [ ] `BG-23.076` Map partial purge to steps.
- [ ] `BG-23.077` Map stale lease to retry timing.
- [ ] `BG-23.078` Map missing file to integrity.
- [ ] `BG-23.079` Map token compromise to revocation.
- [ ] `BG-23.080` Identify incidents without usable action.

#### BG-23 / 09 — Inventory proof

- [ ] `BG-23.081` Walk each runbook incident.
- [ ] `BG-23.082` Locate its actual operator surface.
- [ ] `BG-23.083` Verify endpoint authorization.
- [ ] `BG-23.084` Verify command examples match schema.
- [ ] `BG-23.085` Verify no hidden write on inspect.
- [ ] `BG-23.086` Verify unresolved controls named.
- [ ] `BG-23.087` Record implementation versus planned state.
- [ ] `BG-23.088` Link controls to existing tickets.
- [ ] `BG-23.089` Record scope decisions.
- [ ] `BG-23.090` Prepare operational implementation checklist.

#### BG-23 / 10 — Verify and close this task

- [ ] `BG-23.091` **Review:** Compare the completed checklist with BG-23's stated outcome; identify uncovered behavior.
- [ ] `BG-23.092` **Verification:** Run or inspect the focused proof required by BG-23; reuse a valid existing run rather than repeating it gratuitously.
- [ ] `BG-23.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [ ] `BG-23.094` **Integrity:** Check that BG-23 has not weakened its stated data, privacy, scope or recovery guarantees.
- [ ] `BG-23.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [ ] `BG-23.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [ ] `BG-23.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [ ] `BG-23.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [ ] `BG-23.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [ ] `BG-23.100` **Gate:** Check the parent completion boundary and record whether BG-24 is unlocked.

## BG-24 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#30-bg-24--implement-bounded-token-rotation-and-session-behavior).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-24 / 01 — Establish task context

- [ ] `BG-24.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [ ] `BG-24.002` **Dependency:** Verify BG-23's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [ ] `BG-24.003` **Baseline:** Record the actual checkout or release candidate used for BG-24.
- [ ] `BG-24.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [ ] `BG-24.005` **Evidence:** Check whether existing evidence already satisfies any BG-24 step; reference it instead of manufacturing work.
- [ ] `BG-24.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [ ] `BG-24.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [ ] `BG-24.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [ ] `BG-24.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [ ] `BG-24.010` **Tracking:** Open a BG-24 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-24 / 02 — Rotation contract

- [ ] `BG-24.011` Read ADR-033 requirements.
- [ ] `BG-24.012` Confirm normal overlap duration.
- [ ] `BG-24.013` Confirm maximum overlap duration.
- [ ] `BG-24.014` Confirm compromise revocation rule.
- [ ] `BG-24.015` Identify capture credential scope.
- [ ] `BG-24.016` Identify admin credential scope.
- [ ] `BG-24.017` Identify worker credential scope.
- [ ] `BG-24.018` Define current/next slot semantics.
- [ ] `BG-24.019` Define safe slot identifiers.
- [ ] `BG-24.020` Document token-free audit requirements.

#### BG-24 / 03 — Configuration shape

- [ ] `BG-24.021` Choose documented secret slot names.
- [ ] `BG-24.022` Define activation metadata.
- [ ] `BG-24.023` Define expiry metadata.
- [ ] `BG-24.024` Define issuance slot metadata.
- [ ] `BG-24.025` Define retirement metadata.
- [ ] `BG-24.026` Keep secret values outside D1.
- [ ] `BG-24.027` Validate metadata types.
- [ ] `BG-24.028` Reject impossible time ordering.
- [ ] `BG-24.029` Reject overlap beyond maximum.
- [ ] `BG-24.030` Reject indefinite secondary validity.

#### BG-24 / 04 — Bearer verification

- [ ] `BG-24.031` Reuse constant-time helper.
- [ ] `BG-24.032` Identify eligible current credential.
- [ ] `BG-24.033` Identify eligible next credential.
- [ ] `BG-24.034` Check activation before acceptance.
- [ ] `BG-24.035` Check expiry before acceptance.
- [ ] `BG-24.036` Preserve endpoint scope rules.
- [ ] `BG-24.037` Reject unrelated scope credential.
- [ ] `BG-24.038` Define mixed-credential precedence.
- [ ] `BG-24.039` Avoid timing-sensitive short-circuit changes.
- [ ] `BG-24.040` Return safe authentication failures.

#### BG-24 / 05 — Promotion and retirement

- [ ] `BG-24.041` Define next-to-current promotion.
- [ ] `BG-24.042` Define old-slot removal.
- [ ] `BG-24.043` Clear obsolete overlap metadata.
- [ ] `BG-24.044` Preserve clients using promoted token.
- [ ] `BG-24.045` Avoid data migrations.
- [ ] `BG-24.046` Record promotion timestamp.
- [ ] `BG-24.047` Record retiring actor.
- [ ] `BG-24.048` Reject expired old credential.
- [ ] `BG-24.049` Verify retirement idempotency.
- [ ] `BG-24.050` Document rollback-safe rotation procedure.

#### BG-24 / 06 — Cookie design

- [ ] `BG-24.051` Identify existing signing key source.
- [ ] `BG-24.052` Define active issuance key.
- [ ] `BG-24.053` Define accepted verification keys.
- [ ] `BG-24.054` Define cookie key/version marker.
- [ ] `BG-24.055` Preserve HttpOnly attribute.
- [ ] `BG-24.056` Preserve cookie lifetime bound.
- [ ] `BG-24.057` Prevent old-token login lifetime extension.
- [ ] `BG-24.058` Keep promoted-key sessions valid.
- [ ] `BG-24.059` Expire revoked-key sessions.
- [ ] `BG-24.060` Test tampered key marker rejection.

#### BG-24 / 07 — Compromise path

- [ ] `BG-24.061` Select compromised scope fixture.
- [ ] `BG-24.062` Revoke old token immediately.
- [ ] `BG-24.063` Disable overlap for incident.
- [ ] `BG-24.064` Revoke old signed sessions.
- [ ] `BG-24.065` Preserve unaffected scope behavior.
- [ ] `BG-24.066` Require owner reauthentication.
- [ ] `BG-24.067` Record incident without secret.
- [ ] `BG-24.068` Verify old cookie rejection.
- [ ] `BG-24.069` Verify old bearer rejection.
- [ ] `BG-24.070` Verify new credential continuity.

#### BG-24 / 08 — Clock boundaries

- [ ] `BG-24.071` Test before activation.
- [ ] `BG-24.072` Test exact activation.
- [ ] `BG-24.073` Test within overlap.
- [ ] `BG-24.074` Test exact expiry.
- [ ] `BG-24.075` Test after expiry.
- [ ] `BG-24.076` Test maximum window acceptance.
- [ ] `BG-24.077` Test overlong window rejection.
- [ ] `BG-24.078` Test missing metadata rejection.
- [ ] `BG-24.079` Test next promotion boundary.
- [ ] `BG-24.080` Restore controlled clock after tests.

#### BG-24 / 09 — Runbook rehearsal

- [ ] `BG-24.081` Prepare dummy rotation credentials.
- [ ] `BG-24.082` Exercise capture client update.
- [ ] `BG-24.083` Exercise admin login update.
- [ ] `BG-24.084` Exercise local-worker update.
- [ ] `BG-24.085` Verify no item changes.
- [ ] `BG-24.086` Scan audit output for secrets.
- [ ] `BG-24.087` Document interactive secret input.
- [ ] `BG-24.088` Document immediate retirement command.
- [ ] `BG-24.089` Record routine rotation evidence.
- [ ] `BG-24.090` Record compromise rotation evidence.

#### BG-24 / 10 — Verify and close this task

- [ ] `BG-24.091` **Review:** Compare the completed checklist with BG-24's stated outcome; identify uncovered behavior.
- [ ] `BG-24.092` **Verification:** Run or inspect the focused proof required by BG-24; reuse a valid existing run rather than repeating it gratuitously.
- [ ] `BG-24.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [ ] `BG-24.094` **Integrity:** Check that BG-24 has not weakened its stated data, privacy, scope or recovery guarantees.
- [ ] `BG-24.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [ ] `BG-24.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [ ] `BG-24.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [ ] `BG-24.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [ ] `BG-24.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [ ] `BG-24.100` **Gate:** Check the parent completion boundary and record whether BG-25 is unlocked.

## BG-25 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#31-bg-25--harden-authentication-session-requests-and-logs).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-25 / 01 — Establish task context

- [ ] `BG-25.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [ ] `BG-25.002` **Dependency:** Verify BG-24's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [ ] `BG-25.003` **Baseline:** Record the actual checkout or release candidate used for BG-25.
- [ ] `BG-25.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [ ] `BG-25.005` **Evidence:** Check whether existing evidence already satisfies any BG-25 step; reference it instead of manufacturing work.
- [ ] `BG-25.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [ ] `BG-25.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [ ] `BG-25.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [ ] `BG-25.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [ ] `BG-25.010` **Tracking:** Open a BG-25 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-25 / 02 — Entry points

- [ ] `BG-25.011` List unauthenticated login route.
- [ ] `BG-25.012` List anonymous capture rejection path.
- [ ] `BG-25.013` List upload admission path.
- [ ] `BG-25.014` List health route.
- [ ] `BG-25.015` List cookie mutations.
- [ ] `BG-25.016` List bearer mutations.
- [ ] `BG-25.017` List private download routes.
- [ ] `BG-25.018` List export routes.
- [ ] `BG-25.019` Separate liveness from private readiness.
- [ ] `BG-25.020` Record threat boundary inventory.

#### BG-25 / 03 — Login abuse

- [ ] `BG-25.021` Inspect platform limiter options.
- [ ] `BG-25.022` Choose bounded limiter key.
- [ ] `BG-25.023` Choose configured observation window.
- [ ] `BG-25.024` Define limit response.
- [ ] `BG-25.025` Define recovery/reset behavior.
- [ ] `BG-25.026` Avoid permanent attacker-triggered lockout.
- [ ] `BG-25.027` Preserve owner repair procedure.
- [ ] `BG-25.028` Test repeated invalid login.
- [ ] `BG-25.029` Test limit reset.
- [ ] `BG-25.030` Keep token values out of counters.

#### BG-25 / 04 — Session security

- [ ] `BG-25.031` Verify Secure under HTTPS.
- [ ] `BG-25.032` Verify HttpOnly behavior.
- [ ] `BG-25.033` Verify SameSite behavior.
- [ ] `BG-25.034` Verify session expiration.
- [ ] `BG-25.035` Verify logout cookie removal.
- [ ] `BG-25.036` Distinguish logout from global revocation.
- [ ] `BG-25.037` Verify rotation session policy.
- [ ] `BG-25.038` Reject tampered sessions.
- [ ] `BG-25.039` Reject stale signing keys.
- [ ] `BG-25.040` Document stolen-cookie incident behavior.

#### BG-25 / 05 — Origin and CSRF

- [ ] `BG-25.041` Inventory every cookie write route.
- [ ] `BG-25.042` Apply agreed origin protection.
- [ ] `BG-25.043` Test unexpected Origin.
- [ ] `BG-25.044` Test null Origin.
- [ ] `BG-25.045` Test missing Origin policy.
- [ ] `BG-25.046` Preserve legitimate bearer clients.
- [ ] `BG-25.047` Prevent arbitrary credentialed CORS.
- [ ] `BG-25.048` Verify proxy trust boundary.
- [ ] `BG-25.049` Verify operations-control protection.
- [ ] `BG-25.050` Record route-wide matrix.

#### BG-25 / 06 — Body admission

- [ ] `BG-25.051` Inspect JSON body limits.
- [ ] `BG-25.052` Inspect multipart limits.
- [ ] `BG-25.053` Inspect raw upload limits.
- [ ] `BG-25.054` Enforce earliest supported admission.
- [ ] `BG-25.055` Bound malformed request handling.
- [ ] `BG-25.056` Test missing Content-Length.
- [ ] `BG-25.057` Test oversized JSON.
- [ ] `BG-25.058` Test oversized multipart.
- [ ] `BG-25.059` Test chunked oversized bytes.
- [ ] `BG-25.060` Verify no expensive unauthorized parsing.

#### BG-25 / 07 — Log redaction

- [ ] `BG-25.061` Place synthetic secret in header.
- [ ] `BG-25.062` Place marker in malformed JSON.
- [ ] `BG-25.063` Place marker in URL query.
- [ ] `BG-25.064` Place marker in upstream error.
- [ ] `BG-25.065` Trigger each error path.
- [ ] `BG-25.066` Inspect structured application logs.
- [ ] `BG-25.067` Inspect public error responses.
- [ ] `BG-25.068` Assert token marker absent.
- [ ] `BG-25.069` Assert private source marker absent.
- [ ] `BG-25.070` Record safe retained diagnostics.

#### BG-25 / 08 — Rendering and files

- [ ] `BG-25.071` Escape acquired source snippets.
- [ ] `BG-25.072` Escape user-supplied filename.
- [ ] `BG-25.073` Escape provider error text.
- [ ] `BG-25.074` Avoid unsafe HTML insertion.
- [ ] `BG-25.075` Reject object-key traversal attempts.
- [ ] `BG-25.076` Reject guessed private access.
- [ ] `BG-25.077` Reject wrong-scope file access.
- [ ] `BG-25.078` Reject stale upload authority.
- [ ] `BG-25.079` Verify signature validation remains.
- [ ] `BG-25.080` Verify cache does not expose bytes.

#### BG-25 / 09 — Security closure

- [ ] `BG-25.081` Run focused boundary regressions.
- [ ] `BG-25.082` Run complete auth matrix.
- [ ] `BG-25.083` Review deployed response headers.
- [ ] `BG-25.084` Review export confidentiality.
- [ ] `BG-25.085` Check valid downloads still work.
- [ ] `BG-25.086` Review scanner findings separately.
- [ ] `BG-25.087` Document actual vulnerabilities fixed.
- [ ] `BG-25.088` Document unresolved threat boundaries.
- [ ] `BG-25.089` Update security acceptance evidence.
- [ ] `BG-25.090` Avoid scanner-only completion claim.

#### BG-25 / 10 — Verify and close this task

- [ ] `BG-25.091` **Review:** Compare the completed checklist with BG-25's stated outcome; identify uncovered behavior.
- [ ] `BG-25.092` **Verification:** Run or inspect the focused proof required by BG-25; reuse a valid existing run rather than repeating it gratuitously.
- [ ] `BG-25.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [ ] `BG-25.094` **Integrity:** Check that BG-25 has not weakened its stated data, privacy, scope or recovery guarantees.
- [ ] `BG-25.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [ ] `BG-25.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [ ] `BG-25.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [ ] `BG-25.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [ ] `BG-25.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [ ] `BG-25.100` **Gate:** Check the parent completion boundary and record whether BG-26 is unlocked.

## BG-26 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#32-bg-26--show-usage-backlog-and-recovery-state-truthfully).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-26 / 01 — Establish task context

- [ ] `BG-26.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [ ] `BG-26.002` **Dependency:** Verify BG-25's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [ ] `BG-26.003` **Baseline:** Record the actual checkout or release candidate used for BG-26.
- [ ] `BG-26.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [ ] `BG-26.005` **Evidence:** Check whether existing evidence already satisfies any BG-26 step; reference it instead of manufacturing work.
- [ ] `BG-26.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [ ] `BG-26.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [ ] `BG-26.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [ ] `BG-26.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [ ] `BG-26.010` **Tracking:** Open a BG-26 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-26 / 02 — Usage data

- [ ] `BG-26.011` Read current usage response.
- [ ] `BG-26.012` Identify policy version field.
- [ ] `BG-26.013` Identify active window boundaries.
- [ ] `BG-26.014` Identify consumed counters.
- [ ] `BG-26.015` Identify reserved counters.
- [ ] `BG-26.016` Identify remaining headroom.
- [ ] `BG-26.017` Identify breaker state fields.
- [ ] `BG-26.018` Identify deferred-job counters.
- [ ] `BG-26.019` Identify last success fields.
- [ ] `BG-26.020` Define unavailable-data representation.

#### BG-26 / 03 — Usage presentation

- [ ] `BG-26.021` Label units accurately.
- [ ] `BG-26.022` Distinguish estimated from account usage.
- [ ] `BG-26.023` Show 70-percent warning.
- [ ] `BG-26.024` Show 90-percent warning.
- [ ] `BG-26.025` Show hard-stop state.
- [ ] `BG-26.026` Show next reset time.
- [ ] `BG-26.027` Show unavailable dimension honestly.
- [ ] `BG-26.028` Avoid unlimited inference.
- [ ] `BG-26.029` Explain reserved versus consumed.
- [ ] `BG-26.030` Avoid suggesting quota bypass.

#### BG-26 / 04 — Backlog query

- [ ] `BG-26.031` Inspect existing job list scope.
- [ ] `BG-26.032` Define bounded aggregate query.
- [ ] `BG-26.033` Group by job type.
- [ ] `BG-26.034` Group by visible state.
- [ ] `BG-26.035` Calculate oldest eligible age.
- [ ] `BG-26.036` Include next available time.
- [ ] `BG-26.037` Include safe error code counts.
- [ ] `BG-26.038` Separate Notion from processing.
- [ ] `BG-26.039` Inspect query plan.
- [ ] `BG-26.040` Measure D1 rows read.

#### BG-26 / 05 — Backlog UI

- [ ] `BG-26.041` Show pending work count.
- [ ] `BG-26.042` Show processing work count.
- [ ] `BG-26.043` Show retry-wait count.
- [ ] `BG-26.044` Show terminal failures.
- [ ] `BG-26.045` Show oldest backlog age.
- [ ] `BG-26.046` Show next eligible retry.
- [ ] `BG-26.047` Show safe failure reason.
- [ ] `BG-26.048` Link supported inspection control.
- [ ] `BG-26.049` Hide ineligible retry action.
- [ ] `BG-26.050` Keep raw content off dashboard.

#### BG-26 / 06 — Recovery signals

- [ ] `BG-26.051` Show partial purge count.
- [ ] `BG-26.052` Show failed backup state.
- [ ] `BG-26.053` Show latest verified backup.
- [ ] `BG-26.054` Show last integrity result.
- [ ] `BG-26.055` Show ambiguous digest count.
- [ ] `BG-26.056` Show missing Notion projections.
- [ ] `BG-26.057` Link per-step purge inspection.
- [ ] `BG-26.058` Link digest reconciliation guidance.
- [ ] `BG-26.059` Link backup verification details.
- [ ] `BG-26.060` Distinguish warnings from completed recovery.

#### BG-26 / 07 — Storage indicators

- [ ] `BG-26.061` Identify R2 usage source.
- [ ] `BG-26.062` Show stored byte count.
- [ ] `BG-26.063` Show object count where available.
- [ ] `BG-26.064` Show orphan pressure.
- [ ] `BG-26.065` Identify D1 capacity source.
- [ ] `BG-26.066` Show rows-read/write measures if available.
- [ ] `BG-26.067` Label provider-dashboard-only measures.
- [ ] `BG-26.068` Record measurement timestamp.
- [ ] `BG-26.069` Avoid fabricated zero values.
- [ ] `BG-26.070` Explain measurement scope.

#### BG-26 / 08 — Refresh behavior

- [ ] `BG-26.071` Show initial loading state.
- [ ] `BG-26.072` Show fetch error state.
- [ ] `BG-26.073` Preserve last successful reading.
- [ ] `BG-26.074` Mark stale reading visibly.
- [ ] `BG-26.075` Bound refresh interval.
- [ ] `BG-26.076` Cancel superseded requests.
- [ ] `BG-26.077` Avoid per-item full downloads.
- [ ] `BG-26.078` Stop polling on logout.
- [ ] `BG-26.079` Announce important status changes accessibly.
- [ ] `BG-26.080` Verify narrow-screen layout.

#### BG-26 / 09 — Continuity proof

- [ ] `BG-26.081` Force approved test quota stop.
- [ ] `BG-26.082` Save synthetic capture.
- [ ] `BG-26.083` Retrieve raw item.
- [ ] `BG-26.084` Search exact phrase.
- [ ] `BG-26.085` Inspect pending optional job.
- [ ] `BG-26.086` Inspect dashboard hard-stop message.
- [ ] `BG-26.087` Release/reset quota fixture.
- [ ] `BG-26.088` Observe eligible work resume.
- [ ] `BG-26.089` Verify no credential in response.
- [ ] `BG-26.090` Record operational visibility acceptance.

#### BG-26 / 10 — Verify and close this task

- [ ] `BG-26.091` **Review:** Compare the completed checklist with BG-26's stated outcome; identify uncovered behavior.
- [ ] `BG-26.092` **Verification:** Run or inspect the focused proof required by BG-26; reuse a valid existing run rather than repeating it gratuitously.
- [ ] `BG-26.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [ ] `BG-26.094` **Integrity:** Check that BG-26 has not weakened its stated data, privacy, scope or recovery guarantees.
- [ ] `BG-26.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [ ] `BG-26.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [ ] `BG-26.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [ ] `BG-26.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [ ] `BG-26.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [ ] `BG-26.100` **Gate:** Check the parent completion boundary and record whether BG-27 is unlocked.

## BG-27 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#33-bg-27--make-digest-review-and-delivery-uncertainty-operable).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-27 / 01 — Establish task context

- [ ] `BG-27.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [ ] `BG-27.002` **Dependency:** Verify BG-26's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [ ] `BG-27.003` **Baseline:** Record the actual checkout or release candidate used for BG-27.
- [ ] `BG-27.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [ ] `BG-27.005` **Evidence:** Check whether existing evidence already satisfies any BG-27 step; reference it instead of manufacturing work.
- [ ] `BG-27.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [ ] `BG-27.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [ ] `BG-27.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [ ] `BG-27.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [ ] `BG-27.010` **Tracking:** Open a BG-27 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-27 / 02 — Route mapping

- [ ] `BG-27.011` Locate generation route.
- [ ] `BG-27.012` Locate digest inspection route.
- [ ] `BG-27.013` Locate review route.
- [ ] `BG-27.014` Locate regeneration route.
- [ ] `BG-27.015` Locate delivery queue route.
- [ ] `BG-27.016` Locate reconciliation route.
- [ ] `BG-27.017` Read each request schema.
- [ ] `BG-27.018` Read delivery state enum.
- [ ] `BG-27.019` Read eligibility checks.
- [ ] `BG-27.020` Avoid inventing send endpoint.

#### BG-27 / 03 — Preview presentation

- [ ] `BG-27.021` Show digest type.
- [ ] `BG-27.022` Show period start.
- [ ] `BG-27.023` Show period end.
- [ ] `BG-27.024` Show Asia/Kolkata timezone.
- [ ] `BG-27.025` Show eligible item count.
- [ ] `BG-27.026` Show review status.
- [ ] `BG-27.027` Show delivery status.
- [ ] `BG-27.028` Show safe failure code.
- [ ] `BG-27.029` Show exact item links.
- [ ] `BG-27.030` Mark preview as not sent.

#### BG-27 / 04 — Generation and review

- [ ] `BG-27.031` Generate without queueing delivery.
- [ ] `BG-27.032` Preserve deterministic selection.
- [ ] `BG-27.033` Validate preview payload.
- [ ] `BG-27.034` Render public labels.
- [ ] `BG-27.035` Render restricted neutral labels.
- [ ] `BG-27.036` Record review actor safely.
- [ ] `BG-27.037` Require supported review action.
- [ ] `BG-27.038` Queue only eligible reviewed state.
- [ ] `BG-27.039` Avoid implicit external send.
- [ ] `BG-27.040` Handle generation failure visibly.

#### BG-27 / 05 — Delivery privacy

- [ ] `BG-27.041` Recheck item deletion at send.
- [ ] `BG-27.042` Recheck current privacy at send.
- [ ] `BG-27.043` Remove newly ineligible content.
- [ ] `BG-27.044` Preserve neutral restricted labels.
- [ ] `BG-27.045` Suppress now-empty delivery.
- [ ] `BG-27.046` Validate Web origin in links.
- [ ] `BG-27.047` Validate exact item identifier.
- [ ] `BG-27.048` Reject untrusted link construction.
- [ ] `BG-27.049` Test logged-out link opening.
- [ ] `BG-27.050` Preserve item auth boundary.

#### BG-27 / 06 — Definite failures

- [ ] `BG-27.051` Detect definite rate-limit rejection.
- [ ] `BG-27.052` Respect next eligible delivery time.
- [ ] `BG-27.053` Preserve retry count rules.
- [ ] `BG-27.054` Show eligible retry control.
- [ ] `BG-27.055` Detect definite terminal error.
- [ ] `BG-27.056` Hide invalid generic Retry.
- [ ] `BG-27.057` Keep message content out of logs.
- [ ] `BG-27.058` Prevent duplicate queued attempts.
- [ ] `BG-27.059` Verify retry-safe message identity.
- [ ] `BG-27.060` Record final known outcome.

#### BG-27 / 07 — Unknown delivery

- [ ] `BG-27.061` Detect ambiguous transport result.
- [ ] `BG-27.062` Store unknown state.
- [ ] `BG-27.063` Prevent automatic resend.
- [ ] `BG-27.064` Show reconciliation requirement.
- [ ] `BG-27.065` Inspect actual destination evidence.
- [ ] `BG-27.066` Require message ID for sent conclusion.
- [ ] `BG-27.067` Use supported failed conclusion.
- [ ] `BG-27.068` Avoid guessing from immediate absence.
- [ ] `BG-27.069` Audit reconciliation actor.
- [ ] `BG-27.070` Verify one resolved delivery state.

#### BG-27 / 08 — Regeneration

- [ ] `BG-27.071` Check current digest eligibility.
- [ ] `BG-27.072` Check already-sent behavior.
- [ ] `BG-27.073` Preserve period identity.
- [ ] `BG-27.074` Recompute current item eligibility.
- [ ] `BG-27.075` Preserve version/review rules.
- [ ] `BG-27.076` Avoid mutating sent history silently.
- [ ] `BG-27.077` Prevent duplicate same-period delivery.
- [ ] `BG-27.078` Display regenerated preview state.
- [ ] `BG-27.079` Require review when appropriate.
- [ ] `BG-27.080` Verify empty-period distinction.

#### BG-27 / 09 — Acceptance fixtures

- [ ] `BG-27.081` Test deterministic preview.
- [ ] `BG-27.082` Test privacy change before send.
- [ ] `BG-27.083` Test deletion before send.
- [ ] `BG-27.084` Test definite 429 recovery.
- [ ] `BG-27.085` Test ambiguous timeout.
- [ ] `BG-27.086` Test reconciled sent result.
- [ ] `BG-27.087` Test reconciled failed result.
- [ ] `BG-27.088` Test exact deep links.
- [ ] `BG-27.089` Test empty-period suppression.
- [ ] `BG-27.090` Keep live send separately authorized.

#### BG-27 / 10 — Verify and close this task

- [ ] `BG-27.091` **Review:** Compare the completed checklist with BG-27's stated outcome; identify uncovered behavior.
- [ ] `BG-27.092` **Verification:** Run or inspect the focused proof required by BG-27; reuse a valid existing run rather than repeating it gratuitously.
- [ ] `BG-27.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [ ] `BG-27.094` **Integrity:** Check that BG-27 has not weakened its stated data, privacy, scope or recovery guarantees.
- [ ] `BG-27.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [ ] `BG-27.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [ ] `BG-27.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [ ] `BG-27.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [ ] `BG-27.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [ ] `BG-27.100` **Gate:** Check the parent completion boundary and record whether BG-28 is unlocked.

## BG-28 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#34-bg-28--make-backup-restore-and-purge-procedures-complete).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-28 / 01 — Establish task context

- [ ] `BG-28.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [ ] `BG-28.002` **Dependency:** Verify BG-27's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [ ] `BG-28.003` **Baseline:** Record the actual checkout or release candidate used for BG-28.
- [ ] `BG-28.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [ ] `BG-28.005` **Evidence:** Check whether existing evidence already satisfies any BG-28 step; reference it instead of manufacturing work.
- [ ] `BG-28.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [ ] `BG-28.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [ ] `BG-28.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [ ] `BG-28.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [ ] `BG-28.010` **Tracking:** Open a BG-28 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-28 / 02 — Export documentation

- [ ] `BG-28.011` Read portable JSON envelope.
- [ ] `BG-28.012` Record schema version.
- [ ] `BG-28.013` Record item-count semantics.
- [ ] `BG-28.014` Document CSV readability purpose.
- [ ] `BG-28.015` Document JSON restore requirement.
- [ ] `BG-28.016` Document attachment metadata contents.
- [ ] `BG-28.017` Document absent embedded bytes.
- [ ] `BG-28.018` Document credential exclusion.
- [ ] `BG-28.019` Document owner-copy disclosure.
- [ ] `BG-28.020` Verify examples match real payload.

#### BG-28 / 03 — Original-byte strategy

- [ ] `BG-28.021` Inventory attachment object references.
- [ ] `BG-28.022` Define independent byte-copy procedure.
- [ ] `BG-28.023` Create checksum manifest format.
- [ ] `BG-28.024` Record source and target bucket identities.
- [ ] `BG-28.025` Preserve ownership metadata.
- [ ] `BG-28.026` Verify copied byte count.
- [ ] `BG-28.027` Verify copied hashes.
- [ ] `BG-28.028` Define missing-object reporting.
- [ ] `BG-28.029` Separate same-bucket from disaster recovery.
- [ ] `BG-28.030` Record original-byte retention policy.

#### BG-28 / 04 — Backup creation

- [ ] `BG-28.031` Inspect current creation endpoint.
- [ ] `BG-28.032` Inspect scheduled cleanup caller.
- [ ] `BG-28.033` Confirm cleanup does not create backups.
- [ ] `BG-28.034` Select required creation cadence.
- [ ] `BG-28.035` Select actual creation mechanism.
- [ ] `BG-28.036` Bound creation concurrency.
- [ ] `BG-28.037` Preserve unique object keys.
- [ ] `BG-28.038` Verify read-back requirement.
- [ ] `BG-28.039` Expose failed verification state.
- [ ] `BG-28.040` Record successful verification timestamp.

#### BG-28 / 05 — Retention

- [ ] `BG-28.041` Read 30-day retention decision.
- [ ] `BG-28.042` Show backup expiry timestamp.
- [ ] `BG-28.043` Keep verified backups immutable.
- [ ] `BG-28.044` Remove only eligible expired artifacts.
- [ ] `BG-28.045` Preserve unexpired backups.
- [ ] `BG-28.046` Preserve canonical items during cleanup.
- [ ] `BG-28.047` Record cleanup failure safely.
- [ ] `BG-28.048` Disclose owner-controlled copies.
- [ ] `BG-28.049` Avoid false remote erase claims.
- [ ] `BG-28.050` Verify retention procedure example.

#### BG-28 / 06 — Restore procedure

- [ ] `BG-28.051` Write explicit dry_run request.
- [ ] `BG-28.052` Explain omitted mode behavior.
- [ ] `BG-28.053` Verify target identity step.
- [ ] `BG-28.054` Require clean target.
- [ ] `BG-28.055` Validate compatible schema.
- [ ] `BG-28.056` Validate counts and references.
- [ ] `BG-28.057` Include original-byte restoration.
- [ ] `BG-28.058` Include purge ledger merge.
- [ ] `BG-28.059` Include FTS verification.
- [ ] `BG-28.060` Define stop conditions before traffic switch.

#### BG-28 / 07 — Purge procedure

- [ ] `BG-28.061` Require existing soft deletion.
- [ ] `BG-28.062` Fetch current edit version.
- [ ] `BG-28.063` Request workflow-bound confirmation.
- [ ] `BG-28.064` Display returned exact phrase.
- [ ] `BG-28.065` Display confirmation expiry.
- [ ] `BG-28.066` Confirm only intended workflow.
- [ ] `BG-28.067` Inspect queued/processing state.
- [ ] `BG-28.068` Inspect per-step results.
- [ ] `BG-28.069` Distinguish partial from complete.
- [ ] `BG-28.070` Preserve retryable lease recovery.

#### BG-28 / 08 — Cross-system safety

- [ ] `BG-28.071` Stop before canonical deletion on R2 failure.
- [ ] `BG-28.072` Stop on required Notion failure.
- [ ] `BG-28.073` Preserve non-content D1 receipt.
- [ ] `BG-28.074` Preserve private R2 receipt.
- [ ] `BG-28.075` Include new URL evidence cleanup.
- [ ] `BG-28.076` Include URL evidence export.
- [ ] `BG-28.077` Include URL evidence restore.
- [ ] `BG-28.078` Check duplicate references after purge.
- [ ] `BG-28.079` Check missing projection never authorizes deletion.
- [ ] `BG-28.080` Explain historical backup retention.

#### BG-28 / 09 — Rehearsal documentation

- [ ] `BG-28.081` Test corrupt backup rejection.
- [ ] `BG-28.082` Test nonempty target rejection.
- [ ] `BG-28.083` Test missing attachment report.
- [ ] `BG-28.084` Test partial purge persistence.
- [ ] `BG-28.085` Test old-backup anti-resurrection.
- [ ] `BG-28.086` Record independent artifact location safely.
- [ ] `BG-28.087` Record incident recovery ordering.
- [ ] `BG-28.088` Record authorized production boundary.
- [ ] `BG-28.089` Record measurable recovery acceptance.
- [ ] `BG-28.090` Update operator examples with actual outcomes.

#### BG-28 / 10 — Verify and close this task

- [ ] `BG-28.091` **Review:** Compare the completed checklist with BG-28's stated outcome; identify uncovered behavior.
- [ ] `BG-28.092` **Verification:** Run or inspect the focused proof required by BG-28; reuse a valid existing run rather than repeating it gratuitously.
- [ ] `BG-28.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [ ] `BG-28.094` **Integrity:** Check that BG-28 has not weakened its stated data, privacy, scope or recovery guarantees.
- [ ] `BG-28.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [ ] `BG-28.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [ ] `BG-28.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [ ] `BG-28.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [ ] `BG-28.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [ ] `BG-28.100` **Gate:** Check the parent completion boundary and record whether BG-29 is unlocked.

## BG-29 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#35-bg-29--run-resilience-capacity-and-performance-acceptance).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-29 / 01 — Establish task context

- [ ] `BG-29.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [ ] `BG-29.002` **Dependency:** Verify BG-28's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [ ] `BG-29.003` **Baseline:** Record the actual checkout or release candidate used for BG-29.
- [ ] `BG-29.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [ ] `BG-29.005` **Evidence:** Check whether existing evidence already satisfies any BG-29 step; reference it instead of manufacturing work.
- [ ] `BG-29.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [ ] `BG-29.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [ ] `BG-29.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [ ] `BG-29.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [ ] `BG-29.010` **Tracking:** Open a BG-29 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-29 / 02 — Scenario matrix

- [ ] `BG-29.011` List URL privacy combinations.
- [ ] `BG-29.012` List text privacy combinations.
- [ ] `BG-29.013` List note privacy combinations.
- [ ] `BG-29.014` List image privacy combinations.
- [ ] `BG-29.015` List PDF/file privacy combinations.
- [ ] `BG-29.016` Mark unsupported combinations honestly.
- [ ] `BG-29.017` Define known source phrases.
- [ ] `BG-29.018` Define malicious input fixtures.
- [ ] `BG-29.019` Define expected raw preservation.
- [ ] `BG-29.020` Define expected provider permissions.

#### BG-29 / 03 — Dependency outage

- [ ] `BG-29.021` Disable test AI path.
- [ ] `BG-29.022` Save and retrieve raw capture.
- [ ] `BG-29.023` Search original phrase.
- [ ] `BG-29.024` Disable test Notion path.
- [ ] `BG-29.025` Verify independent capture continuity.
- [ ] `BG-29.026` Disable both optional paths.
- [ ] `BG-29.027` Verify durable acknowledgment.
- [ ] `BG-29.028` Restore test dependencies.
- [ ] `BG-29.029` Observe bounded backlog recovery.
- [ ] `BG-29.030` Record no lost acknowledged item.

#### BG-29 / 04 — Model failure

- [ ] `BG-29.031` Inject malformed JSON.
- [ ] `BG-29.032` Inject schema-invalid output.
- [ ] `BG-29.033` Inject bounded repair failure.
- [ ] `BG-29.034` Check no corrupt derived write.
- [ ] `BG-29.035` Check original text remains.
- [ ] `BG-29.036` Check owner override remains.
- [ ] `BG-29.037` Check provider calls stay bounded.
- [ ] `BG-29.038` Check safe error classification.
- [ ] `BG-29.039` Check aggregate failure state.
- [ ] `BG-29.040` Check no raw provider leakage.

#### BG-29 / 05 — Capacity race

- [ ] `BG-29.041` Reserve final unit concurrently.
- [ ] `BG-29.042` Assert only allowed admission succeeds.
- [ ] `BG-29.043` Check shared text/vision pool.
- [ ] `BG-29.044` Expire abandoned reservation.
- [ ] `BG-29.045` Test exact reset boundary.
- [ ] `BG-29.046` Open breaker with qualifying failures.
- [ ] `BG-29.047` Race half-open probes.
- [ ] `BG-29.048` Verify single probe winner.
- [ ] `BG-29.049` Test manual retry under hard stop.
- [ ] `BG-29.050` Revalidate published limits before release.

#### BG-29 / 06 — Capture performance

- [ ] `BG-29.051` Define personal-load profile.
- [ ] `BG-29.052` Record fixture sizes.
- [ ] `BG-29.053` Measure acknowledgment latency.
- [ ] `BG-29.054` Separate upload duration.
- [ ] `BG-29.055` Separate optional processing duration.
- [ ] `BG-29.056` Calculate P50.
- [ ] `BG-29.057` Calculate P95.
- [ ] `BG-29.058` Compare runbook target.
- [ ] `BG-29.059` Record runtime environment.
- [ ] `BG-29.060` Preserve reproducible measurement command.

#### BG-29 / 07 — Search scale

- [ ] `BG-29.061` Seed representative small corpus.
- [ ] `BG-29.062` Seed 10000-item corpus.
- [ ] `BG-29.063` Plan 100000-item corpus if feasible.
- [ ] `BG-29.064` Record corpus composition.
- [ ] `BG-29.065` Run exact phrase queries.
- [ ] `BG-29.066` Run combined filters.
- [ ] `BG-29.067` Run tied pagination traversal.
- [ ] `BG-29.068` Measure query latency.
- [ ] `BG-29.069` Measure D1 rows read.
- [ ] `BG-29.070` Record limits of tested scale.

#### BG-29 / 08 — Runtime pressure

- [ ] `BG-29.071` Test near-limit upload.
- [ ] `BG-29.072` Test upload cancellation.
- [ ] `BG-29.073` Test parser timeout.
- [ ] `BG-29.074` Test parser byte bound.
- [ ] `BG-29.075` Measure Worker resource usage.
- [ ] `BG-29.076` Inspect hourly cron batch behavior.
- [ ] `BG-29.077` Calculate expected drain capacity.
- [ ] `BG-29.078` Measure multi-stage backlog delay.
- [ ] `BG-29.079` Adjust only with capacity evidence.
- [ ] `BG-29.080` Preserve lease and zero-cost guards.

#### BG-29 / 09 — Recovery and conclusions

- [ ] `BG-29.081` Interrupt active worker fixture.
- [ ] `BG-29.082` Recover stale lease.
- [ ] `BG-29.083` Reject stale result.
- [ ] `BG-29.084` Rebuild drifted FTS.
- [ ] `BG-29.085` Clean expired upload fixture.
- [ ] `BG-29.086` Clean expired backup fixture.
- [ ] `BG-29.087` Classify environment restrictions separately.
- [ ] `BG-29.088` List data-loss/privacy/cost blockers.
- [ ] `BG-29.089` Record actual performance results.
- [ ] `BG-29.090` Link defects to acceptance impact.

#### BG-29 / 10 — Verify and close this task

- [ ] `BG-29.091` **Review:** Compare the completed checklist with BG-29's stated outcome; identify uncovered behavior.
- [ ] `BG-29.092` **Verification:** Run or inspect the focused proof required by BG-29; reuse a valid existing run rather than repeating it gratuitously.
- [ ] `BG-29.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [ ] `BG-29.094` **Integrity:** Check that BG-29 has not weakened its stated data, privacy, scope or recovery guarantees.
- [ ] `BG-29.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [ ] `BG-29.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [ ] `BG-29.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [ ] `BG-29.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [ ] `BG-29.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [ ] `BG-29.100` **Gate:** Check the parent completion boundary and record whether BG-30 is unlocked.

## BG-30 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#36-bg-30--reconcile-completion-records-and-close-hardening-evidence).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-30 / 01 — Establish task context

- [ ] `BG-30.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [ ] `BG-30.002` **Dependency:** Verify BG-29's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [ ] `BG-30.003` **Baseline:** Record the actual checkout or release candidate used for BG-30.
- [ ] `BG-30.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [ ] `BG-30.005` **Evidence:** Check whether existing evidence already satisfies any BG-30 step; reference it instead of manufacturing work.
- [ ] `BG-30.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [ ] `BG-30.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [ ] `BG-30.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [ ] `BG-30.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [ ] `BG-30.010` **Tracking:** Open a BG-30 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-30 / 02 — Status schema

- [ ] `BG-30.011` Define implementation column.
- [ ] `BG-30.012` Define local-test column.
- [ ] `BG-30.013` Define CI-evidence column.
- [ ] `BG-30.014` Define deployed-version column.
- [ ] `BG-30.015` Define production-evidence column.
- [ ] `BG-30.016` Define device-evidence column.
- [ ] `BG-30.017` Define remaining-gate column.
- [ ] `BG-30.018` Define exact SHA reference.
- [ ] `BG-30.019` Define historical evidence label.
- [ ] `BG-30.020` Define accepted limitation field.

#### BG-30 / 03 — Baseline reconciliation

- [ ] `BG-30.021` Read current BUILD_STATUS.
- [ ] `BG-30.022` Identify obsolete missing-feature statements.
- [ ] `BG-30.023` Identify merged branch-pending statements.
- [ ] `BG-30.024` Verify corresponding merge SHAs.
- [ ] `BG-30.025` Preserve useful historical evidence.
- [ ] `BG-30.026` Replace unqualified old test counts.
- [ ] `BG-30.027` Separate current from historical result.
- [ ] `BG-30.028` Reconcile repository context summary.
- [ ] `BG-30.029` Avoid claiming unrun checks.
- [ ] `BG-30.030` Record reconciliation date.

#### BG-30 / 04 — Audit defects

- [ ] `BG-30.031` Locate each audit finding.
- [ ] `BG-30.032` Find actual fixing revision.
- [ ] `BG-30.033` Find download regression evidence.
- [ ] `BG-30.034` Find bare-URL regression evidence.
- [ ] `BG-30.035` Find status consistency evidence.
- [ ] `BG-30.036` Find clock-test evidence.
- [ ] `BG-30.037` Find smoke-script evidence.
- [ ] `BG-30.038` Mark unresolved finding explicitly.
- [ ] `BG-30.039` Update limitation wording accurately.
- [ ] `BG-30.040` Preserve original audit as history.

#### BG-30 / 05 — Feature trace

- [ ] `BG-30.041` Reconcile OPE-225 search state.
- [ ] `BG-30.042` Reconcile OPE-226 digest state.
- [ ] `BG-30.043` Reconcile OPE-248 Web state.
- [ ] `BG-30.044` Reconcile OPE-227 capacity state.
- [ ] `BG-30.045` Reconcile OPE-228 recovery state.
- [ ] `BG-30.046` Verify implementation versus release.
- [ ] `BG-30.047` Verify release versus acceptance.
- [ ] `BG-30.048` Link exact ticket files.
- [ ] `BG-30.049` Avoid inferred tracker Done status.
- [ ] `BG-30.050` Update traceability rows.

#### BG-30 / 06 — Hardening packet

- [ ] `BG-30.051` Collect auth evidence.
- [ ] `BG-30.052` Collect rotation evidence.
- [ ] `BG-30.053` Collect log-redaction evidence.
- [ ] `BG-30.054` Collect private-object evidence.
- [ ] `BG-30.055` Collect operational visibility evidence.
- [ ] `BG-30.056` Collect incident procedure evidence.
- [ ] `BG-30.057` Collect privacy evidence.
- [ ] `BG-30.058` Collect capacity evidence.
- [ ] `BG-30.059` Collect recovery evidence.
- [ ] `BG-30.060` Identify remaining OPE-247 blockers.

#### BG-30 / 07 — Optional scope

- [ ] `BG-30.061` Inventory local-worker APIs.
- [ ] `BG-30.062` Check runnable client evidence.
- [ ] `BG-30.063` Identify actual local-processing requirement.
- [ ] `BG-30.064` Record required versus deferred decision.
- [ ] `BG-30.065` Avoid API-only completion claim.
- [ ] `BG-30.066` Keep no-AI behavior explicit.
- [ ] `BG-30.067` Keep RAG separately gated.
- [ ] `BG-30.068` Keep Android separately gated.
- [ ] `BG-30.069` Keep extension separately gated.
- [ ] `BG-30.070` Keep multi-user scope separate.

#### BG-30 / 08 — Tracker boundaries

- [ ] `BG-30.071` Confirm existing external ticket IDs.
- [ ] `BG-30.072` Keep BG IDs guide-local.
- [ ] `BG-30.073` Prepare factual ticket update text.
- [ ] `BG-30.074` Include verified evidence links.
- [ ] `BG-30.075` Avoid fabricated PR references.
- [ ] `BG-30.076` Avoid fabricated deployed versions.
- [ ] `BG-30.077` Use authorized tracker workflow only.
- [ ] `BG-30.078` Preserve human acceptance gates.
- [ ] `BG-30.079` Record blocked external updates honestly.
- [ ] `BG-30.080` Match tracker wording to evidence.

#### BG-30 / 09 — Documentation closure

- [ ] `BG-30.081` Update cumulative guide status.
- [ ] `BG-30.082` Update operational runbook links.
- [ ] `BG-30.083` Check local document links.
- [ ] `BG-30.084` Check completion matrix consistency.
- [ ] `BG-30.085` Check stale counts labeled.
- [ ] `BG-30.086` Check live guarantees justified.
- [ ] `BG-30.087` Review unresolved release gates.
- [ ] `BG-30.088` Record next release prerequisite.
- [ ] `BG-30.089` Save final hardening evidence index.
- [ ] `BG-30.090` Prepare Priority 4 acceptance decision.

#### BG-30 / 10 — Verify and close this task

- [ ] `BG-30.091` **Review:** Compare the completed checklist with BG-30's stated outcome; identify uncovered behavior.
- [ ] `BG-30.092` **Verification:** Run or inspect the focused proof required by BG-30; reuse a valid existing run rather than repeating it gratuitously.
- [ ] `BG-30.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [ ] `BG-30.094` **Integrity:** Check that BG-30 has not weakened its stated data, privacy, scope or recovery guarantees.
- [ ] `BG-30.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [ ] `BG-30.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [ ] `BG-30.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [ ] `BG-30.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [ ] `BG-30.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [ ] `BG-30.100` **Gate:** Check the parent completion boundary and record whether BG-31 is unlocked.

## BG-31 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#37-bg-31--prepare-a-concrete-release-manifest).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-31 / 01 — Establish task context

- [ ] `BG-31.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [ ] `BG-31.002` **Dependency:** Verify BG-30's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [ ] `BG-31.003` **Baseline:** Record the actual checkout or release candidate used for BG-31.
- [ ] `BG-31.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [ ] `BG-31.005` **Evidence:** Check whether existing evidence already satisfies any BG-31 step; reference it instead of manufacturing work.
- [ ] `BG-31.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [ ] `BG-31.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [ ] `BG-31.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [ ] `BG-31.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [ ] `BG-31.010` **Tracking:** Open a BG-31 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-31 / 02 — Candidate identity

- [ ] `BG-31.011` Record candidate Git SHA.
- [ ] `BG-31.012` Record CI run reference.
- [ ] `BG-31.013` Record Node/tool versions.
- [ ] `BG-31.014` Record Worker artifact identity.
- [ ] `BG-31.015` Record matching Web artifact identity.
- [ ] `BG-31.016` Record current migration head.
- [ ] `BG-31.017` Record complete test evidence.
- [ ] `BG-31.018` Record browser acceptance evidence.
- [ ] `BG-31.019` Identify unresolved local qualification.
- [ ] `BG-31.020` Freeze candidate manifest version.

#### BG-31 / 03 — Production read-only inventory

- [ ] `BG-31.021` Read live Worker version.
- [ ] `BG-31.022` Read live migration ledger.
- [ ] `BG-31.023` Compare live versus candidate migrations.
- [ ] `BG-31.024` Identify production D1 target.
- [ ] `BG-31.025` Identify production R2 target.
- [ ] `BG-31.026` Identify actual Web origin.
- [ ] `BG-31.027` Identify configured Notion destination safely.
- [ ] `BG-31.028` Identify Telegram destination safely.
- [ ] `BG-31.029` Record only nonsecret identifiers.
- [ ] `BG-31.030` Mark unverified live values explicitly.

#### BG-31 / 04 — Migration plan

- [ ] `BG-31.031` List pending forward migrations.
- [ ] `BG-31.032` Order pending migrations.
- [ ] `BG-31.033` Identify affected tables.
- [ ] `BG-31.034` Identify affected indexes.
- [ ] `BG-31.035` Identify data backfills.
- [ ] `BG-31.036` Identify runtime compatibility assumptions.
- [ ] `BG-31.037` Assess old-code compatibility.
- [ ] `BG-31.038` Assess migration interruption behavior.
- [ ] `BG-31.039` Define migration stop conditions.
- [ ] `BG-31.040` Record schema rollback limitations.

#### BG-31 / 05 — Configuration

- [ ] `BG-31.041` Inventory required secret names.
- [ ] `BG-31.042` Verify presence without values.
- [ ] `BG-31.043` Inventory required nonsecret variables.
- [ ] `BG-31.044` Verify canonical Web origin.
- [ ] `BG-31.045` Verify approved provider configuration.
- [ ] `BG-31.046` Verify enabled implementation capabilities.
- [ ] `BG-31.047` Verify model/free-tier guard configuration.
- [ ] `BG-31.048` Verify privacy routing configuration.
- [ ] `BG-31.049` Verify preview/production separation.
- [ ] `BG-31.050` Record configuration validation result.

#### BG-31 / 06 — Backup plan

- [ ] `BG-31.051` Define pre-change D1 export.
- [ ] `BG-31.052` Define attachment-byte backup scope.
- [ ] `BG-31.053` Define purge-ledger preservation.
- [ ] `BG-31.054` Define protected artifact destination.
- [ ] `BG-31.055` Define checksum verification.
- [ ] `BG-31.056` Define count verification.
- [ ] `BG-31.057` Define restore target procedure.
- [ ] `BG-31.058` Define restore operator.
- [ ] `BG-31.059` Define recovery timing expectation.
- [ ] `BG-31.060` Identify missing recovery prerequisite.

#### BG-31 / 07 — Smoke plan

- [ ] `BG-31.061` List homepage smoke.
- [ ] `BG-31.062` List deep-link smoke.
- [ ] `BG-31.063` List login/session smoke.
- [ ] `BG-31.064` List anonymous denial smoke.
- [ ] `BG-31.065` List capture/replay smoke.
- [ ] `BG-31.066` List private-download smoke.
- [ ] `BG-31.067` List search smoke.
- [ ] `BG-31.068` List privacy smoke.
- [ ] `BG-31.069` List integration smoke.
- [ ] `BG-31.070` List post-deploy log inspection.

#### BG-31 / 08 — Rollback plan

- [ ] `BG-31.071` Define auth failure trigger.
- [ ] `BG-31.072` Define capture loss trigger.
- [ ] `BG-31.073` Define privacy leak trigger.
- [ ] `BG-31.074` Define migration failure trigger.
- [ ] `BG-31.075` Define deep-link failure trigger.
- [ ] `BG-31.076` Identify compatible old artifact.
- [ ] `BG-31.077` Identify schema-compatible rollback boundary.
- [ ] `BG-31.078` Define traffic stop procedure.
- [ ] `BG-31.079` Define operator notification path.
- [ ] `BG-31.080` Record recovery fallback if rollback unsafe.

#### BG-31 / 09 — Authorization packet

- [ ] `BG-31.081` Name intended release operator.
- [ ] `BG-31.082` State exact production mutations.
- [ ] `BG-31.083` State expected external test actions.
- [ ] `BG-31.084` Separate messaging authorization.
- [ ] `BG-31.085` Include backup verification prerequisites.
- [ ] `BG-31.086` Include target identifiers.
- [ ] `BG-31.087` Include stop/rollback plan.
- [ ] `BG-31.088` Present reviewable manifest.
- [ ] `BG-31.089` Record actual release authorization reference.
- [ ] `BG-31.090` Keep execution blocked without required approval.

#### BG-31 / 10 — Verify and close this task

- [ ] `BG-31.091` **Review:** Compare the completed checklist with BG-31's stated outcome; identify uncovered behavior.
- [ ] `BG-31.092` **Verification:** Run or inspect the focused proof required by BG-31; reuse a valid existing run rather than repeating it gratuitously.
- [ ] `BG-31.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [ ] `BG-31.094` **Integrity:** Check that BG-31 has not weakened its stated data, privacy, scope or recovery guarantees.
- [ ] `BG-31.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [ ] `BG-31.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [ ] `BG-31.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [ ] `BG-31.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [ ] `BG-31.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [ ] `BG-31.100` **Gate:** Check the parent completion boundary and record whether BG-32 is unlocked.

## BG-32 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#38-bg-32--apply-the-authorized-production-release).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-32 / 01 — Establish task context

- [ ] `BG-32.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [ ] `BG-32.002` **Dependency:** Verify BG-31's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [ ] `BG-32.003` **Baseline:** Record the actual checkout or release candidate used for BG-32.
- [ ] `BG-32.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [ ] `BG-32.005` **Evidence:** Check whether existing evidence already satisfies any BG-32 step; reference it instead of manufacturing work.
- [ ] `BG-32.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [ ] `BG-32.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [ ] `BG-32.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [ ] `BG-32.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [ ] `BG-32.010` **Tracking:** Open a BG-32 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-32 / 02 — Preflight

- [ ] `BG-32.011` Verify approved manifest revision.
- [ ] `BG-32.012` Verify current candidate SHA.
- [ ] `BG-32.013` Verify authorized operation scope.
- [ ] `BG-32.014` Verify actual target Worker.
- [ ] `BG-32.015` Verify actual D1 identifier.
- [ ] `BG-32.016` Verify actual R2 identifier.
- [ ] `BG-32.017` Verify canonical Web origin.
- [ ] `BG-32.018` Verify correct account context.
- [ ] `BG-32.019` Verify no pending unreviewed changes.
- [ ] `BG-32.020` Record preflight timestamp.

#### BG-32 / 03 — Backup execution

- [ ] `BG-32.021` Create approved pre-change export.
- [ ] `BG-32.022` Preserve original-byte backup scope.
- [ ] `BG-32.023` Preserve latest purge receipts.
- [ ] `BG-32.024` Check export command outcome.
- [ ] `BG-32.025` Check artifact nonempty.
- [ ] `BG-32.026` Calculate artifact checksum.
- [ ] `BG-32.027` Verify expected row counts.
- [ ] `BG-32.028` Verify protected destination.
- [ ] `BG-32.029` Record safe backup identifiers.
- [ ] `BG-32.030` Stop if verification fails.

#### BG-32 / 04 — Migration execution

- [ ] `BG-32.031` Read pending migration list again.
- [ ] `BG-32.032` Compare with approved list.
- [ ] `BG-32.033` Select explicit remote mode.
- [ ] `BG-32.034` Apply authorized forward chain.
- [ ] `BG-32.035` Capture actual command exit.
- [ ] `BG-32.036` Inspect migration ledger afterward.
- [ ] `BG-32.037` Inspect schema after failure.
- [ ] `BG-32.038` Avoid blind SQL replay.
- [ ] `BG-32.039` Verify required indexes.
- [ ] `BG-32.040` Record applied migration evidence.

#### BG-32 / 05 — Artifact deployment

- [ ] `BG-32.041` Select matching Worker bundle.
- [ ] `BG-32.042` Select matching Web assets.
- [ ] `BG-32.043` Verify candidate configuration.
- [ ] `BG-32.044` Deploy approved artifact.
- [ ] `BG-32.045` Capture deployed version identifier.
- [ ] `BG-32.046` Record actual deployed SHA mapping.
- [ ] `BG-32.047` Verify binding configuration safely.
- [ ] `BG-32.048` Confirm secret values not printed.
- [ ] `BG-32.049` Confirm canonical origin unchanged as planned.
- [ ] `BG-32.050` Record deployment timestamp.

#### BG-32 / 06 — Immediate smoke

- [ ] `BG-32.051` Request health endpoint.
- [ ] `BG-32.052` Request homepage.
- [ ] `BG-32.053` Open direct item route.
- [ ] `BG-32.054` Test admin login.
- [ ] `BG-32.055` Test session persistence.
- [ ] `BG-32.056` Test anonymous item denial.
- [ ] `BG-32.057` Test private download authorization.
- [ ] `BG-32.058` Run synthetic capture/replay.
- [ ] `BG-32.059` Run exact search.
- [ ] `BG-32.060` Preserve stage failures accurately.

#### BG-32 / 07 — Operational inspection

- [ ] `BG-32.061` Inspect safe request logs.
- [ ] `BG-32.062` Inspect migration error signals.
- [ ] `BG-32.063` Inspect Worker runtime errors.
- [ ] `BG-32.064` Inspect binding failures.
- [ ] `BG-32.065` Inspect unexpected auth failures.
- [ ] `BG-32.066` Inspect initial job backlog.
- [ ] `BG-32.067` Inspect private response caching.
- [ ] `BG-32.068` Inspect asset loading failures.
- [ ] `BG-32.069` Compare observed versus manifest expectations.
- [ ] `BG-32.070` Record unexpected deviations.

#### BG-32 / 08 — Failure response

- [ ] `BG-32.071` Evaluate each stop trigger.
- [ ] `BG-32.072` Stop dependent release actions on failure.
- [ ] `BG-32.073` Preserve failure request IDs.
- [ ] `BG-32.074` Determine schema compatibility.
- [ ] `BG-32.075` Select approved code rollback if safe.
- [ ] `BG-32.076` Execute recovery plan if required.
- [ ] `BG-32.077` Verify rollback/recovery behavior.
- [ ] `BG-32.078` Avoid unauthorized destructive repair.
- [ ] `BG-32.079` Document remaining production impact.
- [ ] `BG-32.080` Keep launch acceptance unapproved.

#### BG-32 / 09 — Release record

- [ ] `BG-32.081` Record final deployed version.
- [ ] `BG-32.082` Record final migration ledger.
- [ ] `BG-32.083` Record smoke stage results.
- [ ] `BG-32.084` Record backup evidence reference.
- [ ] `BG-32.085` Record any rollback action.
- [ ] `BG-32.086` Record unresolved integration gates.
- [ ] `BG-32.087` Preserve synthetic fixture ownership.
- [ ] `BG-32.088` Record operator and timestamps.
- [ ] `BG-32.089` Update manifest actuals.
- [ ] `BG-32.090` Prepare live acceptance handoff.

#### BG-32 / 10 — Verify and close this task

- [ ] `BG-32.091` **Review:** Compare the completed checklist with BG-32's stated outcome; identify uncovered behavior.
- [ ] `BG-32.092` **Verification:** Run or inspect the focused proof required by BG-32; reuse a valid existing run rather than repeating it gratuitously.
- [ ] `BG-32.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [ ] `BG-32.094` **Integrity:** Check that BG-32 has not weakened its stated data, privacy, scope or recovery guarantees.
- [ ] `BG-32.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [ ] `BG-32.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [ ] `BG-32.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [ ] `BG-32.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [ ] `BG-32.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [ ] `BG-32.100` **Gate:** Check the parent completion boundary and record whether BG-33 is unlocked.

## BG-33 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#39-bg-33--prove-production-capture-search-downloads-and-approved-ai).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-33 / 01 — Establish task context

- [ ] `BG-33.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [ ] `BG-33.002` **Dependency:** Verify BG-32's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [ ] `BG-33.003` **Baseline:** Record the actual checkout or release candidate used for BG-33.
- [ ] `BG-33.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [ ] `BG-33.005` **Evidence:** Check whether existing evidence already satisfies any BG-33 step; reference it instead of manufacturing work.
- [ ] `BG-33.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [ ] `BG-33.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [ ] `BG-33.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [ ] `BG-33.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [ ] `BG-33.010` **Tracking:** Open a BG-33 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-33 / 02 — Live fixture scope

- [ ] `BG-33.011` Verify approved test origin.
- [ ] `BG-33.012` Verify approved synthetic content.
- [ ] `BG-33.013` Identify actual client versions.
- [ ] `BG-33.014` Choose public URL fixture.
- [ ] `BG-33.015` Choose neutral text fixture.
- [ ] `BG-33.016` Choose neutral note fixture.
- [ ] `BG-33.017` Choose parseable PDF fixture.
- [ ] `BG-33.018` Choose screenshot fixture.
- [ ] `BG-33.019` Identify permitted provider operations.
- [ ] `BG-33.020` Record fixture privacy assignments.

#### BG-33 / 03 — Capture durability

- [ ] `BG-33.021` Save URL through intended client.
- [ ] `BG-33.022` Save text through intended client.
- [ ] `BG-33.023` Save note through intended client.
- [ ] `BG-33.024` Save PDF through intended client.
- [ ] `BG-33.025` Save image through intended client.
- [ ] `BG-33.026` Record returned capture IDs.
- [ ] `BG-33.027` Retrieve originals before optional processing.
- [ ] `BG-33.028` Verify reason preservation.
- [ ] `BG-33.029` Verify captured timestamps.
- [ ] `BG-33.030` Verify source type metadata.

#### BG-33 / 04 — Duplicate semantics

- [ ] `BG-33.031` Replay exact submitted request.
- [ ] `BG-33.032` Compare stable canonical ID.
- [ ] `BG-33.033` Verify replay indicator.
- [ ] `BG-33.034` Verify same-key event behavior.
- [ ] `BG-33.035` Share same canonical URL anew.
- [ ] `BG-33.036` Use distinct reason.
- [ ] `BG-33.037` Use distinct key.
- [ ] `BG-33.038` Verify one canonical item.
- [ ] `BG-33.039` Verify intended event count.
- [ ] `BG-33.040` Verify intended attachment object count.

#### BG-33 / 05 — URL and FTS

- [ ] `BG-33.041` Acquire approved webpage.
- [ ] `BG-33.042` Inspect actual acquired text.
- [ ] `BG-33.043` Search internal source phrase.
- [ ] `BG-33.044` Disable AI for lexical proof.
- [ ] `BG-33.045` Verify exact matching item.
- [ ] `BG-33.046` Inspect acquisition provenance.
- [ ] `BG-33.047` Inspect coverage label.
- [ ] `BG-33.048` Save unavailable URL fixture.
- [ ] `BG-33.049` Verify honest URL-only result.
- [ ] `BG-33.050` Verify no invented transcript.

#### BG-33 / 06 — Live AI

- [ ] `BG-33.051` Select approved public input.
- [ ] `BG-33.052` Confirm eligible provider route.
- [ ] `BG-33.053` Run bounded real provider operation.
- [ ] `BG-33.054` Validate structured result.
- [ ] `BG-33.055` Inspect provider/model provenance.
- [ ] `BG-33.056` Inspect reported usage.
- [ ] `BG-33.057` Inspect actual summary usefulness.
- [ ] `BG-33.058` Preserve original source.
- [ ] `BG-33.059` Edit owner override.
- [ ] `BG-33.060` Verify override survives eligible reprocess.

#### BG-33 / 07 — Privacy boundary

- [ ] `BG-33.061` Prepare synthetic private marker.
- [ ] `BG-33.062` Test Unknown routing.
- [ ] `BG-33.063` Test Sensitive routing.
- [ ] `BG-33.064` Test Personal without consent.
- [ ] `BG-33.065` Observe outbound boundary safely.
- [ ] `BG-33.066` Assert no unapproved hosted send.
- [ ] `BG-33.067` Check approved consent requirements.
- [ ] `BG-33.068` Check no silent fallback.
- [ ] `BG-33.069` Avoid real sensitive test content.
- [ ] `BG-33.070` Record what was actually instrumented.

#### BG-33 / 08 — Private originals

- [ ] `BG-33.071` Log into production Web.
- [ ] `BG-33.072` Open synthetic file detail.
- [ ] `BG-33.073` Download PDF original.
- [ ] `BG-33.074` Compare PDF checksum.
- [ ] `BG-33.075` Download image original.
- [ ] `BG-33.076` Compare image checksum.
- [ ] `BG-33.077` Repeat anonymously.
- [ ] `BG-33.078` Confirm anonymous denial.
- [ ] `BG-33.079` Inspect private cache headers.
- [ ] `BG-33.080` Verify exact original after reload.

#### BG-33 / 09 — Review and conclusion

- [ ] `BG-33.081` Edit synthetic derived field.
- [ ] `BG-33.082` Refresh and verify persisted value.
- [ ] `BG-33.083` Soft-delete test item.
- [ ] `BG-33.084` Check normal search exclusion.
- [ ] `BG-33.085` Restore with current version.
- [ ] `BG-33.086` Check search return.
- [ ] `BG-33.087` Record actual provider capability limits.
- [ ] `BG-33.088` Separate JSON validity from quality.
- [ ] `BG-33.089` Record production request IDs.
- [ ] `BG-33.090` Preserve unmet acceptance qualifications.

#### BG-33 / 10 — Verify and close this task

- [ ] `BG-33.091` **Review:** Compare the completed checklist with BG-33's stated outcome; identify uncovered behavior.
- [ ] `BG-33.092` **Verification:** Run or inspect the focused proof required by BG-33; reuse a valid existing run rather than repeating it gratuitously.
- [ ] `BG-33.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [ ] `BG-33.094` **Integrity:** Check that BG-33 has not weakened its stated data, privacy, scope or recovery guarantees.
- [ ] `BG-33.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [ ] `BG-33.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [ ] `BG-33.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [ ] `BG-33.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [ ] `BG-33.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [ ] `BG-33.100` **Gate:** Check the parent completion boundary and record whether BG-34 is unlocked.

## BG-34 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#40-bg-34--prove-notion-projection-outage-and-recreation).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-34 / 01 — Establish task context

- [ ] `BG-34.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [ ] `BG-34.002` **Dependency:** Verify BG-33's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [ ] `BG-34.003` **Baseline:** Record the actual checkout or release candidate used for BG-34.
- [ ] `BG-34.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [ ] `BG-34.005` **Evidence:** Check whether existing evidence already satisfies any BG-34 step; reference it instead of manufacturing work.
- [ ] `BG-34.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [ ] `BG-34.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [ ] `BG-34.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [ ] `BG-34.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [ ] `BG-34.010` **Tracking:** Open a BG-34 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-34 / 02 — Destination setup

- [ ] `BG-34.011` Verify approved synthetic Notion destination.
- [ ] `BG-34.012` Verify configured database identity.
- [ ] `BG-34.013` Verify integration access.
- [ ] `BG-34.014` Inspect expected property schema.
- [ ] `BG-34.015` Compare property types.
- [ ] `BG-34.016` Identify machine-owned fields.
- [ ] `BG-34.017` Identify human-owned fields.
- [ ] `BG-34.018` Record safe destination identifier.
- [ ] `BG-34.019` Avoid real knowledge-store disruption.
- [ ] `BG-34.020` Record test scope authorization.

#### BG-34 / 03 — Initial projection

- [ ] `BG-34.021` Create neutral canonical item.
- [ ] `BG-34.022` Schedule intended sync.
- [ ] `BG-34.023` Record canonical Capture ID.
- [ ] `BG-34.024` Observe sync attempt state.
- [ ] `BG-34.025` Wait for actual projection.
- [ ] `BG-34.026` Record Notion page ID.
- [ ] `BG-34.027` Inspect machine-owned values.
- [ ] `BG-34.028` Inspect source link.
- [ ] `BG-34.029` Inspect privacy-safe content.
- [ ] `BG-34.030` Verify D1 remains authoritative.

#### BG-34 / 04 — Replay behavior

- [ ] `BG-34.031` Requeue supported sync path.
- [ ] `BG-34.032` Trigger duplicate scheduling fixture.
- [ ] `BG-34.033` Wait for convergence.
- [ ] `BG-34.034` Search destination by Capture ID.
- [ ] `BG-34.035` Verify one intended page.
- [ ] `BG-34.036` Verify stored page reference.
- [ ] `BG-34.037` Verify no duplicate active attempt.
- [ ] `BG-34.038` Verify idempotent result handling.
- [ ] `BG-34.039` Inspect safe audit history.
- [ ] `BG-34.040` Record replay proof.

#### BG-34 / 05 — Human-owned fields

- [ ] `BG-34.041` Edit allowed human-owned Notion field.
- [ ] `BG-34.042` Preserve canonical item state.
- [ ] `BG-34.043` Run routine synchronization.
- [ ] `BG-34.044` Verify human value remains.
- [ ] `BG-34.045` Update machine-owned canonical field.
- [ ] `BG-34.046` Synchronize again.
- [ ] `BG-34.047` Verify machine projection updates.
- [ ] `BG-34.048` Verify source evidence unchanged.
- [ ] `BG-34.049` Check unsupported field behavior.
- [ ] `BG-34.050` Record ownership boundary result.

#### BG-34 / 06 — Outage behavior

- [ ] `BG-34.051` Select isolated outage mechanism.
- [ ] `BG-34.052` Trigger definite test 429 if supported.
- [ ] `BG-34.053` Record Retry-After behavior.
- [ ] `BG-34.054` Trigger temporary integration failure.
- [ ] `BG-34.055` Observe delayed sync state.
- [ ] `BG-34.056` Capture new item during outage.
- [ ] `BG-34.057` Retrieve new raw item.
- [ ] `BG-34.058` Search new phrase.
- [ ] `BG-34.059` Verify no capture dependency.
- [ ] `BG-34.060` Record simulation versus live distinction.

#### BG-34 / 07 — Recovery

- [ ] `BG-34.061` Restore test integration availability.
- [ ] `BG-34.062` Wait until retry is eligible.
- [ ] `BG-34.063` Trigger supported retry when appropriate.
- [ ] `BG-34.064` Verify attempts stay bounded.
- [ ] `BG-34.065` Verify one eventual projection.
- [ ] `BG-34.066` Verify no duplicate page.
- [ ] `BG-34.067` Verify preserved human fields.
- [ ] `BG-34.068` Verify cleared transient error state.
- [ ] `BG-34.069` Inspect sync timestamps.
- [ ] `BG-34.070` Record outage recovery duration.

#### BG-34 / 08 — Missing page

- [ ] `BG-34.071` Remove approved synthetic projection.
- [ ] `BG-34.072` Run supported missing-page detection.
- [ ] `BG-34.073` Verify original D1 item remains.
- [ ] `BG-34.074` Verify R2 original remains.
- [ ] `BG-34.075` Verify stored missing reference behavior.
- [ ] `BG-34.076` Inspect server recovery eligibility.
- [ ] `BG-34.077` Avoid clearing page ID manually.
- [ ] `BG-34.078` Verify ineligible recreation denial.
- [ ] `BG-34.079` Confirm Notion deletion grants no purge authority.
- [ ] `BG-34.080` Record missing-page state.

#### BG-34 / 09 — Explicit recreation

- [ ] `BG-34.081` Request approved admin recreation.
- [ ] `BG-34.082` Record new sync attempt.
- [ ] `BG-34.083` Wait for new projection.
- [ ] `BG-34.084` Verify one replacement page.
- [ ] `BG-34.085` Verify new canonical page reference.
- [ ] `BG-34.086` Verify superseded attempt retry restriction.
- [ ] `BG-34.087` Verify source content unchanged.
- [ ] `BG-34.088` Save safe IDs and timestamps.
- [ ] `BG-34.089` Document manual actions.
- [ ] `BG-34.090` Record real projection acceptance boundary.

#### BG-34 / 10 — Verify and close this task

- [ ] `BG-34.091` **Review:** Compare the completed checklist with BG-34's stated outcome; identify uncovered behavior.
- [ ] `BG-34.092` **Verification:** Run or inspect the focused proof required by BG-34; reuse a valid existing run rather than repeating it gratuitously.
- [ ] `BG-34.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [ ] `BG-34.094` **Integrity:** Check that BG-34 has not weakened its stated data, privacy, scope or recovery guarantees.
- [ ] `BG-34.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [ ] `BG-34.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [ ] `BG-34.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [ ] `BG-34.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [ ] `BG-34.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [ ] `BG-34.100` **Gate:** Check the parent completion boundary and record whether BG-35 is unlocked.

## BG-35 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#41-bg-35--complete-the-physical-iphone-online-stories).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-35 / 01 — Establish task context

- [ ] `BG-35.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [ ] `BG-35.002` **Dependency:** Verify BG-34's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [ ] `BG-35.003` **Baseline:** Record the actual checkout or release candidate used for BG-35.
- [ ] `BG-35.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [ ] `BG-35.005` **Evidence:** Check whether existing evidence already satisfies any BG-35 step; reference it instead of manufacturing work.
- [ ] `BG-35.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [ ] `BG-35.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [ ] `BG-35.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [ ] `BG-35.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [ ] `BG-35.010` **Tracking:** Open a BG-35 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-35 / 02 — Device record

- [ ] `BG-35.011` Record physical device model.
- [ ] `BG-35.012` Record iOS version.
- [ ] `BG-35.013` Record Shortcut version.
- [ ] `BG-35.014` Record capture API environment.
- [ ] `BG-35.015` Record acceptance date.
- [ ] `BG-35.016` Record tester identity.
- [ ] `BG-35.017` Prepare neutral fixture content.
- [ ] `BG-35.018` Prepare PDF hash reference.
- [ ] `BG-35.019` Prepare image reference.
- [ ] `BG-35.020` Keep credentials out of evidence.

#### BG-35 / 03 — Shortcut installation

- [ ] `BG-35.021` Install intended Shortcut version.
- [ ] `BG-35.022` Configure actual API base.
- [ ] `BG-35.023` Configure capture credential privately.
- [ ] `BG-35.024` Verify Share Sheet visibility.
- [ ] `BG-35.025` Verify accepted input types.
- [ ] `BG-35.026` Verify requested file permissions.
- [ ] `BG-35.027` Verify intended action menu.
- [ ] `BG-35.028` Verify initial privacy default.
- [ ] `BG-35.029` Verify debug output redaction.
- [ ] `BG-35.030` Record installation issues honestly.

#### BG-35 / 04 — Safari and text

- [ ] `BG-35.031` Share normal Safari page.
- [ ] `BG-35.032` Verify original URL preserved.
- [ ] `BG-35.033` Verify source application metadata.
- [ ] `BG-35.034` Verify capture timestamp.
- [ ] `BG-35.035` Add explicit reason.
- [ ] `BG-35.036` Find item by reason.
- [ ] `BG-35.037` Share selected text.
- [ ] `BG-35.038` Verify Unicode preservation.
- [ ] `BG-35.039` Verify intended whitespace handling.
- [ ] `BG-35.040` Verify text-only capture type.

#### BG-35 / 05 — Social links

- [ ] `BG-35.041` Share Instagram URL.
- [ ] `BG-35.042` Inspect canonical normalization.
- [ ] `BG-35.043` Verify honest URL-only label.
- [ ] `BG-35.044` Verify no invented transcript.
- [ ] `BG-35.045` Preserve optional personal reason.
- [ ] `BG-35.046` Share YouTube URL.
- [ ] `BG-35.047` Check tracking duplicate handling.
- [ ] `BG-35.048` Confirm exact source link.
- [ ] `BG-35.049` Test long supported link.
- [ ] `BG-35.050` Record source-specific limitations.

#### BG-35 / 06 — Photos

- [ ] `BG-35.051` Select approved synthetic image.
- [ ] `BG-35.052` Share through Photos.
- [ ] `BG-35.053` Verify selected bytes reach upload.
- [ ] `BG-35.054` Verify finalization result.
- [ ] `BG-35.055` Verify linked image item.
- [ ] `BG-35.056` Inspect declared/detected MIME.
- [ ] `BG-35.057` Inspect extraction coverage.
- [ ] `BG-35.058` Download from Web Inbox.
- [ ] `BG-35.059` Compare original image evidence.
- [ ] `BG-35.060` Record Photos story outcome.

#### BG-35 / 07 — Files

- [ ] `BG-35.061` Share parseable PDF from Files.
- [ ] `BG-35.062` Verify canonical file capture.
- [ ] `BG-35.063` Verify attachment linkage.
- [ ] `BG-35.064` Search known internal phrase.
- [ ] `BG-35.065` Download PDF through Web.
- [ ] `BG-35.066` Compare PDF hash.
- [ ] `BG-35.067` Share supported generic file.
- [ ] `BG-35.068` Verify truthful unsupported-extraction behavior.
- [ ] `BG-35.069` Verify original generic file retained.
- [ ] `BG-35.070` Record Files story outcome.

#### BG-35 / 08 — Capture modes

- [ ] `BG-35.071` Exercise Quick Save.
- [ ] `BG-35.072` Verify no forced optional prompt.
- [ ] `BG-35.073` Exercise Add Reason.
- [ ] `BG-35.074` Verify reason persisted.
- [ ] `BG-35.075` Exercise Private Save.
- [ ] `BG-35.076` Verify intended privacy class.
- [ ] `BG-35.077` Verify no unapproved AI route.
- [ ] `BG-35.078` Exercise manual note action.
- [ ] `BG-35.079` Verify note requires no URL.
- [ ] `BG-35.080` Record mode-specific results.

#### BG-35 / 09 — Repeated shares

- [ ] `BG-35.081` Repeat same pending operation.
- [ ] `BG-35.082` Verify same-key replay outcome.
- [ ] `BG-35.083` Verify no extra replay event.
- [ ] `BG-35.084` Intentionally share source again.
- [ ] `BG-35.085` Use new reason/key.
- [ ] `BG-35.086` Verify canonical reuse.
- [ ] `BG-35.087` Verify both reasons in history.
- [ ] `BG-35.088` Fill online device QA rows.
- [ ] `BG-35.089` Link sanitized evidence per row.
- [ ] `BG-35.090` Record unresolved physical-device failures.

#### BG-35 / 10 — Verify and close this task

- [ ] `BG-35.091` **Review:** Compare the completed checklist with BG-35's stated outcome; identify uncovered behavior.
- [ ] `BG-35.092` **Verification:** Run or inspect the focused proof required by BG-35; reuse a valid existing run rather than repeating it gratuitously.
- [ ] `BG-35.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [ ] `BG-35.094` **Integrity:** Check that BG-35 has not weakened its stated data, privacy, scope or recovery guarantees.
- [ ] `BG-35.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [ ] `BG-35.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [ ] `BG-35.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [ ] `BG-35.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [ ] `BG-35.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [ ] `BG-35.100` **Gate:** Check the parent completion boundary and record whether BG-36 is unlocked.

## BG-36 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#42-bg-36--prove-iphone-offline-retention-retries-and-rotation).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-36 / 01 — Establish task context

- [ ] `BG-36.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [ ] `BG-36.002` **Dependency:** Verify BG-35's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [ ] `BG-36.003` **Baseline:** Record the actual checkout or release candidate used for BG-36.
- [ ] `BG-36.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [ ] `BG-36.005` **Evidence:** Check whether existing evidence already satisfies any BG-36 step; reference it instead of manufacturing work.
- [ ] `BG-36.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [ ] `BG-36.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [ ] `BG-36.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [ ] `BG-36.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [ ] `BG-36.010` **Tracking:** Open a BG-36 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-36 / 02 — Offline note

- [ ] `BG-36.011` Enable airplane mode.
- [ ] `BG-36.012` Share neutral note.
- [ ] `BG-36.013` Verify no server Saved claim.
- [ ] `BG-36.014` Inspect retained logical key.
- [ ] `BG-36.015` Inspect retained original timestamp.
- [ ] `BG-36.016` Inspect retained text.
- [ ] `BG-36.017` Inspect retained reason.
- [ ] `BG-36.018` Inspect retained privacy.
- [ ] `BG-36.019` Exit Shortcut process.
- [ ] `BG-36.020` Verify retry entry survives reopening.

#### BG-36 / 03 — Offline file

- [ ] `BG-36.021` Select approved test file.
- [ ] `BG-36.022` Share while offline.
- [ ] `BG-36.023` Verify retained upload operation.
- [ ] `BG-36.024` Verify actual bytes retained or disclosed.
- [ ] `BG-36.025` Record expected hash.
- [ ] `BG-36.026` Exit and reopen Shortcut.
- [ ] `BG-36.027` Inspect file recovery action.
- [ ] `BG-36.028` Verify filename alone is not completion.
- [ ] `BG-36.029` Verify missing-byte guidance.
- [ ] `BG-36.030` Preserve unchanged logical capture key.

#### BG-36 / 04 — Reconnect

- [ ] `BG-36.031` Restore network connectivity.
- [ ] `BG-36.032` Retry retained note.
- [ ] `BG-36.033` Compare original key.
- [ ] `BG-36.034` Compare original timestamp.
- [ ] `BG-36.035` Verify canonical acknowledgment.
- [ ] `BG-36.036` Retry retained file.
- [ ] `BG-36.037` Verify finalized attachment linkage.
- [ ] `BG-36.038` Compare eventual file hash.
- [ ] `BG-36.039` Clear only successful queue entries.
- [ ] `BG-36.040` Keep unrelated pending entries.

#### BG-36 / 05 — Ambiguous acknowledgment

- [ ] `BG-36.041` Simulate response loss after commit.
- [ ] `BG-36.042` Retain pending queue record.
- [ ] `BG-36.043` Retry same operation.
- [ ] `BG-36.044` Compare returned canonical ID.
- [ ] `BG-36.045` Check same-key event count.
- [ ] `BG-36.046` Check attachment object count.
- [ ] `BG-36.047` Verify reason remains unchanged.
- [ ] `BG-36.048` Verify privacy remains unchanged.
- [ ] `BG-36.049` Verify truthful replay message.
- [ ] `BG-36.050` Record ambiguous-response evidence.

#### BG-36 / 06 — Upload interruptions

- [ ] `BG-36.051` Interrupt byte transfer.
- [ ] `BG-36.052` Retry from known stage.
- [ ] `BG-36.053` Interrupt finalization response.
- [ ] `BG-36.054` Reconcile stored upload state.
- [ ] `BG-36.055` Trigger expired upload fixture.
- [ ] `BG-36.056` Reinitialize deliberately.
- [ ] `BG-36.057` Preserve original capture key.
- [ ] `BG-36.058` Verify old orphan handling.
- [ ] `BG-36.059` Finish canonical save.
- [ ] `BG-36.060` Verify one intended linked original.

#### BG-36 / 07 — Authentication recovery

- [ ] `BG-36.061` Use authorized invalid test credential.
- [ ] `BG-36.062` Attempt retained save.
- [ ] `BG-36.063` Verify actionable auth message.
- [ ] `BG-36.064` Preserve queued payload.
- [ ] `BG-36.065` Rotate/update test credential safely.
- [ ] `BG-36.066` Retry without new logical key.
- [ ] `BG-36.067` Verify successful save.
- [ ] `BG-36.068` Test overlap boundary where authorized.
- [ ] `BG-36.069` Verify old credential retirement.
- [ ] `BG-36.070` Record no queued-content loss.

#### BG-36 / 08 — Input and server failures

- [ ] `BG-36.071` Share unsupported signature.
- [ ] `BG-36.072` Verify type correction guidance.
- [ ] `BG-36.073` Share over-limit file.
- [ ] `BG-36.074` Verify no false upload success.
- [ ] `BG-36.075` Simulate approved API outage.
- [ ] `BG-36.076` Verify queue retention.
- [ ] `BG-36.077` Simulate approved R2 outage.
- [ ] `BG-36.078` Verify no false Saved claim.
- [ ] `BG-36.079` Restore availability.
- [ ] `BG-36.080` Verify bounded successful retry.

#### BG-36 / 09 — Device persistence

- [ ] `BG-36.081` Check iCloud queue permissions.
- [ ] `BG-36.082` Check queue storage availability.
- [ ] `BG-36.083` Restart relevant device workflow.
- [ ] `BG-36.084` Verify retained records afterward.
- [ ] `BG-36.085` Inspect multi-entry cleanup behavior.
- [ ] `BG-36.086` Check privacy default unchanged.
- [ ] `BG-36.087` Check reason not dropped.
- [ ] `BG-36.088` Complete offline device QA rows.
- [ ] `BG-36.089` Record OS-specific limitations.
- [ ] `BG-36.090` Keep unavailable-device gate explicitly blocked.

#### BG-36 / 10 — Verify and close this task

- [ ] `BG-36.091` **Review:** Compare the completed checklist with BG-36's stated outcome; identify uncovered behavior.
- [ ] `BG-36.092` **Verification:** Run or inspect the focused proof required by BG-36; reuse a valid existing run rather than repeating it gratuitously.
- [ ] `BG-36.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [ ] `BG-36.094` **Integrity:** Check that BG-36 has not weakened its stated data, privacy, scope or recovery guarantees.
- [ ] `BG-36.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [ ] `BG-36.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [ ] `BG-36.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [ ] `BG-36.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [ ] `BG-36.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [ ] `BG-36.100` **Gate:** Check the parent completion boundary and record whether BG-37 is unlocked.

## BG-37 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#43-bg-37--rehearse-disaster-recovery-independently).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-37 / 01 — Establish task context

- [ ] `BG-37.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [ ] `BG-37.002` **Dependency:** Verify BG-36's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [ ] `BG-37.003` **Baseline:** Record the actual checkout or release candidate used for BG-37.
- [ ] `BG-37.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [ ] `BG-37.005` **Evidence:** Check whether existing evidence already satisfies any BG-37 step; reference it instead of manufacturing work.
- [ ] `BG-37.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [ ] `BG-37.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [ ] `BG-37.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [ ] `BG-37.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [ ] `BG-37.010` **Tracking:** Open a BG-37 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-37 / 02 — Recovery fixture

- [ ] `BG-37.011` Create multiple canonical items.
- [ ] `BG-37.012` Create repeated capture events.
- [ ] `BG-37.013` Create owner field overrides.
- [ ] `BG-37.014` Assign varied privacy classes.
- [ ] `BG-37.015` Link image original.
- [ ] `BG-37.016` Link PDF original.
- [ ] `BG-37.017` Persist URL extraction evidence.
- [ ] `BG-37.018` Create safe pending jobs.
- [ ] `BG-37.019` Record known search phrases.
- [ ] `BG-37.020` Record expected entity counts.

#### BG-37 / 03 — Independent artifacts

- [ ] `BG-37.021` Export portable JSON.
- [ ] `BG-37.022` Record export schema version.
- [ ] `BG-37.023` Copy original attachment bytes.
- [ ] `BG-37.024` Create hash manifest.
- [ ] `BG-37.025` Preserve newest purge receipts.
- [ ] `BG-37.026` Identify independent storage target.
- [ ] `BG-37.027` Verify artifact access permissions.
- [ ] `BG-37.028` Verify artifact byte counts.
- [ ] `BG-37.029` Verify artifact checksums.
- [ ] `BG-37.030` Record protected artifact references.

#### BG-37 / 04 — Target preparation

- [ ] `BG-37.031` Choose clean recovery D1.
- [ ] `BG-37.032` Choose recovery R2 target.
- [ ] `BG-37.033` Verify source/target are distinct.
- [ ] `BG-37.034` Apply compatible migrations.
- [ ] `BG-37.035` Disable external delivery credentials.
- [ ] `BG-37.036` Disable unintended hosted processing.
- [ ] `BG-37.037` Verify empty canonical state.
- [ ] `BG-37.038` Verify intended artifact version.
- [ ] `BG-37.039` Record target identifiers safely.
- [ ] `BG-37.040` Define stop-on-mismatch rule.

#### BG-37 / 05 — Dry run

- [ ] `BG-37.041` Send explicit dry_run=true.
- [ ] `BG-37.042` Validate input envelope.
- [ ] `BG-37.043` Validate item count.
- [ ] `BG-37.044` Validate child ownership.
- [ ] `BG-37.045` Validate duplicate references.
- [ ] `BG-37.046` Validate purge ledger merge.
- [ ] `BG-37.047` Inspect planned skipped items.
- [ ] `BG-37.048` Inspect missing prerequisites.
- [ ] `BG-37.049` Verify no canonical writes.
- [ ] `BG-37.050` Approve only correct recovery plan.

#### BG-37 / 06 — Real restore

- [ ] `BG-37.051` Select explicit real restore mode.
- [ ] `BG-37.052` Import canonical records.
- [ ] `BG-37.053` Restore capture history.
- [ ] `BG-37.054` Restore owner overrides.
- [ ] `BG-37.055` Restore attachment metadata.
- [ ] `BG-37.056` Restore original bytes independently.
- [ ] `BG-37.057` Restore permitted extraction evidence.
- [ ] `BG-37.058` Reset transient leases safely.
- [ ] `BG-37.059` Preserve privacy state.
- [ ] `BG-37.060` Record actual restore outcome.

#### BG-37 / 07 — Verification

- [ ] `BG-37.061` Compare canonical item count.
- [ ] `BG-37.062` Compare event count.
- [ ] `BG-37.063` Check foreign keys.
- [ ] `BG-37.064` Verify attachment ownership.
- [ ] `BG-37.065` Download from recovery target.
- [ ] `BG-37.066` Compare original byte hashes.
- [ ] `BG-37.067` Search known internal phrases.
- [ ] `BG-37.068` Verify owner overrides.
- [ ] `BG-37.069` Verify no external delivery occurred.
- [ ] `BG-37.070` Measure recovery duration.

#### BG-37 / 08 — Anti-resurrection

- [ ] `BG-37.071` Take older synthetic backup.
- [ ] `BG-37.072` Soft-delete synthetic target item.
- [ ] `BG-37.073` Request exact purge workflow.
- [ ] `BG-37.074` Confirm intended purge phrase.
- [ ] `BG-37.075` Complete test purge steps.
- [ ] `BG-37.076` Preserve newer receipt ledger.
- [ ] `BG-37.077` Restore older backup into another clean target.
- [ ] `BG-37.078` Verify purged item skipped.
- [ ] `BG-37.079` Verify purged FTS content absent.
- [ ] `BG-37.080` Verify purged objects/queues absent.

#### BG-37 / 09 — Adverse recovery

- [ ] `BG-37.081` Remove one test attachment.
- [ ] `BG-37.082` Run integrity check.
- [ ] `BG-37.083` Confirm missing-object finding.
- [ ] `BG-37.084` Corrupt one backup artifact.
- [ ] `BG-37.085` Confirm verification rejection.
- [ ] `BG-37.086` Simulate partial purge.
- [ ] `BG-37.087` Confirm truthful partial state.
- [ ] `BG-37.088` Record every manual recovery action.
- [ ] `BG-37.089` State residual full-bucket-loss risk.
- [ ] `BG-37.090` Save disaster acceptance evidence.

#### BG-37 / 10 — Verify and close this task

- [ ] `BG-37.091` **Review:** Compare the completed checklist with BG-37's stated outcome; identify uncovered behavior.
- [ ] `BG-37.092` **Verification:** Run or inspect the focused proof required by BG-37; reuse a valid existing run rather than repeating it gratuitously.
- [ ] `BG-37.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [ ] `BG-37.094` **Integrity:** Check that BG-37 has not weakened its stated data, privacy, scope or recovery guarantees.
- [ ] `BG-37.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [ ] `BG-37.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [ ] `BG-37.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [ ] `BG-37.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [ ] `BG-37.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [ ] `BG-37.100` **Gate:** Check the parent completion boundary and record whether BG-38 is unlocked.

## BG-38 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#44-bg-38--observe-seven-eligible-consecutive-daily-deliveries).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-38 / 01 — Establish task context

- [ ] `BG-38.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [ ] `BG-38.002` **Dependency:** Verify BG-37's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [ ] `BG-38.003` **Baseline:** Record the actual checkout or release candidate used for BG-38.
- [ ] `BG-38.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [ ] `BG-38.005` **Evidence:** Check whether existing evidence already satisfies any BG-38 step; reference it instead of manufacturing work.
- [ ] `BG-38.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [ ] `BG-38.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [ ] `BG-38.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [ ] `BG-38.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [ ] `BG-38.010` **Tracking:** Open a BG-38 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-38 / 02 — Trial preparation

- [ ] `BG-38.011` Record stable candidate SHA.
- [ ] `BG-38.012` Record private destination identifier.
- [ ] `BG-38.013` Record canonical Web origin.
- [ ] `BG-38.014` Verify Asia/Kolkata schedule.
- [ ] `BG-38.015` Define eligible-period criteria.
- [ ] `BG-38.016` Define empty-period exclusion.
- [ ] `BG-38.017` Define missed-day restart rule.
- [ ] `BG-38.018` Define build-change invalidation rule.
- [ ] `BG-38.019` Confirm explicit live delivery authorization.
- [ ] `BG-38.020` Prepare seven-day evidence ledger.

#### BG-38 / 03 — Eligible day one

- [ ] `BG-38.021` Record scheduled first period.
- [ ] `BG-38.022` Record first digest identifier.
- [ ] `BG-38.023` Record first eligible item count.
- [ ] `BG-38.024` Observe scheduler-owned delivery.
- [ ] `BG-38.025` Record received timestamp.
- [ ] `BG-38.026` Record message identifier.
- [ ] `BG-38.027` Open exact item link.
- [ ] `BG-38.028` Check neutral restricted labels.
- [ ] `BG-38.029` Classify actual delivery outcome.
- [ ] `BG-38.030` Save first-day evidence.

#### BG-38 / 04 — Eligible day two

- [ ] `BG-38.031` Verify candidate remains unchanged.
- [ ] `BG-38.032` Record second scheduled period.
- [ ] `BG-38.033` Record second digest identifier.
- [ ] `BG-38.034` Record eligible item count.
- [ ] `BG-38.035` Observe actual scheduled receipt.
- [ ] `BG-38.036` Record message identifier.
- [ ] `BG-38.037` Check link authentication.
- [ ] `BG-38.038` Verify no duplicate delivery.
- [ ] `BG-38.039` Confirm consecutive eligible success.
- [ ] `BG-38.040` Save second-day evidence.

#### BG-38 / 05 — Eligible day three

- [ ] `BG-38.041` Record third scheduled period.
- [ ] `BG-38.042` Record third digest identifier.
- [ ] `BG-38.043` Verify current privacy recheck.
- [ ] `BG-38.044` Use approved synthetic privacy change.
- [ ] `BG-38.045` Inspect neutralized delivery content.
- [ ] `BG-38.046` Record actual receipt time.
- [ ] `BG-38.047` Open linked surviving item.
- [ ] `BG-38.048` Check no stale sensitive label.
- [ ] `BG-38.049` Confirm sequence still eligible.
- [ ] `BG-38.050` Save third-day evidence.

#### BG-38 / 06 — Eligible day four

- [ ] `BG-38.051` Record fourth scheduled period.
- [ ] `BG-38.052` Record fourth digest identifier.
- [ ] `BG-38.053` Record selected item count.
- [ ] `BG-38.054` Observe scheduled receipt.
- [ ] `BG-38.055` Compare period boundaries.
- [ ] `BG-38.056` Check no previous-period duplicate.
- [ ] `BG-38.057` Record actual message identifier.
- [ ] `BG-38.058` Verify exact source links.
- [ ] `BG-38.059` Classify suppression separately if empty.
- [ ] `BG-38.060` Save fourth-day or restart evidence.

#### BG-38 / 07 — Eligible day five

- [ ] `BG-38.061` Verify same accepted scheduler build.
- [ ] `BG-38.062` Record fifth scheduled period.
- [ ] `BG-38.063` Record fifth digest identifier.
- [ ] `BG-38.064` Observe actual delivery state.
- [ ] `BG-38.065` Investigate unknown outcome if present.
- [ ] `BG-38.066` Reconcile only with receipt evidence.
- [ ] `BG-38.067` Avoid blind resend.
- [ ] `BG-38.068` Record message identifier if sent.
- [ ] `BG-38.069` Confirm valid consecutive sequence.
- [ ] `BG-38.070` Save fifth-day evidence.

#### BG-38 / 08 — Eligible day six

- [ ] `BG-38.071` Record sixth scheduled period.
- [ ] `BG-38.072` Record sixth digest identifier.
- [ ] `BG-38.073` Record eligible selection count.
- [ ] `BG-38.074` Observe scheduled delivery.
- [ ] `BG-38.075` Record received timestamp.
- [ ] `BG-38.076` Verify logged-out link authentication.
- [ ] `BG-38.077` Inspect privacy-safe labels.
- [ ] `BG-38.078` Check definite retry timing if encountered.
- [ ] `BG-38.079` Restart sequence after missed eligible day.
- [ ] `BG-38.080` Save sixth-day evidence.

#### BG-38 / 09 — Eligible day seven

- [ ] `BG-38.081` Record seventh scheduled period.
- [ ] `BG-38.082` Record seventh digest identifier.
- [ ] `BG-38.083` Observe actual receipt.
- [ ] `BG-38.084` Record message identifier.
- [ ] `BG-38.085` Verify exact item link.
- [ ] `BG-38.086` Verify no duplicate period delivery.
- [ ] `BG-38.087` Count seven qualifying consecutive results.
- [ ] `BG-38.088` Review any build changes.
- [ ] `BG-38.089` Record weekly-review evidence separately.
- [ ] `BG-38.090` Prepare sustained-delivery acceptance conclusion.

#### BG-38 / 10 — Verify and close this task

- [ ] `BG-38.091` **Review:** Compare the completed checklist with BG-38's stated outcome; identify uncovered behavior.
- [ ] `BG-38.092` **Verification:** Run or inspect the focused proof required by BG-38; reuse a valid existing run rather than repeating it gratuitously.
- [ ] `BG-38.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [ ] `BG-38.094` **Integrity:** Check that BG-38 has not weakened its stated data, privacy, scope or recovery guarantees.
- [ ] `BG-38.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [ ] `BG-38.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [ ] `BG-38.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [ ] `BG-38.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [ ] `BG-38.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [ ] `BG-38.100` **Gate:** Check the parent completion boundary and record whether BG-39 is unlocked.

## BG-39 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#45-bg-39--complete-two-weeks-of-real-use-and-verify-actual-cost).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-39 / 01 — Establish task context

- [ ] `BG-39.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [ ] `BG-39.002` **Dependency:** Verify BG-38's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [ ] `BG-39.003` **Baseline:** Record the actual checkout or release candidate used for BG-39.
- [ ] `BG-39.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [ ] `BG-39.005` **Evidence:** Check whether existing evidence already satisfies any BG-39 step; reference it instead of manufacturing work.
- [ ] `BG-39.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [ ] `BG-39.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [ ] `BG-39.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [ ] `BG-39.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [ ] `BG-39.010` **Tracking:** Open a BG-39 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-39 / 02 — Trial definition

- [ ] `BG-39.011` Record trial start date.
- [ ] `BG-39.012` Record candidate version.
- [ ] `BG-39.013` Define fourteen-day minimum.
- [ ] `BG-39.014` Identify actual daily device.
- [ ] `BG-39.015` Define everyday source mix.
- [ ] `BG-39.016` Define useful-recall goal.
- [ ] `BG-39.017` Define accepted privacy defaults.
- [ ] `BG-39.018` Define severe-friction categories.
- [ ] `BG-39.019` Define evidence privacy rules.
- [ ] `BG-39.020` Prepare daily observation ledger.

#### BG-39 / 03 — Daily capture use

- [ ] `BG-39.021` Capture ordinary webpage when useful.
- [ ] `BG-39.022` Capture ordinary note when useful.
- [ ] `BG-39.023` Capture screenshot when useful.
- [ ] `BG-39.024` Capture PDF when useful.
- [ ] `BG-39.025` Record steps needed to save.
- [ ] `BG-39.026` Record failed share trigger.
- [ ] `BG-39.027` Record acknowledged capture identifier.
- [ ] `BG-39.028` Check optional-processing independence.
- [ ] `BG-39.029` Repeat observations across trial days.
- [ ] `BG-39.030` Avoid synthetic-only usability claim.

#### BG-39 / 04 — Recall use

- [ ] `BG-39.031` Search a remembered reason.
- [ ] `BG-39.032` Search a known source phrase.
- [ ] `BG-39.033` Search an imperfect remembered keyword.
- [ ] `BG-39.034` Use intended filter combination.
- [ ] `BG-39.035` Open expected item.
- [ ] `BG-39.036` Inspect original source.
- [ ] `BG-39.037` Record unsuccessful search example safely.
- [ ] `BG-39.038` Distinguish lexical from semantic expectation.
- [ ] `BG-39.039` Record recovery without Notion.
- [ ] `BG-39.040` Repeat recall observations throughout trial.

#### BG-39 / 05 — Review and reminders

- [ ] `BG-39.041` Correct generated title when needed.
- [ ] `BG-39.042` Correct project classification when needed.
- [ ] `BG-39.043` Set useful review date.
- [ ] `BG-39.044` Verify displayed local time.
- [ ] `BG-39.045` Act or archive reviewed item.
- [ ] `BG-39.046` Observe scheduled digest usefulness.
- [ ] `BG-39.047` Open digest source link.
- [ ] `BG-39.048` Record confusing coverage message.
- [ ] `BG-39.049` Record unnecessary operator intervention.
- [ ] `BG-39.050` Preserve natural-use feedback.

#### BG-39 / 06 — Reliability monitoring

- [ ] `BG-39.051` Check acknowledged items remain retrievable.
- [ ] `BG-39.052` Record false Saved immediately.
- [ ] `BG-39.053` Record lost draft immediately.
- [ ] `BG-39.054` Record privacy leak immediately.
- [ ] `BG-39.055` Record silent billing immediately.
- [ ] `BG-39.056` Classify launch-blocking incident.
- [ ] `BG-39.057` Preserve safe diagnostic identifiers.
- [ ] `BG-39.058` Fix critical defect before acceptance.
- [ ] `BG-39.059` Rerun affected workflow.
- [ ] `BG-39.060` Record candidate change impact.

#### BG-39 / 07 — Actual cost

- [ ] `BG-39.061` Identify provider account scope.
- [ ] `BG-39.062` Identify Cloudflare account scope.
- [ ] `BG-39.063` Read actual trial-period spend.
- [ ] `BG-39.064` Read actual provider usage.
- [ ] `BG-39.065` Distinguish shared-account unrelated usage.
- [ ] `BG-39.066` Compare internal usage estimates.
- [ ] `BG-39.067` Investigate unexplained difference.
- [ ] `BG-39.068` Verify hard guard configuration.
- [ ] `BG-39.069` Record safe billing evidence.
- [ ] `BG-39.070` Avoid zero-estimate-only cost claim.

#### BG-39 / 08 — Friction resolution

- [ ] `BG-39.071` Rank repeated capture friction.
- [ ] `BG-39.072` Rank repeated search friction.
- [ ] `BG-39.073` Rank confusing failure messages.
- [ ] `BG-39.074` Rank retry recovery friction.
- [ ] `BG-39.075` Rank reminder usefulness issues.
- [ ] `BG-39.076` Select required V1 fixes.
- [ ] `BG-39.077` Implement through appropriate task scope.
- [ ] `BG-39.078` Verify owner-facing improvement.
- [ ] `BG-39.079` Record accepted residual limitation.
- [ ] `BG-39.080` Avoid silently lowering required acceptance.

#### BG-39 / 09 — Trial closure

- [ ] `BG-39.081` Count actual real-use days.
- [ ] `BG-39.082` Verify minimum duration reached.
- [ ] `BG-39.083` Review severe incident resolution.
- [ ] `BG-39.084` Review digest sequence evidence.
- [ ] `BG-39.085` Review actual-cost evidence.
- [ ] `BG-39.086` Review tested deployed revision.
- [ ] `BG-39.087` Identify invalidated earlier evidence.
- [ ] `BG-39.088` Record unresolved required behavior.
- [ ] `BG-39.089` Prepare real-use acceptance summary.
- [ ] `BG-39.090` Prepare owner launch review packet.

#### BG-39 / 10 — Verify and close this task

- [ ] `BG-39.091` **Review:** Compare the completed checklist with BG-39's stated outcome; identify uncovered behavior.
- [ ] `BG-39.092` **Verification:** Run or inspect the focused proof required by BG-39; reuse a valid existing run rather than repeating it gratuitously.
- [ ] `BG-39.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [ ] `BG-39.094` **Integrity:** Check that BG-39 has not weakened its stated data, privacy, scope or recovery guarantees.
- [ ] `BG-39.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [ ] `BG-39.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [ ] `BG-39.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [ ] `BG-39.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [ ] `BG-39.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [ ] `BG-39.100` **Gate:** Check the parent completion boundary and record whether BG-40 is unlocked.

## BG-40 — 100 executable microtasks

[Read the detailed implementation chapter](RECOLLECTFLOW_BUILD_GUIDE.md#46-bg-40--record-the-v1-gono-go-decision).

These unchecked steps inherit this task's **what, why, when, where and proof** above.
Follow the numbered order; the group headings organize related work.
Implementation choices remain proposals until resolved in the relevant step.

#### BG-40 / 01 — Establish task context

- [ ] `BG-40.001` **Scope:** Read this task's what/why, file pointers and completion boundary before using its checklist.
- [ ] `BG-40.002` **Dependency:** Verify BG-39's required completion evidence; preserve any unresolved prerequisite as a blocker.
- [ ] `BG-40.003` **Baseline:** Record the actual checkout or release candidate used for BG-40.
- [ ] `BG-40.004` **Discovery:** Locate the current implementation or operational record named in this task; use graph discovery for code.
- [ ] `BG-40.005` **Evidence:** Check whether existing evidence already satisfies any BG-40 step; reference it instead of manufacturing work.
- [ ] `BG-40.006` **Contract:** Identify the authoritative schema, policy or acceptance rule governing this task.
- [ ] `BG-40.007` **Environment:** Select the local, preview, production or physical-device environment required by this task.
- [ ] `BG-40.008` **Authorization:** Confirm the task's existing action boundary; preparation does not grant production or messaging authorization.
- [ ] `BG-40.009` **Inputs:** Prepare the smallest appropriate synthetic fixtures or authorized real-use inputs for this task.
- [ ] `BG-40.010` **Tracking:** Open a BG-40 evidence record and distinguish planned, performed, verified and blocked work.

#### BG-40 / 02 — Acceptance inventory

- [ ] `BG-40.011` Open V1 acceptance checklist.
- [ ] `BG-40.012` Map each checkbox to evidence.
- [ ] `BG-40.013` Identify missing evidence links.
- [ ] `BG-40.014` Identify historical-only evidence.
- [ ] `BG-40.015` Identify candidate-specific evidence.
- [ ] `BG-40.016` Identify deployed-specific evidence.
- [ ] `BG-40.017` Identify physical-device evidence.
- [ ] `BG-40.018` Identify sustained-use evidence.
- [ ] `BG-40.019` Identify accepted limitations.
- [ ] `BG-40.020` Identify unresolved mandatory failures.

#### BG-40 / 03 — Release identity

- [ ] `BG-40.021` Record final Git SHA.
- [ ] `BG-40.022` Record final Worker version.
- [ ] `BG-40.023` Record matching Web asset version.
- [ ] `BG-40.024` Record applied migration head.
- [ ] `BG-40.025` Record canonical Web origin.
- [ ] `BG-40.026` Record actual client versions.
- [ ] `BG-40.027` Record relevant configuration version.
- [ ] `BG-40.028` Record provider policy version.
- [ ] `BG-40.029` Record deployment date.
- [ ] `BG-40.030` Verify identity consistency across evidence.

#### BG-40 / 04 — Core workflow review

- [ ] `BG-40.031` Review capture durability proof.
- [ ] `BG-40.032` Review duplicate/replay proof.
- [ ] `BG-40.033` Review private download proof.
- [ ] `BG-40.034` Review actual source search proof.
- [ ] `BG-40.035` Review owner override proof.
- [ ] `BG-40.036` Review failure/status consistency proof.
- [ ] `BG-40.037` Review delete/restore proof.
- [ ] `BG-40.038` Review export/backup proof.
- [ ] `BG-40.039` Review independent restore proof.
- [ ] `BG-40.040` Review purge anti-resurrection proof.

#### BG-40 / 05 — External and device review

- [ ] `BG-40.041` Review real provider scope evidence.
- [ ] `BG-40.042` Review privacy outbound evidence.
- [ ] `BG-40.043` Review Notion outage evidence.
- [ ] `BG-40.044` Review Notion recreation evidence.
- [ ] `BG-40.045` Review iPhone online rows.
- [ ] `BG-40.046` Review iPhone offline rows.
- [ ] `BG-40.047` Review rotation device behavior.
- [ ] `BG-40.048` Review seven-day digest ledger.
- [ ] `BG-40.049` Review weekly evidence separately.
- [ ] `BG-40.050` Review fourteen-day real-use ledger.

#### BG-40 / 06 — Hardening and cost

- [ ] `BG-40.051` Review OPE-247 packet.
- [ ] `BG-40.052` Review token revocation evidence.
- [ ] `BG-40.053` Review session security evidence.
- [ ] `BG-40.054` Review log redaction evidence.
- [ ] `BG-40.055` Review operational controls.
- [ ] `BG-40.056` Review capacity/concurrency proof.
- [ ] `BG-40.057` Review provider limit revalidation.
- [ ] `BG-40.058` Review actual billing evidence.
- [ ] `BG-40.059` Review performance qualifications.
- [ ] `BG-40.060` Identify remaining release-critical risk.

#### BG-40 / 07 — Scope decision

- [ ] `BG-40.061` Verify local-processing requirement status.
- [ ] `BG-40.062` Reject API-only client completion claim.
- [ ] `BG-40.063` Record approved local-client deferral if applicable.
- [ ] `BG-40.064` Keep required local client blocking otherwise.
- [ ] `BG-40.065` Confirm RAG remains conditional.
- [ ] `BG-40.066` Confirm optional clients remain separate.
- [ ] `BG-40.067` Distinguish limitation from missing requirement.
- [ ] `BG-40.068` Avoid renaming failed behavior complete.
- [ ] `BG-40.069` Record owner tradeoff decisions.
- [ ] `BG-40.070` Preserve required V1 outcome.

#### BG-40 / 08 — Go/no-go record

- [ ] `BG-40.071` Name decision owner.
- [ ] `BG-40.072` Record review date.
- [ ] `BG-40.073` Present evidence summary.
- [ ] `BG-40.074` Present unresolved blocker list.
- [ ] `BG-40.075` Present accepted limitation list.
- [ ] `BG-40.076` Record explicit go or no-go.
- [ ] `BG-40.077` Record reasons for decision.
- [ ] `BG-40.078` Avoid automatic CI-based approval.
- [ ] `BG-40.079` Name task resolving each no-go blocker.
- [ ] `BG-40.080` Record required follow-up evidence.

#### BG-40 / 09 — Publication and history

- [ ] `BG-40.081` Update current completion matrix.
- [ ] `BG-40.082` Preserve historical audit SHA.
- [ ] `BG-40.083` Link fixing revisions.
- [ ] `BG-40.084` Link deployed acceptance evidence.
- [ ] `BG-40.085` Update cumulative guide status.
- [ ] `BG-40.086` Update OPE-229 record through authorized workflow.
- [ ] `BG-40.087` Avoid invented external ticket state.
- [ ] `BG-40.088` Record next eligible milestone.
- [ ] `BG-40.089` Preserve protected evidence locations.
- [ ] `BG-40.090` Close only actually accepted V1 gates.

#### BG-40 / 10 — Verify and close this task

- [ ] `BG-40.091` **Review:** Compare the completed checklist with BG-40's stated outcome; identify uncovered behavior.
- [ ] `BG-40.092` **Verification:** Run or inspect the focused proof required by BG-40; reuse a valid existing run rather than repeating it gratuitously.
- [ ] `BG-40.093` **Failures:** Confirm the task's required rejection, failure or incomplete-outcome cases remain truthful.
- [ ] `BG-40.094` **Integrity:** Check that BG-40 has not weakened its stated data, privacy, scope or recovery guarantees.
- [ ] `BG-40.095` **Cleanup:** Stop only owned temporary processes and remove only disposable task fixtures where appropriate; preserve required evidence.
- [ ] `BG-40.096` **Change review:** Review task-owned code or document changes and preserve unrelated owner work.
- [ ] `BG-40.097` **Results:** Record actual outcomes and evidence references, with source/deployment/device identity as applicable.
- [ ] `BG-40.098` **Exceptions:** Record remaining blockers or justified nonapplicable steps; do not mark unperformed work as passed.
- [ ] `BG-40.099` **Documentation:** Update the task status only to the level actually proved; link the detailed evidence record.
- [ ] `BG-40.100` **Gate:** Check the parent completion boundary and record whether the explicitly approved post-V1 milestone is unlocked.
