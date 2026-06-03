export default function WaitingRoomPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-md w-full p-8 bg-white dark:bg-zinc-900 shadow-xl rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <div className="w-16 h-16 mx-auto mb-6 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">You're in the Waiting Room</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-8">
          Your account has been created successfully, but it needs to be verified by an administrator before you can access the platform. Please check back later.
        </p>
        <div className="text-sm text-zinc-500 dark:text-zinc-500">
          Status: <span className="font-semibold text-amber-600 dark:text-amber-500">Unverified</span>
        </div>
      </div>
    </div>
  );
}
