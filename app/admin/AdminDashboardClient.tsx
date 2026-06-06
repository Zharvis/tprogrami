'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Role, Group } from '@/app/generated/prisma'
import {
  createWeeklyPlan,
  setActiveWeeklyPlan,
  duplicateWeeklyPlan,
  deleteWeeklyPlan,
} from './actions'
import { computeLayout } from '@/lib/layout-engine'
import { ScheduleGrid, GridActivity } from '@/components/ScheduleGrid'

interface User {
  id: string
  email: string
  status: string
  role: Role | null
  group: Group | null
  createdAt: Date
}

interface WeeklyPlan {
  id: string
  name: string
  isActive: boolean
}

interface ActivityType {
  id: string
  name: string
  color: string
}

interface Activity {
  id: string
  title: string
  dayOfWeek: number
  startTime: string
  endTime: string
  weeklyPlanId: string
  activityTypeId: string
  groups: Group[]
  activityType: { name: string; color: string }
  teachers: { id: string; email: string }[]
}

interface AdminDashboardClientProps {
  unverifiedUsers: User[]
  weeklyPlans: WeeklyPlan[]
  activePlan: (WeeklyPlan & { activities: Activity[] }) | null
  activityTypes: ActivityType[]
  teachers: User[]
  verifyUserAction: (userId: string, formData: FormData) => Promise<void>
}

