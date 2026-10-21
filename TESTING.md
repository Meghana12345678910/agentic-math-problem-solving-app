# Phase 20 verification

Run commands from the `math` directory:

```sh
npm run test -- --run --maxWorkers=2
npm run lint
npm run build
npm run format:check
```

Focused additions:

```sh
npm run test -- --run src/pages/CompleteFlows.test.tsx src/accessibilityAudit.test.tsx --maxWorkers=2
```

## Coverage map

Existing tests count toward the Phase 20 checklist; these tests exercise the actual services and components.

| Requirement                                                                              | Test files under `src`                                                                                                                                               |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Four operations, difficulty limits, whole-number division, choice shuffling              | `services/questionGenerator.test.ts`                                                                                                                                 |
| Plausible distractors, unique choices, bounded duplicate handling                        | `services/answerChoices.test.ts`                                                                                                                                     |
| Statistics, accuracy, zero attempts, all correct/wrong                                   | `services/statisticsService.test.ts`, `services/mistakeStatisticsService.test.ts`                                                                                    |
| Mistake updates, similarity rules, mastery thresholds and reopening                      | `services/mistakeService.test.tsx`, `services/similarQuestionGenerator.test.ts`, `pages/ReviewMode.test.tsx`                                                         |
| Storage serialization, invalid data, blocked/full storage                                | `services/storageService.test.ts`, `services/errorHandling.test.ts`, `pages/StoragePersistence.test.tsx`                                                             |
| Operation/difficulty/length selection and validation                                     | `pages/PracticeSetupPage.test.tsx`                                                                                                                                   |
| Answer selection, flip, self-report buttons and duplicate prevention                     | `components/practice/QuestionCard.test.tsx`, `pages/PracticePage.test.tsx`                                                                                           |
| Progress, completion, statistics, confirmation dialogs                                   | `pages/PracticePage.test.tsx`, `pages/SessionSummaryPage.test.tsx`, `pages/StatisticsPage.test.tsx`, `pages/SettingsPage.test.tsx`, `pages/SessionRecovery.test.tsx` |
| Full addition session using keyboard only, all correct and all wrong                     | `pages/CompleteFlows.test.tsx`                                                                                                                                       |
| Mixed session with all four operations and persisted statistics                          | `pages/CompleteFlows.test.tsx`                                                                                                                                       |
| Continuous practice beyond 20 cards and explicit ending                                  | `pages/CompleteFlows.test.tsx`                                                                                                                                       |
| Regular miss to related review to mastery to statistics reset                            | `pages/CompleteFlows.test.tsx`                                                                                                                                       |
| Refresh recovery and exactly-once results through completion                             | `pages/CompleteFlows.test.tsx`, `pages/SessionRecovery.test.tsx`                                                                                                     |
| Keyboard controls, focus, announcements, contrast values, live reduced-motion preference | `accessibility.test.tsx`                                                                                                                                             |
| Automated WCAG A/AA and accessibility best-practice checks                               | `accessibilityAudit.test.tsx`                                                                                                                                        |

## Accessibility checker and reviewed finding

The axe-core development dependency checks Home, setup, sample card, Statistics (empty and populated), Settings, missing-page and missing-summary states, completed summary, both active-card faces, and reset/leave dialogs. The audit initially reported a skipped heading level on the question card. Reviewing its markup showed an h1-to-h3 jump. Both card faces now use h2 headings; the audit is rerun after that fix. The heading-order rule remains enabled.

JSDOM does not render pixels or provide canvas/layout. The audit explicitly disables color-contrast and reports canvas as unavailable; CSS contrast values are tested separately in `accessibility.test.tsx`. An automated DOM audit cannot verify actual screen-reader speech, visual focus, browser zoom/reflow, or touch layout. Refresh integration tests unmount and remount the app using its serialized storage; they are not a real browser reload.

## Manual browser checks still required

Use `npm run dev` and the local address printed by Vite. Use a disposable browser profile when clearing history.

1. With the mouse untouched, Tab to Start Practice, press Enter, choose Addition with Space, select 5 questions with arrow keys, and start. On each card use 1-4, Tab to Flip Card, Enter, then Tab to a self-report and Space. Finish all five cards. Confirm visible focus, automatic question/answer focus, correct totals, and a reachable summary.
2. With NVDA on Windows (or VoiceOver on macOS), repeat a short session. Confirm operation names, choice labels, selected state, new question/progress announcements, and revealed answers are understandable. The hidden card face must not be announced. Check the reset dialog title/description, trapped focus, Escape cancellation, and return of focus.
3. Set browser zoom to 200%. Check Home, setup, both card faces, summary, populated Statistics, Settings, and confirmation dialogs. Confirm no clipped text, inaccessible controls, overlapping labels, or unnecessary horizontal scrolling. Also check a 320 CSS-pixel-wide viewport and a larger default font.
4. Enable the operating system/browser reduced-motion setting. Flip a card: the answer must remain accessible without rotation. Change the preference while the app stays open and confirm it takes effect without changing the saved animation preference.
5. Choose all operations and finish a mixed session. Confirm all cards have four unique choices and summary/statistics match the self-reports. In continuous mode pass 20 questions, cancel ending once, then confirm ending.
6. Mark one regular answer wrong and complete the session. Choose Practice Mistakes; confirm related questions appear. Mark three review answers right with the default threshold; confirm mastery and early completion. On Statistics, cancel Reset Statistics once, then confirm. History should clear while settings and mastered patterns remain.
7. Mid-session, select and flip a card, reload, and accept the native warning. Confirm the exact card, selection, progress, and session return. Finish; each answer must count once.
8. Run axe DevTools or a browser accessibility checker on these rendered states with contrast enabled. Review every violation and incomplete result, including contrast, focus, and zoom concerns. Record browser/version, assistive technology/version, findings, and fixes before checking the remaining manual Phase 20 items.

Screen-reader testing, browser-zoom testing, and manual browser review remain unchecked in TODO.md until performed. No Phase 21 performance or archiving changes are part of this phase.
