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

Fixed sessions show accessible progress and stop at the selected count, displaying a brief finished message. Continuous practice has no fixed progress bar; End Session asks for confirmation and then shows an inline summary with the counts. Direct session URLs without valid setup redirect to setup. The sample-card preview is still available at `/practice/card-preview`.

Attempts are not persisted yet. The dedicated fixed-session summary page, summary actions, and completion timestamps remain Phase 8 work; storage is Phase 9. The optional between-question transition is not implemented.
