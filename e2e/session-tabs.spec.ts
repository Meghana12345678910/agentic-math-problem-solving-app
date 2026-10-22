import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

test('different sessions preserve both histories when answers overlap', async ({
  page,
  context,
}) => {
  const second = await context.newPage()
  for (const [tab, operation] of [
    [page, 'Addition'],
    [second, 'Division'],
  ] as const) {
    await tab.goto('/practice/setup')
    await tab.getByRole('checkbox', { name: operation, exact: true }).check()
    await tab
      .getByRole('button', { name: 'Start Session', exact: true })
      .click()
    await reveal(tab)
  }
  await Promise.all(
    [page, second].map((tab) =>
      tab.getByRole('button', { name: 'I Got It Wrong', exact: true }).click(),
    ),
  )
  await expect.poll(async () => (await read(page)).attempts.length).toBe(2)
  const history = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('mathPractice.attempts')!) as {
        sessionId: string
        operation: string
      }[],
  )
  expect(new Set(history.map((attempt) => attempt.sessionId)).size).toBe(2)
  expect(history.map((attempt) => attempt.operation).sort()).toEqual([
    'addition',
    'division',
  ])
  expect((await read(page)).mistakes).toHaveLength(2)
})

async function reveal(page: Page) {
  await page
    .getByRole('button', { name: /^Answer / })
    .first()
    .click()
  await page.getByRole('button', { name: 'Flip Card', exact: true }).click()
}
async function answer(page: Page) {
  await reveal(page)
  await page
    .getByRole('button', { name: 'I Got It Right', exact: true })
    .click()
}
const read = (page: Page) =>
  page.evaluate(() => ({
    snapshot: JSON.parse(
      localStorage.getItem('mathPractice.activeSession') ?? 'null',
    ),
    attempts: JSON.parse(
      localStorage.getItem('mathPractice.attempts') ?? '[]',
    ) as { questionId: string; selfReportedCorrect: boolean }[],
    session: JSON.parse(
      localStorage.getItem('mathPractice.sessions') ?? '[]',
    )[0],
    mistakes: JSON.parse(
      localStorage.getItem('mathPractice.mistakePatterns') ?? '[]',
    ),
  }))

for (const fallback of [false, true]) {
  test(`two tabs preserve shared progress (IndexedDB fallback=${fallback})`, async ({
    page,
    context,
  }) => {
    if (fallback)
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'locks', { value: undefined })
      })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/practice/setup')
    await page.getByRole('checkbox', { name: 'Addition', exact: true }).check()
    await page
      .getByRole('radio', { name: 'Continuous practice', exact: true })
      .check()
    await page
      .getByRole('button', { name: 'Start Session', exact: true })
      .click()
    await expect
      .poll(async () => (await read(page)).snapshot?.session.attempted)
      .toBe(0)
    expect(await page.evaluate(() => Boolean(navigator.locks))).toBe(!fallback)
    const older = await context.newPage()
    older.on('pageerror', (error) => errors.push(error.message))
    await older.goto('/practice/session')
    await reveal(older)
    await answer(page)
    await expect.poll(async () => (await read(page)).session.attempted).toBe(1)
    await answer(page)
    await expect.poll(async () => (await read(page)).session.attempted).toBe(2)
    const latest = await read(page)
    await older
      .getByRole('button', { name: 'I Got It Wrong', exact: true })
      .click()
    await expect(older.getByText(/Question 3/)).toBeVisible()
    expect(await read(older)).toEqual(latest)
    expect(latest.mistakes).toEqual([])

    // Both tabs submit the same current question while their lock requests overlap.
    await Promise.all([reveal(page), reveal(older)])
    await Promise.all([
      page.getByRole('button', { name: 'I Got It Right', exact: true }).click(),
      older
        .getByRole('button', { name: 'I Got It Wrong', exact: true })
        .click(),
    ])
    await expect.poll(async () => (await read(page)).attempts.length).toBe(3)
    await expect(page.getByText(/Question 4/)).toBeVisible()
    await expect(older.getByText(/Question 4/)).toBeVisible()
    const committed = await read(page)
    expect(committed.session.attempted).toBe(3)
    expect(committed.session.correct).toBe(
      committed.attempts.filter((a) => a.selfReportedCorrect).length,
    )
    expect(new Set(committed.attempts.map((a) => a.questionId)).size).toBe(3)

    await answer(page)
    await expect.poll(async () => (await read(page)).session.attempted).toBe(4)
    await older.getByRole('link', { name: 'Statistics', exact: true }).click()
    await older
      .getByRole('button', { name: 'End session and leave', exact: true })
      .click()
    await expect(
      older.getByRole('heading', { name: 'Statistics', exact: true }),
    ).toBeVisible()
    const ended = await read(older)
    expect(ended.snapshot).toBeNull()
    expect(ended.attempts).toHaveLength(4)
    expect(ended.session.attempted).toBe(4)
    expect(ended.session.correct).toBe(
      ended.attempts.filter((a) => a.selfReportedCorrect).length,
    )
    expect(ended.session.completedAt).toBeTruthy()
    // Input in the other tab must now show the completed summary, not reopen recovery.
    await page
      .getByRole('button', { name: /^Answer / })
      .first()
      .click()
    await expect(
      page.getByRole('heading', { name: 'Session summary' }),
    ).toBeVisible()
    expect((await read(page)).snapshot).toBeNull()
    expect(errors).toEqual([])
  })
}
