import { test, expect } from '@playwright/test';
import { prisma } from '../lib/prisma';

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

test.describe('Dynamic Verification Routing', () => {
  const dynamicUserId = '00000000-0000-0000-0000-000000000095';
  const dynamicUserEmail = 'dynamic-unverified@test.com';

  test.afterEach(async () => {
    try {
      await prisma.user.delete({ where: { email: dynamicUserEmail } });
    } catch (e) {
      // Ignore if user didn't exist
    }
  });

  test('user is locked in waiting room when unverified, and can bypass when verified', async ({ page, context }) => {
    // 1. Create unverified user in DB
    await prisma.user.upsert({
      where: { email: dynamicUserEmail },
      update: { status: 'UNVERIFIED', role: null, group: null },
      create: {
        id: dynamicUserId,
        email: dynamicUserEmail,
        status: 'UNVERIFIED',
      },
    });

    // 2. Add cookie with dynamic mock token
    await context.addCookies([
      {
        name: 'sb-access-token',
        value: `mock-user-${dynamicUserId}`,
        domain: 'localhost',
        path: '/',
      }
    ]);

    // 3. Go to /schedule -> should redirect to /waiting-room
    await page.goto('/schedule');
    await expect(page).toHaveURL(/.*\/waiting-room/);

    // 4. Update user to VERIFIED in DB
    await prisma.user.update({
      where: { id: dynamicUserId },
      data: { status: 'VERIFIED', role: 'STUDENT' },
    });

    // 5. Go to /schedule -> should NOT redirect to /waiting-room anymore
    await page.goto('/schedule');
    await expect(page).not.toHaveURL(/.*\/waiting-room/);
  });
});

