import { test, expect } from '@playwright/test';

test.describe('Global Navigation', () => {
  test('verified user can logout from the schedule page', async ({ page, context }) => {
    // 1. Setup: Mock a verified session
    await context.addCookies([
      {
        name: 'sb-access-token',
        value: 'mock-verified-token',
        domain: 'localhost',
        path: '/',
      }
    ]);

    // 2. Go to schedule page
    await page.goto('/schedule');
    await expect(page).toHaveURL(/.*\/schedule/);

    // 3. Find and click the Logout button
    const logoutBtn = page.getByRole('button', { name: /Logout/i });
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // 4. Verify redirection to login page
    await expect(page).toHaveURL(/.*\/login/);

    // 5. Verify cookie is cleared
    const cookies = await context.cookies();
    const authCookie = cookies.find(c => c.name === 'sb-access-token');
    expect(authCookie).toBeUndefined();
  });

  test('unverified user can logout from the waiting room', async ({ page, context }) => {
    // 1. Setup: Mock an unverified session
    await context.addCookies([
      {
        name: 'sb-access-token',
        value: 'mock-unverified-token',
        domain: 'localhost',
        path: '/',
      }
    ]);

    // 2. Go to waiting room
    await page.goto('/');
    await expect(page).toHaveURL(/.*\/waiting-room/);

    // 3. Find and click the Logout button
    const logoutBtn = page.getByRole('button', { name: /Logout/i });
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // 4. Verify redirection
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('unverified users see limited header links', async ({ page, context }) => {
    // 1. Setup: Mock an unverified session
    await context.addCookies([
      {
        name: 'sb-access-token',
        value: 'mock-unverified-token',
        domain: 'localhost',
        path: '/',
      }
    ]);

    // 2. Go to waiting room
    await page.goto('/');
    await expect(page).toHaveURL(/.*\/waiting-room/);

    // 3. Verify Header visibility
    await expect(page.getByText('ONBOARDING')).toBeVisible();
    await expect(page.getByRole('button', { name: /Logout/i })).toBeVisible();

    // 4. Verify restricted links are hidden
    await expect(page.getByRole('link', { name: 'Schedule' })).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'Admin Dashboard' })).not.toBeVisible();
  });

  test('admin users see both schedule and admin dashboard links', async ({ page, context }) => {
    // 1. Setup: Mock an admin session
    await context.addCookies([
      {
        name: 'sb-access-token',
        value: 'mock-admin-token',
        domain: 'localhost',
        path: '/',
      }
    ]);

    // 2. Go to admin page
    await page.goto('/admin');
    await expect(page).toHaveURL(/.*\/admin/);

    // 3. Verify Header links
    await expect(page.getByRole('link', { name: 'Schedule' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Admin Dashboard' })).toBeVisible();

    // 4. Navigate to Schedule
    await page.getByRole('link', { name: 'Schedule' }).click();
    await expect(page).toHaveURL(/.*\/schedule/);
    
    // 5. Verify links still visible on schedule page
    await expect(page.getByRole('link', { name: 'Admin Dashboard' })).toBeVisible();
  });

  test('profile identity shows email, role and initial', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'sb-access-token',
        value: 'mock-admin-token', // admin@test.com
        domain: 'localhost',
        path: '/',
      }
    ]);

    await page.goto('/schedule');
    
    const header = page.getByRole('banner');
    await expect(header.getByText('admin@test.com')).toBeVisible();
    await expect(header.getByText('ADMIN', { exact: true })).toBeVisible();
    await expect(header.getByText('A', { exact: true }).first()).toBeVisible(); 
  });

  test('mobile navigation uses burger menu', async ({ page, context }) => {
    // 1. Set viewport to mobile
    await page.setViewportSize({ width: 375, height: 667 });

    await context.addCookies([
      {
        name: 'sb-access-token',
        value: 'mock-admin-token',
        domain: 'localhost',
        path: '/',
      }
    ]);

    await page.goto('/schedule');

    // 2. Desktop links should be hidden
    await expect(page.locator('nav.hidden.md\\:flex')).not.toBeVisible();

    // 3. Open burger menu - targeting the button specifically inside the .md\:hidden div
    const burgerBtn = page.locator('div.md\\:hidden > button');
    await burgerBtn.click();

    // 4. Wait for mobile menu overlay to appear and check links
    const mobileMenu = page.locator('.md\\:hidden.animate-in');
    await expect(mobileMenu.getByRole('link', { name: 'Admin Dashboard' })).toBeVisible();
    await expect(mobileMenu.getByRole('button', { name: 'Logout' })).toBeVisible();
  });
});
