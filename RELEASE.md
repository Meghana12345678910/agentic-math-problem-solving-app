# Phase 22 release preparation

For the latest targeted-fix verification and remaining requirements, see
[AUDIT.md](AUDIT.md). The phase-specific verification record below is historical.

## Current scope

Netlify is the selected hosting service. This workspace prepares the production build and SPA routing; publication and live-domain verification require authenticated Netlify access. No Netlify auth token or site ID was available in this session, and no deployment has been made. Do not treat local preview checks as verification of a deployed site.

## Privacy review

- The app asks for no name, email, password, account, or other personal details. Record identifiers are locally generated IDs for questions, attempts, sessions, and mistake patterns.
- Settings, attempts, session recovery, session summaries, and mistake patterns stay in browser localStorage, with an in-memory fallback when storage fails. Statistics are derived locally. There is no app backend, upload, analytics, tracking SDK, advertising, external iframe, remote font, or runtime third-party API in the current source.
- Home and Settings explain browser-local data, clearing browser data, Clear All Application Data, and lack of recovery on another device.
- Browser release tests collect console/page errors and reject off-origin requests during the tested flows. This is a check of the application's behavior; static hosting may keep normal HTTP request logs. Practice records are not uploaded by the app.
- Clearing browser data, private browsing, a different browser profile, or changing site origins can make saved progress unavailable. Moving from localhost to a Netlify domain does not transfer localStorage automatically.

## Local verification commands

From `math`:

```sh
npm ci
npm run browsers:install
npm run test -- --run --maxWorkers=1
npm run lint
npm run typecheck
npm run test:e2e
npm run format:check
```

`test:e2e` uses one browser worker and a 90-second scenario budget to accommodate cross-engine startup and teardown on Windows. No automatic retries hide failures. It builds first, starts Vite's production preview at `http://127.0.0.1:4173`, runs headless Playwright tests, and stops the preview. Keep that port free. Browser binaries download into ignored `math/.playwright`; browser reports and traces go into ignored local result directories. The wrapper keeps browser installation and testing paths consistent across shells. The tests use fresh browser contexts and do not touch the student's existing browser profile.

The four scenarios cover every direct route plus reload, the privacy notice, a real reload of a revealed active card through fixed-session completion and persisted statistics, and viewport overflow on core pages and both card faces. Each scenario also checks console/page errors and external requests. A JSON result report records browser versions in `test-results/release-report.json`; responsive-card screenshots and failure traces stay in the ignored result directory. The configured projects are Chromium/Chrome for Testing, Firefox, WebKit, tablet emulation, and mobile emulation. WebKit is not proof of actual Safari compatibility; desktop emulation is not proof of physical iOS behavior. Branded Microsoft Edge remains a manual check.

## Netlify deployment

