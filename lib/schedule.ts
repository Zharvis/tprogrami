import { prisma } from './prisma';

// --- Domain Interfaces --- //

export interface ActivityTypeInfo {
  id: string;
  name: string;
  color: string;
}

export interface TeacherInfo {
  id: string;
  email: string;
}

export interface BaselineActivity {
  id: string;
  title: string;
  dayOfWeek: number; // 1 = Monday, ..., 7 = Sunday
  startTime: string; // "HH:MM" e.g., "08:30"
  endTime: string;   // "HH:MM" e.g., "10:00"
  activityType: ActivityTypeInfo;
  groups: string[];
  teachers: TeacherInfo[];
}

export interface OverrideData {
  id: string;
  date: string; // "YYYY-MM-DD" e.g., "2026-06-08"
  isCancelled: boolean;
  activityId: string | null;
  
  title?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  activityType?: ActivityTypeInfo | null;
  groups?: string[];
  teachers?: TeacherInfo[];
  overrideGroups: boolean;
  overrideTeachers: boolean;
}

export interface ActivityInstance {
  id: string; // Unique combination: `${activityId}-${date}`
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  activityType: ActivityTypeInfo;
  groups: string[];
  teachers: TeacherInfo[];
  isOverride?: boolean;
  overrideId?: string;
  isOneOff?: boolean;
}

// --- The Pure Domain Logic --- //

export class MaterializedSchedule {
  constructor(
    private readonly startDate: Date,
    private readonly endDate: Date,
    private readonly baseline: BaselineActivity[],
    private readonly overrides: OverrideData[]
  ) {}

  getAll(): ActivityInstance[] {
    const instances: ActivityInstance[] = [];
    const current = new Date(this.startDate.getTime());
    
    while (current <= this.endDate) {
      const dateStr = current.toISOString().split('T')[0];
      const jsDay = current.getUTCDay();
      const dayOfWeek = jsDay === 0 ? 7 : jsDay;

      const dayOverrides = this.overrides.filter((o) => o.date === dateStr);
      const baselineForDay = this.baseline.filter((act) => act.dayOfWeek === dayOfWeek);

      // 1. Process baseline activities, applying overrides
      for (const act of baselineForDay) {
        const override = dayOverrides.find((o) => o.activityId === act.id);
        
        if (override) {
          if (override.isCancelled) {
            continue; // Skip cancelled activity
          }
          
          instances.push({
            id: `${act.id}-${dateStr}`,
            title: override.title ?? act.title,
            date: dateStr,
            startTime: override.startTime ?? act.startTime,
            endTime: override.endTime ?? act.endTime,
            activityType: override.activityType ?? act.activityType,
            groups: override.overrideGroups ? (override.groups || []) : act.groups,
            teachers: override.overrideTeachers ? (override.teachers || []) : act.teachers,
            isOverride: true,
            overrideId: override.id,
          });
        } else {
          instances.push({
            id: `${act.id}-${dateStr}`,
            title: act.title,
            date: dateStr,
            startTime: act.startTime,
            endTime: act.endTime,
            activityType: act.activityType,
            groups: act.groups,
            teachers: act.teachers,
          });
        }
      }

      // 2. Add one-off activities
      const oneOffs = dayOverrides.filter((o) => o.activityId === null);
      for (const override of oneOffs) {
        if (!override.isCancelled) {
          instances.push({
            id: `${override.id}-${dateStr}`,
            title: override.title ?? '',
            date: dateStr,
            startTime: override.startTime ?? '',
            endTime: override.endTime ?? '',
            activityType: override.activityType ?? { id: '', name: 'Unknown', color: '#ccc' },
            groups: override.groups || [],
            teachers: override.teachers || [],
            isOneOff: true,
            overrideId: override.id,
          });
        }
      }

      current.setUTCDate(current.getUTCDate() + 1);
    }

    // Sort chronologically
    return instances.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.startTime.localeCompare(b.startTime);
    });
  }

  forUser(role: string | null, group: string | null): ActivityInstance[] {
    const all = this.getAll();
    if (role === 'STUDENT' && group) {
      return all.filter((act) => act.groups.length === 0 || act.groups.includes(group));
    }
    return all;
  }
}

