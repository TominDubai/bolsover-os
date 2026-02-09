'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Loader2,
  FileText,
  DollarSign,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  Send,
  Edit,
  Plus,
  Clock
} from 'lucide-react'

interface ActivityTabProps {
  projectId: string
}

interface ActivityItem {
  id: string
  action: string
  description: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  user?: {
    name: string
  }
}

// Map action types to icons
const ACTION_ICONS: Record<string, typeof FileText> = {
  'project.created': Plus,
  'project.updated': Edit,
  'boq.created': FileText,
  'boq.submitted': Send,
  'boq.approved': CheckCircle2,
  'boq.sent_to_client': Send,
  'variation.created': AlertTriangle,
  'variation.approved': CheckCircle2,
  'variation.paid': DollarSign,
  'schedule.created': Calendar,
  'task.completed': CheckCircle2,
  'report.submitted': FileText,
  'team.assigned': UserPlus,
  'default': Clock,
}

const ACTION_COLORS: Record<string, string> = {
  'project.created': 'bg-blue-100 text-blue-600',
  'boq.approved': 'bg-green-100 text-green-600',
  'variation.created': 'bg-amber-100 text-amber-600',
  'variation.paid': 'bg-green-100 text-green-600',
  'task.completed': 'bg-green-100 text-green-600',
  'default': 'bg-gray-100 text-gray-600',
}

function getActionIcon(action: string) {
  const prefix = action.split('.')[0] + '.' + action.split('.')[1]
  return ACTION_ICONS[action] || ACTION_ICONS[prefix] || ACTION_ICONS.default
}

function getActionColor(action: string) {
  const prefix = action.split('.')[0] + '.' + action.split('.')[1]
  return ACTION_COLORS[action] || ACTION_COLORS[prefix] || ACTION_COLORS.default
}

export function ActivityTab({ projectId }: ActivityTabProps) {
  const [loading, setLoading] = useState(true)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [hasMore, setHasMore] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function fetchActivity() {
      setLoading(true)

      const { data, count } = await supabase
        .from('activity_log')
        .select(`
          *,
          user:users!activity_log_user_id_fkey(name)
        `, { count: 'exact' })
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (data) {
        setActivities(data)
        setHasMore((count || 0) > 50)
      }
      setLoading(false)
    }

    fetchActivity()
  }, [projectId, supabase])

  const formatDateTime = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Group activities by date
  const groupedActivities = activities.reduce((acc, activity) => {
    const date = new Date(activity.created_at).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    if (!acc[date]) acc[date] = []
    acc[date].push(activity)
    return acc
  }, {} as Record<string, ActivityItem[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Activity Yet</h3>
        <p className="text-gray-500">Project activity will appear here as changes are made</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {Object.entries(groupedActivities).map(([date, dayActivities]) => (
        <div key={date}>
          <h4 className="text-sm font-medium text-gray-500 mb-4">{date}</h4>
          <div className="space-y-4">
            {dayActivities.map((activity, index) => {
              const Icon = getActionIcon(activity.action)
              const color = getActionColor(activity.action)

              return (
                <div key={activity.id} className="flex gap-4">
                  {/* Timeline */}
                  <div className="flex flex-col items-center">
                    <div className={`p-2 rounded-full ${color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    {index < dayActivities.length - 1 && (
                      <div className="w-px h-full bg-gray-200 my-2" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-gray-900">
                          {activity.description || activity.action.replace('.', ' → ')}
                        </p>
                        {activity.user && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            by {activity.user.name}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {formatDateTime(activity.created_at)}
                      </span>
                    </div>

                    {/* Metadata */}
                    {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                        {Object.entries(activity.metadata).map(([key, value]) => (
                          <div key={key} className="flex gap-2">
                            <span className="text-gray-400">{key}:</span>
                            <span>{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {hasMore && (
        <button className="w-full py-3 text-sm text-blue-600 hover:text-blue-700 border border-gray-200 rounded-lg hover:bg-gray-50">
          Load more activity
        </button>
      )}
    </div>
  )
}
