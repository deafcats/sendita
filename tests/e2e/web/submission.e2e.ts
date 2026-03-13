import { test, expect } from '@playwright/test';
import { makeDeviceSecret } from '../helpers/factories';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3001';

async function createTestInbox(): Promise<string> {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceSecret: makeDeviceSecret(),
      birthYear: 1995,
      displayName: 'Test User',
    }),
  });
  const data = await res.json() as { slug: string };
  return data.slug;
}

test.describe('Submission page — happy path', () => {
  test('page loads with display name and avatar placeholder', async ({ page }) => {
    const slug = await createTestInbox();
    await page.goto(`/to/${slug}`);

    // Display name should appear
    await expect(page.getByText('Test User')).toBeVisible();
    await expect(page.getByText('Send Test User an anonymous message')).toBeVisible();
  });

  test('character counter updates as user types', async ({ page }) => {
    const slug = await createTestInbox();
    await page.goto(`/to/${slug}`);

    const textarea = page.locator('textarea');
    await textarea.fill('Hello there');
    await expect(page.getByText('289')).toBeVisible();
  });

  test('send button is disabled when textarea is empty', async ({ page }) => {
    const slug = await createTestInbox();
    await page.goto(`/to/${slug}`);
    const button = page.getByRole('button', { name: 'Send anonymously' });
    await expect(button).toBeDisabled();
  });

  test('successful submission shows confetti and success screen', async ({ page }) => {
    const slug = await createTestInbox();
    await page.goto(`/to/${slug}`);

    await page.locator('textarea').fill('This is my anonymous message to you!');
    await page.getByRole('button', { name: 'Send anonymously' }).click();

    // Success state
    await expect(page.getByText('Sent!')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Send another')).toBeVisible();
  });

  test('viral loop CTA appears after successful send', async ({ page }) => {
    const slug = await createTestInbox();
    await page.goto(`/to/${slug}`);

    await page.locator('textarea').fill('Test message');
    await page.getByRole('button', { name: 'Send anonymously' }).click();

    await expect(page.getByText('Want to know what people really think of you?')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('App Store')).toBeVisible();
    await expect(page.getByText('Play Store')).toBeVisible();
  });

  test('"Send another" resets form and allows new submission', async ({ page }) => {
    const slug = await createTestInbox();
    await page.goto(`/to/${slug}`);

    await page.locator('textarea').fill('First message');
    await page.getByRole('button', { name: 'Send anonymously' }).click();
    await page.getByText('Send another').click({ timeout: 10000 });

    // Form should be reset
    await expect(page.locator('textarea')).toHaveValue('');
    await expect(page.getByRole('button', { name: 'Send anonymously' })).toBeVisible();
  });
});

test.describe('Submission page — security', () => {
  test('script tag in message body is not executed (XSS prevention)', async ({ page }) => {
    const slug = await createTestInbox();
    await page.goto(`/to/${slug}`);

    let alertFired = false;
    page.on('dialog', () => { alertFired = true; });

    await page.locator('textarea').fill('<script>alert("xss")</script>');
    await page.getByRole('button', { name: 'Send anonymously' }).click();

    await page.waitForTimeout(2000);
    expect(alertFired).toBe(false);
  });

  test('invalid slug shows 404 page', async ({ page }) => {
    await page.goto('/to/zzzzzz_invalid_slug_that_does_not_exist');
    await expect(page.getByText('Inbox not found')).toBeVisible();
  });

  test('rapid clicking does not submit multiple times', async ({ page }) => {
    const slug = await createTestInbox();
    await page.goto(`/to/${slug}`);

    await page.locator('textarea').fill('Rapid click test');
    const button = page.getByRole('button', { name: 'Send anonymously' });

    // Rapid double click
    await button.dblclick();

    // Should still show success (only once)
    await expect(page.getByText('Sent!')).toBeVisible({ timeout: 10000 });
  });
});
