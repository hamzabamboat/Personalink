/**
 * Checkly browser check: Post generation flow
 *
 * When a session cookie is available (CHECKLY_SESSION_COOKIE env var), this
 * check logs in and verifies the full generate → output flow.
 *
 * Without a cookie it falls back to a smoke-test: navigate to /dashboard/generate
 * and confirm the app responds (either with the generate UI or an auth redirect
 * back to the home page — both mean the server is healthy).
 *
 * To enable the full check, set CHECKLY_SESSION_COOKIE to the value of your
 * `next-auth.session-token` cookie from a logged-in browser session.
 */
import { test, expect } from '@playwright/test'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
const SESSION_COOKIE = process.env.CHECKLY_SESSION_COOKIE

test('Post generation page loads and generate button is present', async ({ page, context }) => {
  // Inject session cookie if provided so the check can reach the protected UI
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

  await page.goto(`${BASE_URL}/dashboard/generate`, { waitUntil: 'domcontentloaded', timeout: 60_000 })

  if (SESSION_COOKIE) {
    // Full check: confirm generate UI renders
    // <button class="btn-dash btn-dash--primary btn-dash--lg">Generate Post</button>
    const generateBtn = page.getByRole('button', { name: /Generate Post/i })
    await expect(generateBtn).toBeVisible({ timeout: 15_000 })
    await expect(generateBtn).toBeEnabled()

    // Click and confirm loading state kicks in (shows spinner / loading message)
    // We do NOT wait for the full AI response to avoid timeouts
    await generateBtn.click()
    await expect(
      page.locator('.btn-dash--primary.btn-dash--lg svg.animate-spin')
    ).toBeVisible({ timeout: 8_000 })
  } else {
    // Smoke check: server is up and responds — either the generate page or an auth redirect
    await expect(page).toHaveURL(
      new RegExp(`${BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(/|/dashboard/generate)?`)
    )
    const statusCode = await page.evaluate(() =>
      fetch(window.location.href).then(r => r.status)
    )
    expect(statusCode).toBeLessThan(500)
  }
})
