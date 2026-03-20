import { expect, test, type Page } from '@playwright/test';
import { makeCredentials, registerUser as registerApiUser } from '../../helpers/auth';

async function expectDashboardLoaded(page: Page, slug: string) {
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
  await expect(page.getByText('Your audience question page')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open public page' })).toHaveAttribute('href', `/${slug}`);
}

test.describe('Auth and dashboard flows', () => {
  test('claims a username through the UI and reaches the share step', async ({ page }) => {
    const credentials = makeCredentials();

    await page.goto('/register');
    await page.getByLabel('Username').fill(credentials.username);
    await expect(page.getByText('Username is available')).toBeVisible();
    await page.getByRole('button', { name: 'Continue with this link' }).click();

    await expect(page).toHaveURL(new RegExp(`/register/share\\?username=${credentials.username}$`));
    await expect(page.getByRole('heading', { name: 'Share your link' })).toBeVisible();
    await expect(page.getByText(new RegExp(credentials.username)).first()).toBeVisible();
  });

  test('shows inline alternatives when the username is taken', async ({ page }) => {
    const registeredUser = await registerApiUser();

    await page.goto('/register');
    await page.getByLabel('Username').fill(registeredUser.slug);

    await expect(page.getByText('That username is already taken')).toBeVisible();
    await expect(page.getByText('Try one of these instead')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue with this link' })).toBeDisabled();
    await expect(page.locator('button[type="button"]').first()).toBeVisible();
  });

  test('logs in through the UI, restores the session on reload, and keeps dashboard access', async ({ page }) => {
    const registeredUser = await registerApiUser();

    await page.goto('/login');
    await page.getByLabel('Email').fill(registeredUser.credentials.email);
    await page.getByLabel('Password').fill(registeredUser.credentials.password);
    await page.getByRole('button', { name: 'Log in' }).click();

    await expectDashboardLoaded(page, registeredUser.slug);

    await page.reload();

    await expectDashboardLoaded(page, registeredUser.slug);
    await expect(page.getByText(registeredUser.displayName)).toBeVisible();
  });

  test('shows an error for invalid credentials', async ({ page }) => {
    const registeredUser = await registerApiUser();

    await page.goto('/login');
    await page.getByLabel('Email').fill(registeredUser.credentials.email);
    await page.getByLabel('Password').fill(`${registeredUser.credentials.password}-wrong`);
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('Invalid email or password')).toBeVisible();
  });

  test('redirects protected dashboard routes to login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/settings');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
  });

  test('logs out and blocks dashboard access afterward', async ({ page }) => {
    const registeredUser = await registerApiUser();

    await page.goto('/login');
    await page.getByLabel('Email').fill(registeredUser.credentials.email);
    await page.getByLabel('Password').fill(registeredUser.credentials.password);
    await page.getByRole('button', { name: 'Log in' }).click();

    await expectDashboardLoaded(page, registeredUser.slug);

    await page.getByRole('button', { name: 'Log out' }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
  });
});
