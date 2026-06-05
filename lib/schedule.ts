import { prisma } from './prisma';

export interface ActivityInstance {
  id: string; // Projected unique ID: e.g., `${activityId}-${dateString}`
  title: string;
  date: string; // YYYY-MM-DD format
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  activityType: {
    id: string;
    name: string;
    color: string;
  };
  groups: string[];
  teachers: {
    id: string;
    email: string;
  }[];
  isOverride?: boolean;
  overrideId?: string;
  isOneOff?: boolean;
}

export interface ResolveScheduleOptions {
  userId: string;
  startDate: Date;
  endDate: Date;
}

/**
 * Projects active Weekly Plan activities onto calendar dates within the date range,
 * filtering them according to the user's role and target groups.
 */
export async function resolveSchedule(options: ResolveScheduleOptions): Promise<ActivityInstance[]> {
  const { userId, startDate, endDate } = options;

  // Fetch user role and group
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return [];
  }

  // 1. Fetch active weekly plan
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

  if (!activePlan) {
    return [];
  }

  // Fetch all overrides within the date range
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  const overrides = await prisma.override.findMany({
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

  const instances: ActivityInstance[] = [];

  // Iterate date-by-date from startDate to endDate
  const current = new Date(startDate.getTime());
  
  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    
    // Day of week (1 = Monday, ..., 7 = Sunday)
    const jsDay = current.getUTCDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;

    // Get baseline activities for this day of week
    const baselineActivities = activePlan.activities.filter(
      (act) => act.dayOfWeek === dayOfWeek
    );

    // Get overrides for this date
    const dayOverrides = overrides.filter((o) => o.date === dateStr);

    // Build the list of activities for this day
    const resolvedDayActivities: any[] = [];

    console.log(`[DEBUG] Date: ${dateStr}, Day of Week: ${dayOfWeek}`);
    console.log(`[DEBUG] Baseline count: ${baselineActivities.length}`);
    console.log(`[DEBUG] Overrides count: ${dayOverrides.length}`);

    // 1. Process baseline activities, applying overrides
    for (const act of baselineActivities) {
      const override = dayOverrides.find((o) => o.activityId === act.id);
      console.log(`[DEBUG] Act ID: ${act.id}, Match Override: ${!!override}`);
      if (override) {
        if (override.isCancelled) {
          console.log(`[DEBUG] Skipping cancelled act: ${act.id}`);
          // Skip cancelled activity
          continue;
        }
        // Add modified activity
        resolvedDayActivities.push({
          id: `${act.id}-${dateStr}`,
          title: override.title ?? act.title,
          date: dateStr,
          startTime: override.startTime ?? act.startTime,
          endTime: override.endTime ?? act.endTime,
          activityType: override.activityType
            ? { id: override.activityType.id, name: override.activityType.name, color: override.activityType.color }
            : { id: act.activityType.id, name: act.activityType.name, color: act.activityType.color },
          groups: (override.groups && override.groups.length > 0) ? override.groups : act.groups,
          teachers: (override.teachers && override.teachers.length > 0) ? override.teachers : act.teachers,
        });
      } else {
        // No override, add baseline activity
        resolvedDayActivities.push({
          id: `${act.id}-${dateStr}`,
          title: act.title,
          date: dateStr,
          startTime: act.startTime,
          endTime: act.endTime,
          activityType: {
            id: act.activityType.id,
            name: act.activityType.name,
            color: act.activityType.color,
          },
          groups: act.groups,
          teachers: act.teachers,
        });
      }
    }

    // 2. Add one-off activities (overrides with activityId === null)
    const oneOffs = dayOverrides.filter((o) => o.activityId === null);
    for (const override of oneOffs) {
      console.log(`[DEBUG] Adding one-off override: ${override.id}`);
      resolvedDayActivities.push({
        id: `${override.id}-${dateStr}`,
        title: override.title ?? '',
        date: dateStr,
        startTime: override.startTime ?? '',
        endTime: override.endTime ?? '',
        activityType: override.activityType
          ? { id: override.activityType.id, name: override.activityType.name, color: override.activityType.color }
          : { id: '', name: 'Unknown', color: '#ccc' },
        groups: override.groups,
        teachers: override.teachers,
        isOneOff: true,
        overrideId: override.id,
      });
    }

    // 3. Apply student group filtering on the final day's activities
    let filteredDayActivities = resolvedDayActivities;
    if (user.role === 'STUDENT' && user.group) {
      filteredDayActivities = filteredDayActivities.filter(
        (act) => act.groups.length === 0 || act.groups.includes(user.group!)
      );
    }
    console.log(`[DEBUG] Final day activity count: ${filteredDayActivities.length}`);

    // 4. Push to instances
    for (const act of filteredDayActivities) {
      instances.push({
        id: act.id,
        title: act.title,
        date: act.date,
        startTime: act.startTime,
        endTime: act.endTime,
        activityType: act.activityType,
        groups: act.groups,
        teachers: act.teachers.map((t: any) => ({
          id: t.id,
          email: t.email,
        })),
        isOverride: act.isOverride,
        overrideId: act.overrideId,
        isOneOff: act.isOneOff,
      });
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

/**
 * Determines which activity is "Happening Now" and which is "Up Next" based on the current time.
 */
export function getHappeningAndNext(
  activities: ActivityInstance[],
  currentTime: Date
): { happening?: ActivityInstance; next?: ActivityInstance } {
  const currentDateStr = currentTime.toISOString().split('T')[0];
  const currentHour = currentTime.getUTCHours();
  const currentMin = currentTime.getUTCMinutes();
  const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;

  let happening: ActivityInstance | undefined;
  let next: ActivityInstance | undefined;

  // Filter activities for today
  const todaysActivities = activities.filter((act) => act.date === currentDateStr);

  for (const act of todaysActivities) {
    if (act.startTime <= currentTimeStr && act.endTime >= currentTimeStr) {
      happening = act;
    } else if (act.startTime > currentTimeStr) {
      if (!next || act.startTime < next.startTime) {
        next = act;
      }
    }
  }

  // If no next activity today, look for the first activity on future days
  if (!next) {
    const futureActivities = activities.filter((act) => act.date > currentDateStr);
    if (futureActivities.length > 0) {
      // Future activities are sorted chronologically, so the first is the closest
      next = futureActivities[0];
    }
  }

  return { happening, next };
}
