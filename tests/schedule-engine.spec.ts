import { test, expect } from '@playwright/test';
import { prisma } from '../lib/prisma';
import { ScheduleEngine } from '../lib/schedule';

test.describe.serial('ScheduleEngine Mutations', () => {
  const typeId = '66666666-6666-6666-6666-666666666666';
  const planId = '55555555-5555-5555-5555-555555555555';
  const activityId = '77777777-7777-7777-7777-777777777771';

  test.beforeAll(async () => {
    // Setup baseline data
    await prisma.activityType.upsert({
      where: { id: typeId },
      create: { id: typeId, name: 'Test Lesson Type', color: 'blue' },
      update: {},
    });

    await prisma.weeklyPlan.upsert({
      where: { id: planId },
      create: { id: planId, name: 'Test Plan', isActive: true },
      update: { isActive: true },
    });

    await prisma.activity.upsert({
      where: { id: activityId },
      create: {
        id: activityId,
        title: 'Baseline Activity',
        dayOfWeek: 1, // Monday
        startTime: '09:00',
        endTime: '10:00',
        weeklyPlanId: planId,
        activityTypeId: typeId,
      },
      update: {},
    });
  });

  test.afterEach(async () => {
    await prisma.override.deleteMany({});
  });

  test('cancelInstance creates an override for a baseline activity', async () => {
    const date = '2026-06-08'; // A Monday
    const instanceId = `${activityId}-${date}`;

    await ScheduleEngine.cancelInstance(instanceId);

    const overrides = await prisma.override.findMany({
      where: { date, activityId },
    });

    expect(overrides).toHaveLength(1);
    expect(overrides[0].isCancelled).toBe(true);
  });

  test('resetInstance deletes the override for a baseline activity', async () => {
    const date = '2026-06-08';
    const instanceId = `${activityId}-${date}`;

    // 1. Create an override first
    await prisma.override.create({
      data: {
        date,
        activityId,
        isCancelled: true,
      },
    });

    // 2. Reset it
    await ScheduleEngine.resetInstance(instanceId);

    const overrides = await prisma.override.findMany({
      where: { date, activityId },
    });

    expect(overrides).toHaveLength(0);
  });
});
