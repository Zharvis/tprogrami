import { test, expect } from '@playwright/test';

test.describe('Root page redirection', () => {
  test('unauthenticated users are redirected from / to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('unverified users are redirected from / to /waiting-room', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'sb-access-token',
        value: 'mock-unverified-token',
        domain: 'localhost',
        path: '/',
      }
    ]);

    await page.goto('/');
    await expect(page).toHaveURL(/.*\/waiting-room/);
  });

  test('verified users are redirected from / to /schedule', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'sb-access-token',
        value: 'mock-verified-token',
        domain: 'localhost',
        path: '/',
      }
    ]);

    await page.goto('/');
    await expect(page).toHaveURL(/.*\/schedule/);
  });

  test('admins are redirected from / to /schedule', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'sb-access-token',
        value: 'mock-admin-token',
        domain: 'localhost',
        path: '/',
      }
    ]);

    await page.goto('/');
    await expect(page).toHaveURL(/.*\/schedule/);
  });
});
