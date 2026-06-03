import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AdminDashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  if (user.role !== 'ADMIN') {
    redirect('/')
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">Admin Dashboard</h1>
      <p className="text-zinc-600 dark:text-zinc-400">Welcome to the administration panel.</p>
    </div>
  )
}
