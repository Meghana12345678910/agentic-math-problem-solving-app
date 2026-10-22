import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const browserProblems = new WeakMap<Page, string[]>()

// Fresh browser contexts keep these checks away from real student history.
test.beforeEach(async ({ page, browser }) => {
  const origin = new URL(test.info().project.use.baseURL!).origin
  const problems: string[] = []
  page.on('pageerror', (error) => problems.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(message.text())
  })
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== origin)
      problems.push('Unexpected external request: ' + request.url())
  })
  test.info().annotations.push({
    type: 'scope',
    description:
      'Local production preview; emulation is not a physical device or branded Safari/Chrome/Edge.',
  })
  test.info().annotations.push({
    type: 'browser-version',
    description: browser.version(),
  })
  browserProblems.set(page, problems)
})

test.afterEach(async ({ page }) => {
  expect(browserProblems.get(page) ?? []).toEqual([])
})

async function answer(page: Page, right: boolean) {
  await page
    .getByRole('button', { name: /^Answer / })
    .first()
    .click()
  await page.getByRole('button', { name: 'Flip Card', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Answer revealed' }),
  ).toBeFocused()
  await page
    .getByRole('button', {
      name: right ? 'I Got It Right' : 'I Got It Wrong',
      exact: true,
    })
    .click()
}
async function start(page: Page) {
  await page.goto('/practice/setup')
  await page.getByRole('checkbox', { name: 'Addition', exact: true }).check()
  await page.getByRole('radio', { name: '5 questions', exact: true }).check()
  await page.getByRole('button', { name: 'Start Session', exact: true }).click()
}

test('all direct routes and reloads load the production app', async ({
  page,
}) => {
  const routes = [
    ['/', 'Welcome to Math Practice!'],
    ['/practice/setup', 'Practice setup'],
    ['/practice/session', 'Practice setup'],
    ['/practice/summary', 'Session summary'],
    ['/statistics', 'Statistics'],
    ['/settings', 'Settings'],
    ['/practice/card-preview', 'Try a sample card'],
    ['/unknown-route', 'Page not found'],
  ]
  for (const [path, heading] of routes) {
    const response = await page.goto(path)
    expect(response?.status()).toBe(200)
    await expect(
      page.getByRole('heading', { name: heading, exact: true }),
    ).toBeVisible()
    await page.reload()
    await expect(
      page.getByRole('heading', { name: heading, exact: true }),
    ).toBeVisible()
  }
})

test('privacy notice explains browser-local data and deletion', async ({
  page,
}) => {
  for (const path of ['/', '/settings']) {
    await page.goto(path)
    await expect(
      page.getByRole('heading', { name: 'Your practice stays here' }),
    ).toBeVisible()
    await expect(page.getByText(/Clearing your browser data/)).toBeVisible()
    await expect(
      page.locator('input[type="email"], input[type="password"], iframe'),
    ).toHaveCount(0)
    expect(
      await page
        .locator('a')
        .evaluateAll((links) =>
          links.every(
            (link) =>
              new URL(link.getAttribute('href')!, location.href).origin ===
              location.origin,
          ),
        ),
    ).toBe(true)
  }
})

test('reload recovers the card, session completes once, and statistics persist', async ({
  page,
}) => {
  await start(page)
  await answer(page, false)
  await page
    .getByRole('button', { name: /^Answer / })
    .first()
    .click()
  await page.getByRole('button', { name: 'Flip Card', exact: true }).click()
  const before = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('mathPractice.activeSession')!),
  )
  page.on('dialog', (dialog) => dialog.accept())
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Answer revealed' }),
  ).toBeVisible()
  const after = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('mathPractice.activeSession')!),
  )
  expect(after.question.id).toBe(before.question.id)
  expect(after.selectedAnswer).toBe(before.selectedAnswer)
  await page
    .getByRole('button', { name: 'I Got It Right', exact: true })
    .click()
  for (let index = 0; index < 3; index++) await answer(page, true)
  await expect(
    page.getByRole('heading', { name: 'Session summary' }),
  ).toBeVisible()
  await expect(page.getByText('80%', { exact: true })).toBeVisible()
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('mathPractice.attempts')!).length,
    ),
  ).toBe(5)
  expect(
    await page.evaluate(() =>
      localStorage.getItem('mathPractice.activeSession'),
    ),
  ).toBeNull()
  await page.getByRole('link', { name: 'View Statistics', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Statistics', exact: true }),
  ).toBeFocused()
  await page.reload()
  await expect(
    page.getByRole('region', { name: 'Overall totals' }),
  ).toContainText('80%')
})

test('responsive pages and card faces fit the viewport', async ({ page }) => {
  for (const path of [
    '/',
    '/practice/setup',
    '/statistics',
    '/settings',
    '/practice/card-preview',
  ]) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true)
    if (path.endsWith('card-preview')) {
      await page
        .getByRole('button', { name: /^Answer / })
        .first()
        .click()
      await page.getByRole('button', { name: 'Flip Card', exact: true }).click()
      await expect(
        page.getByRole('heading', { name: 'Answer revealed' }),
      ).toBeVisible()
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true)
    }
  }
  // Visibility changes immediately; wait for the 3D transition's actual end frame.
  await page.locator('.question-card-inner').evaluate(async (card) => {
    await Promise.all(
      card.getAnimations().map((animation) => animation.finished),
    )
  })
  await page.screenshot({
    path: test.info().outputPath('responsive-card.png'),
    fullPage: true,
    animations: 'disabled',
  })
})
