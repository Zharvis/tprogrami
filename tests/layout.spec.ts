import { test, expect } from '@playwright/test';
import { prisma } from '../lib/prisma';

test.describe.serial('Schedule Grid Layout Visuals', () => {
  const planId = '00000000-0000-0000-0000-000000000300';
  const typeId = '00000000-0000-0000-0000-000000000301';

  test.beforeEach(async () => {
    // 1. Deactivate other plans
    await prisma.weeklyPlan.updateMany({ data: { isActive: false } });

    // 2. Seed a plan and activity type
    await prisma.weeklyPlan.upsert({
      where: { id: planId },
      update: { isActive: true },
      create: { id: planId, name: 'Layout Test Plan', isActive: true },
    });

    await prisma.activityType.upsert({
      where: { id: typeId },
      update: { name: 'Lecture', color: '#ef4444' },
      create: { id: typeId, name: 'Lecture', color: '#ef4444' },
    });

    // 3. Clear existing activities for this plan
    await prisma.activity.deleteMany({ where: { weeklyPlanId: planId } });
  });

  test.afterEach(async () => {
    await prisma.activity.deleteMany({ where: { weeklyPlanId: planId } }).catch(() => {});
    await prisma.weeklyPlan.delete({ where: { id: planId } }).catch(() => {});
    await prisma.activityType.delete({ where: { id: typeId } }).catch(() => {});
  });

  test('activities are correctly positioned horizontally across days', async ({ page, context }) => {
    // Create one activity on Monday (day 1) and one on Wednesday (day 3)
    await prisma.activity.createMany({
      data: [
        {
          id: '00000000-0000-0000-0000-000000000302',
          title: 'Monday Activity',
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '10:00',
          weeklyPlanId: planId,
          activityTypeId: typeId,
        },
        {
          id: '00000000-0000-0000-0000-000000000303',
          title: 'Wednesday Activity',
          dayOfWeek: 3,
          startTime: '09:00',
          endTime: '10:00',
          weeklyPlanId: planId,
          activityTypeId: typeId,
        }
      ]
    });

    await context.addCookies([
      { name: 'sb-access-token', value: 'mock-admin-token', domain: 'localhost', path: '/' }
    ]);

    await page.goto('/admin');

    // Find the activity cards
    const mondayCard = page.locator('div', { hasText: 'Monday Activity' }).last();
    const wednesdayCard = page.locator('div', { hasText: 'Wednesday Activity' }).last();

    await expect(mondayCard).toBeVisible();
    await expect(wednesdayCard).toBeVisible();

    // Get the bounding boxes or CSS styles
    const mondayBox = await mondayCard.boundingBox();
    const wednesdayBox = await wednesdayCard.boundingBox();

    expect(mondayBox).not.toBeNull();
    expect(wednesdayBox).not.toBeNull();

    // Wednesday should be significantly to the right of Monday
    // Each day column is (100% - 100px) / 7. 
    // On a 1280px screen (default), column width is ~168px.
    // Monday starts at 100px. Wednesday starts at 100px + 2*168px = 436px.
    expect(wednesdayBox!.x).toBeGreaterThan(mondayBox!.x + 200);

    // Verify they are NOT at x=0 or x=100 (if they were both pushed to left)
    expect(mondayBox!.x).toBeGreaterThan(50); // Should be around 100+ (padding/margins)
  });

  test('overlapping activities are correctly split into columns within a day', async ({ page, context }) => {
    // Create two overlapping activities on Tuesday (day 2)
    await prisma.activity.createMany({
      data: [
        {
          id: '00000000-0000-0000-0000-000000000304',
          title: 'Overlap 1',
          dayOfWeek: 2,
          startTime: '09:00',
          endTime: '10:30',
          weeklyPlanId: planId,
          activityTypeId: typeId,
        },
        {
          id: '00000000-0000-0000-0000-000000000305',
          title: 'Overlap 2',
          dayOfWeek: 2,
          startTime: '09:30',
          endTime: '11:00',
          weeklyPlanId: planId,
          activityTypeId: typeId,
        }
      ]
    });

    await context.addCookies([
      { name: 'sb-access-token', value: 'mock-admin-token', domain: 'localhost', path: '/' }
    ]);

    await page.goto('/admin');

    const card1 = page.locator('div', { hasText: 'Overlap 1' }).last();
    const card2 = page.locator('div', { hasText: 'Overlap 2' }).last();

    await expect(card1).toBeVisible();
    await expect(card2).toBeVisible();

    const box1 = await card1.boundingBox();
    const box2 = await card2.boundingBox();

    // Overlap 2 should be to the right of Overlap 1
    expect(box2!.x).toBeGreaterThan(box1!.x + 20);
    
    // They should have roughly the same width (50% of the column)
    expect(Math.abs(box1!.width - box2!.width)).toBeLessThan(10);
  });
});
