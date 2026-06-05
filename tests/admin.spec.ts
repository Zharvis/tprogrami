import { test, expect } from '@playwright/test';
import { prisma } from '../lib/prisma';

test.describe('Admin Verification Workflow', () => {
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

  test.describe('List unverified users', () => {
    const listTestUserId = '00000000-0000-0000-0000-000000000091';
    const listTestUserEmail = 'unverified-list@test.com';

    test.afterEach(async () => {
      try {
        await prisma.user.delete({
          where: { email: listTestUserEmail },
        });
      } catch (e) {
        // Ignore if user didn't exist
      }
    });

    test('admin dashboard lists all users currently in the unverified state', async ({ page, context }) => {
      // 1. Seed an unverified user in the database
      await prisma.user.upsert({
        where: { email: listTestUserEmail },
        update: { status: 'UNVERIFIED', role: null, group: null },
        create: {
          id: listTestUserId,
          email: listTestUserEmail,
          status: 'UNVERIFIED',
        },
      });

      // 2. Log in as an Admin
      await context.addCookies([
        {
          name: 'sb-access-token',
          value: 'mock-admin-token',
          domain: 'localhost',
          path: '/',
        }
      ]);

      // 3. Go to admin dashboard
      await page.goto('/admin');

      // 4. Assert that the unverified user is listed
      await expect(page.locator('body')).toContainText(listTestUserEmail);
    });
  });

  test.describe('Verify unverified users', () => {
    const verifyTestUserId = '00000000-0000-0000-0000-000000000092';
    const verifyTestUserEmail = 'unverified-verify@test.com';

    test.afterEach(async () => {
      try {
        await prisma.user.delete({
          where: { email: verifyTestUserEmail },
        });
      } catch (e) {
        // Ignore if user didn't exist
      }
    });

    test('admin can verify a user by assigning a Role and Group', async ({ page, context }) => {
      // 1. Seed an unverified user
      await prisma.user.upsert({
        where: { email: verifyTestUserEmail },
        update: { status: 'UNVERIFIED', role: null, group: null },
        create: {
          id: verifyTestUserId,
          email: verifyTestUserEmail,
          status: 'UNVERIFIED',
        },
      });

      // 2. Log in as Admin
      await context.addCookies([
        {
          name: 'sb-access-token',
          value: 'mock-admin-token',
          domain: 'localhost',
          path: '/',
        }
      ]);

      // 3. Go to admin dashboard
      await page.goto('/admin');

      // 4. Find the user row, select Role and Group, and click Verify
      const userRow = page.locator('li', { hasText: verifyTestUserEmail });
      await userRow.locator('select[name="role"]').selectOption('STUDENT');
      await userRow.locator('select[name="group"]').selectOption('GROUP_1');
      await userRow.locator('button[type="submit"]').click();

      // 5. Assert the user is removed from the pending list
      await expect(page.locator('body')).not.toContainText(verifyTestUserEmail);

      // 6. Verify database state
      const updatedUser = await prisma.user.findUnique({
        where: { email: verifyTestUserEmail },
      });
      expect(updatedUser?.status).toBe('VERIFIED');
      expect(updatedUser?.role).toBe('STUDENT');
      expect(updatedUser?.group).toBe('GROUP_1');
    });
  });

  test.describe.serial('Weekly Plan Grid Workflow', () => {
    const gridPlanId = '00000000-0000-0000-0000-000000000100';
    const gridTypeId = '00000000-0000-0000-0000-000000000101';
    const activityId1 = '00000000-0000-0000-0000-000000000102';
    const activityId2 = '00000000-0000-0000-0000-000000000103';

    test.beforeEach(async () => {
      // Deactivate all other plans to ensure the test plan is the only active one
      await prisma.weeklyPlan.updateMany({
        data: { isActive: false },
      });

      // Seed a weekly plan and activity type
      await prisma.weeklyPlan.upsert({
        where: { id: gridPlanId },
        update: { isActive: true },
        create: {
          id: gridPlanId,
          name: 'Test Baseline Plan',
          isActive: true,
        },
      });

      await prisma.activityType.upsert({
        where: { id: gridTypeId },
        update: { name: 'Test Lesson', color: '#ef4444' },
        create: {
          id: gridTypeId,
          name: 'Test Lesson',
          color: '#ef4444',
        },
      });
    });

    test.afterEach(async () => {
      // Clean up activities
      await prisma.activity.deleteMany({
        where: { id: { in: [activityId1, activityId2] } },
      }).catch(() => {});
      
      await prisma.weeklyPlan.delete({
        where: { id: gridPlanId },
      }).catch(() => {});

      await prisma.activityType.delete({
        where: { id: gridTypeId },
      }).catch(() => {});
    });

    test('admin can create a new activity on the weekly plan grid', async ({ page, context }) => {
      // 1. Log in as Admin
      await context.addCookies([
        {
          name: 'sb-access-token',
          value: 'mock-admin-token',
          domain: 'localhost',
          path: '/',
        }
      ]);

      // 2. Go to admin dashboard
      await page.goto('/admin');

      // 3. Click the "Edit Plan" link to go to the separate editor page
      const editPlanLink = page.getByRole('link', { name: /Edit Plan/i });
      await editPlanLink.click();

      // 4. Click the "Add Activity" button to open form
      const addBtn = page.getByRole('button', { name: /Add Activity/i });
      await addBtn.click();

      // 4. Fill in the form
      await page.locator('input[name="title"]').fill('Visual Design');
      await page.locator('select[name="dayOfWeek"]').selectOption('1'); // Monday
      await page.locator('input[name="startTime"]').fill('09:00');
      await page.locator('input[name="endTime"]').fill('10:30');
      await page.locator('select[name="activityTypeId"]').selectOption(gridTypeId);
      await page.locator('input[value="GROUP_1"]').check();

      // Submit the form
      await page.locator('button[type="submit"]', { hasText: 'Create Activity' }).click();

      // 5. Verify the activity is rendered in the Monday column
      const activityCard = page.locator('body');
      await expect(activityCard).toContainText('Visual Design');
      await expect(activityCard).toContainText('09:00 - 10:30');
    });

    test('overlapping activities are visually supported and do not crash', async ({ page, context }) => {
      // 1. Create two overlapping activities in the database
      await prisma.activity.createMany({
        data: [
          {
            id: activityId1,
            title: 'Overlap Lesson A',
            dayOfWeek: 2, // Tuesday
            startTime: '10:00',
            endTime: '11:30',
            weeklyPlanId: gridPlanId,
            activityTypeId: gridTypeId,
            groups: ['GROUP_1'],
          },
          {
            id: activityId2,
            title: 'Overlap Lesson B',
            dayOfWeek: 2, // Tuesday
            startTime: '10:30',
            endTime: '12:00',
            weeklyPlanId: gridPlanId,
            activityTypeId: gridTypeId,
            groups: ['GROUP_1'],
          }
        ]
      });

      // 2. Log in as Admin
      await context.addCookies([
        {
          name: 'sb-access-token',
          value: 'mock-admin-token',
          domain: 'localhost',
          path: '/',
        }
      ]);

      // 3. Go to admin dashboard
      await page.goto('/admin');

      // 4. Verify both overlapping activities are rendered on screen
      const body = page.locator('body');
      await expect(body).toContainText('Overlap Lesson A');
      await expect(body).toContainText('Overlap Lesson B');
    });
  });
});





