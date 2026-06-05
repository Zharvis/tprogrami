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

  test.describe.serial('Admin Overrides E2E Workflow', () => {
    const planId = '00000000-0000-0000-0000-000000000200';
    const typeId = '00000000-0000-0000-0000-000000000201';
    const activityId = '00000000-0000-0000-0000-000000000202';

    test.beforeEach(async () => {
      // Deactivate other plans to make this plan the active one
      await prisma.weeklyPlan.updateMany({
        data: { isActive: false },
      });

      // Seed a weekly plan
      await prisma.weeklyPlan.upsert({
        where: { id: planId },
        update: { isActive: true },
        create: {
          id: planId,
          name: 'Overrides Test Baseline',
          isActive: true,
        },
      });

      // Seed activity type
      await prisma.activityType.upsert({
        where: { id: typeId },
        update: { name: 'Test Override Lesson', color: '#ef4444' },
        create: {
          id: typeId,
          name: 'Test Override Lesson',
          color: '#ef4444',
        },
      });

      // Seed baseline recurring activity (Monday, targets GROUP_1)
      await prisma.activity.upsert({
        where: { id: activityId },
        update: {
          title: 'Math Class',
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '10:30',
          weeklyPlanId: planId,
          activityTypeId: typeId,
          groups: ['GROUP_1'],
        },
        create: {
          id: activityId,
          title: 'Math Class',
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '10:30',
          weeklyPlanId: planId,
          activityTypeId: typeId,
          groups: ['GROUP_1'],
        },
      });

      // Clean up existing overrides to ensure a clean slate
      await prisma.override.deleteMany({});
    });

    test.afterEach(async () => {
      await prisma.override.deleteMany({}).catch(() => {});

      await prisma.activity.delete({
        where: { id: activityId },
      }).catch(() => {});

      await prisma.weeklyPlan.delete({
        where: { id: planId },
      }).catch(() => {});

      await prisma.activityType.delete({
        where: { id: typeId },
      }).catch(() => {});
    });

    test('admin can cancel a recurring activity for a specific date', async ({ page, context }) => {
      // 1. Log in as Admin
      await context.addCookies([
        {
          name: 'sb-access-token',
          value: 'mock-admin-token',
          domain: 'localhost',
          path: '/',
        }
      ]);

      // 2. Go to schedule page for Monday, June 8, 2026
      await page.goto('/schedule?date=2026-06-08');

      // 3. Confirm activity exists
      await expect(page.locator('body')).toContainText('Math Class');

      // 4. Click Cancel button (handle confirm dialog)
      page.once('dialog', dialog => dialog.accept());
      await page.getByRole('button', { name: /Cancel/i }).first().click();

      // 5. Assert that the activity is removed from the schedule view
      await expect(page.locator('body')).not.toContainText('Math Class');

      // 6. Verify database record
      const override = await prisma.override.findFirst({
        where: { activityId, date: '2026-06-08' },
      });
      expect(override).toBeDefined();
      expect(override?.isCancelled).toBe(true);
    });

    test('admin can modify a recurring activity details for a specific date', async ({ page, context }) => {
      // 1. Log in as Admin
      await context.addCookies([
        {
          name: 'sb-access-token',
          value: 'mock-admin-token',
          domain: 'localhost',
          path: '/',
        }
      ]);

      // 2. Go to schedule page
      await page.goto('/schedule?date=2026-06-08');

      // 3. Click Edit
      await page.getByRole('button', { name: /Edit/i }).first().click();

      // 4. Modify form
      await page.locator('input[placeholder="e.g. Guest Speaker Session..."]').fill('Math Class - Advanced');
      await page.locator('input[type="time"]').first().fill('09:30');
      await page.locator('input[type="time"]').nth(1).fill('11:00');

      // 5. Submit
      await page.getByRole('button', { name: /Save Override/i }).click();

      // 6. Assert UI updates
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.locator('body')).toContainText('Math Class - Advanced');
      await expect(page.locator('body')).toContainText('09:30 - 11:00');
      await expect(page.locator('body')).toContainText('Override');

      // 7. Verify database record
      const override = await prisma.override.findFirst({
        where: { activityId, date: '2026-06-08' },
      });
      expect(override?.title).toBe('Math Class - Advanced');
      expect(override?.startTime).toBe('09:30');
      expect(override?.endTime).toBe('11:00');
    });

    test('admin can add a one-off activity for a specific date', async ({ page, context }) => {
      // 1. Log in as Admin
      await context.addCookies([
        {
          name: 'sb-access-token',
          value: 'mock-admin-token',
          domain: 'localhost',
          path: '/',
        }
      ]);

      // 2. Go to schedule page
      await page.goto('/schedule?date=2026-06-08');

      // 3. Click Add One-off Activity
      await page.getByRole('button', { name: /\+ Add One-off Activity/i }).first().click();

      // 4. Fill form
      await page.locator('input[placeholder="e.g. Guest Speaker Session..."]').fill('Special Guest Lecture');
      await page.locator('input[type="time"]').first().fill('14:00');
      await page.locator('input[type="time"]').nth(1).fill('15:30');
      await page.locator('input[value="GROUP_1"]').check();

      // 5. Submit
      await page.getByRole('button', { name: /Save Override/i }).click();

      // 6. Assert UI updates
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.locator('body')).toContainText('Special Guest Lecture');

      // 7. Verify database record
      const override = await prisma.override.findFirst({
        where: { title: 'Special Guest Lecture' },
      });
      expect(override).not.toBeNull();
      expect(override?.startTime).toBe('14:00');
      expect(override?.endTime).toBe('15:30');
    });
  });
});





