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

Each question has four shuffled, distinct nonnegative integer choices, including exactly one correct answer. Basic distractors use nearby values; specialized operation-specific distractor strategies remain later work. Generation validates the result, retries unexpected failures up to three times, and throws a descriptive error if it cannot return a valid question.
