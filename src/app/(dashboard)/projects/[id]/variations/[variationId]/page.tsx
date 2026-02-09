import { Header } from '@/components/layout/Header'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  FileSignature,
  Edit,
  Send
} from 'lucide-react'
import { VariationActions } from './VariationActions'

interface Props {
  params: Promise<{ id: string; variationId: string }>
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
  client_on_site: 'Client Request (On Site)',
  design_change: 'Design Change',
  unforeseen: 'Unforeseen Works',
  other: 'Other',
}

export default async function VariationDetailPage({ params }: Props) {
  const { id: projectId, variationId } = await params
  const supabase = await createClient()

  const { data: variation, error } = await supabase
    .from('variations')
    .select('*')
    .eq('id', variationId)
    .single()

  if (error || !variation) {
    notFound()
  }

  const { data: project } = await supabase
    .from('projects')
    .select('reference')
    .eq('id', projectId)
    .single()

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

  const statusConfig = STATUS_CONFIG[variation.status] || STATUS_CONFIG.draft
  const margin = variation.cost && variation.price 
    ? (((variation.price - variation.cost) / variation.cost) * 100).toFixed(0)
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title={variation.reference || 'Variation'}
        breadcrumbs={[
          { label: 'Projects', href: '/projects' },
          { label: project?.reference || 'Project', href: `/projects/${projectId}` },
          { label: 'Variations', href: `/projects/${projectId}?tab=variations` },
          { label: variation.reference || 'Variation' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/projects/${projectId}/variations/${variationId}/edit`}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Link>
          </div>
        }
      />

      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Status Banner */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className={`inline-flex rounded-full px-4 py-1.5 text-sm font-medium ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
                {variation.payment_status === 'paid' && (
                  <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium bg-green-100 text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Paid
                  </span>
                )}
                {variation.payment_status === 'pending' && variation.status !== 'draft' && variation.status !== 'pricing' && (
                  <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium bg-amber-100 text-amber-700">
                    <Clock className="h-4 w-4" />
                    Awaiting Payment
                  </span>
                )}
              </div>
              <VariationActions 
                variation={variation} 
                projectId={projectId}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="col-span-2 space-y-6">
              {/* Description */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4">Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{variation.description}</p>
                
                {variation.request_notes && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Additional Notes</h4>
                    <p className="text-gray-600">{variation.request_notes}</p>
                  </div>
                )}
              </div>

              {/* Payment Warning */}
              {variation.payment_status === 'pending' && 
               ['client_approved', 'awaiting_payment'].includes(variation.status) && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Payment Required Before Work</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Per company policy, variation work should not proceed until payment is received from the client.
                    </p>
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4">Timeline</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-full bg-blue-100">
                      <FileSignature className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Requested</p>
                      <p className="text-sm text-gray-500">{formatDate(variation.request_date)}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {REQUEST_TYPE_LABELS[variation.requested_by] || variation.requested_by}
                      </p>
                    </div>
                  </div>

                  {variation.priced_at && (
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 rounded-full bg-purple-100">
                        <DollarSign className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Priced</p>
                        <p className="text-sm text-gray-500">{formatDate(variation.priced_at)}</p>
                      </div>
                    </div>
                  )}

                  {variation.internal_approved_at && (
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 rounded-full bg-green-100">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Internally Approved</p>
                        <p className="text-sm text-gray-500">{formatDate(variation.internal_approved_at)}</p>
                      </div>
                    </div>
                  )}

                  {variation.client_signed_at && (
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 rounded-full bg-green-100">
                        <FileSignature className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Client Signed</p>
                        <p className="text-sm text-gray-500">{formatDate(variation.client_signed_at)}</p>
                      </div>
                    </div>
                  )}

                  {variation.payment_date && (
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 rounded-full bg-green-100">
                        <DollarSign className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Payment Received</p>
                        <p className="text-sm text-gray-500">{formatDate(variation.payment_date)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Financials */}
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  Financials
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cost</span>
                    <span className="font-medium">{formatCurrency(variation.cost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price</span>
                    <span className="font-semibold text-lg">{formatCurrency(variation.price)}</span>
                  </div>
                  {margin && (
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-gray-600">Margin</span>
                      <span className="font-medium text-green-600">{margin}%</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Request Info */}
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4">Request Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type</span>
                    <span className="font-medium">
                      {REQUEST_TYPE_LABELS[variation.requested_by] || variation.requested_by}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date</span>
                    <span>{formatDate(variation.request_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reference</span>
                    <span className="font-mono">{variation.reference || '—'}</span>
                  </div>
                </div>
              </div>

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
      </div>
    </div>
  )
}
