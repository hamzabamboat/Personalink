/**
 * Checkly browser check: LinkedIn OAuth functional check
 *
 * 1. Verifies "Connect LinkedIn" is visible on the home page
 * 2. Clicks it and confirms the browser lands on linkedin.com/oauth
 *    (proves /api/auth/linkedin is alive and correctly redirecting)
 */
import { test, expect } from '@playwright/test'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

test('LinkedIn OAuth redirect works end-to-end', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 })

  // Button text varies by accountType toggle ("free" / "business") — match prefix
  const linkedinBtn = page.getByRole('button', { name: /Connect LinkedIn/i })
  await expect(linkedinBtn.first()).toBeVisible({ timeout: 15_000 })

  // Click and wait for LinkedIn's OAuth page
  await Promise.all([
    page.waitForURL(/linkedin\.com\/(oauth|checkpoint|uas)/, { timeout: 20_000 }),
    linkedinBtn.first().click(),
  ])

  // We should now be on LinkedIn's OAuth consent/login screen
  expect(page.url()).toMatch(/linkedin\.com/)
})
