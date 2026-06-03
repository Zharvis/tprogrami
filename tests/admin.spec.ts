import { test, expect } from '@playwright/test';

test('non-admin verified users are redirected away from admin dashboard', async ({ page, context }) => {
  await context.addCookies([
    {
      name: 'sb-access-token',
      value: 'mock-verified-token',
      domain: 'localhost',
      path: '/',
    }
  ]);

  // Attempt to access admin dashboard
  await page.goto('/admin');

  // Verify redirection to a non-admin page, e.g. schedule or home
  await expect(page).toHaveURL(/.*\/schedule|.*\/waiting-room|\/$/);
});

test('admin users can access admin dashboard', async ({ page, context }) => {
  await context.addCookies([
    {
      name: 'sb-access-token',
      value: 'mock-admin-token',
      domain: 'localhost',
      path: '/',
    }
  ]);

  // Access admin dashboard
  await page.goto('/admin');

  // Verify we are on /admin
  await expect(page).toHaveURL(/.*\/admin/);
  
  // Verify heading or signifier of admin dashboard exists
  const heading = page.getByRole('heading', { name: /Admin Dashboard/i });
  await expect(heading).toBeVisible();
});
