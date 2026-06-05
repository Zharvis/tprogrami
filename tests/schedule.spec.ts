import { test, expect } from '@playwright/test';
import { prisma } from '../lib/prisma';
import { resolveSchedule, mergeSchedule, getHappeningAndNext } from '../lib/schedule';

test.describe.serial('Schedule Projection Logic (TDD)', () => {
  const planId = '55555555-5555-5555-5555-555555555555';
  const typeId = '66666666-6666-6666-6666-666666666666';
  const activityId1 = '77777777-7777-7777-7777-777777777771';
  const activityId2 = '77777777-7777-7777-7777-777777777772';
  const overrideId1 = '88888888-8888-8888-8888-888888888881';
  const overrideId2 = '88888888-8888-8888-8888-888888888882';
  const overrideId3 = '88888888-8888-8888-8888-888888888883';
  
  const studentId = '00000000-0000-0000-0000-000000000055';
  const teacherId = '00000000-0000-0000-0000-000000000056';
  
  const studentEmail = 'student-tdd@example.com';
  const teacherEmail = 'teacher-tdd@example.com';

  test.beforeEach(async () => {
    // Clean up first to be safe
    await prisma.override.deleteMany({ where: { id: { in: [overrideId1, overrideId2, overrideId3] } } }).catch(() => {});
    await prisma.activity.deleteMany({ where: { weeklyPlanId: planId } }).catch(() => {});
    await prisma.weeklyPlan.deleteMany({ where: { id: planId } }).catch(() => {});
    await prisma.activityType.deleteMany({ where: { id: typeId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: [studentId, teacherId] } } }).catch(() => {});

    // Ensure other weekly plans are inactive so our test plan is the active one
    await prisma.weeklyPlan.updateMany({ data: { isActive: false } });

    // Seed mock database records
    await prisma.user.create({
      data: {
        id: studentId,
        email: studentEmail,
        status: 'VERIFIED',
        role: 'STUDENT',
        group: 'GROUP_1',
      },
    });

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
        name: 'TDD Active Plan',
        isActive: true,
      },
    });

    await prisma.activityType.create({
      data: {
        id: typeId,
        name: 'TDD Lesson',
        color: '#ef4444',
      },
    });

    // Activity 1 targets GROUP_1 (Monday)
    await prisma.activity.create({
      data: {
        id: activityId1,
        title: 'Group 1 Activity',
        dayOfWeek: 1, // Monday
        startTime: '09:00',
        endTime: '10:30',
        weeklyPlanId: planId,
        activityTypeId: typeId,
        groups: ['GROUP_1'],
      },
    });

    // Activity 2 targets GROUP_2 (Monday)
    await prisma.activity.create({
      data: {
        id: activityId2,
        title: 'Group 2 Activity',
        dayOfWeek: 1, // Monday
        startTime: '11:00',
        endTime: '12:30',
        weeklyPlanId: planId,
        activityTypeId: typeId,
        groups: ['GROUP_2'],
      },
    });
  });

  test.afterEach(async () => {
    try {
      await prisma.override.deleteMany({ where: { id: { in: [overrideId1, overrideId2, overrideId3] } } }).catch(() => {});
      await prisma.activity.deleteMany({ where: { weeklyPlanId: planId } }).catch(() => {});
      await prisma.weeklyPlan.deleteMany({ where: { id: planId } }).catch(() => {});
      await prisma.activityType.deleteMany({ where: { id: typeId } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: { in: [studentId, teacherId] } } }).catch(() => {});
    } catch {
      // Ignore
    }
  });

  test.describe('Pure Schedule Merging Logic (Unit)', () => {
    const type1 = { id: 'type-1', name: 'TDD Lesson', color: '#ef4444' };
    
    const baseData = {
      user: { role: 'STUDENT', group: 'GROUP_1' },
      activePlan: {
        activities: [
          {
            id: 'act-1',
            title: 'Group 1 Activity',
            dayOfWeek: 1, // Monday
            startTime: '09:00',
            endTime: '10:30',
            activityType: type1,
            groups: ['GROUP_1'],
            teachers: [],
          },
          {
            id: 'act-2',
            title: 'Group 2 Activity',
            dayOfWeek: 1,
            startTime: '11:00',
            endTime: '12:30',
            activityType: type1,
            groups: ['GROUP_2'],
            teachers: [],
          }
        ]
      },
      overrides: []
    };

    test('projects recurring weekly plan activity onto calendar dates (Slice 1)', () => {
      const startDate = new Date('2026-06-08T00:00:00.000Z');
      const endDate = new Date('2026-06-14T23:59:59.999Z');

      const instances = mergeSchedule(baseData, startDate, endDate);

      const g1Inst = instances.find(inst => inst.title === 'Group 1 Activity');
      expect(g1Inst).toBeDefined();
      expect(g1Inst?.date).toBe('2026-06-08');
      expect(g1Inst?.startTime).toBe('09:00');
      expect(g1Inst?.endTime).toBe('10:30');
    });

    test('filters activities by student group (Slice 2)', () => {
      const startDate = new Date('2026-06-08T00:00:00.000Z');
      const endDate = new Date('2026-06-14T23:59:59.999Z');

      const instances = mergeSchedule(baseData, startDate, endDate);

      expect(instances).toHaveLength(1);
      expect(instances[0].title).toBe('Group 1 Activity');
    });

    test('does not filter activities by group for teachers (Slice 2)', () => {
      const startDate = new Date('2026-06-08T00:00:00.000Z');
      const endDate = new Date('2026-06-14T23:59:59.999Z');

      const data = { ...baseData, user: { role: 'TEACHER', group: null } };
      const instances = mergeSchedule(data, startDate, endDate);

      expect(instances).toHaveLength(2);
      const titles = instances.map(i => i.title);
      expect(titles).toContain('Group 1 Activity');
      expect(titles).toContain('Group 2 Activity');
    });

    test('applies date-specific override modifications (Slice 2)', () => {
      const startDate = new Date('2026-06-08T00:00:00.000Z');
      const endDate = new Date('2026-06-14T23:59:59.999Z');

      const data = {
        ...baseData,
        overrides: [
          {
            id: 'ovr-1',
            date: '2026-06-08',
            isCancelled: false,
            activityId: 'act-1',
            title: 'Overridden Math Class',
            startTime: '10:00',
            endTime: '11:30',
            activityType: null,
            groups: [],
            teachers: []
          }
        ]
      };

      const instances = mergeSchedule(data, startDate, endDate);

      expect(instances).toHaveLength(1);
      expect(instances[0].title).toBe('Overridden Math Class');
      expect(instances[0].startTime).toBe('10:00');
      expect(instances[0].endTime).toBe('11:30');
    });

    test('applies date-specific override cancellations (Slice 2)', () => {
      const startDate = new Date('2026-06-08T00:00:00.000Z');
      const endDate = new Date('2026-06-14T23:59:59.999Z');

      const data = {
        ...baseData,
        overrides: [
          {
            id: 'ovr-1',
            date: '2026-06-08',
            isCancelled: true,
            activityId: 'act-1',
            title: null,
            startTime: null,
            endTime: null,
            activityType: null,
            groups: [],
            teachers: []
          }
        ]
      };

      const instances = mergeSchedule(data, startDate, endDate);

      expect(instances).toHaveLength(0); // activity 1 cancelled, activity 2 filtered out for STUDENT in GROUP_1
    });

    test('applies date-specific one-off activity additions (Slice 2)', () => {
      const startDate = new Date('2026-06-08T00:00:00.000Z');
      const endDate = new Date('2026-06-14T23:59:59.999Z');

      const data = {
        ...baseData,
        overrides: [
          {
            id: 'ovr-1',
            date: '2026-06-08',
            isCancelled: false,
            activityId: null,
            title: 'One-off TDD Workshop',
            startTime: '14:00',
            endTime: '15:30',
            activityType: type1,
            groups: ['GROUP_1'],
            teachers: []
          }
        ]
      };

      const instances = mergeSchedule(data, startDate, endDate);

      expect(instances).toHaveLength(2);
      const titles = instances.map(i => i.title);
      expect(titles).toContain('Group 1 Activity');
      expect(titles).toContain('One-off TDD Workshop');
    });

    test('one-off activity additions respect student group filters (Slice 2)', () => {
      const startDate = new Date('2026-06-08T00:00:00.000Z');
      const endDate = new Date('2026-06-14T23:59:59.999Z');

      const data = {
        ...baseData,
        overrides: [
          {
            id: 'ovr-1',
            date: '2026-06-08',
            isCancelled: false,
            activityId: null,
            title: 'One-off for Group 2',
            startTime: '14:00',
            endTime: '15:30',
            activityType: type1,
            groups: ['GROUP_2'],
            teachers: []
          }
        ]
      };

      const instances = mergeSchedule(data, startDate, endDate);

      expect(instances).toHaveLength(1);
      expect(instances[0].title).toBe('Group 1 Activity'); // only their own group's activity
    });
  });

  test.describe('Happening Now / Up Next Banner Logic', () => {
    const mockActivity1 = {
      id: 'act-1-2026-06-08',
      title: 'First Class',
      date: '2026-06-08',
      startTime: '09:00',
      endTime: '10:30',
      activityType: { id: 'type-1', name: 'Lesson', color: 'red' },
      groups: ['GROUP_1'],
      teachers: [],
    };

    const mockActivity2 = {
      id: 'act-2-2026-06-08',
      title: 'Second Class',
      date: '2026-06-08',
      startTime: '11:00',
      endTime: '12:30',
      activityType: { id: 'type-1', name: 'Lesson', color: 'red' },
      groups: ['GROUP_1'],
      teachers: [],
    };

    test('identifies happening now and up next', () => {
      // 1. Current time is 09:30 on Monday, June 8, 2026 -> First Class happening, Second Class next
      const time1 = new Date('2026-06-08T09:30:00.000Z');
      const result1 = getHappeningAndNext([mockActivity1, mockActivity2], time1);
      expect(result1.happening?.title).toBe('First Class');
      expect(result1.next?.title).toBe('Second Class');

      // 2. Current time is 10:45 -> None happening, Second Class next
      const time2 = new Date('2026-06-08T10:45:00.000Z');
      const result2 = getHappeningAndNext([mockActivity1, mockActivity2], time2);
      expect(result2.happening).toBeUndefined();
      expect(result2.next?.title).toBe('Second Class');

      // 3. Current time is 13:00 -> None happening, None next
      const time3 = new Date('2026-06-08T13:00:00.000Z');
      const result3 = getHappeningAndNext([mockActivity1, mockActivity2], time3);
      expect(result3.happening).toBeUndefined();
      expect(result3.next).toBeUndefined();
    });
  });

  test.describe('Schedule Page Access & Horizon Limits (E2E)', () => {
    test('students cannot view schedule beyond the horizon (Slice 3)', async ({ page, context }) => {
      await context.addCookies([
        {
          name: 'sb-access-token',
          value: 'mock-verified-token', // maps to student@test.com, verified STUDENT
          domain: 'localhost',
          path: '/',
        }
      ]);

      // Schedule Horizon is 4 weeks. Let's try to access July 20, 2026 (beyond 4 weeks from today)
      await page.goto('/schedule?date=2026-07-20');
      await expect(page.locator('body')).toContainText(/Beyond schedule horizon/i);
    });

    test('students can view schedule within the horizon (Slice 3)', async ({ page, context }) => {
      await context.addCookies([
        {
          name: 'sb-access-token',
          value: 'mock-verified-token',
          domain: 'localhost',
          path: '/',
        }
      ]);

      // Go to schedule for Monday, June 8, 2026 (within 4 weeks)
      await page.goto('/schedule?date=2026-06-08');
      await expect(page.locator('body')).not.toContainText(/Beyond schedule horizon/i);
      await expect(page.locator('body')).toContainText('Group 1 Activity');
    });

    test('teachers can view schedule beyond the horizon (Slice 3)', async ({ page, context }) => {
      await context.addCookies([
        {
          name: 'sb-access-token',
          value: `mock-user-${teacherId}`,
          domain: 'localhost',
          path: '/',
        }
      ]);

      // Go to schedule for July 20, 2026
      await page.goto('/schedule?date=2026-07-20');
      await expect(page.locator('body')).not.toContainText(/Beyond schedule horizon/i);
    });

    test('teachers see only their assigned activities by default, but can toggle to see all', async ({ page, context }) => {
      // Setup teacher assigned to Activity 1
      await prisma.activity.update({
        where: { id: activityId1 },
        data: { teachers: { connect: [{ id: teacherId }] } }
      });

      await context.addCookies([
        {
          name: 'sb-access-token',
          value: `mock-user-${teacherId}`,
          domain: 'localhost',
          path: '/',
        }
      ]);

      await page.goto('/schedule?date=2026-06-08');

      // Should default to only showing assigned activity
      await expect(page.locator('body')).toContainText('Group 1 Activity');
      await expect(page.locator('body')).not.toContainText('Group 2 Activity');

      // Uncheck the toggle
      await page.getByLabel('My Activities Only').uncheck();

      // Now it should show all activities across all groups
      await expect(page.locator('body')).toContainText('Group 1 Activity');
      await expect(page.locator('body')).toContainText('Group 2 Activity');
    });

    test('users can toggle between Agenda and Grid views', async ({ page, context }) => {
      await context.addCookies([
        {
          name: 'sb-access-token',
          value: 'mock-verified-token',
          domain: 'localhost',
          path: '/',
        }
      ]);

      await page.goto('/schedule?date=2026-06-08');

      // Should default to Agenda view
      await expect(page.getByTestId('agenda-view')).toBeVisible();

      // Click the Grid toggle
      await page.getByRole('button', { name: 'Grid' }).click();

      // Now Grid view should be visible, and Agenda hidden
      await expect(page.getByTestId('grid-view')).toBeVisible();
      await expect(page.getByTestId('agenda-view')).not.toBeVisible();

      // Toggle back to Agenda
      await page.getByRole('button', { name: 'Agenda' }).click();
      await expect(page.getByTestId('agenda-view')).toBeVisible();
    });
  });
});
