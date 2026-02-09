'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { 
  ArrowLeft, 
  Loader2, 
  Save, 
  Plus, 
  Trash2, 
  ChevronDown,
  ChevronRight,
  Calendar,
  GripVertical
} from 'lucide-react'
import Link from 'next/link'

interface Task {
  id: string
  description: string
}

interface Phase {
  id: string
  name: string
  start_date: string
  end_date: string
  tasks: Task[]
  expanded: boolean
}

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

const COMMON_PHASES = [
  'Demolition & Strip Out',
  'MEP First Fix',
  'Joinery Installation',
  'Tiling & Finishes',
  'MEP Second Fix',
  'Painting',
  'Snagging & Handover'
]

export default function NewSchedulePage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')
  const [phases, setPhases] = useState<Phase[]>([])

  const addPhase = (name: string = '') => {
    const lastPhase = phases[phases.length - 1]
    const newStartDate = lastPhase?.end_date || startDate
    
    setPhases([
      ...phases,
      { 
        id: generateId(), 
        name, 
        start_date: newStartDate,
        end_date: '',
        tasks: [],
        expanded: true 
      }
    ])
  }

  const updatePhase = (phaseId: string, updates: Partial<Phase>) => {
    setPhases(phases.map(phase => 
      phase.id === phaseId ? { ...phase, ...updates } : phase
    ))
  }

  const togglePhase = (phaseId: string) => {
    setPhases(phases.map(phase => 
      phase.id === phaseId ? { ...phase, expanded: !phase.expanded } : phase
    ))
  }

  const removePhase = (phaseId: string) => {
    setPhases(phases.filter(phase => phase.id !== phaseId))
  }

  const addTask = (phaseId: string) => {
    setPhases(phases.map(phase => {
      if (phase.id !== phaseId) return phase
      return {
        ...phase,
        tasks: [...phase.tasks, { id: generateId(), description: '' }]
      }
    }))
  }

  const updateTask = (phaseId: string, taskId: string, description: string) => {
    setPhases(phases.map(phase => {
      if (phase.id !== phaseId) return phase
      return {
        ...phase,
        tasks: phase.tasks.map(task => 
          task.id === taskId ? { ...task, description } : task
        )
      }
    }))
  }

  const removeTask = (phaseId: string, taskId: string) => {
    setPhases(phases.map(phase => {
      if (phase.id !== phaseId) return phase
      return {
        ...phase,
        tasks: phase.tasks.filter(task => task.id !== taskId)
      }
    }))
  }

  const useTemplate = () => {
    const today = new Date()
    let currentDate = new Date(startDate)
    
    const templatePhases: Phase[] = COMMON_PHASES.map((name, index) => {
      const phaseStart = new Date(currentDate)
      currentDate.setDate(currentDate.getDate() + 7) // Default 1 week per phase
      const phaseEnd = new Date(currentDate)
      
      return {
        id: generateId(),
        name,
        start_date: phaseStart.toISOString().split('T')[0],
        end_date: phaseEnd.toISOString().split('T')[0],
        tasks: [],
        expanded: false
      }
    })

    setPhases(templatePhases)
    setEndDate(currentDate.toISOString().split('T')[0])
  }

  const handleSubmit = async () => {
    setError(null)

    if (phases.length === 0) {
      setError('Add at least one phase')
      return
    }

    if (phases.some(p => !p.name.trim())) {
      setError('All phases must have a name')
      return
    }

    setLoading(true)

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()

      // Calculate end date from phases if not set
      const calculatedEndDate = endDate || phases[phases.length - 1]?.end_date || startDate

      // Create schedule
      const { data: schedule, error: scheduleError } = await supabase
        .from('schedules')
        .insert({
          project_id: projectId,
          start_date: startDate,
          end_date: calculatedEndDate,
          created_by: user?.id,
        })
        .select()
        .single()

      if (scheduleError) throw scheduleError

      // Create phases and tasks
      for (let i = 0; i < phases.length; i++) {
        const phase = phases[i]

        const { data: createdPhase, error: phaseError } = await supabase
          .from('phases')
          .insert({
            schedule_id: schedule.id,
            name: phase.name,
            start_date: phase.start_date || null,
            end_date: phase.end_date || null,
            status: 'not_started',
            progress_percent: 0,
            sort_order: i,
          })
          .select()
          .single()

        if (phaseError) throw phaseError

        // Create tasks
        if (phase.tasks.length > 0) {
          const { error: tasksError } = await supabase
            .from('tasks')
            .insert(
              phase.tasks
                .filter(t => t.description.trim())
                .map((task, j) => ({
                  phase_id: createdPhase.id,
                  description: task.description,
                  status: 'pending',
                  sort_order: j,
                }))
            )

          if (tasksError) throw tasksError
        }
      }

      router.push(`/projects/${projectId}`)
      router.refresh()
    } catch (err) {
      console.error('Error creating schedule:', err)
      setError('Failed to create schedule')
    } finally {
      setLoading(false)
    }
  }

  const totalTasks = phases.reduce((sum, p) => sum + p.tasks.length, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="Create Schedule"
        breadcrumbs={[
          { label: 'Projects', href: '/projects' },
          { label: 'Project', href: `/projects/${projectId}` },
          { label: 'New Schedule' }
        ]}
      />

      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-600 mb-6">
              {error}
            </div>
          )}

          {/* Project Dates */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                Project Timeline
              </h3>
              <button
                onClick={useTemplate}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Use standard template
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Summary Bar */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              <span className="text-gray-600">{phases.length} phases</span>
              <span className="text-gray-600">{totalTasks} tasks</span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Schedule
                </>
              )}
            </button>
          </div>

          {/* Phases */}
          <div className="space-y-4">
            {phases.map((phase, index) => (
              <div key={phase.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Phase Header */}
                <div className="flex items-center gap-3 p-4 bg-gray-50 border-b">
                  <button
                    onClick={() => togglePhase(phase.id)}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    {phase.expanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                  <span className="text-sm text-gray-500 w-8">{index + 1}.</span>
                  <input
                    type="text"
                    value={phase.name}
                    onChange={(e) => updatePhase(phase.id, { name: e.target.value })}
                    placeholder="Phase name"
                    className="flex-1 bg-transparent border-none text-lg font-semibold text-gray-900 focus:outline-none focus:ring-0 placeholder-gray-400"
                  />
                  <input
                    type="date"
                    value={phase.start_date}
                    onChange={(e) => updatePhase(phase.id, { start_date: e.target.value })}
                    className="rounded border border-gray-200 px-2 py-1 text-sm"
                  />
                  <span className="text-gray-400">→</span>
                  <input
                    type="date"
                    value={phase.end_date}
                    onChange={(e) => updatePhase(phase.id, { end_date: e.target.value })}
                    className="rounded border border-gray-200 px-2 py-1 text-sm"
                  />
                  <button
                    onClick={() => removePhase(phase.id)}
                    className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Tasks */}
                {phase.expanded && (
                  <div className="p-4">
                    {phase.tasks.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {phase.tasks.map((task, taskIndex) => (
                          <div key={task.id} className="flex items-center gap-3">
                            <span className="text-sm text-gray-400 w-6">{taskIndex + 1}.</span>
                            <input
                              type="text"
                              value={task.description}
                              onChange={(e) => updateTask(phase.id, task.id, e.target.value)}
                              placeholder="Task description"
                              className="flex-1 rounded border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            />
                            <button
                              onClick={() => removeTask(phase.id, task.id)}
                              className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => addTask(phase.id)}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Plus className="h-4 w-4" />
                      Add task
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Add Phase */}
            <div className="flex gap-2">
              <button
                onClick={() => addPhase()}
                className="flex-1 py-4 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-gray-300 hover:text-gray-600 flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Phase
              </button>
            </div>

            {/* Quick Add Common Phases */}
            {phases.length === 0 && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500 mb-3">Quick add common phases:</p>
                <div className="flex flex-wrap gap-2">
                  {COMMON_PHASES.map(phaseName => (
                    <button
                      key={phaseName}
                      onClick={() => addPhase(phaseName)}
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                    >
                      {phaseName}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between mt-8">
            <Link
              href={`/projects/${projectId}`}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
