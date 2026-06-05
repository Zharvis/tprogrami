import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../lib/auth';
import { resolveSchedule, getHappeningAndNext } from '../../lib/schedule';
import Link from 'next/link';

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

  return (
    <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-8 font-sans">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
              School Schedule
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">
              Welcome back, <span className="font-semibold">{user.email}</span> ({user.role})
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Link
              href={`/schedule?date=${prevWeekStr}`}
              className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-sm font-medium"
            >
              ← Prev Week
            </Link>
            <Link
              href="/schedule"
              className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-sm font-semibold"
            >
              Today
            </Link>
            {!isNextWeekBeyond ? (
              <Link
                href={`/schedule?date=${nextWeekStr}`}
                className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-sm font-medium"
              >
                Next Week →
              </Link>
            ) : (
              <button
                disabled
                className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg opacity-40 cursor-not-allowed text-sm font-medium"
                title="Beyond schedule horizon"
              >
                Next Week →
              </button>
            )}
          </div>
        </div>

        {/* Happening Now & Up Next Banner */}
        {(happening || next) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-800 text-white p-6 rounded-2xl shadow-lg">
            {happening ? (
              <div className="flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/25 pb-4 md:pb-0 md:pr-4">
                <div>
                  <span className="bg-red-500 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full">
                    Happening Now
                  </span>
                  <h2 className="text-xl font-bold mt-2">{happening.title}</h2>
                  <p className="text-blue-100 text-sm mt-1">
                    {happening.startTime} - {happening.endTime}
                  </p>
                </div>
                {happening.teachers.length > 0 && (
                  <p className="text-xs text-blue-200 mt-4">
                    Teacher: {happening.teachers.map(t => t.email).join(', ')}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col justify-center border-b md:border-b-0 md:border-r border-white/25 pb-4 md:pb-0 md:pr-4">
                <span className="text-blue-100/70 text-sm font-semibold">No activity happening right now.</span>
              </div>
            )}

            {next ? (
              <div className="flex flex-col justify-between pt-4 md:pt-0 md:pl-4">
                <div>
                  <span className="bg-emerald-500 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full">
                    Up Next
                  </span>
                  <h2 className="text-xl font-bold mt-2">{next.title}</h2>
                  <p className="text-blue-100 text-sm mt-1">
                    {next.date === todayStr ? 'Today' : next.date} at {next.startTime} - {next.endTime}
                  </p>
                </div>
                {next.teachers.length > 0 && (
                  <p className="text-xs text-blue-200 mt-4">
                    Teacher: {next.teachers.map(t => t.email).join(', ')}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col justify-center pt-4 md:pt-0 md:pl-4">
                <span className="text-blue-100/70 text-sm font-semibold">No upcoming activities scheduled.</span>
              </div>
            )}
          </div>
        )}

        {/* Agenda View */}
        <div className="flex flex-col gap-4 mt-2">
          {weekDays.map((dateStr) => {
            const dateObj = new Date(dateStr);
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
            const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
            const dayActivities = groupedActivities[dateStr];
            const isToday = dateStr === todayStr;

            return (
              <div 
                key={dateStr}
                className={`flex flex-col p-4 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border ${
                  isToday ? 'border-blue-500 ring-1 ring-blue-500' : 'border-zinc-200 dark:border-zinc-800'
                }`}
              >
                <div className="flex justify-between items-baseline mb-3">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                    {dayName}
                    {isToday && (
                      <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                        Today
                      </span>
                    )}
                  </h3>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                    {formattedDate}
                  </span>
                </div>

                {dayActivities.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {dayActivities.map((act) => (
                      <div 
                        key={act.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-1.5 h-10 rounded-full animate-pulse-slow"
                            style={{ backgroundColor: act.activityType.color }}
                          />
                          <div>
                            <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm">
                              {act.title}
                            </h4>
                            <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-0.5">
                              {act.startTime} - {act.endTime} • {act.activityType.name}
                            </p>
                          </div>
                        </div>

                        {act.teachers.length > 0 && (
                          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 bg-zinc-100/50 dark:bg-zinc-800/50 px-2 py-1 rounded">
                            {act.teachers.map(t => t.email.split('@')[0]).join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-400 dark:text-zinc-600 italic py-2">
                    No activities scheduled.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
