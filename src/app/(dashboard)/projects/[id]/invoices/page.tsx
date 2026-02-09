import { Header } from '@/components/layout/Header'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { 
  Plus, 
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  ArrowLeft,
  FileText,
  Eye
} from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: FileText },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700', icon: Send },
  viewed: { label: 'Viewed', color: 'bg-purple-100 text-purple-700', icon: Eye },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500', icon: FileText },
}

const TYPE_LABELS = {
  deposit: 'Deposit',
  progress: 'Progress',
  variation: 'Variation',
  final: 'Final',
}

export default async function InvoicesPage({ params }: Props) {
  const { id: projectId } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('reference, contract_value')
    .eq('id', projectId)
    .single()

  if (!project) {
    notFound()
  }

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '—'
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
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

  // Calculate totals
  const totalInvoiced = invoices?.filter(i => i.status !== 'cancelled').reduce((sum, i) => sum + (i.amount || 0), 0) || 0
  const totalPaid = invoices?.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.amount || 0), 0) || 0
  const totalOutstanding = totalInvoiced - totalPaid
  const overdueInvoices = invoices?.filter(i => i.status === 'overdue') || []

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="Invoices"
        breadcrumbs={[
          { label: 'Projects', href: '/projects' },
          { label: project.reference || 'Project', href: `/projects/${projectId}` },
          { label: 'Invoices' }
        ]}
        actions={
          <Link
            href={`/projects/${projectId}/invoices/new`}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New Invoice
          </Link>
        }
      />

      <div className="p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Overdue Alert */}
          {overdueInvoices.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">
                  {overdueInvoices.length} overdue invoice{overdueInvoices.length > 1 ? 's' : ''}
                </p>
                <p className="text-sm text-red-700 mt-1">
                  Total overdue: {formatCurrency(overdueInvoices.reduce((sum, i) => sum + (i.amount || 0), 0))}
                </p>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Contract Value</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(project.contract_value)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Total Invoiced</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(totalInvoiced)}</p>
              {project.contract_value && (
                <p className="text-xs text-gray-500 mt-1">
                  {((totalInvoiced / project.contract_value) * 100).toFixed(0)}% of contract
                </p>
              )}
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-sm text-green-700">Paid</p>
              <p className="text-xl font-bold text-green-700 mt-1">{formatCurrency(totalPaid)}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4">
              <p className="text-sm text-amber-700">Outstanding</p>
              <p className="text-xl font-bold text-amber-700 mt-1">{formatCurrency(totalOutstanding)}</p>
            </div>
          </div>

          {/* Progress Bar */}
          {project.contract_value && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Invoicing Progress</span>
                <span className="text-sm font-medium">{((totalInvoiced / project.contract_value) * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="relative h-3 rounded-full overflow-hidden">
                  <div 
                    className="absolute h-full bg-green-500"
                    style={{ width: `${(totalPaid / project.contract_value) * 100}%` }}
                  />
                  <div 
                    className="absolute h-full bg-amber-400"
                    style={{ 
                      left: `${(totalPaid / project.contract_value) * 100}%`,
                      width: `${((totalInvoiced - totalPaid) / project.contract_value) * 100}%` 
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Paid
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Outstanding
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-gray-200"></span>
                  Not invoiced
                </span>
              </div>
            </div>
          )}

          {/* Invoices List */}
          {invoices && invoices.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Reference
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map((invoice) => {
                    const statusConfig = STATUS_CONFIG[invoice.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft
                    const StatusIcon = statusConfig.icon

                    return (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">{invoice.reference || '—'}</p>
                          {invoice.description && (
                            <p className="text-sm text-gray-500 truncate max-w-[200px]">{invoice.description}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600 capitalize">
                            {TYPE_LABELS[invoice.invoice_type as keyof typeof TYPE_LABELS] || invoice.invoice_type}
                          </span>
                          {invoice.progress_percent && (
                            <span className="text-xs text-gray-500 ml-1">({invoice.progress_percent}%)</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-gray-900">{formatCurrency(invoice.amount)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">{formatDate(invoice.due_date)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/projects/${projectId}/invoices/${invoice.id}`}
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
              <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Invoices</h3>
              <p className="text-gray-500 mb-6">Create invoices to track payments</p>
              <Link
                href={`/projects/${projectId}/invoices/new`}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Create First Invoice
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
