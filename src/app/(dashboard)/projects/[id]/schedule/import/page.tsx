'use client'

import { useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { 
  ArrowLeft, 
  Loader2, 
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Calendar,
  Save
} from 'lucide-react'
import Link from 'next/link'
import * as XLSX from 'xlsx'

interface ImportedTask {
  code: string
  name: string
  startDate: string | null
  endDate: string | null
}

interface ImportedPhase {
  prefix: string
  name: string
  tasks: ImportedTask[]
  startDate: string | null
  endDate: string | null
  expanded: boolean
}

// Map common Primavera activity code prefixes to phase names
const PHASE_PREFIX_MAP: Record<string, string> = {
  'A': 'Mobilization & Approvals',
  'B': 'Demolition',
  'C': 'Construction & Finishing',
  'D': 'Electrical',
  'E': 'Aluminum & Windows',
  'F': 'Garage Works',
  'G': 'External & Landscaping',
  'H': 'HVAC',
  'I': 'Interior Fit-out',
  'J': 'Joinery',
  'K': 'Kitchen',
  'L': 'Lighting',
  'M': 'MEP',
  'N': 'Network & IT',
  'O': 'Other',
  'P': 'Plumbing',
  'Q': 'Quality & Snagging',
  'R': 'Roofing',
  'S': 'Structural',
  'T': 'Tiling',
  'U': 'Utilities',
  'V': 'Ventilation',
  'W': 'Waterproofing',
  'X': 'External Cladding',
  'Y': 'Yard Works',
  'Z': 'Final Handover',
}

function parseDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null
  
  // Handle DD-MMM-YY format (e.g., "23-Feb-26")
  const match = dateStr.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/)
  if (match) {
    const [, day, monthStr, year] = match
    const months: Record<string, string> = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
      'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
      'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    }
    const month = months[monthStr]
    if (month) {
      const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`
      return `${fullYear}-${month}-${day.padStart(2, '0')}`
    }
  }
  
  // Try to parse as regular date
  const date = new Date(dateStr)
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0]
  }
  
  return null
}

function getPhasePrefix(code: string): string {
  // Extract first letter(s) before numbers
  const match = code.match(/^([A-Za-z]+)/)
  return match ? match[1].toUpperCase() : 'O'
}

export default function ImportSchedulePage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [phases, setPhases] = useState<ImportedPhase[]>([])
  const [projectStart, setProjectStart] = useState<string>('')
  const [projectEnd, setProjectEnd] = useState<string>('')

  const handleFileDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) await processFile(file)
  }, [])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) await processFile(file)
  }, [])

  const processFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError('Please upload an Excel file (.xlsx, .xls) or CSV')
      return
    }

    setLoading(true)
    setError(null)
    setFileName(file.name)

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][]

      // Find header row (look for "Activity" or "task" columns)
      let headerRowIndex = 0
      for (let i = 0; i < Math.min(5, data.length); i++) {
        const row = data[i]?.map(c => String(c || '').toLowerCase()) || []
        if (row.some(c => c.includes('activity') || c.includes('task'))) {
          headerRowIndex = i
          break
        }
      }

      const headers = data[headerRowIndex]?.map(h => String(h || '').toLowerCase()) || []
      
      // Find column indices
      const codeCol = headers.findIndex(h => 
        h.includes('activity id') || h.includes('task_code') || h.includes('code') || h.includes('id')
      )
      const nameCol = headers.findIndex(h => 
        h.includes('activity name') || h.includes('task_name') || h.includes('name') || h.includes('description')
      )
      const startCol = headers.findIndex(h => 
        h.includes('start') || h.includes('begin')
      )
      const endCol = headers.findIndex(h => 
        h.includes('finish') || h.includes('end') || h.includes('complete')
      )

      if (nameCol === -1) {
        throw new Error('Could not find activity/task name column')
      }

      // Parse tasks and group by prefix
      const tasksMap = new Map<string, ImportedTask[]>()
      let minDate: string | null = null
      let maxDate: string | null = null

      for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i]
        if (!row || !row[nameCol]) continue

        const code = codeCol >= 0 ? String(row[codeCol] || '') : `T${i}`
        const name = String(row[nameCol] || '').trim()
        const startDate = parseDate(startCol >= 0 ? String(row[startCol] || '') : null)
        const endDate = parseDate(endCol >= 0 ? String(row[endCol] || '') : null)

        if (!name || name.toLowerCase().includes('activity name')) continue

        const prefix = getPhasePrefix(code)
        
        if (!tasksMap.has(prefix)) {
          tasksMap.set(prefix, [])
        }
        tasksMap.get(prefix)!.push({ code, name, startDate, endDate })

        // Track project dates
        if (startDate && (!minDate || startDate < minDate)) minDate = startDate
        if (endDate && (!maxDate || endDate > maxDate)) maxDate = endDate
      }

      // Convert to phases array
      const importedPhases: ImportedPhase[] = Array.from(tasksMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([prefix, tasks]) => {
          const phaseTasks = tasks.sort((a, b) => a.code.localeCompare(b.code))
          const phaseStart = phaseTasks
            .map(t => t.startDate)
            .filter(Boolean)
            .sort()[0] || null
          const phaseEnd = phaseTasks
            .map(t => t.endDate)
            .filter(Boolean)
            .sort()
            .reverse()[0] || null

          return {
            prefix,
            name: PHASE_PREFIX_MAP[prefix] || `Phase ${prefix}`,
            tasks: phaseTasks,
            startDate: phaseStart,
            endDate: phaseEnd,
            expanded: true,
          }
        })

      setPhases(importedPhases)
      setProjectStart(minDate || new Date().toISOString().split('T')[0])
      setProjectEnd(maxDate || '')

    } catch (err) {
      console.error('Error parsing file:', err)
      setError(err instanceof Error ? err.message : 'Failed to parse file')
    } finally {
      setLoading(false)
    }
  }

  const togglePhase = (prefix: string) => {
    setPhases(phases.map(p => 
      p.prefix === prefix ? { ...p, expanded: !p.expanded } : p
    ))
  }

  const updatePhaseName = (prefix: string, name: string) => {
    setPhases(phases.map(p => 
      p.prefix === prefix ? { ...p, name } : p
    ))
  }

  const handleSave = async () => {
    if (phases.length === 0) {
      setError('No phases to import')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Check if schedule already exists
      const { data: existingSchedule } = await supabase
        .from('schedules')
        .select('id')
        .eq('project_id', projectId)
        .single()

      if (existingSchedule) {
        // Delete existing phases and tasks
        const { data: existingPhases } = await supabase
          .from('phases')
          .select('id')
          .eq('schedule_id', existingSchedule.id)

        if (existingPhases?.length) {
          await supabase
            .from('tasks')
            .delete()
            .in('phase_id', existingPhases.map(p => p.id))
          
          await supabase
            .from('phases')
            .delete()
            .eq('schedule_id', existingSchedule.id)
        }

        // Update schedule dates
        await supabase
          .from('schedules')
          .update({
            start_date: projectStart,
            end_date: projectEnd,
          })
          .eq('id', existingSchedule.id)

        // Create new phases and tasks
        for (let i = 0; i < phases.length; i++) {
          const phase = phases[i]

          const { data: createdPhase, error: phaseError } = await supabase
            .from('phases')
            .insert({
              schedule_id: existingSchedule.id,
              name: phase.name,
              start_date: phase.startDate,
              end_date: phase.endDate,
              status: 'not_started',
              progress_percent: 0,
              sort_order: i,
            })
            .select()
            .single()

          if (phaseError) throw phaseError

          if (phase.tasks.length > 0) {
            await supabase
              .from('tasks')
              .insert(
                phase.tasks.map((task, j) => ({
                  phase_id: createdPhase.id,
                  description: `${task.code}: ${task.name}`,
                  due_date: task.endDate,
                  status: 'pending',
                  sort_order: j,
                }))
              )
          }
        }
      } else {
        // Create new schedule
        const { data: schedule, error: scheduleError } = await supabase
          .from('schedules')
          .insert({
            project_id: projectId,
            start_date: projectStart,
            end_date: projectEnd,
          })
          .select()
          .single()

        if (scheduleError) {
          throw new Error(`Failed to create schedule: ${scheduleError.message}`)
        }

        // Create phases and tasks
        for (let i = 0; i < phases.length; i++) {
          const phase = phases[i]

          const { data: createdPhase, error: phaseError } = await supabase
            .from('phases')
            .insert({
              schedule_id: schedule.id,
              name: phase.name,
              start_date: phase.startDate,
              end_date: phase.endDate,
              status: 'not_started',
              progress_percent: 0,
              sort_order: i,
            })
            .select()
            .single()

          if (phaseError) throw phaseError

          if (phase.tasks.length > 0) {
            await supabase
              .from('tasks')
              .insert(
                phase.tasks.map((task, j) => ({
                  phase_id: createdPhase.id,
                  description: `${task.code}: ${task.name}`,
                  due_date: task.endDate,
                  status: 'pending',
                  sort_order: j,
                }))
              )
          }
        }
      }

      router.push(`/projects/${projectId}`)
      router.refresh()
    } catch (err: any) {
      console.error('Error saving schedule:', err)
      const errorMsg = err?.message || err?.error?.message || JSON.stringify(err) || 'Failed to save schedule'
      setError(`Save failed: ${errorMsg}`)
    } finally {
      setSaving(false)
    }
  }

  const totalTasks = phases.reduce((sum, p) => sum + p.tasks.length, 0)

  const formatDate = (date: string | null) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="Import Schedule"
        breadcrumbs={[
          { label: 'Projects', href: '/projects' },
          { label: 'Project', href: `/projects/${projectId}` },
          { label: 'Import Schedule' }
        ]}
      />

      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-600 mb-6 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Upload Area */}
          {phases.length === 0 && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-400 transition-colors bg-white"
            >
              {loading ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
                  <p className="text-gray-600">Processing {fileName}...</p>
                </div>
              ) : (
                <>
                  <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Import from Primavera
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Drag & drop your Primavera Excel export, or click to browse
                  </p>
                  <label className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 cursor-pointer">
                    <Upload className="h-4 w-4" />
                    Choose File
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-400 mt-4">
                    Supports: Excel (.xlsx, .xls), CSV
                  </p>
                </>
              )}
            </div>
          )}

          {/* Preview */}
          {phases.length > 0 && (
            <>
              {/* Summary */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="font-medium text-gray-900">
                      Imported from {fileName}
                    </span>
                  </div>
                  <label className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer">
                    Upload different file
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Start
                    </label>
                    <input
                      type="date"
                      value={projectStart}
                      onChange={(e) => setProjectStart(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project End
                    </label>
                    <input
                      type="date"
                      value={projectEnd}
                      onChange={(e) => setProjectEnd(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    {phases.length} phases • {totalTasks} tasks
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? (
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
              </div>

              {/* Phases */}
              <div className="space-y-3">
                {phases.map((phase) => (
                  <div key={phase.prefix} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div 
                      className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50"
                      onClick={() => togglePhase(phase.prefix)}
                    >
                      {phase.expanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                      <input
                        type="text"
                        value={phase.name}
                        onChange={(e) => updatePhaseName(phase.prefix, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 bg-transparent font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1"
                      />
                      <span className="text-sm text-gray-500">
                        {formatDate(phase.startDate)} → {formatDate(phase.endDate)}
                      </span>
                      <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-1 rounded">
                        {phase.tasks.length} tasks
                      </span>
                    </div>

                    {phase.expanded && phase.tasks.length > 0 && (
                      <div className="border-t bg-gray-50 px-4 py-3">
                        <div className="space-y-1">
                          {phase.tasks.map((task) => (
                            <div 
                              key={task.code}
                              className="flex items-center justify-between py-2 px-3 bg-white rounded border border-gray-100"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-mono text-gray-400 w-8">
                                  {task.code}
                                </span>
                                <span className="text-sm text-gray-900">
                                  {task.name}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {formatDate(task.startDate)} → {formatDate(task.endDate)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Back link */}
          <div className="mt-8">
            <Link
              href={`/projects/${projectId}`}
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Project
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
