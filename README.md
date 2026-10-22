# Math Practice

A browser-based arithmetic practice app for children ages 7?12. Students practice addition, subtraction, multiplication, and division using four-choice cards, reveal answers, and self-report results. Features include four difficulty levels, fixed or continuous sessions, mistake review, mastery tracking, statistics, and configurable settings.

No account or backend is required. Progress stays in the current browser; clearing browser data removes it.

## Technologies

- React, TypeScript, Vite, React Router, and CSS
- Vitest and React Testing Library for unit/component tests
- Playwright and axe-core for browser and accessibility checks
- ESLint, Oxlint, and Prettier for code quality

## Prerequisites

- Node.js 22.12 or later and npm
- A modern web browser

## Install and run

Run all commands from the `math` project directory.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite.

## Project commands

| Task | Command |
| --- | --- |
| Run tests once | `npm run test -- --run --maxWorkers=1` |
| Watch tests | `npm run test` |
| Lint | `npm run lint` |
| Production build, including TypeScript checks | `npm run build` |
| Preview the production build locally | `npm run preview` |

Run the build before previewing. The production files are generated in `dist`.

For optional browser tests, run `npm run browsers:install`, then `npm run test:e2e`.

## Deployment

Deployed on Netlify: [Live demo](https://legendary-sfogliatella-a52e1d.netlify.app/). Use build command `npm run build` and publish directory `dist`. If deploying from a repository containing the parent workspace, set the base directory to `math`; otherwise leave it empty. Alternatively, upload the built `dist` folder manually.

`netlify.toml` provides build settings, and `public/_redirects` supplies the React Router fallback so direct links and page refreshes work. No runtime environment variables are required. Complete the remaining live-site checks for route refreshes, session recovery, saved progress, responsive layouts, and the browser console. Progress does not transfer between localhost and the deployed origin.

Deployment is complete; some manual release checks remain pending. See [AUDIT.md](AUDIT.md) for current verification status and [RELEASE.md](RELEASE.md) for detailed deployment instructions.
