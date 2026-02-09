'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, 
  FileText,
  Camera,
  Users,
  Loader2,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Clock
} from 'lucide-react'
import Link from 'next/link'

interface ReportsTabProps {
  projectId: string
}

interface DailyReport {
  id: string
  report_date: string
  submitted_at: string | null
  progress_status: string
  notes: string | null
  submitted_by_user?: {
    name: string
  }
}

const PROGRESS_STATUS = {
  on_track: { label: 'On Track', icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
  minor_delay: { label: 'Minor Delay', icon: Clock, color: 'text-amber-600 bg-amber-50' },
  major_issue: { label: 'Major Issue', icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
}

export function ReportsTab({ projectId }: ReportsTabProps) {
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<DailyReport[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function fetchReports() {
      setLoading(true)

      const { data } = await supabase
        .from('daily_reports')
        .select(`
          *,
          submitted_by_user:users!daily_reports_submitted_by_fkey(name)
        `)
        .eq('project_id', projectId)
        .order('report_date', { ascending: false })
        .limit(30)

      if (data) setReports(data)
      setLoading(false)
    }

    fetchReports()
  }, [projectId, supabase])

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatTime = (date: string | null) => {
    if (!date) return ''
    return new Date(date).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Daily Reports</h3>
        <Link
          href={`/projects/${projectId}/reports/new`}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New Report
        </Link>
      </div>

      {/* Reports List */}
      {reports.length > 0 ? (
        <div className="space-y-3">
          {reports.map((report) => {
            const status = PROGRESS_STATUS[report.progress_status as keyof typeof PROGRESS_STATUS] || PROGRESS_STATUS.on_track
            const StatusIcon = status.icon

            return (
              <Link
                key={report.id}
                href={`/projects/${projectId}/reports/${report.id}`}
                className="block p-4 bg-white border border-gray-100 rounded-lg hover:border-gray-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${status.color}`}>
                      <StatusIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{formatDate(report.report_date)}</p>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        {report.submitted_by_user && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {report.submitted_by_user.name}
                          </span>
                        )}
                        {report.submitted_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatTime(report.submitted_at)}
                          </span>
                        )}
                      </div>
                      {report.notes && (
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">{report.notes}</p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Reports Yet</h3>
          <p className="text-gray-500 mb-6">Daily reports help track progress and attendance</p>
          <Link
            href={`/projects/${projectId}/reports/new`}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create First Report
          </Link>
        </div>
      )}
    </div>
  )
}
