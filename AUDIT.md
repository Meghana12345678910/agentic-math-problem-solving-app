# Requirements audit after targeted fixes

This audit covers all of `specification.md` and `TODO.md`. Implemented means the
behavior exists with relevant automated coverage, not that every manual release
check has passed. The project is **not yet fully release-verified or deployed**.
Paths below are relative to this project; test filenames without directories are
under `src` in the corresponding service, page, or component directory.

## Targeted fixes

- The session hook now requires a selected answer, a revealed card, a matching
  selected value, and a boolean self-assessment before recording a result.
- Stored attempts and mistake patterns now use the same difficulty-range
  validator as generated questions.
- Mastered-pattern details use a heading instead of an invalid standalone
  `summary` element. The existing disclosure button and visual layout remain.
- Narrow layouts use flexible navigation columns and viewport-bounded padding
  so doubled text does not force navigation and card labels into tiny fragments.
  A browser regression checks that navigation words remain on one line.
- Shared confirmation styles now load with the dialog rather than the lazy
  Statistics page. A cold-start browser test checks the leave overlay before
  Statistics loads, plus its bounds with doubled text at 320 pixels.
- Practice updates share one cross-tab lock across session IDs. Browsers without
  Web Locks use an IndexedDB read/write transaction to serialize the synchronous
  localStorage read/check/write callback. Only lock metadata is stored in that
  database; practice history remains in localStorage.
- Unexpected synchronous or asynchronous progress-update errors reach the
  existing page error boundary instead of escaping as unhandled rejections.
- Hook tests now select/reveal before reporting results. Assertions remain in
  place. Test timing budgets accommodate long keyboard flows and real lazy
  imports on the Windows host; browser tests still use zero retries.

## Requirement matrix

