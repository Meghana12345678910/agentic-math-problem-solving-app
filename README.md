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

Only the Phase 1 placeholder is implemented. Routing and the functional interface belong to later phases.
