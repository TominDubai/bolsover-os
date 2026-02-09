import { Header } from '@/components/layout/Header'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { 
  Plus, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Building2,
  Truck,
  ArrowLeft
} from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

const PASS_TYPE_CONFIG = {
  main_site: { label: 'Main Site', icon: Building2, color: 'bg-blue-100 text-blue-700' },
  individual: { label: 'Individual', icon: User, color: 'bg-green-100 text-green-700' },
  subcontractor: { label: 'Subcontractor', icon: Building2, color: 'bg-purple-100 text-purple-700' },
  vehicle: { label: 'Vehicle', icon: Truck, color: 'bg-amber-100 text-amber-700' },
}

const STATUS_CONFIG = {
  active: { label: 'Active', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  expiring_soon: { label: 'Expiring Soon', color: 'bg-amber-100 text-amber-700', icon: Clock },
  expired: { label: 'Expired', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  renewed: { label: 'Renewed', color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
}

export default async function GatePassesPage({ params }: Props) {
  const { id: projectId } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('reference')
    .eq('id', projectId)
    .single()

  if (!project) {
    notFound()
  }

  const { data: gatePasses } = await supabase
    .from('gate_passes')
    .select('*')
    .eq('project_id', projectId)
    .order('valid_to', { ascending: true })

  const formatDate = (date: string | null) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const getDaysUntilExpiry = (validTo: string) => {
    const today = new Date()
    const expiry = new Date(validTo)
    const diffTime = expiry.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Group by status
  const expiringSoon = gatePasses?.filter(p => {
    const days = getDaysUntilExpiry(p.valid_to)
    return days > 0 && days <= 14
  }) || []

  const expired = gatePasses?.filter(p => getDaysUntilExpiry(p.valid_to) <= 0) || []
  const active = gatePasses?.filter(p => getDaysUntilExpiry(p.valid_to) > 14) || []

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="Gate Passes"
        breadcrumbs={[
          { label: 'Projects', href: '/projects' },
          { label: project.reference || 'Project', href: `/projects/${projectId}` },
          { label: 'Gate Passes' }
        ]}
        actions={
          <Link
            href={`/projects/${projectId}/gate-passes/new`}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Pass
          </Link>
        }
      />

      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Alerts */}
          {(expiringSoon.length > 0 || expired.length > 0) && (
            <div className="space-y-3">
              {expired.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">
                      {expired.length} pass{expired.length > 1 ? 'es' : ''} expired
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                      Renew these passes immediately to avoid site access issues.
                    </p>
                  </div>
                </div>
              )}

              {expiringSoon.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">
                      {expiringSoon.length} pass{expiringSoon.length > 1 ? 'es' : ''} expiring within 14 days
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                      Start the renewal process to ensure uninterrupted access.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-2xl font-bold text-gray-900">{gatePasses?.length || 0}</p>
              <p className="text-sm text-gray-500">Total Passes</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-green-700">{active.length}</p>
              <p className="text-sm text-green-600">Active</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-amber-700">{expiringSoon.length}</p>
              <p className="text-sm text-amber-600">Expiring Soon</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-red-700">{expired.length}</p>
              <p className="text-sm text-red-600">Expired</p>
            </div>
          </div>

          {/* Passes List */}
          {gatePasses && gatePasses.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Name / Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Valid Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {gatePasses.map((pass) => {
                    const daysLeft = getDaysUntilExpiry(pass.valid_to)
                    const typeConfig = PASS_TYPE_CONFIG[pass.pass_type as keyof typeof PASS_TYPE_CONFIG] || PASS_TYPE_CONFIG.individual
                    const TypeIcon = typeConfig.icon
                    
                    let status: keyof typeof STATUS_CONFIG = 'active'
                    if (daysLeft <= 0) status = 'expired'
                    else if (daysLeft <= 14) status = 'expiring_soon'
                    
                    const statusConfig = STATUS_CONFIG[status]
                    const StatusIcon = statusConfig.icon

                    return (
                      <tr key={pass.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">{pass.name}</p>
                          {pass.company && (
                            <p className="text-sm text-gray-500">{pass.company}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${typeConfig.color}`}>
                            <TypeIcon className="h-3 w-3" />
                            {typeConfig.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-900">
                            {formatDate(pass.valid_from)} — {formatDate(pass.valid_to)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {daysLeft > 0 ? `${daysLeft} days left` : `Expired ${Math.abs(daysLeft)} days ago`}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/projects/${projectId}/gate-passes/${pass.id}`}
                            className="text-sm text-blue-600 hover:text-blue-700"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
              <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Gate Passes</h3>
              <p className="text-gray-500 mb-6">Add gate passes to track site access permits</p>
              <Link
                href={`/projects/${projectId}/gate-passes/new`}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add First Pass
              </Link>
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
