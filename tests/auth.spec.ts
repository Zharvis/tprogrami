import { test, expect } from '@playwright/test';

test('unauthenticated users are redirected to login', async ({ page }) => {
  // Attempt to access the root page
  const response = await page.goto('/');
  
  // Verify that the user is redirected to a login page
  await expect(page).toHaveURL(/.*\/login/);
});

test('unverified users are locked in the waiting room', async ({ page, context }) => {
  // Simulate being logged in as an Unverified user
  // (In the green phase, our Supabase proxy will validate this token)
  await context.addCookies([
    {
      name: 'sb-access-token',
      value: 'mock-unverified-token',
      domain: 'localhost',
      path: '/',
    }
  ]);

  // Attempt to access a protected route
  await page.goto('/schedule');
  
  // Verify that the user is forced into the waiting room
  await expect(page).toHaveURL(/.*\/waiting-room/);
});

test('verified users can access protected routes', async ({ page, context }) => {
  await context.addCookies([
    {
      name: 'sb-access-token',
      value: 'mock-verified-token',
      domain: 'localhost',
      path: '/',
    }
  ]);

  await page.goto('/schedule');
  
  // They shouldn't be redirected
  await expect(page).toHaveURL(/.*\/schedule/);
});

test('login page renders Google sign in button', async ({ page }) => {
  await page.goto('/login');
  const googleBtn = page.getByRole('button', { name: /Sign in with Google/i });
  await expect(googleBtn).toBeVisible();
});
