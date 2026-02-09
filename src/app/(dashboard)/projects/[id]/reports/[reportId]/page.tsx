import { Header } from '@/components/layout/Header'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Camera
} from 'lucide-react'

interface Props {
  params: Promise<{ id: string; reportId: string }>
}

const PROGRESS_STATUS = {
  on_track: { label: 'On Track', icon: CheckCircle2, color: 'bg-green-100 text-green-700' },
  minor_delay: { label: 'Minor Delay', icon: Clock, color: 'bg-amber-100 text-amber-700' },
  major_issue: { label: 'Major Issue', icon: AlertTriangle, color: 'bg-red-100 text-red-700' },
}

export default async function ReportDetailPage({ params }: Props) {
  const { id: projectId, reportId } = await params
  const supabase = await createClient()

  const { data: report, error } = await supabase
    .from('daily_reports')
    .select(`
      *,
      submitted_by_user:users!daily_reports_submitted_by_fkey(name, email)
    `)
    .eq('id', reportId)
    .single()

  if (error || !report) {
    notFound()
  }

  const { data: project } = await supabase
    .from('projects')
    .select('reference')
    .eq('id', projectId)
    .single()

  // Get photos
  const { data: photos } = await supabase
    .from('daily_report_photos')
    .select('*')
    .eq('daily_report_id', reportId)

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
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

  const statusConfig = PROGRESS_STATUS[report.progress_status as keyof typeof PROGRESS_STATUS] || PROGRESS_STATUS.on_track
  const StatusIcon = statusConfig.icon

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title={formatDate(report.report_date)}
        breadcrumbs={[
          { label: 'Projects', href: '/projects' },
          { label: project?.reference || 'Project', href: `/projects/${projectId}` },
          { label: 'Reports', href: `/projects/${projectId}?tab=reports` },
          { label: formatDate(report.report_date) }
        ]}
      />

      <div className="p-6">
        <div className="max-w-3xl mx-auto">
          {/* Status Card */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${statusConfig.color}`}>
                  <StatusIcon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {statusConfig.label}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Submitted {formatTime(report.submitted_at)} by {report.submitted_by_user?.name || 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Progress Notes</h3>
            {report.notes ? (
              <p className="text-gray-700 whitespace-pre-wrap">{report.notes}</p>
            ) : (
              <p className="text-gray-400 italic">No notes added</p>
            )}
          </div>

          {/* Photos */}
          {photos && photos.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Camera className="h-4 w-4 text-gray-400" />
                Photos ({photos.length})
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {photos.map((photo) => (
                  <a
                    key={photo.id}
                    href={photo.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-square bg-gray-100 rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                  >
                    <img
                      src={photo.file_url}
                      alt={photo.caption || 'Site photo'}
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Back Link */}
          <Link
            href={`/projects/${projectId}`}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to project
          </Link>
        </div>
      </div>
    </div>
  )
}
