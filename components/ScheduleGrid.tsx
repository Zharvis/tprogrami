'use client'

import React from 'react'
import { Group } from '@/app/generated/prisma'

export interface GridActivity {
  id: string
  title: string
  dayOfWeek: number
  startTime: string
  endTime: string
  top: number
  height: number
  left: number
  width: number
  activityType: {
    color: string
    name: string
  }
  groups: Group[]
  teachers: {
    id: string
    email: string
  }[]
}

interface ScheduleGridProps {
  activities: GridActivity[]
  daysOfWeek: { label: string; val: number }[]
  hours: number[]
  height?: number
  minWidth?: number
  renderActivityCard?: (activity: GridActivity) => React.ReactNode
}

export function ScheduleGrid({
  activities,
  daysOfWeek,
  hours,
  height = 600,
  minWidth = 800,
  renderActivityCard,
}: ScheduleGridProps) {
  const timeColumnWidth = 100

  return (
    <div className="relative border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto">
      <div className="select-none" style={{ minWidth: `${minWidth}px` }}>
        {/* Day Header Row */}
        <div 
          className="grid border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/20 text-center font-semibold text-sm text-zinc-700 dark:text-zinc-300 py-3"
          style={{ gridTemplateColumns: `${timeColumnWidth}px repeat(${daysOfWeek.length}, 1fr)` }}
        >
          <div>Time</div>
          {daysOfWeek.map((day) => (
            <div key={day.val} className="border-l border-zinc-200 dark:border-zinc-800">
              {day.label}
            </div>
          ))}
        </div>

        {/* Grid Gridlines Container */}
        <div 
          className="relative grid" 
          style={{ 
            height: `${height}px`,
            gridTemplateColumns: `${timeColumnWidth}px repeat(${daysOfWeek.length}, 1fr)`
          }}
        >
          {/* Hourly rows / grid lines */}
          {hours.map((hour) => (
            <div
              key={hour}
              className="col-span-full border-b border-zinc-100 dark:border-zinc-800/40 relative grid"
              style={{ 
                height: `${height / hours.length}px`,
                gridTemplateColumns: `${timeColumnWidth}px repeat(${daysOfWeek.length}, 1fr)`
              }}
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

          {/* Absolute Placed Activity Cards */}
          {activities.map((act) => {
            const dayColIdx = daysOfWeek.findIndex((d) => d.val === act.dayOfWeek)
            if (dayColIdx === -1) return null

            const leftCalc = `calc(${timeColumnWidth}px + ${dayColIdx} * (100% - ${timeColumnWidth}px) / ${daysOfWeek.length} + ${act.left} * (100% - ${timeColumnWidth}px) / ${daysOfWeek.length} / 100)`
            const widthCalc = `calc(${act.width} * (100% - ${timeColumnWidth}px) / ${daysOfWeek.length} / 100 - 4px)`

            return (
              <div
                key={act.id}
                className="absolute group rounded-lg p-2 text-white shadow-sm overflow-hidden flex flex-col justify-between select-text transition-transform hover:scale-[1.01]"
                style={{
                  top: `${act.top}%`,
                  height: `${act.height}%`,
                  left: leftCalc,
                  width: widthCalc,
                  backgroundColor: act.activityType.color || '#3b82f6',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                {renderActivityCard ? (
                  renderActivityCard(act)
                ) : (
                  <>
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
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
