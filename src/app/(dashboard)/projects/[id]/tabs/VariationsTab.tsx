'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, 
  AlertTriangle,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  FileSignature,
  Loader2,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'

interface VariationsTabProps {
  projectId: string
}

interface Variation {
  id: string
  reference: string | null
  description: string
  status: string
  cost: number | null
  price: number | null
  payment_status: string | null
  request_date: string | null
  requested_by: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  pricing: { label: 'Pricing', color: 'bg-amber-100 text-amber-700' },
  internal_review: { label: 'Internal Review', color: 'bg-purple-100 text-purple-700' },
  sent_to_client: { label: 'Sent to Client', color: 'bg-blue-100 text-blue-700' },
  client_approved: { label: 'Client Approved', color: 'bg-green-100 text-green-700' },
  awaiting_payment: { label: 'Awaiting Payment', color: 'bg-amber-100 text-amber-700' },
  approved_to_proceed: { label: 'Ready to Proceed', color: 'bg-green-100 text-green-700' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  complete: { label: 'Complete', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
}

const REQUEST_TYPE_LABELS: Record<string, string> = {
  client_on_site: 'Client Request (Site)',
  design_change: 'Design Change',
  unforeseen: 'Unforeseen Works',
  other: 'Other',
}

export function VariationsTab({ projectId }: VariationsTabProps) {
  const [loading, setLoading] = useState(true)
  const [variations, setVariations] = useState<Variation[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function fetchVariations() {
      setLoading(true)

      const { data } = await supabase
        .from('variations')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (data) setVariations(data)
      setLoading(false)
    }

    fetchVariations()
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
  const totalValue = variations.reduce((sum, v) => sum + (v.price || 0), 0)
  const pendingPayment = variations
    .filter(v => v.payment_status === 'pending' && v.status !== 'rejected')
    .reduce((sum, v) => sum + (v.price || 0), 0)
  const paidAmount = variations
    .filter(v => v.payment_status === 'paid')
    .reduce((sum, v) => sum + (v.price || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Variations</h3>
        <Link
          href={`/projects/${projectId}/variations/new`}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New Variation
        </Link>
      </div>

      {/* Summary Cards */}
      {variations.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Total Variations</p>
            <p className="text-lg font-semibold text-gray-900">{formatCurrency(totalValue)}</p>
            <p className="text-xs text-gray-500 mt-1">{variations.length} items</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-4">
            <p className="text-sm text-amber-700 mb-1">Pending Payment</p>
            <p className="text-lg font-semibold text-amber-700">{formatCurrency(pendingPayment)}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-700 mb-1">Paid</p>
            <p className="text-lg font-semibold text-green-700">{formatCurrency(paidAmount)}</p>
          </div>
        </div>
      )}

      {/* Variations List */}
      {variations.length > 0 ? (
        <div className="space-y-3">
          {variations.map((variation) => {
            const statusConfig = STATUS_CONFIG[variation.status] || STATUS_CONFIG.draft

            return (
              <Link
                key={variation.id}
                href={`/projects/${projectId}/variations/${variation.id}`}
                className="block p-4 bg-white border border-gray-100 rounded-lg hover:border-gray-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-medium text-gray-900">
                        {variation.reference || 'VAR-XXX'}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                      {variation.payment_status === 'pending' && variation.status !== 'rejected' && (
                        <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Unpaid
                        </span>
                      )}
                      {variation.payment_status === 'paid' && (
                        <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Paid
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{variation.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>{REQUEST_TYPE_LABELS[variation.requested_by] || variation.requested_by}</span>
                      <span>{formatDate(variation.request_date)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(variation.price)}</p>
                      <p className="text-xs text-gray-500">Cost: {formatCurrency(variation.cost)}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Variations</h3>
          <p className="text-gray-500 mb-6">Variations track changes to the original scope</p>
          <Link
            href={`/projects/${projectId}/variations/new`}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Variation
          </Link>
        </div>
      )}

      {/* Important Notice */}
      {variations.some(v => v.payment_status === 'pending' && v.status === 'client_approved') && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Payment Required Before Work</p>
            <p className="text-sm text-amber-700 mt-1">
              Some approved variations are awaiting payment. Per policy, work should not proceed until payment is received.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