| Major requirement                                                            | Status                                         | Responsible files                                                                             | Automated coverage                                                                                                                | Manual check still needed                                                                                                         |
| ---------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Vite, React, TypeScript, tools and shared models                             | Implemented                                    | `package.json`, build/lint/test configuration, `src/types/*`, `src/main.tsx`                  | TypeScript production build, lint, component suite                                                                                | Run development server locally                                                                                                    |
| Shared layout, Home and navigation                                           | Implemented                                    | `src/components/layout/*`, `src/pages/HomePage.tsx`, `src/app/AppRoutes.tsx`                  | `App.test.tsx`, browser release routes                                                                                            | Child-friendly readability and navigation on actual devices                                                                       |
| Addition                                                                     | Implemented                                    | `src/services/questionGenerator.ts`                                                           | `questionGenerator.test.ts`: arithmetic and level boundaries                                                                      | Sample all four levels                                                                                                            |
| Subtraction                                                                  | Implemented                                    | `questionGenerator.ts`                                                                        | Arithmetic, operand bounds, nonnegative results                                                                                   | Inspect borrowing examples                                                                                                        |
| Multiplication                                                               | Implemented                                    | `questionGenerator.ts`                                                                        | Products and factor ranges for every level                                                                                        | Inspect intermediate/advanced examples                                                                                            |
| Division                                                                     | Implemented                                    | `questionGenerator.ts`                                                                        | Nonzero divisor, integer answer, divisor/dividend bounds                                                                          | Sample all levels                                                                                                                 |
| Difficulty rules                                                             | Implemented                                    | `questionGenerator.ts`, `DifficultySelector.tsx`                                              | All operation/level combinations and exact boundaries                                                                             | Compare descriptions with sample cards                                                                                            |
| Four unique choices, one correct, plausible distractors, shuffled positions  | Implemented                                    | `answerChoices.ts`, `questionGenerator.ts`, `src/utils/shuffle.ts`                            | `answerChoices.test.ts`, `questionGenerator.test.ts`, `utilities.test.ts`                                                         | Judge distractor suitability for the target age                                                                                   |
| Operation/multiple-operation, difficulty, length and review configuration    | Implemented                                    | `PracticeSetupPage.tsx`, selector components, `practiceConfiguration.ts`                      | `PracticeSetupPage.test.tsx`, `ReviewMode.test.tsx`, complete flows                                                               | Exercise mixed operations and each session length                                                                                 |
| Card front, selection, reveal, explanation and right/wrong buttons           | Implemented                                    | `QuestionCard.tsx`, `CardFront.tsx`, `CardBack.tsx`, `AnswerChoice.tsx`                       | `QuestionCard.test.tsx`, accessibility tests, browser card checks                                                                 | Inspect both faces and animation/no-animation behavior                                                                            |
| Self-report validation and exactly-once recording                            | Implemented                                    | `usePracticeSession.ts`, `QuestionCard.tsx`, `storageService.ts`                              | `auditValidation.test.tsx`, hook/card/session tests                                                                               | Double-click and attempt an old tab's answer                                                                                      |
| Progression, progress bar, repeat avoidance, fixed and continuous completion | Implemented                                    | `usePracticeSession.ts`, `PracticePage.tsx`, `ProgressBar.tsx`                                | `PracticePage.test.tsx`, `CompleteFlows.test.tsx`                                                                                 | Complete fixed and continuous sessions, including cancel/end                                                                      |
| Summaries and all summary actions                                            | Implemented                                    | `SessionSummaryPage.tsx`                                                                      | `SessionSummaryPage.test.tsx`, review and complete-flow tests                                                                     | Exercise all five actions with known totals                                                                                       |
| Mistake creation, updates and persistence                                    | Implemented                                    | `mistakeService.ts`, `storageService.ts`                                                      | `mistakeService.test.tsx`, complete flows                                                                                         | Miss a fact repeatedly and inspect its details                                                                                    |
| Nearby, reversed and inverse/fact-family similar questions                   | Implemented                                    | `similarQuestionGenerator.ts`                                                                 | `similarQuestionGenerator.test.ts`: all operations, bounds, repeat avoidance and lineage                                          | Compare review questions with missed facts                                                                                        |
| Review eligibility, priority and mixing                                      | Implemented                                    | `reviewService.ts`, setup/summary pages                                                       | `ReviewMode.test.tsx`: eligibility, frequency, recency, success, ties and rounds                                                  | Review multiple active patterns                                                                                                   |
| Configurable mastery, wrong-review reset and reopening                       | Implemented                                    | `mistakeService.ts`, `reviewService.ts`, Settings                                             | `ReviewMode.test.tsx`, complete flows                                                                                             | Master a pattern, then miss its original fact again                                                                               |
| Overall, operation, difficulty and recent-session statistics                 | Implemented                                    | `statisticsService.ts`, `StatisticsPage.tsx`, statistics components                           | Statistics service/page tests, complete flows                                                                                     | Compare a known session with totals and dates                                                                                     |
| Mistake rankings, ties, active/mastered details and review totals            | Implemented                                    | `mistakeStatisticsService.ts`, `MistakeStatistics.tsx`                                        | Mistake statistics service/page tests, semantic heading regression                                                                | Expand mastered details and inspect a populated history                                                                           |
| Settings, defaults, explanations, sound and feedback preferences             | Implemented                                    | `SettingsPage.tsx`, `storageService.ts`, setup/card utilities                                 | `SettingsPage.test.tsx`, `FeedbackPolish.test.tsx`, feedback tests                                                                | Save/reload each preference and listen to sound                                                                                   |
| Reset Statistics and Clear All confirmation                                  | Implemented                                    | Settings/Statistics, `ConfirmDialog.tsx`, `storageService.ts`                                 | Cancel/confirm, focus, preservation, defaults and failure tests                                                                   | Use a disposable profile to cancel and confirm each action                                                                        |
| localStorage, versioning, validation and affected-category recovery          | Implemented                                    | `storageService.ts`, `StorageWarning.tsx`                                                     | Storage/error tests; new out-of-range attempt/pattern regression                                                                  | Inspect recovery messages with disposable corrupt data                                                                            |
| Blocked/full storage and continued practice                                  | Implemented                                    | `storageService.ts`, `StorageWarning.tsx`                                                     | Quota/blocked storage tests and UI continued-practice test                                                                        | Block storage and confirm warning and continued use                                                                               |
| Refresh recovery, including reordered operations                             | Implemented                                    | `PracticePage.tsx`, `usePracticeSession.ts`, active snapshot validators                       | `SessionRecovery.test.tsx`, browser real-reload scenario                                                                          | Reload before selection, after selection and after reveal                                                                         |
| Browser close/restart persistence acceptance                                 | Partially implemented/verified                 | `storageService.ts`                                                                           | Fresh-service/remount and real reload tests                                                                                       | Close and reopen the actual browser and verify history; persistent-browser automation was not reliable on this host               |
| Cross-tab practice updates                                                   | Implemented with browser API limits below      | `progressLock.ts`, `usePracticeSession.ts`, `storageService.ts`                               | Hook regressions; `e2e/session-tabs.spec.ts`: same session, different sessions, disabled Web Locks                                | Repeat on actual Safari/Edge; simultaneous destructive resets are outside these tests                                             |
| Navigation safety                                                            | Implemented                                    | `SessionNavigationGuard.tsx`, `ConfirmDialog.tsx`, `ConfirmDialog.css`, Practice page         | Recovery/navigation tests, browser stale-tab leaving, and `e2e/dialog.spec.ts` cold-overlay/enlarged-bounds checks                | Actual native close/refresh prompts vary by browser                                                                               |
| Friendly generation, storage, route and unexpected-update errors             | Implemented for specified cases                | `questionRecovery.ts`, storage service, `ErrorBoundary.tsx`, `ErrorMessage.tsx`, session hook | `errorHandling.test.ts`, page errors, new async boundary regression                                                               | Inspect production messages and console                                                                                           |
| Keyboard, focus, labels and reduced motion                                   | Implemented                                    | Layout, card, selectors, dialogs, `useReducedMotion.ts`, CSS                                  | Keyboard-only complete flows, shortcut/focus/motion tests                                                                         | Repeat keyboard flow and actual OS reduced-motion setting                                                                         |
| Complete visual/screen-reader accessibility verification                     | Partially implemented/verified                 | Shared/card/page CSS and semantic components                                                  | Axe scans, palette contrast calculations, doubled-root-text browser reflow checks                                                 | Screen reader, actual 200% browser zoom, larger OS fonts and rendered contrast review; axe's JSDOM contrast rule remains disabled |
| Responsive layout                                                            | Partially verified                             | `App.css`, card/page CSS                                                                      | Existing tablet/mobile emulation plus 320/375/768/1024-pixel portrait/landscape and enlarged-text coverage in `e2e/audit.spec.ts` | Physical-device behavior and populated long-content/dialog checks                                                                 |
| Thousands of attempts and compact histories                                  | Implemented at tested size                     | Storage service, memoized statistics components                                               | 5,000 attempts; newest 100 session summaries; aggregate/review totals retained                                                    | Measure realistic long histories on slower hardware; detailed attempt archiving is conditional and remains deferred               |
| Loading and rendering performance                                            | Partially verified                             | Lazy routes, storage cache, memoized statistics                                               | Performance/lazy-page tests; delayed JS assets and Chromium 4x CPU scenario                                                       | Actual slower devices and representative school/home networks; no hardware performance guarantee is claimed                       |
| Privacy and no-account operation                                             | Implemented in app code                        | `PrivacyNotice.tsx`, Home/Settings, local services                                            | Privacy tests, off-origin request checks in release flows                                                                         | Review live hosting/network settings; no practice history is uploaded by the app                                                  |
| React Router direct routes and refresh                                       | Implemented locally; live verification missing | `AppRoutes.tsx`, `public/_redirects`, `netlify.toml`                                          | Local production direct-route/reload tests                                                                                        | Verify every route on the actual Netlify domain                                                                                   |
| Browser compatibility                                                        | Partially verified                             | `playwright.config.ts`, `e2e/*`                                                               | Chromium, Firefox, WebKit and Chromium tablet/mobile projects                                                                     | Actual Safari and Microsoft Edge; WebKit is not Safari certification                                                              |
| Deployment                                                                   | Missing                                        | `netlify.toml`, `_redirects`, `RELEASE.md`                                                    | Local production build and routing checks                                                                                         | Authenticated Netlify deployment, live persistence/layout/routes/console verification                                             |

