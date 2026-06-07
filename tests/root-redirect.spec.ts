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

  test('verified users stay on / and see the Bento Box layout', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'sb-access-token',
        value: 'mock-verified-token',
        domain: 'localhost',
        path: '/',
      }
    ]);

    await page.goto('/');
    
    // Should stay on the root route
    await expect(page).not.toHaveURL(/.*\/schedule/);
    // the URL should match the root precisely (or with localhost/port)
    await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/$/);

    // Should render the Bento Box container
    const bentoContainer = page.getByTestId('bento-box-container');
    await expect(bentoContainer).toBeVisible();
  });

  test('admins stay on / and see the Bento Box layout', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'sb-access-token',
        value: 'mock-admin-token',
        domain: 'localhost',
        path: '/',
      }
    ]);

    await page.goto('/');
    
    // Should stay on the root route
    await expect(page).not.toHaveURL(/.*\/schedule/);
    await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/$/);

    // Should render the Bento Box container
    const bentoContainer = page.getByTestId('bento-box-container');
    await expect(bentoContainer).toBeVisible();
  });
});
