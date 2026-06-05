'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { Role, Group } from '@/app/generated/prisma'
import { upsertOverride, deleteOverride } from '../admin/actions'

interface User {
  id: string
  email: string
  role: Role | null
  group: Group | null
}

interface ActivityType {
  id: string
  name: string
  color: string
}

interface ActivityInstance {
  id: string
  title: string
  date: string
  startTime: string
  endTime: string
  activityType: {
    id: string;
    name: string;
    color: string;
  }
  groups: string[]
  teachers: {
    id: string
    email: string
  }[]
  isOverride?: boolean
  overrideId?: string
  isOneOff?: boolean
}

interface ScheduleClientProps {
  user: User
  activities: ActivityInstance[]
  weekDays: string[]
  groupedActivities: { [dateStr: string]: ActivityInstance[] }
  happening: ActivityInstance | undefined
  next: ActivityInstance | undefined
  prevWeekStr: string
  nextWeekStr: string
  todayStr: string
  isNextWeekBeyond: boolean
  activityTypes: ActivityType[]
  teachers: User[]
}

export default function ScheduleClient({
  user,
  weekDays,
  groupedActivities,
  happening,
  next,
  prevWeekStr,
  nextWeekStr,
  todayStr,
  isNextWeekBeyond,
  activityTypes,
  teachers,
}: ScheduleClientProps) {
  const [isPending, startTransition] = useTransition()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedActivity, setSelectedActivity] = useState<ActivityInstance | null>(null)
  const [showMyActivitiesOnly, setShowMyActivitiesOnly] = useState(true)
  const [viewMode, setViewMode] = useState<'agenda' | 'grid'>('agenda')

  // Form states
  const [formTitle, setFormTitle] = useState('')
  const [formStartTime, setFormStartTime] = useState('09:00')
  const [formEndTime, setFormEndTime] = useState('10:30')
  const [formActivityTypeId, setFormActivityTypeId] = useState(activityTypes[0]?.id || '')
  const [formGroups, setFormGroups] = useState<Group[]>([])
  const [formTeacherIds, setFormTeacherIds] = useState<string[]>([])

  const isAdmin = user.role === 'ADMIN'

  // Pre-filter activities for Teachers based on the toggle
  const processedActivities = useMemo(() => {
    const result: { [key: string]: ActivityInstance[] } = {}
    weekDays.forEach(dateStr => {
      let acts = groupedActivities[dateStr] || []
      if (user.role === 'TEACHER' && showMyActivitiesOnly) {
        acts = acts.filter(act => act.teachers.some(t => t.id === user.id))
      }
      result[dateStr] = acts
    })
    return result
  }, [groupedActivities, weekDays, user.role, user.id, showMyActivitiesOnly])

  const openAddModal = (dateStr: string) => {
    setModalMode('add')
    setSelectedDate(dateStr)
    setSelectedActivity(null)
    setFormTitle('')
    setFormStartTime('09:00')
    setFormEndTime('10:30')
    setFormActivityTypeId(activityTypes[0]?.id || '')
    setFormGroups([])
    setFormTeacherIds([])
    setIsModalOpen(true)
  }

  const openEditModal = (act: ActivityInstance) => {
    setModalMode('edit')
    setSelectedDate(act.date)
    setSelectedActivity(act)
    setFormTitle(act.title)
    setFormStartTime(act.startTime)
    setFormEndTime(act.endTime)
    setFormActivityTypeId(act.activityType.id)
    setFormGroups(act.groups.map(g => g as Group))
    setFormTeacherIds(act.teachers.map(t => t.id))
    setIsModalOpen(true)
  }

  const handleCancelActivity = (act: ActivityInstance) => {
    if (!confirm(`Are you sure you want to cancel "${act.title}" for ${act.date}?`)) return

    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.append('date', act.date)
        formData.append('isCancelled', 'true')
        
        // Extract original activity id
        const originalActId = act.id.slice(0, -11)
        formData.append('activityId', originalActId)

        await upsertOverride(formData)
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to cancel activity')
      }
    })
  }

  const handleResetActivity = (act: ActivityInstance) => {
    if (!act.overrideId) return
    const message = act.isOneOff 
      ? `Are you sure you want to delete this one-off activity?`
      : `Are you sure you want to reset "${act.title}" back to baseline schedule?`
    
    if (!confirm(message)) return

    startTransition(async () => {
      try {
        await deleteOverride(act.overrideId!)
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to reset activity')
      }
    })
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) {
      alert('Title is required')
      return
    }

    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.append('date', selectedDate)
        formData.append('isCancelled', 'false')
        formData.append('title', formTitle.trim())
        formData.append('startTime', formStartTime)
        formData.append('endTime', formEndTime)
        formData.append('activityTypeId', formActivityTypeId)
        
        formGroups.forEach(grp => formData.append('groups', grp))
        formTeacherIds.forEach(tId => formData.append('teacherIds', tId))

        if (modalMode === 'edit' && selectedActivity) {
          if (selectedActivity.overrideId) {
            // Already an override, update it
            formData.append('id', selectedActivity.overrideId)
          }
          if (!selectedActivity.isOneOff) {
            // Overriding a baseline activity
            formData.append('activityId', selectedActivity.id.slice(0, -11))
          }
        }

        await upsertOverride(formData)
        setIsModalOpen(false)
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to save override')
      }
    })
  }

  const toggleGroup = (grp: Group) => {
    if (formGroups.includes(grp)) {
      setFormGroups(formGroups.filter(g => g !== grp))
    } else {
      setFormGroups([...formGroups, grp])
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
            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 mr-2">
              <button
                onClick={() => setViewMode('agenda')}
                className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors cursor-pointer ${viewMode === 'agenda' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
              >
                Agenda
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
              >
                Grid
              </button>
            </div>

            {user.role === 'TEACHER' && (
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mr-2 cursor-pointer hidden sm:flex">
                <input
                  type="checkbox"
                  checked={showMyActivitiesOnly}
                  onChange={(e) => setShowMyActivitiesOnly(e.target.checked)}
                  className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                />
                My Activities Only
              </label>
            )}
            <Link
              href={`/schedule?date=${prevWeekStr}`}
              className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-sm font-medium text-zinc-850 dark:text-zinc-200"
            >
              ← Prev Week
            </Link>
            <Link
              href="/schedule"
              className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-sm font-semibold text-zinc-850 dark:text-zinc-200"
            >
              Today
            </Link>
            {!isNextWeekBeyond ? (
              <Link
                href={`/schedule?date=${nextWeekStr}`}
                className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-sm font-medium text-zinc-850 dark:text-zinc-200"
              >
                Next Week →
              </Link>
            ) : (
              <button
                disabled
                className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg opacity-40 cursor-not-allowed text-sm font-medium text-zinc-450 dark:text-zinc-600"
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

        {viewMode === 'agenda' ? (
          /* Agenda View */
          <div data-testid="agenda-view" className="flex flex-col gap-4 mt-2">
            {weekDays.map((dateStr) => {
              const dateObj = new Date(dateStr)
              const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
              const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
              const dayActivities = processedActivities[dateStr] || []

              const isToday = dateStr === todayStr

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
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 transition-colors gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-1.5 h-10 rounded-full shrink-0"
                              style={{ backgroundColor: act.activityType.color }}
                            />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm">
                                  {act.title}
                                </h4>
                                {act.isOverride && (
                                  <span className="text-[9px] bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider">
                                    Override
                                  </span>
                                )}
                                {act.isOneOff && (
                                  <span className="text-[9px] bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider">
                                    One-off
                                  </span>
                                )}
                              </div>
                              <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-0.5">
                                {act.startTime} - {act.endTime} • {act.activityType.name}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-3 self-end sm:self-center">
                            {act.teachers.length > 0 && (
                              <div className="text-[11px] text-zinc-400 dark:text-zinc-500 bg-zinc-100/50 dark:bg-zinc-800/50 px-2 py-1 rounded">
                                {act.teachers.map(t => t.email.split('@')[0]).join(', ')}
                              </div>
                            )}

                            {isAdmin && (
                              <div className="flex items-center gap-1.5 border-l border-zinc-200 dark:border-zinc-800 pl-3">
                                <button
                                  onClick={() => openEditModal(act)}
                                  disabled={isPending}
                                  className="text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-2 py-1 rounded transition-colors cursor-pointer"
                                >
                                  Edit
                                </button>

                                {act.overrideId ? (
                                  <button
                                    onClick={() => handleResetActivity(act)}
                                    disabled={isPending}
                                    className="text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 px-2 py-1 rounded transition-colors cursor-pointer"
                                    title={act.isOneOff ? "Delete One-off" : "Reset to Baseline"}
                                  >
                                    {act.isOneOff ? "Delete" : "Reset"}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleCancelActivity(act)}
                                    disabled={isPending}
                                    className="text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 px-2 py-1 rounded transition-colors cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-400 dark:text-zinc-650 italic py-2">
                      No activities scheduled.
                    </p>
                  )}

                  {isAdmin && (
                    <button
                      onClick={() => openAddModal(dateStr)}
                      className="mt-3 w-full py-1.5 border border-dashed border-zinc-300 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                    >
                      + Add One-off Activity
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          /* Grid View */
          <div data-testid="grid-view" className="mt-2 overflow-x-auto pb-4">
            <div className="min-w-[900px] grid grid-cols-7 gap-3">
              {weekDays.map((dateStr) => {
                const dateObj = new Date(dateStr)
                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
                const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
                const isToday = dateStr === todayStr
                const dayActivities = processedActivities[dateStr] || []

                return (
                  <div key={dateStr} className={`flex flex-col border rounded-xl p-3 ${isToday ? 'bg-blue-50/20 dark:bg-blue-900/10 border-blue-300 dark:border-blue-800 shadow-sm' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'}`}>
                    <div className={`text-center pb-2 mb-3 border-b ${isToday ? 'border-blue-200 dark:border-blue-900/50' : 'border-zinc-100 dark:border-zinc-800'}`}>
                      <h3 className={`font-bold text-sm ${isToday ? 'text-blue-700 dark:text-blue-400' : 'text-zinc-800 dark:text-zinc-200'}`}>
                        {dayName}
                      </h3>
                      <div className={`text-xs mt-0.5 ${isToday ? 'text-blue-600 dark:text-blue-500 font-medium' : 'text-zinc-500 dark:text-zinc-500'}`}>
                        {formattedDate}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 flex-1">
                      {dayActivities.length > 0 ? (
                        dayActivities.map(act => (
                          <div 
                            key={act.id} 
                            className="p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 text-xs flex flex-col gap-1.5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-xs"
                          >
                            <div className="flex items-start gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: act.activityType.color }} />
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">{act.title}</span>
                            </div>
                            <div className="text-zinc-500 dark:text-zinc-400 font-medium ml-3">
                              {act.startTime} - {act.endTime}
                            </div>
                            {act.teachers.length > 0 && (
                              <div className="text-[10px] text-zinc-400 dark:text-zinc-500 ml-3 mt-0.5">
                                {act.teachers.map(t => t.email.split('@')[0]).join(', ')}
                              </div>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => openEditModal(act)}
                                disabled={isPending}
                                className="mt-1 ml-3 text-[10px] font-medium text-blue-600 dark:text-blue-400 self-start hover:underline cursor-pointer"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-xs text-zinc-400 dark:text-zinc-600 italic py-4">
                          No activities
                        </div>
                      )}
                      
                      {isAdmin && (
                        <button
                          onClick={() => openAddModal(dateStr)}
                          className="mt-auto pt-2 text-[10px] font-semibold text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors cursor-pointer text-center w-full"
                        >
                          + Add
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Admin Override upsert Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div role="dialog" className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-4">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {modalMode === 'add' ? 'Add One-off Activity' : 'Edit Override'} ({selectedDate})
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-250 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Guest Speaker Session..."
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Activity Type
                  </label>
                  <select
                    value={formActivityTypeId}
                    onChange={(e) => setFormActivityTypeId(e.target.value)}
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

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      required
                      className="w-full px-2 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 text-sm rounded-lg focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      required
                      className="w-full px-2 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 text-sm rounded-lg focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Target Groups
                </label>
                <div className="flex flex-wrap gap-3">
                  {Object.values(Group).map((grp) => {
                    const isChecked = formGroups.includes(grp)
                    return (
                      <label 
                        key={grp} 
                        className="inline-flex items-center gap-1.5 text-zinc-855 dark:text-zinc-200 text-sm font-medium cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          value={grp}
                          checked={isChecked}
                          onChange={() => toggleGroup(grp)}
                          className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                        <span>{grp.replace('GROUP_', 'Group ')}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Assigned Teachers
                </label>
                {teachers.length === 0 ? (
                  <p className="text-xs text-zinc-500">No verified teachers available.</p>
                ) : (
                  <select
                    multiple
                    value={formTeacherIds}
                    onChange={(e) => {
                      const options = e.target.options
                      const values: string[] = []
                      for (let i = 0; i < options.length; i++) {
                        if (options[i].selected) {
                          values.push(options[i].value)
                        }
                      }
                      setFormTeacherIds(values)
                    }}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 text-sm rounded-lg focus:outline-none min-h-[80px]"
                  >
                    {teachers.map((teach) => (
                      <option key={teach.id} value={teach.id}>
                        {teach.email}
                      </option>
                    ))}
                  </select>
                )}
                <span className="text-[10px] text-zinc-550 block mt-1">Hold Ctrl (Cmd) to select multiple teachers.</span>
              </div>

              <div className="flex justify-end gap-3 mt-4 border-t border-zinc-200 dark:border-zinc-800 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-semibold rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isPending ? 'Saving...' : 'Save Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
