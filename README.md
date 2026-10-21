# Math Practice

A Vite React TypeScript app for arithmetic practice. Phase 1 provides the project structure, shared types, and development tools.

## Development

Run commands from the math directory:

```sh
npm ci
npm run dev
```

## Checks

```sh
npm run test -- --run
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run preview
```

Use `npm run format` to format project files and `npm run test` for tests in watch mode. Lint runs ESLint and the existing Oxlint configuration.

## Structure

- `src/app`: future application wiring
- `src/components`: common, layout, practice, and statistics components
- `src/pages`: future page components
- `src/services`: future question generation, storage, and statistics services
- `src/hooks`: future React hooks
- `src/types`: shared question, session, mistake, statistics, and settings models
- `src/utils`: future utilities
- `src/test`: test environment setup

Phase 2 adds the shared layout, home page, and browser routing. Practice setup, session, summary, statistics, and settings routes currently show placeholders; their features belong to later phases.

## Question generation (Phase 4)

The generators in `src/services/questionGenerator.ts` return complete questions. They are not yet connected to the practice screen. Pass an operation (or an array of enabled operations), a difficulty, and optionally a random source for repeatable tests.

| Level | Addition/subtraction operands | Multiplication factors | Division                           |
| ----- | ----------------------------- | ---------------------- | ---------------------------------- |
| 1     | 0�10                          | 0�5 � 0�5              | Divisor 1�5, quotient 0�5          |
| 2     | 0�50                          | 0�10 � 0�10            | Divisor 1�10, quotient 0�10        |
| 3     | 0�100                         | 0�9 � 0�99             | Divisor 1�12, dividend at most 144 |
| 4     | 0�1,000                       | 10�99 � 0�99           | Divisor 1�99, dividend 100�1,000   |

The specification leaves Beginner/Easy quotient limits and the Advanced dividend cap open; the table records the implementation choices. Subtraction operands are ordered to prevent negatives. Division chooses an integer quotient first, then multiplies it by a nonzero divisor. A cap may not be exactly reachable with every divisor.

Each question has four shuffled, distinct nonnegative integer choices, including exactly one correct answer. Phase 5 uses operation-specific distractors through src/services/answerChoices.ts: carry and borrow mistakes, neighboring multiplication facts, and division fact-family factors. Candidates must stay within 20% of the correct answer (at least 3 for small answers), remain nonnegative whole numbers, and differ from the answer. After at most 12 candidate attempts, nearby alternatives fill any gaps. Fisher-Yates shuffling varies the correct answer position. Generation validates the result, retries unexpected failures up to three times, and throws a descriptive error if it cannot return a valid question.

## Question card (Phase 6)

Open `/practice/card-preview`, or follow **Try a sample card** from the practice page. The fixed sample demonstrates answer selection, card flipping, and one-time self-assessment without saving data or advancing a session. Existing practice configuration behavior is preserved.

`QuestionCard` accepts a question, question number, total question count (or `continuous`), and an optional result callback. Changing the question ID resets selection, flip state, and the result lock. The card-local animation checkbox disables transitions; the system reduced-motion preference also disables them. Number keys 1-4 select answers while focus is inside the card; native buttons support Enter and Space. Inactive faces are hidden from assistive technology and made inert, and revealing the answer moves focus to its heading.

Session generation, statistics, persistence, and automatic advancement remain later work.

## Practice sessions (Phase 7)

Start from `/practice/setup`. A valid configuration starts generated cards with live attempted, correct, and incorrect counts. Self-reported results are stored once in memory with the selected answer and question/session details. Choosing an answer or flipping does not record an attempt. Each recorded result advances to a different fact with cleared card state.

Fixed sessions show accessible progress and stop at the selected count, then navigating to the session summary. Continuous practice has no fixed progress bar; End Session asks for confirmation and then opens the session summary. Direct session URLs without valid setup redirect to setup. The sample-card preview is still available at `/practice/card-preview`.

Phase 9 persists completed attempts and session snapshots locally. Completed sessions now include a timestamp and a dedicated summary page (Phase 8); storage remains Phase 9. The optional between-question transition is not implemented.

## Session summary (Phase 8)

Completed fixed-length sessions and confirmed continuous-session endings navigate to `/practice/summary`. The page shows attempted, correct, incorrect, accuracy (rounded to a whole percent, or 0% for no attempts), operations, difficulty, mistake-review count, and completion time. Current regular sessions have zero mistake-review attempts.