[Netlify's SPA guidance](https://docs.netlify.com/build/configure-builds/javascript-spas/) requires app-shell rewrites for history-based routes. `public/_redirects` contains `/* /index.html 200`; Vite copies it into `dist/_redirects`. Existing static assets are served normally. `netlify.toml` sets `npm run build` and the `dist` publish directory.

For a connected repository:

1. Sign into your Netlify account and import the repository.
2. If the repository contains the parent workspace, set the base directory to `math`. If the repository root is this project, leave the base directory empty. Build and publish paths are relative to that base.
3. Confirm build command `npm run build`, publish directory `dist`, and that Netlify detects `netlify.toml`.
4. Deploy, then run the live-origin checks below. No runtime environment variables are required by this app. Keep optional host analytics/form detection disabled to preserve the reviewed app behavior.

For manual upload:

1. Run `npm run build`.
2. Confirm `dist/index.html`, `dist/assets`, and `dist/_redirects` exist.
3. Upload the **dist folder** through Netlify's manual deploy interface. Do not upload the workspace, node_modules, test fixtures, or browser binaries.
4. Record the actual deployed URL and verify the published routes. Authentication is performed in your browser; do not put account tokens into source files or chat.

After publishing, the same isolated browser scenarios can target the live site. In PowerShell:

```powershell
$env:PLAYWRIGHT_BASE_URL = 'https://your-site.netlify.app'
npm run test:e2e
Remove-Item Env:PLAYWRIGHT_BASE_URL
```

Use the actual approved site URL. This skips the local preview server; the script still builds locally first. Fresh browser contexts keep test records separate from real users' saved browser data. A run against a live URL must be recorded separately from local results.

## Exact manual release checks

1. Run `npm run preview`, open its printed address, and repeat the following checks locally. After deployment, repeat them on the actual Netlify domain using a fresh/disposable browser profile.
2. Open and refresh `/`, `/practice/setup`, `/practice/session`, `/practice/summary`, `/statistics`, `/settings`, and `/practice/card-preview`. A session without configuration/recovery should explain the missing session in setup; an empty summary should explain that no completed session is available. An unknown route should show the app's Page not found view. No host 404 or blank page should appear.
3. Start five-question Addition practice. Select, flip, and mark the first answer wrong. Reveal the second card, reload, accept the native warning if shown, and confirm the same card/selection/progress returns. Finish with the remaining answers marked right: summary and Statistics should show five attempted, four correct, one incorrect, 80% accuracy. Reload Statistics and restart the browser to confirm persistence. Verify only five attempts were recorded.
4. Start mistake review from the summary with the default threshold. Mark three review questions right; confirm related questions, mastery, and early completion. Test continuous practice and both cancel/confirm ending. Test cancel/confirm navigation away from an active session.
5. Save a preference in Settings and reload. Cancel Reset Statistics and Clear All Application Data once before confirming each in a disposable profile. Reset Statistics must preserve settings/patterns; Clear All Application Data restores defaults. Verify the privacy notice on Home and Settings, and no personal-information fields or advertisements.
6. Repeat on actual Chrome, Firefox, Edge, and Safari, recording browser/version/device and failures. WebKit automation complements actual Safari review. Check tablet portrait/landscape and a mobile viewport, both card faces, long statistics content, settings, and dialogs. Confirm no clipped controls or horizontal overflow. Keyboard, screen-reader, 200% zoom, and reduced-motion checks in TESTING.md remain applicable.
7. Open the browser console and Network panel on the production site. Complete the flows above. Confirm no console errors, no development-server connection, no off-origin app requests or tracking, and lazy Statistics/Settings assets load successfully. Server access logs are a hosting concern separate from practice data.
8. Record the deployment URL, date, browser versions, viewport/device, route checks, persistence checks, console/network findings, and any remaining issues. Only then check off deployment/live verification items in TODO.md.

## Verification record

The local production run passed **20 of 20** browser scenarios with no skipped or flaky results and no captured application console errors or off-origin requests. A separate five-project screenshot run passed **5 of 5** after waiting for the flip transition's final frame. Desktop and mobile end-frame screenshots were inspected; the initial blank capture was an intermediate animation frame, and no application animation change was needed.

| Browser/project               | Version      | Local production scenarios |
| ----------------------------- | ------------ | -------------------------- |
| Chrome for Testing / Chromium | 156.0.8078.4 | 4 passed                   |
| Playwright Firefox            | 157.0        | 4 passed                   |
| Playwright WebKit             | 27.2         | 4 passed                   |
| Tablet emulation (Chromium)   | 156.0.8078.4 | 4 passed                   |
| Mobile emulation (Chromium)   | 156.0.8078.4 | 4 passed                   |

The complete run's report is preserved locally in `playwright-report/full-release-report.json`; the latest focused run is in `test-results/release-report.json`. These generated records are ignored by Git. The first concurrent browser run exposed Firefox startup/teardown timeouts; serial execution completed all scenarios successfully without retries. The final sequential Vitest run passed all **293 tests across 29 files**, including the two new privacy-notice tests. Lint, TypeScript checking through the production build, Vite build, and formatting checks passed.

Actual Safari and Edge, physical-device behavior, deployment, and live-site verification remain pending. WebKit passing does not check off Safari. Tablet/mobile checklist items refer specifically to emulation. Earlier-phase manual accessibility and slower-device checks remain unchanged.

## Changed files

Created:

- `src/components/common/PrivacyNotice.tsx`
- `src/pages/PrivacyNotice.test.tsx`
- `playwright.config.ts`
- `e2e/release.spec.ts`
- `scripts/playwright.mjs`
- `netlify.toml`
- `public/_redirects`
- `RELEASE.md`

Modified:

- `src/pages/HomePage.tsx`
- `src/pages/SettingsPage.tsx`
- `package.json`
- `package-lock.json`
- `tsconfig.node.json`
- `eslint.config.js`
- `.gitignore`
- `.prettierignore`
- `README.md`
- `TODO.md`

The only new package is the development dependency `@playwright/test` (1.64.1); its browser downloads remain outside the production bundle.
