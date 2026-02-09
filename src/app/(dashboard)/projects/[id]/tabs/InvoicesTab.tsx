'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, 
  DollarSign,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Loader2,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'

interface InvoicesTabProps {
  projectId: string
}

interface Invoice {
  id: string
  reference: string | null
  invoice_type: string
  amount: number
  status: string
  due_date: string | null
  paid_date: string | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: Clock },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700', icon: Send },
  viewed: { label: 'Viewed', color: 'bg-purple-100 text-purple-700', icon: Clock },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
}

const TYPE_LABELS: Record<string, string> = {
  deposit: 'Deposit',
  progress: 'Progress',
  variation: 'Variation',
  final: 'Final',
}

export function InvoicesTab({ projectId }: InvoicesTabProps) {
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function fetchInvoices() {
      setLoading(true)

      const { data } = await supabase
        .from('invoices')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (data) setInvoices(data)
      setLoading(false)
    }

    fetchInvoices()
  }, [projectId, supabase])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  // Calculate totals
  const totalInvoiced = invoices.filter(i => i.status !== 'cancelled').reduce((sum, i) => sum + (i.amount || 0), 0)
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.amount || 0), 0)
  const totalOutstanding = totalInvoiced - totalPaid

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Invoices</h3>
        <Link
          href={`/projects/${projectId}/invoices/new`}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New Invoice
        </Link>
      </div>

      {/* Summary Cards */}
      {invoices.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Total Invoiced</p>
            <p className="text-lg font-semibold text-gray-900">{formatCurrency(totalInvoiced)}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-700 mb-1">Paid</p>
            <p className="text-lg font-semibold text-green-700">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-4">
            <p className="text-sm text-amber-700 mb-1">Outstanding</p>
            <p className="text-lg font-semibold text-amber-700">{formatCurrency(totalOutstanding)}</p>
          </div>
        </div>
      )}

      {/* Invoices List */}
      {invoices.length > 0 ? (
        <div className="space-y-3">
          {invoices.map((invoice) => {
            const statusConfig = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.draft
            const StatusIcon = statusConfig.icon

            return (
              <Link
                key={invoice.id}
                href={`/projects/${projectId}/invoices/${invoice.id}`}
                className="block p-4 bg-white border border-gray-100 rounded-lg hover:border-gray-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${invoice.status === 'paid' ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <DollarSign className={`h-5 w-5 ${invoice.status === 'paid' ? 'text-green-600' : 'text-gray-600'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-900">{invoice.reference || 'INV-XXX'}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {TYPE_LABELS[invoice.invoice_type] || invoice.invoice_type} · Due {formatDate(invoice.due_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-gray-900">{formatCurrency(invoice.amount)}</span>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Invoices</h3>
          <p className="text-gray-500 mb-6">Create invoices to track payments for this project</p>
          <Link
            href={`/projects/${projectId}/invoices/new`}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create First Invoice
          </Link>
        </div>
      )}

      {/* Link to full invoices page */}
      {invoices.length > 0 && (
        <Link
          href={`/projects/${projectId}/invoices`}
          className="block text-center text-sm text-blue-600 hover:text-blue-700"
        >
          View all invoices & details →
        </Link>
      )}
    </div>
  )
}