## Remaining acceptance work

The TODO items for a real browser restart, screen reader, browser zoom, larger
system fonts, manual accessibility review, slower physical devices, actual
Safari/Edge, and deployment/live-origin checks must not be checked merely because
related automation exists. Netlify is selected, but there is no Netlify connector,
auth token, or site ID available in this workspace.

If both Web Locks and IndexedDB are unavailable/denied, the app retains its
synchronous usable-session fallback. That environment cannot provide the same
cross-tab atomicity guarantee. Blocked/full localStorage also cannot guarantee
persistence after the browser closes; the warning/memory fallback is intentional.

The optional between-question transition, optional negative subtraction, and
conditional attempt archiving do not block the initial functional requirements.
Accounts, cloud sync, remainders and other future enhancements remain out of scope.

## Verification

- Full Vitest suite: **305 tests across 31 files passed**.
- ESLint and oxlint: passed.
- TypeScript and Vite production build: passed.
- Broader production-browser run: **45 passed**, zero failed/skipped/flaky,
  across Chromium, Firefox, WebKit and tablet/mobile Chromium emulation.
  Its local report is `playwright-report/audit-92283-report.json`.
- After the final shared-dialog CSS extraction and rebuild, **15 focused
  production-browser checks passed**, zero failed/skipped/flaky, across the same
  five projects: cold-start dialog styling/bounds, enlarged-text reflow and
  responsive pages/card faces. The report is
  `playwright-report/audit-86404-report.json`. The broader run preceded this final
  CSS-only extraction; it is not presented as a 50-case run of the final bundle.
