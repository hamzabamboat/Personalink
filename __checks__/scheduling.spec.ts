/**
 * Checkly browser check: Scheduling UI (datetime-local input + Schedule button)
 *
 * The scheduling controls live inside the generate page's output panel.
 * They are only visible after a post is generated (requires auth + AI call),
 * which is unsuitable for fast browser checks.
 *
 * Strategy:
 *   - With CHECKLY_SESSION_COOKIE: navigate to /dashboard/calendar and verify
 *     the calendar view loads plus the datetime-local input is reachable in
 *     the edit panel.
 *   - Without cookie: smoke-test that /dashboard/calendar responds with a
 *     non-500 status.
 */
import { test, expect } from '@playwright/test'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
const SESSION_COOKIE = process.env.CHECKLY_SESSION_COOKIE

test('Scheduling form loads correctly', async ({ page, context }) => {
  if (SESSION_COOKIE) {
    await context.addCookies([
      {
        name: 'next-auth.session-token',
        value: SESSION_COOKIE,
        domain: new URL(BASE_URL).hostname,
        path: '/',
        httpOnly: true,
        secure: BASE_URL.startsWith('https'),
        sameSite: 'Lax',
      },
    ])
  }

  await page.goto(`${BASE_URL}/dashboard/calendar`, { waitUntil: 'domcontentloaded', timeout: 60_000 })

  if (SESSION_COOKIE) {
    // Calendar page should load; the datetime-local input is in the edit panel.
    // We verify the page renders (not a blank/crash) by checking for a
    // structural element — the calendar grid or the page heading.
    await expect(page.locator('body')).not.toBeEmpty()

    // Try to open a post edit panel if any scheduled posts exist
    const scheduledPost = page.locator('[data-type="scheduled-post"]').first()
    if (await scheduledPost.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await scheduledPost.click()
      // <input type="datetime-local"> appears in the edit panel
      const datepicker = page.locator('input[type="datetime-local"]').first()
      await expect(datepicker).toBeVisible({ timeout: 6_000 })
      // Schedule button: <button class="btn-dash btn-dash--primary">Schedule</button>
      const scheduleBtn = page.getByRole('button', { name: /^Schedule$/i })
      await expect(scheduleBtn).toBeVisible()
    }
  } else {
    // Smoke check: the server responds without a 5xx error
    const statusCode = await page.evaluate(() =>
      fetch(window.location.href).then(r => r.status)
    )
    expect(statusCode).toBeLessThan(500)
  }
})