export class ScheduleEngine {
  /**
   * Cancels a specific instance of an activity.
   * instanceId format: `${activityId}-${dateStr}` or `${overrideId}-${dateStr}`
   */
  static async cancelInstance(instanceId: string): Promise<void> {
    const parts = instanceId.split('-');
    if (parts.length < 5) {
      throw new Error(`Invalid instance ID format: ${instanceId}`);
    }

    // Extract date (last 3 parts: YYYY-MM-DD)
    const date = parts.slice(-3).join('-');
    // Extract ID (everything before the date)
    const id = parts.slice(0, -3).join('-');

    // 1. Check if this is already an override
    const existingOverride = await prisma.override.findUnique({
      where: { id },
    });

    if (existingOverride) {
      await prisma.override.update({
        where: { id },
        data: { isCancelled: true },
      });
      return;
    }

    // 2. Check if it's a baseline activity
    const baselineActivity = await prisma.activity.findUnique({
      where: { id },
    });

    if (baselineActivity) {
      // Check if an override already exists for this baseline on this date
      const overrideForBaseline = await prisma.override.findFirst({
        where: { activityId: id, date },
      });

      if (overrideForBaseline) {
        await prisma.override.update({
          where: { id: overrideForBaseline.id },
          data: { isCancelled: true },
        });
        return;
      }

      await prisma.override.create({
        data: {
          date,
          activityId: id,
          isCancelled: true,
        },
      });
      return;
    }

    throw new Error(`Instance not found: ${instanceId}`);
  }

  /**
   * Resets an instance back to baseline (or deletes if it's a one-off).
   */
  static async resetInstance(instanceId: string): Promise<void> {
    const parts = instanceId.split('-');
    if (parts.length < 5) {
      throw new Error(`Invalid instance ID format: ${instanceId}`);
    }

    const date = parts.slice(-3).join('-');
    const id = parts.slice(0, -3).join('-');

    // 1. Check if it's a direct override ID
    const directOverride = await prisma.override.findUnique({
      where: { id },
    });

    if (directOverride) {
      await prisma.override.delete({
        where: { id },
      });
      return;
    }

    // 2. Check if it's a baseline activity ID + date
    const overrideForBaseline = await prisma.override.findFirst({
      where: { activityId: id, date },
    });

    if (overrideForBaseline) {
      await prisma.override.delete({
        where: { id: overrideForBaseline.id },
      });
      return;
    }

    throw new Error(`Override not found for instance: ${instanceId}`);
  }
}

// --- The Adapter Layer --- //

export async function loadSchedule(startDate: Date, endDate: Date): Promise<MaterializedSchedule> {
  // 1. Fetch active weekly plan baseline
  const activePlan = await prisma.weeklyPlan.findFirst({
    where: { isActive: true },
    include: {
      activities: {
        include: {
          activityType: true,
          teachers: true,
        },
      },
    },
  });

  const baseline: BaselineActivity[] = activePlan?.activities.map((act) => ({
    id: act.id,
    title: act.title,
    dayOfWeek: act.dayOfWeek,
    startTime: act.startTime,
    endTime: act.endTime,
    activityType: {
      id: act.activityType.id,
      name: act.activityType.name,
      color: act.activityType.color,
    },
    groups: act.groups,
    teachers: act.teachers.map(t => ({ id: t.id, email: t.email })),
  })) || [];

  // 2. Fetch overrides within range
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  const rawOverrides = await prisma.override.findMany({
    where: {
      date: {
        gte: startStr,
        lte: endStr,
      },
    },
    include: {
      activityType: true,
      teachers: true,
    },
  });

  const overrides: OverrideData[] = rawOverrides.map((o) => ({
    id: o.id,
    date: o.date,
    isCancelled: o.isCancelled,
    activityId: o.activityId,
    title: o.title,
    startTime: o.startTime,
    endTime: o.endTime,
    activityType: o.activityType ? {
      id: o.activityType.id,
      name: o.activityType.name,
      color: o.activityType.color,
    } : null,
    groups: o.groups,
    teachers: o.teachers.map(t => ({ id: t.id, email: t.email })),
    overrideGroups: o.overrideGroups,
    overrideTeachers: o.overrideTeachers,
  }));

  // 3. Return pure engine
  return new MaterializedSchedule(startDate, endDate, baseline, overrides);
}
