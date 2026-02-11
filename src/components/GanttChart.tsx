'use client'

import { useMemo } from 'react'
import { format, differenceInDays, addDays, startOfWeek, eachWeekOfInterval } from 'date-fns'

interface Phase {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
  status: string
  progress_percent: number
}

interface GanttChartProps {
  phases: Phase[]
  projectStart: string | null
  projectEnd: string | null
}

const STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-gray-300',
  in_progress: 'bg-blue-500',
  complete: 'bg-green-500',
  delayed: 'bg-red-500',
}

export function GanttChart({ phases, projectStart, projectEnd }: GanttChartProps) {
  const { timelineStart, timelineEnd, totalDays, weeks } = useMemo(() => {
    // Find the earliest and latest dates
    const dates = phases
      .flatMap(p => [p.start_date, p.end_date])
      .filter(Boolean) as string[]
    
    if (projectStart) dates.push(projectStart)
    if (projectEnd) dates.push(projectEnd)
    
    if (dates.length === 0) {
      const today = new Date()
      return {
        timelineStart: today,
        timelineEnd: addDays(today, 60),
        totalDays: 60,
        weeks: [],
      }
    }
    
    const sortedDates = dates.map(d => new Date(d)).sort((a, b) => a.getTime() - b.getTime())
    const start = startOfWeek(sortedDates[0], { weekStartsOn: 0 })
    const end = addDays(sortedDates[sortedDates.length - 1], 7)
    
    return {
      timelineStart: start,
      timelineEnd: end,
      totalDays: differenceInDays(end, start),
      weeks: eachWeekOfInterval({ start, end }, { weekStartsOn: 0 }),
    }
  }, [phases, projectStart, projectEnd])

  const getBarStyle = (phase: Phase) => {
    if (!phase.start_date || !phase.end_date) return null
    
    const start = new Date(phase.start_date)
    const end = new Date(phase.end_date)
    
    const leftPercent = (differenceInDays(start, timelineStart) / totalDays) * 100
    const widthPercent = ((differenceInDays(end, start) + 1) / totalDays) * 100
    
    return {
      left: `${Math.max(0, leftPercent)}%`,
      width: `${Math.min(100 - leftPercent, widthPercent)}%`,
    }
  }

  const todayPosition = useMemo(() => {
    const today = new Date()
    const daysDiff = differenceInDays(today, timelineStart)
    if (daysDiff < 0 || daysDiff > totalDays) return null
    return `${(daysDiff / totalDays) * 100}%`
  }, [timelineStart, totalDays])

  if (phases.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No phases to display. Add phases to see the Gantt chart.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header with weeks */}
      <div className="flex border-b border-gray-200">
        <div className="w-48 flex-shrink-0 px-4 py-2 bg-gray-50 border-r border-gray-200 font-medium text-sm text-gray-700">
          Phase
        </div>
        <div className="flex-1 relative">
          <div className="flex">
            {weeks.map((week, i) => (
              <div 
                key={i} 
                className="flex-1 px-2 py-2 text-xs text-gray-500 text-center border-r border-gray-100 bg-gray-50"
                style={{ minWidth: '80px' }}
              >
                {format(week, 'MMM d')}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Phases */}
      <div className="relative">
        {phases.map((phase) => {
          const barStyle = getBarStyle(phase)
          
          return (
            <div key={phase.id} className="flex border-b border-gray-100 hover:bg-gray-50">
              {/* Phase name */}
              <div className="w-48 flex-shrink-0 px-4 py-3 border-r border-gray-200">
                <div className="text-sm font-medium text-gray-900 truncate">{phase.name}</div>
                <div className="text-xs text-gray-500">
                  {phase.start_date && phase.end_date 
                    ? `${format(new Date(phase.start_date), 'MMM d')} - ${format(new Date(phase.end_date), 'MMM d')}`
                    : 'No dates set'
                  }
                </div>
              </div>
              
              {/* Timeline bar */}
              <div className="flex-1 relative py-3 px-2">
                {/* Grid lines */}
                <div className="absolute inset-0 flex">
                  {weeks.map((_, i) => (
                    <div key={i} className="flex-1 border-r border-gray-100" style={{ minWidth: '80px' }} />
                  ))}
                </div>
                
                {/* Phase bar */}
                {barStyle && (
                  <div
                    className={`absolute top-3 h-8 rounded ${STATUS_COLORS[phase.status]} shadow-sm`}
                    style={barStyle}
                  >
                    {/* Progress fill */}
                    <div 
                      className="absolute inset-0 bg-black/20 rounded-l"
                      style={{ width: `${phase.progress_percent}%` }}
                    />
                    {/* Label */}
                    <div className="absolute inset-0 flex items-center px-2">
                      <span className="text-xs font-medium text-white truncate">
                        {phase.progress_percent}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Today line */}
        {todayPosition && (
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
            style={{ left: `calc(192px + ${todayPosition})` }}
          >
            <div className="absolute -top-1 -left-2 px-1 bg-red-500 text-white text-xs rounded">
              Today
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs">
        <span className="text-gray-500">Status:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gray-300" />
          <span className="text-gray-600">Not Started</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span className="text-gray-600">In Progress</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span className="text-gray-600">Complete</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-gray-600">Delayed</span>
        </div>
      </div>
    </div>
  )
}
