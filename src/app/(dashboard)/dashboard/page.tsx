import { Header } from '@/components/layout/Header'
import { createClient } from '@/lib/supabase/server'
import { 
  TrendingUp, 
  FolderKanban, 
  DollarSign, 
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowRight,
  FileText,
  Calendar,
  Users
} from 'lucide-react'
import Link from 'next/link'
import { STATUS_LABELS, STATUS_COLORS, type ProjectStatus } from '@/types'

const PIPELINE_STATUSES = ['enquiry', 'qualifying', 'awaiting_design', 'ready_for_visit', 'site_visit_scheduled', 'visited', 'boq_in_progress', 'boq_review', 'quoted']
const ACTIVE_STATUSES = ['accepted', 'contract_sent', 'contract_signed', 'deposit_pending', 'deposit_paid', 'approval_pending', 'scheduling', 'scheduled', 'active', 'snagging']

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch all data in parallel
  const [
    { data: projects },
    { data: variations },
    { data: recentActivity },
    { count: pendingBoqCount },
  ] = await Promise.all([
    supabase.from('projects').select('*'),
    supabase.from('variations').select('*, project:projects(reference)').eq('payment_status', 'pending').neq('status', 'rejected'),
    supabase.from('activity_log').select('*, project:projects(reference), user:users(name)').order('created_at', { ascending: false }).limit(10),
    supabase.from('boq').select('*', { count: 'exact', head: true }).eq('status', 'pending_approval'),
  ])

  // Calculate stats
  const pipelineProjects = projects?.filter(p => PIPELINE_STATUSES.includes(p.status)) || []
  const activeProjects = projects?.filter(p => ACTIVE_STATUSES.includes(p.status)) || []
  const completedProjects = projects?.filter(p => p.status === 'complete') || []

  const pipelineValue = pipelineProjects.reduce((sum, p) => sum + (p.contract_value || 0), 0)
  const activeValue = activeProjects.reduce((sum, p) => sum + (p.contract_value || 0), 0)
  const unpaidVariations = variations?.filter(v => v.payment_status === 'pending') || []
  const unpaidVariationValue = unpaidVariations.reduce((sum, v) => sum + (v.price || 0), 0)

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `AED ${(amount / 1000000).toFixed(1)}M`
    }
    if (amount >= 1000) {
      return `AED ${(amount / 1000).toFixed(0)}K`
    }
    return `AED ${amount}`
  }

  const formatDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="min-h-screen">
      <Header 
        title="Dashboard" 
        subtitle={`${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`}
      />
      
      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pipeline</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(pipelineValue)}</p>
                <p className="text-sm text-gray-500 mt-1">{pipelineProjects.length} enquiries</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-100">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Projects</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{activeProjects.length}</p>
                <p className="text-sm text-gray-500 mt-1">{formatCurrency(activeValue)} value</p>
              </div>
              <div className="p-3 rounded-xl bg-green-100">
                <FolderKanban className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{completedProjects.length}</p>
                <p className="text-sm text-gray-500 mt-1">all time</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-100">
                <CheckCircle2 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Unpaid Variations</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{formatCurrency(unpaidVariationValue)}</p>
                <p className="text-sm text-gray-500 mt-1">{unpaidVariations.length} pending</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-100">
                <DollarSign className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Needs Attention */}
          <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Needs Attention</h2>
            </div>
            
            <div className="divide-y divide-gray-100">
              {/* Pending BOQ Approvals */}
              {(pendingBoqCount || 0) > 0 && (
                <Link href="/projects?filter=boq_pending" className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-purple-100">
                      <FileText className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">BOQ Approvals Pending</p>
                      <p className="text-sm text-gray-500">{pendingBoqCount} BOQs awaiting approval</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </Link>
              )}

              {/* Unpaid Variations */}
              {unpaidVariations.slice(0, 3).map((variation) => (
                <Link 
                  key={variation.id} 
                  href={`/projects/${variation.project_id}/variations/${variation.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-amber-100">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {variation.reference} - Awaiting Payment
                      </p>
                      <p className="text-sm text-gray-500">
                        {variation.project?.reference} · {formatCurrency(variation.price || 0)}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </Link>
              ))}

              {(pendingBoqCount || 0) === 0 && unpaidVariations.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <CheckCircle2 className="h-12 w-12 text-green-300 mx-auto mb-3" />
                  <p className="font-medium text-gray-900">All caught up!</p>
                  <p className="text-sm">Nothing needs your attention right now</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Recent Activity</h2>
            </div>
            
            <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
              {recentActivity && recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="p-4">
                    <p className="text-sm text-gray-900">{activity.description || activity.action}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      {activity.project?.reference && (
                        <span>{activity.project.reference}</span>
                      )}
                      <span>·</span>
                      <span>{formatDate(activity.created_at)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Active Projects Quick View */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Active Projects</h2>
            <Link href="/projects" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          
          {activeProjects.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {activeProjects.slice(0, 5).map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-gray-900">{project.reference || 'No reference'}</p>
                    <p className="text-sm text-gray-500">{project.community || 'No location'}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[project.status as ProjectStatus] || 'bg-gray-100 text-gray-800'}`}>
                      {STATUS_LABELS[project.status as ProjectStatus] || project.status}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(project.contract_value || 0)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <FolderKanban className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p>No active projects</p>
              <Link href="/projects/new" className="text-sm text-blue-600 hover:text-blue-700 mt-2 inline-block">
                Create your first project
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
