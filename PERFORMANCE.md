# Phase 21 performance and data management

## Changes and evidence

StatisticsPage previously recomputed overall totals every time its reset dialog opened or closed. MistakeStatistics also repeated fact grouping and sorting on parent updates and its own mastered-list toggle. Both calculations now use memoization by their source data, and the mistake section is memoized. Tests verify that dialog/toggle updates do not rerun the calculations and that resetting history refreshes results.

Question generation remains in the lazy session initializer and accepted-result handlers. It does not run for answer selection, flipping, or unrelated rerenders. A session retains its initial configuration. Active snapshots still save synchronously before leaving/reloading, while selection and flipping no longer rewrite unchanged session totals. The effect initializes persistence once instead of repeating the event handler's writes. Identical card updates are ignored.

Storage caches parsed, validated JSON and compares it with the current browser value on each read. Changed, removed, or corrupt values invalidate the cache. Identical writes skip setItem; failed writes retain the existing in-memory fallback and are retried on the next save. Warning subscriptions still notify only when the warning changes. Consumers should treat loaded records as read-only.

## Large-history measurement

The automated fixture uses 5,000 attempts with realistic UUID identifiers, including 1,250 review attempts. Adding 130 session summaries retains the newest 100. After a fresh service instance reloads the retained history, all 5,000 attempts, overall/operation/difficulty totals, and review totals remain available. Saving another attempt and reloading yields 5,001 attempts.

The fixture plus 100 session summaries measured **3,584,048 estimated UTF-16 key/value bytes** (about 3.42 MiB). One local run measured **54 ms** for loading, calculating totals, inserting/trimming session summaries, reloading, and checking usage. This is a test-environment observation, not a slow-device benchmark or a timing assertion. Browser quotas and accounting vary; the existing full/blocked-storage warning and memory fallback remain in place.

`storageService.measureStorageUsage()` returns this app's estimated bytes by category and total, or null when browser storage is blocked. It excludes unrelated keys. Detailed attempt archiving is deferred at this tested size: every attempt remains available, avoiding a new migration or loss of detail. The conditional TODO item for summarizing older attempts remains unchecked. If future measurements require compaction, archive overall, operation, difficulty, and review totals atomically with retained records and preserve deduplication/mastery behavior before discarding details. Current session-summary retention never removes attempt totals or mistake patterns.

## Loading and asset audit

Before this phase, the initial production JavaScript was **366.96 kB raw / 113.20 kB gzip**. After splitting Statistics and Settings, it is **356.80 kB raw / 111.46 kB gzip**. Initial CSS changes from **7.20 kB / 2.15 kB gzip** to **5.85 kB / 1.86 kB gzip**.

Separate chunks are approximately **8.70 kB / 2.49 kB gzip** for Statistics, **3.20 kB / 1.20 kB gzip** for Settings, and **1.34 kB / 0.51 kB gzip** for Statistics CSS. These are Vite's decimal kB measurements, and hashes/sizes may vary after changes. Lazy routes have an accessible loading announcement; the shared header stays available, and focus moves to the real page heading when it mounts. Existing error-boundary recovery handles a rejected import. Dedicated tests hold each import pending before allowing it to resolve.

The dependency audit found the three runtime packages in use and development packages used by the build, lint, types, or tests (including required testing peers). No packages were removed or installed. The active UI uses system fonts and CSS; it requests no external font files or image assets. Unreferenced starter assets are outside the initial module graph. No image/font processing dependency or network request was added.

## Reproduce automated checks

From `math`:

```sh
npm run test -- --run src/services/performance.test.tsx src/pages/LazyPages.test.tsx --maxWorkers=2 --reporter=verbose --silent=false
npm run test -- --run --maxWorkers=2
npm run lint
npm run build
npm run format:check
```

## Manual browser checks

1. Run `npm run dev`. Complete regular and review sessions, refresh a selected/revealed card, and verify totals, mastery, and exactly-once recording. On Statistics open/cancel reset and expand/collapse mastered patterns; totals must remain stable.
2. In a disposable browser profile, open the developer console on the app and seed the same fixture:

```js
const { createLargeHistory } = await import('/src/test/largeHistory.ts')
const { storageService } = await import('/src/services/storageService.ts')
localStorage.setItem(
  'mathPractice.attempts',
  JSON.stringify(createLargeHistory(5000)),
)
console.table(storageService.measureStorageUsage()?.byCategory)
```

Reload Statistics. Expected overall totals are 5,000 attempted, 3,333 correct, 1,667 incorrect, and 67% accuracy; review attempts are 1,250. The fixture does not create mistake patterns. Answer one more regular question and verify 5,001 attempts survive reload. Check reset confirmation/cancellation and settings preservation. This replaces attempt history in the disposable profile only.

3. Run `npm run build`, then `npm run preview`. Open the printed address, DevTools Network, disable cache, and reload Home. StatisticsPage and SettingsPage chunks should load only on their first respective navigation. Confirm each page works on direct navigation and its heading receives focus. A cached revisit should remain usable.
4. In the production preview, enable network throttling and CPU slowdown (for example, Slow 4G and 4x CPU). Repeat Home navigation, setup, card selection/flip/self-report, Statistics, and Settings. Confirm a readable loading message, available shared navigation, no broken controls, and no lost data. Record device/browser, throttle settings, timings, and any visible stalls. Repeat on a slower real device if available.

Slower-device testing remains unchecked until actually performed. Phase 22 release/deployment work is unchanged.

## Changed-file inventory

Created: `PERFORMANCE.md`, `src/test/largeHistory.ts`, `src/test/renderReady.tsx`, `src/services/performance.test.tsx`, and `src/pages/LazyPages.test.tsx`.

Modified production files: `src/app/AppRoutes.tsx`, `src/pages/StatisticsPage.tsx`, `src/pages/SettingsPage.tsx`, `src/components/statistics/MistakeStatistics.tsx`, `src/hooks/usePracticeSession.ts`, and `src/services/storageService.ts`. Documentation/checklist updates are in `README.md` and `TODO.md`.

Existing application tests now await real lazy imports and committed page headings. Their assertions and scenario coverage remain in place:

- `src/accessibility.test.tsx`
- `src/accessibilityAudit.test.tsx`
- `src/App.test.tsx`
- `src/components/practice/QuestionCard.test.tsx`
- `src/pages/CompleteFlows.test.tsx`
- `src/pages/ErrorHandling.test.tsx`
- `src/pages/FeedbackPolish.test.tsx`
- `src/pages/MistakeStatistics.test.tsx`
- `src/pages/PracticePage.test.tsx`
- `src/pages/PracticeSetupPage.test.tsx`
- `src/pages/ReviewMode.test.tsx`
- `src/pages/SessionRecovery.test.tsx`
- `src/pages/SessionSummaryPage.test.tsx`
- `src/pages/SettingsPage.test.tsx`
- `src/pages/StatisticsPage.test.tsx`
- `src/pages/StoragePersistence.test.tsx`
- `src/services/mistakeService.test.tsx`

Validation: eight new Phase 21 tests pass; the full suite passes 291 tests across 28 files. Lint, the production build, and formatting checks pass. No packages were installed or removed.
