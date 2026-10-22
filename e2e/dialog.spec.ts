import { test, expect } from '@playwright/test'

test('leave confirmation is styled before Statistics loads and fits enlarged narrow layouts', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  // Start cold: the lazy Statistics stylesheet has never been requested.
  await page.goto('/practice/setup')
  await page.getByRole('checkbox', { name: 'Addition', exact: true }).check()
  await page.getByRole('button', { name: 'Start Session', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Flip Card', exact: true }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Statistics', exact: true }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toBeVisible()
  await expect(page.locator('.dialog-backdrop')).toHaveCSS('position', 'fixed')
  await page.setViewportSize({ width: 320, height: 640 })
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '225%'
  })
  expect(
    await dialog.evaluate((element) => {
      const bounds = element.getBoundingClientRect()
      return (
        bounds.left >= 0 &&
        bounds.right <= innerWidth + 1 &&
        bounds.top >= 0 &&
        bounds.bottom <= innerHeight + 1 &&
        element.scrollWidth <= element.clientWidth + 1
      )
    }),
  ).toBe(true)
  await page
    .getByRole('button', { name: 'Keep practicing', exact: true })
    .click()
  await expect(dialog).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Flip Card', exact: true }),
  ).toBeVisible()
  expect(errors).toEqual([])
})
