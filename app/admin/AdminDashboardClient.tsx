'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Role, Group } from '@/app/generated/prisma'
import {
  createWeeklyPlan,
  setActiveWeeklyPlan,
  duplicateWeeklyPlan,
  deleteWeeklyPlan,
} from './actions'

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
  const [activeTab, setActiveTab] = useState<'schedule' | 'users'>('schedule')
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
  ]

  // Collision/Overlap Layout Algorithm
  const getPositionedActivities = (activities: Activity[]) => {
    const timeToMinutes = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number)
      return h * 60 + m
    }

    const gridStartMin = 8 * 60
    const gridEndMin = 18 * 60
    const gridTotalMin = gridEndMin - gridStartMin

    // Group by dayOfWeek
    const days: { [day: number]: Activity[][] } = {}
    for (let d = 1; d <= 7; d++) days[d] = []

    // Sort activities by dayOfWeek and startTime
    const sorted = [...activities].sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek
      return a.startTime.localeCompare(b.startTime)
    })

    for (const act of sorted) {
      const dayClusters = days[act.dayOfWeek]
      const actStart = timeToMinutes(act.startTime)
      const actEnd = timeToMinutes(act.endTime)

      let added = false
      for (const cluster of dayClusters) {
        const overlaps = cluster.some((cAct) => {
          const cStart = timeToMinutes(cAct.startTime)
          const cEnd = timeToMinutes(cAct.endTime)
          return actStart < cEnd && actEnd > cStart
        })

        if (overlaps) {
          cluster.push(act)
          added = true
          break
        }
      }

      if (!added) {
        dayClusters.push([act])
      }
    }

    const positioned: (Activity & {
      top: number
      height: number
      left: number
      width: number
    })[] = []

    for (let d = 1; d <= 7; d++) {
      const clusters = days[d] || []
      for (const cluster of clusters) {
        cluster.sort((a, b) => a.startTime.localeCompare(b.startTime))

        const columns: Activity[][] = []
        for (const act of cluster) {
          const actStart = timeToMinutes(act.startTime)

          let colIndex = 0
          while (true) {
            if (!columns[colIndex]) {
              columns[colIndex] = []
            }
            const lastInCol = columns[colIndex][columns[colIndex].length - 1]
            if (!lastInCol) {
              columns[colIndex].push(act)
              break
            }
            const lastEnd = timeToMinutes(lastInCol.endTime)
            if (actStart >= lastEnd) {
              columns[colIndex].push(act)
              break
            }
            colIndex++
          }
        }

        const columnsCount = columns.length
        for (let colIndex = 0; colIndex < columnsCount; colIndex++) {
          for (const act of columns[colIndex]) {
            const actStart = timeToMinutes(act.startTime)
            const actEnd = timeToMinutes(act.endTime)

            const startMin = Math.max(gridStartMin, actStart)
            const endMin = Math.min(gridEndMin, actEnd)

            const topPercent = ((startMin - gridStartMin) / gridTotalMin) * 100
            const heightPercent = ((endMin - startMin) / gridTotalMin) * 100

            const leftPercent = (colIndex / columnsCount) * 100
            const widthPercent = 100 / columnsCount

            positioned.push({
              ...act,
              top: topPercent,
              height: heightPercent,
              left: leftPercent,
              width: widthPercent,
            })
          }
        }
      }
    }

    return positioned
  }

  const positionedActivities = activePlan ? getPositionedActivities(activePlan.activities) : []

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
      {/* Sidebar - Dashboard Navigation & Verification */}
      <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">Onboarding Admin</h2>
          <nav className="flex flex-col gap-1">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'schedule'
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              Weekly Schedule
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'users'
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              Pending Users ({unverifiedUsers.length})
            </button>
          </nav>
        </div>

        {/* Render Pending Users list directly in the sidebar on large screens, OR when Users tab is active */}
        <div className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex-1 ${activeTab === 'users' ? 'block' : 'hidden lg:block'}`}>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-3">Verification Requests</h3>
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

      {/* Main Panel - Schedule Grid */}
      <div className={`flex-1 flex flex-col gap-6 ${activeTab === 'schedule' ? 'block' : 'block lg:hidden'}`}>
        
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
            <div className="relative border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto">
              <div className="min-w-[650px] select-none">
                {/* Day Header Row */}
                <div className="grid grid-cols-[80px_repeat(5,1fr)] border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/20 text-center font-semibold text-sm text-zinc-700 dark:text-zinc-300 py-3">
                  <div>Time</div>
                  {daysOfWeek.map((day) => (
                    <div key={day.val} className="border-l border-zinc-200 dark:border-zinc-800">
                      {day.label}
                    </div>
                  ))}
                </div>

                {/* Grid Gridlines Container */}
                <div className="relative grid grid-cols-[80px_repeat(5,1fr)]" style={{ height: '600px' }}>
                  {/* Hourly rows / grid lines */}
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="col-span-6 border-b border-zinc-100 dark:border-zinc-800/40 relative grid grid-cols-[80px_repeat(5,1fr)]"
                      style={{ height: `${600 / hours.length}px` }}
                    >
                      {/* Hour labels */}
                      <div className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center justify-center font-mono">
                        {hour.toString().padStart(2, '0')}:00
                      </div>
                      
                      {/* Vertical line columns */}
                      {daysOfWeek.map((day) => (
                        <div
                          key={day.val}
                          className="border-l border-zinc-100 dark:border-zinc-800/40 h-full"
                        />
                      ))}
                    </div>
                  ))}

                  {/* Absolute Placed Activity Cards (Read Only) */}
                  {positionedActivities.map((act) => {
                    const dayColIdx = daysOfWeek.findIndex((d) => d.val === act.dayOfWeek)
                    if (dayColIdx === -1) return null

                    return (
                      <div
                        key={act.id}
                        className="absolute group rounded-lg p-2 text-white shadow-sm overflow-hidden flex flex-col justify-between select-text transition-transform hover:scale-[1.01]"
                        style={{
                          top: `${act.top}%`,
                          height: `${act.height}%`,
                          left: `calc(80px + ${dayColIdx} * (100% - 80px) / ${daysOfWeek.length} + ${act.left}% * (100% - 80px) / ${daysOfWeek.length} / 100)`,
                          width: `calc(${act.width}% * (100% - 80px) / ${daysOfWeek.length} / 100 - 4px)`,
                          backgroundColor: act.activityType.color || '#3b82f6',
                          border: '1px solid rgba(255,255,255,0.15)',
                        }}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="font-bold text-xs leading-tight line-clamp-2" title={act.title}>
                              {act.title}
                            </h4>
                          </div>
                          <span className="text-[10px] opacity-90 block mt-0.5">
                            {act.startTime} - {act.endTime}
                          </span>
                        </div>

                        <div className="flex flex-col gap-0.5">
                          {act.teachers.length > 0 && (
                            <span className="text-[9px] font-semibold opacity-95 truncate" title={act.teachers.map(t => t.email).join(', ')}>
                              🧑‍🏫 {act.teachers.map(t => t.email.split('@')[0]).join(', ')}
                            </span>
                          )}
                          <div className="flex flex-wrap gap-0.5 mt-0.5">
                            {act.groups.map((g) => (
                              <span key={g} className="text-[8px] bg-white/25 px-1 py-0.2 rounded font-bold uppercase">
                                {g.replace('GROUP_', 'G')}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
