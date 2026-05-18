/**
 * Checkly browser check: Google OAuth functional check
 *
 * 1. Verifies "Continue with Google" is visible on the home page
 * 2. Clicks it and confirms the browser lands on accounts.google.com
 *    (proves /api/auth/google is alive and correctly redirecting)
 */
import { test, expect } from '@playwright/test'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

test('Google OAuth redirect works end-to-end', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 })

  // Button must be visible before we click
  const googleLink = page.getByRole('link', { name: /Continue with Google/i })
  await expect(googleLink).toBeVisible({ timeout: 15_000 })

  // Click and wait for navigation to complete
  await Promise.all([
    page.waitForURL(/accounts\.google\.com/, { timeout: 20_000 }),
    googleLink.click(),
  ])

  // We should now be on Google's OAuth consent screen
  expect(page.url()).toMatch(/accounts\.google\.com/)
})
