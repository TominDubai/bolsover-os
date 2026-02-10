import { Header } from '@/components/layout/Header'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { 
  Building2, 
  User, 
  Phone, 
  Mail, 
  MapPin,
  Calendar,
  DollarSign,
  Clock,
  FileText,
  Users,
  ChevronRight,
  Edit,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { ProjectTabs } from './ProjectTabs'
import { STATUS_LABELS, STATUS_COLORS, HEALTH_ICONS, type ProjectStatus, type ProjectHealth } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch project with related data
  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      *,
      client:clients(*)
    `)
    .eq('id', id)
    .single()

  if (error || !project) {
    console.error('Project fetch error:', error)
    notFound()
  }

  // Fetch team members if assigned
  let assigned_pm_user = null
  let assigned_qs_user = null
  let assigned_coordinator_user = null

  if (project.assigned_pm) {
    const { data } = await supabase.from('users').select('id, name, email').eq('id', project.assigned_pm).single()
    assigned_pm_user = data
  }
  if (project.assigned_qs) {
    const { data } = await supabase.from('users').select('id, name, email').eq('id', project.assigned_qs).single()
    assigned_qs_user = data
  }
  if (project.assigned_coordinator) {
    const { data } = await supabase.from('users').select('id, name, email').eq('id', project.assigned_coordinator).single()
    assigned_coordinator_user = data
  }

  // Add team to project object
  const projectWithTeam = {
    ...project,
    assigned_pm_user,
    assigned_qs_user,
    assigned_coordinator_user
  }

  // Fetch counts for tabs (these tables may not exist yet, so handle gracefully)
  let siteVisitCount = 0
  let variationCount = 0
  let dailyReportCount = 0
  let documentCount = 0

  try {
    const [svResult, varResult, drResult, docResult] = await Promise.all([
      supabase.from('site_visits').select('*', { count: 'exact', head: true }).eq('project_id', id),
      supabase.from('variations').select('*', { count: 'exact', head: true }).eq('project_id', id),
      supabase.from('daily_reports').select('*', { count: 'exact', head: true }).eq('project_id', id),
      supabase.from('documents').select('*', { count: 'exact', head: true }).eq('project_id', id),
    ])
    siteVisitCount = svResult.count || 0
    variationCount = varResult.count || 0
    dailyReportCount = drResult.count || 0
    documentCount = docResult.count || 0
  } catch {
    // Tables don't exist yet, that's fine
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '—'
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: string | null) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title={project.reference || 'Project'}
        breadcrumbs={[
          { label: 'Projects', href: '/projects' },
          { label: project.reference || 'Project' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/projects/${id}/settings`}
              className="inline-flex items-center gap-2 rounded-lg bg-white border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Settings
            </Link>
            <Link
              href={`/projects/${id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg bg-white border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Link>
          </div>
        }
      />

      <div className="p-6">
        {/* Status & Health Banner */}
        <div className="mb-6 flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[project.status as ProjectStatus] || 'bg-gray-100 text-gray-800'}`}>
              {STATUS_LABELS[project.status as ProjectStatus] || project.status}
            </span>
            {project.health && (
              <span className="flex items-center gap-2 text-sm">
                <span className="text-lg">{HEALTH_ICONS[project.health as ProjectHealth]}</span>
                <span className="text-gray-600 capitalize">{project.health.replace('_', ' ')}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-6 text-sm">
            {project.start_date && (
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Started {formatDate(project.start_date)}</span>
              </div>
            )}
            {project.due_date && (
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="h-4 w-4" />
                <span>Due {formatDate(project.due_date)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="col-span-2 space-y-6">
            {/* Project Tabs */}
            <ProjectTabs 
              projectId={id}
              counts={{
                siteVisits: siteVisitCount || 0,
                variations: variationCount || 0,
                dailyReports: dailyReportCount || 0,
                documents: documentCount || 0,
              }}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Financial Summary */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-400" />
                Financials
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Contract</span>
                  <span className="font-medium">{formatCurrency(project.contract_value)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Variations</span>
                  <span className="font-medium text-amber-600">
                    {project.variation_total ? `+${formatCurrency(project.variation_total)}` : '—'}
                  </span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="font-medium text-gray-900">Total</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency((project.contract_value || 0) + (project.variation_total || 0))}
                  </span>
                </div>
                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Invoiced</span>
                    <span>{formatCurrency(project.total_invoiced)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Paid</span>
                    <span className="text-green-600">{formatCurrency(project.total_paid)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Outstanding</span>
                    <span className="text-red-600">
                      {formatCurrency((project.total_invoiced || 0) - (project.total_paid || 0))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Client Info */}
            {project.client && (
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  Client
                </h3>
                <div className="space-y-3">
                  <p className="font-medium text-gray-900">{project.client.name}</p>
                  {project.client.phone && (
                    <a 
                      href={`tel:${project.client.phone}`}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600"
                    >
                      <Phone className="h-4 w-4" />
                      {project.client.phone}
                    </a>
                  )}
                  {project.client.email && (
                    <a 
                      href={`mailto:${project.client.email}`}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600"
                    >
                      <Mail className="h-4 w-4" />
                      {project.client.email}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Location */}
            {(project.address || project.community) && (
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  Location
                </h3>
                <div className="space-y-2">
                  {project.community && (
                    <p className="text-sm font-medium text-gray-900">{project.community}</p>
                  )}
                  {project.address && (
                    <p className="text-sm text-gray-600">{project.address}</p>
                  )}
                </div>
              </div>
            )}

            {/* Team */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                Team
              </h3>
              <div className="space-y-3">
                {projectWithTeam.assigned_pm_user && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">PM</span>
                    <span className="text-sm font-medium">{projectWithTeam.assigned_pm_user.name}</span>
                  </div>
                )}
                {projectWithTeam.assigned_qs_user && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">QS</span>
                    <span className="text-sm font-medium">{projectWithTeam.assigned_qs_user.name}</span>
                  </div>
                )}
                {projectWithTeam.assigned_coordinator_user && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Coordinator</span>
                    <span className="text-sm font-medium">{projectWithTeam.assigned_coordinator_user.name}</span>
                  </div>
                )}
                {!projectWithTeam.assigned_pm_user && !projectWithTeam.assigned_qs_user && !projectWithTeam.assigned_coordinator_user && (
                  <p className="text-sm text-gray-400 italic">No team assigned</p>
                )}
              </div>
            </div>

            {/* Key Dates */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                Key Dates
              </h3>
              <div className="space-y-3 text-sm">
                {project.enquiry_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Enquiry</span>
                    <span>{formatDate(project.enquiry_date)}</span>
                  </div>
                )}
                {project.site_visit_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Site Visit</span>
                    <span>{formatDate(project.site_visit_date)}</span>
                  </div>
                )}
                {project.quote_sent_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Quote Sent</span>
                    <span>{formatDate(project.quote_sent_date)}</span>
                  </div>
                )}
                {project.accepted_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Accepted</span>
                    <span>{formatDate(project.accepted_date)}</span>
                  </div>
                )}
                {project.start_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Start</span>
                    <span>{formatDate(project.start_date)}</span>
                  </div>
                )}
                {project.due_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Due</span>
                    <span className="font-medium">{formatDate(project.due_date)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
