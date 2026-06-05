import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../lib/auth';
import { resolveSchedule, getHappeningAndNext } from '../../lib/schedule';
import Link from 'next/link';
import { prisma } from '../../lib/prisma';
import ScheduleClient from './ScheduleClient';

export const dynamic = 'force-dynamic';

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  if (user.status === 'UNVERIFIED') {
    redirect('/waiting-room');
  }

  const resolvedParams = await searchParams;
  const dateParam = resolvedParams.date;

  // Reference for "today"
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Selected date
  let targetDate = new Date();
  if (dateParam) {
    targetDate = new Date(dateParam);
  }

  // Horizon check for students
  const horizonWeeks = process.env.NEXT_PUBLIC_SCHEDULE_HORIZON_WEEKS 
    ? parseInt(process.env.NEXT_PUBLIC_SCHEDULE_HORIZON_WEEKS, 10) 
    : 4;

  const maxAllowedDate = new Date(today);
  maxAllowedDate.setDate(today.getDate() + horizonWeeks * 7);

  const targetMidnight = new Date(targetDate);
  targetMidnight.setHours(0, 0, 0, 0);
  
  const maxMidnight = new Date(maxAllowedDate);
  maxMidnight.setHours(23, 59, 59, 999);

  const isStudent = user.role === 'STUDENT';
  const isBeyondHorizon = isStudent && (targetMidnight > maxMidnight);

  if (isBeyondHorizon) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-950 text-center">
        <div className="max-w-md p-8 bg-white dark:bg-zinc-900 shadow-xl rounded-2xl border border-red-200 dark:border-red-900/30">
          <div className="w-16 h-16 mx-auto mb-6 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-500 mb-4">Beyond Schedule Horizon</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-8">
            Students cannot view schedule activities beyond the global visibility horizon of {horizonWeeks} weeks.
          </p>
          <Link 
            href="/schedule"
            className="inline-block px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            Go to Today
          </Link>
        </div>
      </div>
    );
  }

  // Resolve start and end of week (Monday to Sunday)
  const startOfWeek = new Date(targetDate);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const activities = await resolveSchedule({
    userId: user.id,
    startDate: startOfWeek,
    endDate: endOfWeek,
  });

  const { happening, next } = getHappeningAndNext(activities, today);

  // Navigation dates
  const prevWeekDate = new Date(startOfWeek);
  prevWeekDate.setDate(startOfWeek.getDate() - 7);
  const prevWeekStr = prevWeekDate.toISOString().split('T')[0];

  const nextWeekDate = new Date(startOfWeek);
  nextWeekDate.setDate(startOfWeek.getDate() + 7);
  const nextWeekStr = nextWeekDate.toISOString().split('T')[0];

  const nextWeekMidnight = new Date(nextWeekDate);
  nextWeekMidnight.setHours(0, 0, 0, 0);
  const isNextWeekBeyond = isStudent && (nextWeekMidnight > maxMidnight);

  // Group activities
  const groupedActivities: { [dateStr: string]: typeof activities } = {};
  const weekDays: string[] = [];
  const temp = new Date(startOfWeek);
  for (let i = 0; i < 7; i++) {
    const dStr = temp.toISOString().split('T')[0];
    weekDays.push(dStr);
    groupedActivities[dStr] = [];
    temp.setDate(temp.getDate() + 1);
  }

  for (const act of activities) {
    if (groupedActivities[act.date]) {
      groupedActivities[act.date].push(act);
    }
  }

  // Fetch activity types and teachers if admin
  const isAdmin = user.role === 'ADMIN';
  let activityTypes: any[] = [];
  let teachers: any[] = [];

  if (isAdmin) {
    activityTypes = await prisma.activityType.findMany({
      orderBy: { name: 'asc' },
    });
    teachers = await prisma.user.findMany({
      where: { role: 'TEACHER', status: 'VERIFIED' },
      orderBy: { email: 'asc' },
    });
  }

  return (
    <ScheduleClient
      user={{
        id: user.id,
        email: user.email,
        role: user.role,
        group: user.group,
      }}
      activities={activities}
      weekDays={weekDays}
      groupedActivities={groupedActivities}
      happening={happening}
      next={next}
      prevWeekStr={prevWeekStr}
      nextWeekStr={nextWeekStr}
      todayStr={todayStr}
      isNextWeekBeyond={isNextWeekBeyond}
      activityTypes={activityTypes}
      teachers={teachers}
    />
  );
}
