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

  const instances: ActivityInstance[] = [];

  // Iterate date-by-date from startDate to endDate
  const current = new Date(startDate.getTime());
  
  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    
    // Day of week (1 = Monday, ..., 7 = Sunday)
    const jsDay = current.getUTCDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;

    let dayActivities = activePlan.activities.filter(
      (act) => act.dayOfWeek === dayOfWeek
    );

    // Apply student group filtering
    if (user.role === 'STUDENT' && user.group) {
      dayActivities = dayActivities.filter(
        (act) => act.groups.length === 0 || act.groups.includes(user.group!)
      );
    }

    for (const act of dayActivities) {
      instances.push({
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
        teachers: act.teachers.map((t) => ({
          id: t.id,
          email: t.email,
        })),
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