Practice Again starts a fresh session with the same configuration. Change Settings opens practice setup; View Statistics and Return Home open their existing routes. Practice Mistakes is disabled with an explanation until mistake review is implemented. Opening the summary without completed-session data displays a friendly empty state.

Summary navigation uses browser navigation state. Phase 9 also persists session records and completion timestamps to localStorage; active-session recovery remains later work.

## Local storage (Phase 9)

The storage service uses `mathPractice.version`, `mathPractice.settings`, `mathPractice.sessions`, and `mathPractice.attempts`. Schema version 1 migrates the earlier unversioned/version-0 format without removing records. Newer schema versions are protected from writes. Unrelated keys are never cleared.

The existing card-animation preference is saved and restored. Other application settings have validated defaults and storage APIs; their Settings page controls remain later work. Sessions are upserted by ID, sorted newest first, and limited to 100 records. All completed attempts are retained, including selected answers, self-reports, operations, difficulty, session IDs, and timestamps. Duplicate session/question attempts are not appended twice. The service can load recent sessions; their statistics UI remains Phase 10.

Malformed data falls back to defaults for its category. Blocked storage or quota failures show a friendly warning and retain new records in memory so practice can continue. This fallback cannot survive a closed page. A fresh service-instance test verifies serialized persistence; an actual close-and-reopen browser check remains unchecked in TODO.md until manually verified. Active-session resume and recovery are not implemented here.

## Statistics (Phase 10)

Open `/statistics` to view totals derived from saved self-reported attempts. Overall performance and cards for all four operations and difficulty levels show attempted, correct, incorrect, and accuracy. Accuracy is rounded to the nearest whole percent; no attempts shows 0%. Recent session cards show saved session dates, operations, difficulty, counts, and accuracy, newest first. Incomplete sessions are labeled. Counts across all attempts remain available even after older session summaries exceed the 100-session retention limit.

Reset Statistics opens a confirmation dialog. Cancel or Escape preserves history; confirming clears attempts, sessions, and aggregate statistics and refreshes the page totals immediately. Settings, mistake patterns, schema version, and unrelated localStorage keys are preserved. If the reset cannot be persisted, the page states that it was only applied locally; saved history may reappear after reload. Statistics are derived from attempts instead of maintaining a separate aggregate cache.

The Settings page and its additional controls remain Phase 11 work. Advanced mistake statistics remain later work.

## Settings (Phase 11)

The Settings page exposes sound effects, card animation, explanations, and default operations, difficulty, and session length. Save Settings explicitly saves the draft to localStorage; leaving without saving discards it. Practice setup loads the saved defaults, while changes there affect only that session. The initial defaults are no operations selected, Beginner difficulty, and 10 questions.

Card self-assessment plays a short tone only when sound is enabled and supported by the browser. Explanations describe the arithmetic on the revealed card when enabled. Card animation continues to respect reduced motion and the existing card-local toggle.

Clear All Application Data requires explicit confirmation with a permanent-deletion warning. It clears settings, attempts, sessions, mistake patterns, and aggregate statistics, restores defaults, and returns Home. The schema marker is initialized to version 1; unrelated browser keys are preserved. If deletion fails, the page reports the failure and stays on Settings so it can be retried. This adds no mistake-tracking behavior.

## Mistake tracking (Phase 12)

A self-reported wrong answer creates or updates `mathPractice.mistakePatterns` when the completed attempt is saved. Patterns are identified by operation, ordered operands, and difficulty. A repeat retains its pattern ID, increments incorrectCount, updates lastIncorrectAt, resets similarCorrectCount to zero, and sets mastered to false. A self-reported correct answer neither creates a pattern nor increments review progress. Duplicate attempt records do not count twice.

Patterns load and validate at startup. Invalid records are skipped while valid records are retained; duplicate stored facts are consolidated using the latest record and highest existing miss count. Malformed storage safely falls back without deleting unrelated data, and storage failure uses the existing warning and in-memory fallback. Reset Statistics preserves patterns; Clear All Application Data removes them.

There is no new mistake UI in this phase. Inspect the localStorage key in DevTools for manual verification. Similar-question generation, review sessions, review success tracking, and mastery transitions remain later work.
