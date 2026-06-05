'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Role, Group } from '@/app/generated/prisma'
import {
  createActivity,
  deleteActivity,
  duplicateWeeklyPlan,
  deleteWeeklyPlan,
  renameWeeklyPlan,
  setActiveWeeklyPlan,
} from '../../actions'
import { layoutActivities } from '@/lib/layout'

interface User {
  id: string
  email: string
  status: string
  role: Role | null
  group: Group | null
  createdAt: Date
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

interface WeeklyPlan {
  id: string
  name: string
  isActive: boolean
  activities: Activity[]
}

interface WeeklyPlanEditorClientProps {
  plan: WeeklyPlan
  activityTypes: ActivityType[]
  teachers: User[]
}

export default function WeeklyPlanEditorClient({
  plan,
  activityTypes,
  teachers,
}: WeeklyPlanEditorClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(plan.name)

  // Calendar Grid time settings
  const hours = Array.from({ length: 11 }, (_, i) => i + 8) // 8:00 AM to 6:00 PM

  const daysOfWeek = [
    { label: 'Monday', val: 1 },
    { label: 'Tuesday', val: 2 },
    { label: 'Wednesday', val: 3 },
    { label: 'Thursday', val: 4 },
    { label: 'Friday', val: 5 },
  ]

  const positionedActivities = layoutActivities(plan.activities)

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!renameValue.trim()) return
    startTransition(async () => {
      try {
        await renameWeeklyPlan(plan.id, renameValue)
        setIsRenaming(false)
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to rename plan')
      }
    })
  }

  const handleDuplicate = () => {
    startTransition(async () => {
      try {
        const newId = await duplicateWeeklyPlan(plan.id)
        router.push(`/admin/weekly-plans/${newId}`)
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to duplicate plan')
      }
    })
  }

  const handleDeletePlan = () => {
    if (confirm(`Are you sure you want to delete "${plan.name}" and all of its activities? This cannot be undone.`)) {
      startTransition(async () => {
        try {
          await deleteWeeklyPlan(plan.id)
          router.push('/admin')
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Failed to delete plan')
        }
      })
    }
  }

  const handleSetActive = () => {
    startTransition(async () => {
      try {
        await setActiveWeeklyPlan(plan.id)
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to set active plan')
      }
    })
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col gap-6">
      {/* Top Navigation Row */}
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Admin Dashboard
        </Link>
      </div>

      {/* Header Info and Actions */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            {isRenaming ? (
              <form onSubmit={handleRenameSubmit} className="flex items-center gap-2 w-full max-w-md">
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 text-lg font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRenameValue(plan.name)
                    setIsRenaming(false)
                  }}
                  className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 truncate max-w-lg">
                  {plan.name}
                </h1>
                <button
                  onClick={() => setIsRenaming(true)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Rename Plan"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
            )}
            
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                plan.isActive
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400'
              }`}
            >
              {plan.isActive ? 'Active' : 'Draft'}
            </span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Editing the standard weekly plan template. Changes roll forward to upcoming weeks automatically.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {!plan.isActive && (
            <button
              onClick={handleSetActive}
              disabled={isPending}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              Mark Active
            </button>
          )}

          <button
            onClick={handleDuplicate}
            disabled={isPending}
            className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 text-zinc-800 dark:text-zinc-200 text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            Duplicate Plan
          </button>

          <button
            onClick={handleDeletePlan}
            disabled={isPending}
            className="px-4 py-2 border border-red-200 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            Delete Plan
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            Add Activity
          </button>
        </div>
      </div>

      {/* Full Width Calendar Grid Container */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
        <div className="relative border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto">
          <div className="min-w-[800px] select-none">
            {/* Day Header Row */}
            <div className="grid grid-cols-[100px_repeat(5,1fr)] border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/20 text-center font-semibold text-sm text-zinc-700 dark:text-zinc-300 py-3">
              <div>Time</div>
              {daysOfWeek.map((day) => (
                <div key={day.val} className="border-l border-zinc-200 dark:border-zinc-800">
                  {day.label}
                </div>
              ))}
            </div>

            {/* Grid Container */}
            <div className="relative grid grid-cols-[100px_repeat(5,1fr)]" style={{ height: '700px' }}>
              {/* Hourly Rows */}
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="col-span-6 border-b border-zinc-100 dark:border-zinc-800/40 relative grid grid-cols-[100px_repeat(5,1fr)]"
                  style={{ height: `${700 / hours.length}px` }}
                >
                  {/* Hour labels */}
                  <div className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center justify-center font-mono">
                    {hour.toString().padStart(2, '0')}:00
                  </div>

                  {/* Vertical columns */}
                  {daysOfWeek.map((day) => (
                    <div
                      key={day.val}
                      className="border-l border-zinc-100 dark:border-zinc-800/40 h-full"
                    />
                  ))}
                </div>
              ))}

              {/* Absolute Positioned Activity Cards */}
              {positionedActivities.map((act) => {
                const dayColIdx = daysOfWeek.findIndex((d) => d.val === act.dayOfWeek)
                if (dayColIdx === -1) return null

                return (
                  <div
                    key={act.id}
                    className="absolute group rounded-lg p-2.5 text-white shadow-sm overflow-hidden flex flex-col justify-between select-text transition-transform hover:scale-[1.01]"
                    style={{
                      top: `${act.top}%`,
                      height: `${act.height}%`,
                      left: `calc(100px + ${dayColIdx} * (100% - 100px) / ${daysOfWeek.length} + ${act.left} * (100% - 100px) / ${daysOfWeek.length} / 100)`,
                      width: `calc(${act.width}% * (100% - 100px) / ${daysOfWeek.length} / 100 - 4px)`,
                      backgroundColor: act.activityType.color || '#3b82f6',
                      border: '1px solid rgba(255,255,255,0.15)',
                    }}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="font-bold text-xs leading-tight line-clamp-2" title={act.title}>
                          {act.title}
                        </h4>
                        <form
                          action={async () => {
                            if (confirm(`Are you sure you want to delete "${act.title}"?`)) {
                              await deleteActivity(act.id)
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <button
                            type="submit"
                            className="text-white hover:text-red-200 cursor-pointer p-0.5 rounded hover:bg-white/10"
                            title="Delete"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </form>
                      </div>
                      <span className="text-[10px] opacity-90 block mt-0.5">
                        {act.startTime} - {act.endTime}
                      </span>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      {act.teachers.length > 0 && (
                        <span
                          className="text-[9px] font-semibold opacity-95 truncate"
                          title={act.teachers.map((t) => t.email).join(', ')}
                        >
                          🧑‍🏫 {act.teachers.map((t) => t.email.split('@')[0]).join(', ')}
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
      </div>

      {/* Add Activity Modal Form */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">Create New Activity</h2>

            <form
              action={async (formData) => {
                await createActivity(plan.id, formData)
                setIsAddModalOpen(false)
              }}
              className="flex flex-col gap-4"
            >
              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Title</label>
                <input
                  type="text"
                  name="title"
                  placeholder="e.g. Mathematics Intro"
                  required
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Day of Week</label>
                  <select
                    name="dayOfWeek"
                    required
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 text-sm rounded-lg focus:outline-none"
                  >
                    <option value="1">Monday</option>
                    <option value="2">Tuesday</option>
                    <option value="3">Wednesday</option>
                    <option value="4">Thursday</option>
                    <option value="5">Friday</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Activity Type</label>
                  <select
                    name="activityTypeId"
                    required
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 text-sm rounded-lg focus:outline-none"
                  >
                    {activityTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Start Time</label>
                  <input
                    type="time"
                    name="startTime"
                    required
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 text-sm rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">End Time</label>
                  <input
                    type="time"
                    name="endTime"
                    required
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 text-sm rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              {/* Target Groups checkboxes */}
              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Target Groups</label>
                <div className="flex flex-wrap gap-3">
                  {Object.values(Group).map((grp) => (
                    <label key={grp} className="inline-flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200 text-sm font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        name="groups"
                        value={grp}
                        className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <span>{grp.replace('GROUP_', 'Group ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Teachers selection list */}
              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Assigned Teachers</label>
                {teachers.length === 0 ? (
                  <p className="text-xs text-zinc-500">No verified teachers available.</p>
                ) : (
                  <select
                    name="teacherIds"
                    multiple
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 text-sm rounded-lg focus:outline-none min-h-[80px]"
                  >
                    {teachers.map((teach) => (
                      <option key={teach.id} value={teach.id}>
                        {teach.email}
                      </option>
                    ))}
                  </select>
                )}
                <span className="text-[10px] text-zinc-500 block mt-1">Hold Ctrl (Cmd) to select multiple teachers.</span>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-semibold rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer animate-fade-in"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Create Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
