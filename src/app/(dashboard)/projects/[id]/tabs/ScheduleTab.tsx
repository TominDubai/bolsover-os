'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, 
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Users
} from 'lucide-react'
import Link from 'next/link'

interface ScheduleTabProps {
  projectId: string
}

interface Schedule {
  id: string
  start_date: string | null
  end_date: string | null
}

interface Phase {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
  status: string
  progress_percent: number
  sort_order: number
}

interface Task {
  id: string
  phase_id: string
  description: string
  assigned_to: string | null
  due_date: string | null
  status: string
}

const PHASE_STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  complete: 'bg-green-100 text-green-700',
  delayed: 'bg-red-100 text-red-700',
}

const TASK_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  complete: 'bg-green-100 text-green-700',
}

export function ScheduleTab({ projectId }: ScheduleTabProps) {
  const [loading, setLoading] = useState(true)
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [phases, setPhases] = useState<Phase[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set())
  const supabase = createClient()

  useEffect(() => {
    async function fetchSchedule() {
      setLoading(true)

      const { data: scheduleData } = await supabase
        .from('schedules')
        .select('*')
        .eq('project_id', projectId)
        .single()

      if (scheduleData) {
        setSchedule(scheduleData)

        const [phasesResult, tasksResult] = await Promise.all([
          supabase
            .from('phases')
            .select('*')
            .eq('schedule_id', scheduleData.id)
            .order('sort_order'),
          supabase
            .from('tasks')
            .select('*')
            .in('phase_id', (await supabase
              .from('phases')
              .select('id')
              .eq('schedule_id', scheduleData.id)
            ).data?.map(p => p.id) || [])
            .order('sort_order')
        ])

        if (phasesResult.data) setPhases(phasesResult.data)
        if (tasksResult.data) setTasks(tasksResult.data)
      }

      setLoading(false)
    }

    fetchSchedule()
  }, [projectId, supabase])

  const formatDate = (date: string | null) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short'
    })
  }

  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev)
      if (next.has(phaseId)) {
        next.delete(phaseId)
      } else {
        next.add(phaseId)
      }
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!schedule) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Schedule Created</h3>
        <p className="text-gray-500 mb-6">Create a project schedule to track phases and tasks</p>
        <Link
          href={`/projects/${projectId}/schedule/new`}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Create Schedule
        </Link>
      </div>
    )
  }

  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.status === 'complete').length
  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Schedule Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {formatDate(schedule.start_date)} → {formatDate(schedule.end_date)}
            </span>
          </div>
        </div>
        <Link
          href={`/projects/${projectId}/schedule/edit`}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Edit Schedule
        </Link>
      </div>

      {/* Progress Overview */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Progress</span>
          <span className="text-sm font-semibold text-gray-900">{overallProgress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>{completedTasks} of {totalTasks} tasks complete</span>
          <span>{phases.length} phases</span>
        </div>
      </div>

      {/* Phases */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {phases.length > 0 ? (
          phases.map((phase) => {
            const phaseTasks = tasks.filter(t => t.phase_id === phase.id)
            const phaseCompletedTasks = phaseTasks.filter(t => t.status === 'complete').length
            const isExpanded = expandedPhases.has(phase.id)

            return (
              <div key={phase.id} className="border-b last:border-b-0">
                <button
                  onClick={() => togglePhase(phase.id)}
                  className="w-full p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="font-medium text-gray-900">{phase.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PHASE_STATUS_COLORS[phase.status]}`}>
                        {phase.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">
                        {formatDate(phase.start_date)} - {formatDate(phase.end_date)}
                      </span>
                      <div className="w-24 bg-gray-200 rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full ${
                            phase.status === 'delayed' ? 'bg-red-500' : 'bg-blue-600'
                          }`}
                          style={{ width: `${phase.progress_percent}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-10 text-right">{phase.progress_percent}%</span>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="bg-gray-50 border-t px-4 py-3">
                    {phaseTasks.length > 0 ? (
                      <div className="space-y-2">
                        {phaseTasks.map((task) => (
                          <div 
                            key={task.id}
                            className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100"
                          >
                            <div className="flex items-center gap-3">
                              {task.status === 'complete' ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : task.status === 'in_progress' ? (
                                <Clock className="h-5 w-5 text-blue-500" />
                              ) : (
                                <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                              )}
                              <span className={`text-sm ${task.status === 'complete' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                {task.description}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              {task.due_date && (
                                <span className="text-xs text-gray-500">{formatDate(task.due_date)}</span>
                              )}
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TASK_STATUS_COLORS[task.status]}`}>
                                {task.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">No tasks in this phase</p>
                    )}
                    <button className="mt-3 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                      <Plus className="h-4 w-4" />
                      Add task
                    </button>
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <div className="p-8 text-center text-gray-500">
            No phases added yet
          </div>
        )}
      </div>

      {/* Add Phase Button */}
      <button className="w-full py-3 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-gray-300 hover:text-gray-600 flex items-center justify-center gap-2">
        <Plus className="h-4 w-4" />
        Add Phase
      </button>
    </div>
  )
}