- All changed files passed Prettier checking. No packages were installed.

Browser checks used a separately managed local Vite production preview on port
4175, not a deployed Netlify origin. Firefox crashed before app page creation
inside the restricted sandbox; its focused check and the successful cross-engine
runs used approved execution outside that sandbox. CPU throttling was Chromium
only; every engine received the delayed-asset functional check.

The automated orientation and common-small-screen TODO items are now checked
with explicit viewport-emulation notes. No real-device, screen-reader, browser
restart, actual-browser zoom/system-font, Safari/Edge or deployment checkbox was
checked on the strength of related emulation.

The optional whole-project `format:check` reports an existing formatting difference
in `index.html`. That unrelated file was left unchanged. No changed file was
reported by Prettier.

The initial timed UI run and the experimental persistent-browser shutdown test
are not counted as successful full runs. The latter was removed from the default
suite because shutdown timed out in Playwright after the app reached Statistics;
browser restart remains a manual acceptance check. Root text enlargement is not
claimed as actual browser zoom or an OS font-size test.

## Exact remaining manual checks

1. In a disposable browser profile, complete five questions: mark the first
   wrong and four right. Confirm 5 attempted, 4 correct, 1 incorrect and 80% in
   the summary and Statistics. Close the browser completely, reopen the same
   origin/profile, and confirm those totals and saved settings remain.
2. With a screen reader, navigate setup, select/reveal/report a card, hear its
   question/result/progress, and exercise cancel/confirm in both data-reset
   dialogs and the leave-session dialog. Confirm hidden card controls stay out
   of navigation and focus returns appropriately.
3. Repeat setup, both card faces, populated Statistics, Settings and dialogs at
   actual 200% browser zoom and with larger system fonts. Check rendered contrast,
   readable labels, reachable controls and absence of clipping.
4. Repeat on actual Safari and Edge, physical tablet portrait/landscape and a
   slower device. Record browser/device and any responsiveness or layout issue.
5. After authenticated Netlify deployment, open and refresh every documented
   route on the live origin. Repeat persistence, responsive and console/network
   checks there. Localhost progress does not automatically transfer to Netlify.