export default function AdminDashboardClient({
  unverifiedUsers,
  weeklyPlans,
  activePlan,
  verifyUserAction,
}: AdminDashboardClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [newPlanName, setNewPlanName] = useState('')
  const [isNewPlanOpen, setIsNewPlanOpen] = useState(false)

  // Calendar Grid time settings
  const hours = Array.from({ length: 11 }, (_, i) => i + 8) // 8:00 AM to 6:00 PM

  const daysOfWeek = [
    { label: 'Monday', val: 1 },
    { label: 'Tuesday', val: 2 },
    { label: 'Wednesday', val: 3 },
    { label: 'Thursday', val: 4 },
    { label: 'Friday', val: 5 },
    { label: 'Saturday', val: 6 },
    { label: 'Sunday', val: 7 },
  ]

  const positionedActivities = useMemo(() => {
    if (!activePlan) return []
    const layout = computeLayout(activePlan.activities.map(a => ({
      ...a,
      date: `2026-06-0${a.dayOfWeek}` // Dummy dates for weekly plan grid
    })), {
      viewType: 'grid',
      startHour: 8,
      endHour: 18,
    })
    return layout.items.map(item => ({
      ...item.activity,
      style: item.style,
      layout: item.layout
    })) as unknown as GridActivity[]
  }, [activePlan])

  const handleSetActive = (id: string) => {
    startTransition(async () => {
      try {
        await setActiveWeeklyPlan(id)
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to set active plan')
      }
    })
  }

  const handleDuplicate = (id: string) => {
    startTransition(async () => {
      try {
        const newId = await duplicateWeeklyPlan(id)
        router.push(`/admin/weekly-plans/${newId}`)
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to duplicate plan')
      }
    })
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this Weekly Plan and all its activities?')) {
      startTransition(async () => {
        try {
          await deleteWeeklyPlan(id)
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Failed to delete plan')
        }
      })
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto p-4 md:p-8">
      {/* Sidebar - Pending Users */}
      <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex-1">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-3">Verification Requests ({unverifiedUsers.length})</h3>
          {unverifiedUsers.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">No pending verifications.</p>
          ) : (
            <ul className="flex flex-col gap-4 divide-y divide-zinc-100 dark:divide-zinc-800">
              {unverifiedUsers.map((pUser, idx) => (
                <li key={pUser.id} className={`flex flex-col gap-3 ${idx > 0 ? 'pt-4' : ''}`}>
                  <div>
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50 block truncate" title={pUser.email}>
                      {pUser.email}
                    </span>
                    <span className="text-xs text-zinc-500">
                      Joined: {new Date(pUser.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <form
                    action={async (formData) => {
                      await verifyUserAction(pUser.id, formData)
                    }}
                    className="flex flex-col gap-2"
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        name="role"
                        defaultValue="STUDENT"
                        className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 text-xs rounded-lg p-1.5 focus:outline-none"
                      >
                        <option value="STUDENT">Student</option>
                        <option value="TEACHER">Teacher</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                      <select
                        name="group"
                        defaultValue="none"
                        className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 text-xs rounded-lg p-1.5 focus:outline-none"
                      >
                        <option value="none">No Group</option>
                        <option value="GROUP_1">Group 1</option>
                        <option value="GROUP_2">Group 2</option>
                        <option value="GROUP_3">Group 3</option>
                        <option value="GROUP_4">Group 4</option>
                        <option value="GROUP_5">Group 5</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Verify
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Main Panel - Manage Plans and Schedule Grid */}
      <div className="flex-1 flex flex-col gap-6">
        
        {/* Manage Weekly Plans Section */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Manage Weekly Plans</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Create, copy, delete, and activate standard schedule templates.</p>
            </div>
            
            <button
              onClick={() => setIsNewPlanOpen(!isNewPlanOpen)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              {isNewPlanOpen ? 'Cancel' : 'New Plan'}
            </button>
          </div>

          {/* New Plan Creator Inline Form */}
          {isNewPlanOpen && (
            <form
              action={async (formData) => {
                const newId = await createWeeklyPlan(formData)
                setNewPlanName('')
                setIsNewPlanOpen(false)
                if (newId) {
                  router.push(`/admin/weekly-plans/${newId}`)
                }
              }}
              className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800/40 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl"
            >
              <input
                type="text"
                name="name"
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                placeholder="e.g. Trimester 2 Baseline..."
                className="flex-1 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
              >
                Create & Edit
              </button>
            </form>
          )}

          {/* Plans Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">
                  <th className="py-2 px-3">Plan Name</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
                {weeklyPlans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="py-3 px-3 font-semibold text-zinc-800 dark:text-zinc-200">
                      {plan.name}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          plan.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}
                      >
                        {plan.isActive ? 'Active' : 'Draft'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        {!plan.isActive && (
                          <button
                            onClick={() => handleSetActive(plan.id)}
                            disabled={isPending}
                            className="text-xs bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded font-medium transition-colors cursor-pointer"
                          >
                            Activate
                          </button>
                        )}
                        <Link
                          href={`/admin/weekly-plans/${plan.id}`}
                          className="text-xs bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-2 py-1 rounded font-medium transition-colors"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDuplicate(plan.id)}
                          disabled={isPending}
                          className="text-xs border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-650 dark:text-zinc-350 px-2 py-1 rounded transition-colors cursor-pointer"
                        >
                          Duplicate
                        </button>
                        {!plan.isActive && (
                          <button
                            onClick={() => handleDelete(plan.id)}
                            disabled={isPending}
                            className="text-xs border border-red-200 hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 px-2 py-1 rounded transition-colors cursor-pointer"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Active Weekly Plan Read-Only Display */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Admin Dashboard</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Active Weekly Plan:{' '}
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {activePlan?.name || 'None'}
                </span>
              </p>
            </div>
            
            {activePlan && (
              <div className="flex items-center gap-3">
                <Link
                  href={`/admin/weekly-plans/${activePlan.id}`}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit Plan
                </Link>
              </div>
            )}
          </div>

          {/* Calendar Grid */}
          {!activePlan ? (
            <div className="text-center text-zinc-500 dark:text-zinc-400 py-12">
              No weekly plans are currently active. Please create or activate one above.
            </div>
          ) : (
            <ScheduleGrid
              activities={positionedActivities}
              daysOfWeek={daysOfWeek}
              hours={hours}
              minWidth={650}
            />
          )}
        </div>
      </div>
    </div>
  )
}
