import { test, expect } from '@playwright/test'

test('practice remains usable with delayed assets and simulated CPU slowdown', async ({
  page,
  context,
  browserName,
}) => {
  await page.route('**/assets/*.js', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    await route.continue()
  })
  if (browserName === 'chromium') {
    const session = await context.newCDPSession(page)
    await session.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  }
  await page.goto('/practice/setup')
  await page.getByRole('checkbox', { name: 'Addition', exact: true }).check()
  await page.getByRole('radio', { name: '5 questions', exact: true }).check()
  await page.getByRole('button', { name: 'Start Session', exact: true }).click()
  for (let index = 0; index < 5; index++) {
    await page
      .getByRole('button', { name: /^Answer / })
      .first()
      .click()
    await page.getByRole('button', { name: 'Flip Card', exact: true }).click()
    await page
      .getByRole('button', { name: 'I Got It Right', exact: true })
      .click()
  }
  await expect(
    page.getByRole('heading', { name: 'Session summary' }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'View Statistics', exact: true }).click()
  await expect(
    page.getByRole('region', { name: 'Overall totals' }),
  ).toContainText('100%')
})

test('portrait, landscape and narrow layouts reflow with enlarged text', async ({
  page,
}) => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 375, height: 667 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(viewport)
    for (const route of [
      '/practice/setup',
      '/statistics',
      '/settings',
      '/practice/card-preview',
    ]) {
      await page.goto(route)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '225%'
      })
      for (const link of await page.locator('.main-navigation a').all()) {
        expect(
          await link.evaluate((element) => {
            const text = document.createRange()
            text.selectNodeContents(element)
            return text.getClientRects().length
          }),
        ).toBe(1)
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true)
      if (route.endsWith('card-preview')) {
        await page
          .getByRole('button', { name: /^Answer / })
          .first()
          .click()
        await page
          .getByRole('button', { name: 'Flip Card', exact: true })
          .click()
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
    await page.screenshot({
      path: test.info().outputPath(`large-text-${viewport.width}.png`),
      fullPage: true,
      animations: 'disabled',
    })
  }
})
