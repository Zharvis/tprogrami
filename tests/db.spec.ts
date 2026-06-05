import { test, expect } from '@playwright/test';
import { prisma } from '../lib/prisma';

test.describe.serial('Weekly Plan Database Integration', () => {
  const planId = '11111111-1111-1111-1111-111111111111';
  const typeId = '22222222-2222-2222-2222-222222222222';
  const activityId = '33333333-3333-3333-3333-333333333333';
  const overrideId = '44444444-4444-4444-4444-444444444444';
  const teacherId = '00000000-0000-0000-0000-000000000004';
  const teacherEmail = 'teacher-test@example.com';

  test.beforeEach(async () => {
    // Clean up to ensure a clean state
    try {
      if (prisma.override) {
        await prisma.override.delete({ where: { id: overrideId } }).catch(() => {});
      }
      await prisma.activity.delete({ where: { id: activityId } }).catch(() => {});
      await prisma.weeklyPlan.delete({ where: { id: planId } }).catch(() => {});
      await prisma.activityType.delete({ where: { id: typeId } }).catch(() => {});
      await prisma.user.delete({ where: { id: teacherId } }).catch(() => {});
    } catch (e) {}
  });

  test.afterEach(async () => {
    // Clean up created entities
    try {
      if (prisma.override) {
        await prisma.override.delete({ where: { id: overrideId } }).catch(() => {});
      }
      await prisma.activity.delete({ where: { id: activityId } }).catch(() => {});
      await prisma.weeklyPlan.delete({ where: { id: planId } }).catch(() => {});
      await prisma.activityType.delete({ where: { id: typeId } }).catch(() => {});
      await prisma.user.delete({ where: { id: teacherId } }).catch(() => {});
    } catch (e) {
      // Ignore
    }
  });

  test('can create and query weekly plans, activity types, and activities with relations', async () => {
    // 1. Create a Teacher User
    await prisma.user.create({
      data: {
        id: teacherId,
        email: teacherEmail,
        status: 'VERIFIED',
        role: 'TEACHER',
      },
    });

    // 2. Create a Weekly Plan
    const plan = await prisma.weeklyPlan.create({
      data: {
        id: planId,
        name: 'Trimester 1 Baseline',
        isActive: true,
      },
    });
    expect(plan.name).toBe('Trimester 1 Baseline');
    expect(plan.isActive).toBe(true);

    // 3. Create an Activity Type
    const actType = await prisma.activityType.create({
      data: {
        id: typeId,
        name: 'Test DB Lesson',
        color: '#3b82f6',
      },
    });
    expect(actType.name).toBe('Test DB Lesson');
    expect(actType.color).toBe('#3b82f6');

    // 4. Create an Activity linked to them
    const activity = await prisma.activity.create({
      data: {
        id: activityId,
        title: 'Math Intro',
        dayOfWeek: 1, // Monday
        startTime: '09:00',
        endTime: '10:30',
        weeklyPlanId: planId,
        activityTypeId: typeId,
        groups: ['GROUP_1', 'GROUP_2'],
        teachers: {
          connect: { id: teacherId },
        },
      },
      include: {
        weeklyPlan: true,
        activityType: true,
        teachers: true,
      },
    });

    expect(activity.title).toBe('Math Intro');
    expect(activity.dayOfWeek).toBe(1);
    expect(activity.startTime).toBe('09:00');
    expect(activity.endTime).toBe('10:30');
    expect(activity.weeklyPlan.name).toBe('Trimester 1 Baseline');
    expect(activity.activityType.name).toBe('Test DB Lesson');
    expect(activity.groups).toContain('GROUP_1');
    expect(activity.groups).toContain('GROUP_2');
    expect(activity.teachers[0].email).toBe(teacherEmail);
  });

  test('can create and query overrides with relations', async () => {
    // 1. Create dependencies
    await prisma.user.create({
      data: {
        id: teacherId,
        email: teacherEmail,
        status: 'VERIFIED',
        role: 'TEACHER',
      },
    });

    await prisma.weeklyPlan.create({
      data: {
        id: planId,
        name: 'Trimester 1 Baseline',
        isActive: true,
      },
    });

    await prisma.activityType.create({
      data: {
        id: typeId,
        name: 'Test DB Lesson',
        color: '#3b82f6',
      },
    });

    await prisma.activity.create({
      data: {
        id: activityId,
        title: 'Math Intro',
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '10:30',
        weeklyPlanId: planId,
        activityTypeId: typeId,
        groups: ['GROUP_1'],
      },
    });

    // 2. Create Override
    const override = await prisma.override.create({
      data: {
        id: overrideId,
        date: '2026-06-08',
        isCancelled: false,
        activityId: activityId,
        title: 'Math Intro (Modified)',
        startTime: '09:30',
        endTime: '11:00',
        activityTypeId: typeId,
        groups: ['GROUP_1', 'GROUP_2'],
        teachers: {
          connect: { id: teacherId },
        },
      },
      include: {
        activity: true,
        activityType: true,
        teachers: true,
      },
    });

    expect(override.date).toBe('2026-06-08');
    expect(override.isCancelled).toBe(false);
    expect(override.title).toBe('Math Intro (Modified)');
    expect(override.startTime).toBe('09:30');
    expect(override.endTime).toBe('11:00');
    expect(override.activity?.title).toBe('Math Intro');
    expect(override.activityType?.name).toBe('Test DB Lesson');
    expect(override.groups).toContain('GROUP_1');
    expect(override.groups).toContain('GROUP_2');
    expect(override.teachers[0].email).toBe(teacherEmail);
  });
});
