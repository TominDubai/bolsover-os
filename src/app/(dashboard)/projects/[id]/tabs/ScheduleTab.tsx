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
  Users,
  Bell,
  X,
  List,
  BarChart3
} from 'lucide-react'
import Link from 'next/link'
import { GanttChart } from '@/components/GanttChart'

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
  const [newTaskText, setNewTaskText] = useState<Record<string, string>>({})
  const [addingTask, setAddingTask] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'gantt'>('list')
  
  // Delay Notice Modal State
  const [showDelayModal, setShowDelayModal] = useState(false)
  const [delayPhaseId, setDelayPhaseId] = useState<string | null>(null)
  const [delayReason, setDelayReason] = useState('')
  const [delayDays, setDelayDays] = useState('')
  const [delayNewDate, setDelayNewDate] = useState('')
  const [sendingDelay, setSendingDelay] = useState(false)
  
  const supabase = createClient()
  
  // Open delay modal for a specific phase
  const openDelayModal = (phaseId?: string) => {
    setDelayPhaseId(phaseId || null)
    setDelayReason('')
    setDelayDays('')
    setDelayNewDate('')
    setShowDelayModal(true)
  }
  
  // Send delay notice
  const sendDelayNotice = async () => {
    if (!delayReason.trim()) return
    
    setSendingDelay(true)
    
    const { data: user } = await supabase.auth.getUser()
    
    const { error } = await supabase.from('delay_notices').insert({
      project_id: projectId,
      phase_id: delayPhaseId,
      reason: delayReason.trim(),
      days_delayed: delayDays ? parseInt(delayDays) : null,
      new_date: delayNewDate || null,
      created_by: user.user?.id,
    })
    
    if (!error) {
      // Mark phase as delayed if a phase was selected
      if (delayPhaseId) {
        await supabase
          .from('phases')
          .update({ status: 'delayed' })
          .eq('id', delayPhaseId)
        
        setPhases(phases.map(p => p.id === delayPhaseId ? { ...p, status: 'delayed' } : p))
      }
      
      setShowDelayModal(false)
      alert('Delay notice sent to site staff!')
    } else {
      alert('Failed to send delay notice')
    }
    
    setSendingDelay(false)
  }

  // Toggle task status: pending → in_progress → complete → pending
  const cycleTaskStatus = async (task: Task) => {
    const statusOrder = ['pending', 'in_progress', 'complete']
    const currentIndex = statusOrder.indexOf(task.status)
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length]

    const { error } = await supabase
      .from('tasks')
      .update({ status: nextStatus })
      .eq('id', task.id)

    if (!error) {
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: nextStatus } : t))
      
      // Update phase progress
      const phaseTasks = tasks.map(t => t.id === task.id ? { ...t, status: nextStatus } : t)
        .filter(t => t.phase_id === task.phase_id)
      const completed = phaseTasks.filter(t => t.status === 'complete').length
      const progress = phaseTasks.length > 0 ? Math.round((completed / phaseTasks.length) * 100) : 0
      
      await supabase
        .from('phases')
        .update({ progress_percent: progress })
        .eq('id', task.phase_id)
      
      setPhases(phases.map(p => p.id === task.phase_id ? { ...p, progress_percent: progress } : p))
    }
  }

  // Add new task to a phase
  const addTask = async (phaseId: string) => {
    const text = newTaskText[phaseId]?.trim()
    if (!text) return

    setAddingTask(phaseId)
    
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        phase_id: phaseId,
        description: text,
        status: 'pending',
        sort_order: tasks.filter(t => t.phase_id === phaseId).length,
      })
      .select()
      .single()

    if (!error && data) {
      setTasks([...tasks, data])
      setNewTaskText({ ...newTaskText, [phaseId]: '' })
    }
    
    setAddingTask(null)
  }

  // Add new phase
  const [newPhaseName, setNewPhaseName] = useState('')
  const [addingPhase, setAddingPhase] = useState(false)

  const addPhase = async () => {
    if (!newPhaseName.trim() || !schedule) return

    setAddingPhase(true)
    
    const { data, error } = await supabase
      .from('phases')
      .insert({
        schedule_id: schedule.id,
        name: newPhaseName.trim(),
        status: 'not_started',
        progress_percent: 0,
        sort_order: phases.length,
      })
      .select()
      .single()

    if (!error && data) {
      setPhases([...phases, data])
      setNewPhaseName('')
      setExpandedPhases(new Set([...expandedPhases, data.id]))
    }
    
    setAddingPhase(false)
  }

  // Update phase dates
  const updatePhaseDate = async (phaseId: string, field: 'start_date' | 'end_date', value: string) => {
    const { error } = await supabase
      .from('phases')
      .update({ [field]: value || null })
      .eq('id', phaseId)

    if (!error) {
      setPhases(phases.map(p => p.id === phaseId ? { ...p, [field]: value || null } : p))
    }
  }

  // Update phase status
  const cyclePhaseStatus = async (phase: Phase) => {
    const statusOrder = ['not_started', 'in_progress', 'complete', 'delayed']
    const currentIndex = statusOrder.indexOf(phase.status)
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length]

    const { error } = await supabase
      .from('phases')
      .update({ status: nextStatus })
      .eq('id', phase.id)

    if (!error) {
      setPhases(phases.map(p => p.id === phase.id ? { ...p, status: nextStatus } : p))
    }
  }

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
        <div className="flex items-center justify-center gap-3">
          <Link
            href={`/projects/${projectId}/schedule/new`}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create Schedule
          </Link>
          <Link
            href={`/projects/${projectId}/schedule/import`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Calendar className="h-4 w-4" />
            Import from Primavera
          </Link>
        </div>
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
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {formatDate(schedule.start_date)} → {formatDate(schedule.end_date)}
          </span>
          {/* View Toggle */}
          <div className="flex items-center rounded-lg border border-gray-200 p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'list' 
                  ? 'bg-gray-900 text-white' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="h-4 w-4" />
              List
            </button>
            <button
              onClick={() => setViewMode('gantt')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'gantt' 
                  ? 'bg-gray-900 text-white' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Gantt
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openDelayModal()}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600"
          >
            <Bell className="h-4 w-4" />
            Send Delay Notice
          </button>
          <Link
            href={`/projects/${projectId}/schedule/import`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Import
          </Link>
          <Link
            href={`/projects/${projectId}/schedule/edit`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Edit Schedule
          </Link>
        </div>
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

      {/* Gantt Chart View */}
      {viewMode === 'gantt' && (
        <GanttChart 
          phases={phases} 
          projectStart={schedule.start_date} 
          projectEnd={schedule.end_date} 
        />
      )}

      {/* List View - Phases */}
      {viewMode === 'list' && (
      <>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {phases.length > 0 ? (
          phases.map((phase) => {
            const phaseTasks = tasks.filter(t => t.phase_id === phase.id)
            const phaseCompletedTasks = phaseTasks.filter(t => t.status === 'complete').length
            const isExpanded = expandedPhases.has(phase.id)

            return (
              <div key={phase.id} className="border-b last:border-b-0">
                <div className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button onClick={() => togglePhase(phase.id)}>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                      <span className="font-medium text-gray-900">{phase.name}</span>
                      <button
                        onClick={() => cyclePhaseStatus(phase)}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${PHASE_STATUS_COLORS[phase.status]} hover:opacity-80`}
                        title="Click to change status"
                      >
                        {phase.status.replace('_', ' ')}
                      </button>
                      {phase.status === 'delayed' && (
                        <button
                          onClick={() => openDelayModal(phase.id)}
                          className="text-amber-500 hover:text-amber-600"
                          title="Send delay notice"
                        >
                          <Bell className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="date"
                        value={phase.start_date || ''}
                        onChange={(e) => updatePhaseDate(phase.id, 'start_date', e.target.value)}
                        className="rounded border border-gray-200 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                      />
                      <span className="text-gray-400">→</span>
                      <input
                        type="date"
                        value={phase.end_date || ''}
                        onChange={(e) => updatePhaseDate(phase.id, 'end_date', e.target.value)}
                        className="rounded border border-gray-200 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                      />
                      <div className="w-20 bg-gray-200 rounded-full h-1.5">
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
                </div>

                {isExpanded && (
                  <div className="bg-gray-50 border-t px-4 py-3">
                    {phaseTasks.length > 0 ? (
                      <div className="space-y-2">
                        {phaseTasks.map((task) => (
                          <div 
                            key={task.id}
                            onClick={() => cycleTaskStatus(task)}
                            className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 cursor-pointer hover:border-gray-300 transition-colors"
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
                                {task.status.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">No tasks in this phase</p>
                    )}
                    
                    {/* Add Task Input */}
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="text"
                        value={newTaskText[phase.id] || ''}
                        onChange={(e) => setNewTaskText({ ...newTaskText, [phase.id]: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && addTask(phase.id)}
                        placeholder="Add a task..."
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      />
                      <button 
                        onClick={() => addTask(phase.id)}
                        disabled={addingTask === phase.id || !newTaskText[phase.id]?.trim()}
                        className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {addingTask === phase.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        Add
                      </button>
                    </div>
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

      {/* Add Phase */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newPhaseName}
          onChange={(e) => setNewPhaseName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addPhase()}
          placeholder="New phase name..."
          className="flex-1 rounded-lg border-2 border-dashed border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button 
          onClick={addPhase}
          disabled={addingPhase || !newPhaseName.trim()}
          className="inline-flex items-center gap-2 px-4 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {addingPhase ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add Phase
        </button>
      </div>
      </>
      )}

      {/* Delay Notice Modal */}
      {showDelayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Send Delay Notice</h3>
              <button 
                onClick={() => setShowDelayModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">
                This will notify all site staff about a schedule delay.
              </p>
              
              {/* Phase Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Affected Phase (optional)
                </label>
                <select
                  value={delayPhaseId || ''}
                  onChange={(e) => setDelayPhaseId(e.target.value || null)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">General / All Phases</option>
                  {phases.map(phase => (
                    <option key={phase.id} value={phase.id}>{phase.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Delay *
                </label>
                <textarea
                  value={delayReason}
                  onChange={(e) => setDelayReason(e.target.value)}
                  placeholder="e.g. Material delivery delayed, waiting for approval..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
              
              {/* Days Delayed */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Days Delayed
                  </label>
                  <input
                    type="number"
                    value={delayDays}
                    onChange={(e) => setDelayDays(e.target.value)}
                    placeholder="e.g. 3"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Target Date
                  </label>
                  <input
                    type="date"
                    value={delayNewDate}
                    onChange={(e) => setDelayNewDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowDelayModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={sendDelayNotice}
                disabled={sendingDelay || !delayReason.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingDelay ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
                Send Notice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
