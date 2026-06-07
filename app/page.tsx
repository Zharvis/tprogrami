import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.status === 'UNVERIFIED') {
    redirect('/waiting-room');
  }

  return (
    <div 
      data-testid="bento-box-container"
      className="p-4 md:p-8 min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Welcome back, {user.email?.split('@')[0] || 'User'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Here's your overview for today.
          </p>
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-[minmax(180px,auto)]">
          {/* Schedule Widget Placeholder */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60 hover:shadow-md transition-shadow duration-300">
            <h2 className="text-lg font-medium text-slate-800 dark:text-slate-200">Schedule</h2>
            <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500 text-sm">
              Schedule widget coming soon
            </div>
          </div>

          {/* Another placeholder box */}
          <div className="col-span-1 bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60 hover:shadow-md transition-shadow duration-300">
             <h2 className="text-lg font-medium text-slate-800 dark:text-slate-200">Tasks</h2>
          </div>

          {/* Another placeholder box */}
          <div className="col-span-1 md:col-span-1 lg:col-span-1 bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60 hover:shadow-md transition-shadow duration-300">
            <h2 className="text-lg font-medium text-slate-800 dark:text-slate-200">Announcements</h2>
          </div>

          {/* Another placeholder box */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 shadow-sm text-white hover:shadow-lg transition-shadow duration-300">
            <h2 className="text-lg font-medium">Insights</h2>
            <p className="mt-2 text-indigo-100 text-sm">Quick look at your recent activity.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
