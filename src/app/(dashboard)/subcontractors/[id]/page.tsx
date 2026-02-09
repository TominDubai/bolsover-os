import { Header } from '@/components/layout/Header'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { 
  Phone, 
  Mail, 
  Star,
  Edit, 
  ArrowLeft,
  Building2,
  CreditCard,
  Clock,
  CheckCircle2
} from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

const TRADE_COLORS: Record<string, string> = {
  electrical: 'bg-yellow-100 text-yellow-700',
  plumbing: 'bg-blue-100 text-blue-700',
  ac: 'bg-cyan-100 text-cyan-700',
  joinery: 'bg-amber-100 text-amber-700',
  tiling: 'bg-orange-100 text-orange-700',
  painting: 'bg-purple-100 text-purple-700',
  gypsum: 'bg-gray-100 text-gray-700',
  flooring: 'bg-green-100 text-green-700',
  glass: 'bg-sky-100 text-sky-700',
  steel: 'bg-slate-100 text-slate-700',
}

export default async function SubcontractorDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: sub, error } = await supabase
    .from('subcontractors')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !sub) {
    notFound()
  }

  // Get recent quotes from this subcontractor
  const { data: quotes } = await supabase
    .from('quotes')
    .select(`
      *,
      rfq:rfqs(
        project:projects(reference, client:clients(name))
      )
    `)
    .eq('subcontractor_id', id)
    .order('received_at', { ascending: false })
    .limit(10)

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title={sub.company_name}
        breadcrumbs={[
          { label: 'Subcontractors', href: '/subcontractors' },
          { label: sub.company_name }
        ]}
        actions={
          <Link
            href={`/subcontractors/${id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Link>
        }
      />

      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="col-span-2 space-y-6">
              {/* Trades */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4">Trades</h3>
                <div className="flex flex-wrap gap-2">
                  {sub.trades?.map((trade: string) => (
                    <span 
                      key={trade}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${TRADE_COLORS[trade] || 'bg-gray-100 text-gray-700'}`}
                    >
                      {trade}
                    </span>
                  )) || (
                    <p className="text-gray-500">No trades specified</p>
                  )}
                </div>
              </div>

              {/* Recent Quotes */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Recent Quotes</h3>
                </div>

                {quotes && quotes.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {quotes.map((quote) => (
                      <div key={quote.id} className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {quote.rfq?.project?.reference || 'Unknown project'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {quote.rfq?.project?.client?.name || 'Unknown client'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">{formatCurrency(quote.total_amount)}</p>
                          <div className="flex items-center gap-2 justify-end mt-1">
                            {quote.is_selected ? (
                              <span className="flex items-center gap-1 text-xs text-green-600">
                                <CheckCircle2 className="h-3 w-3" />
                                Selected
                              </span>
                            ) : (
                              <span className="text-xs text-gray-500">{formatDate(quote.received_at)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    No quotes received yet
                  </div>
                )}
              </div>

              {/* Notes */}
              {sub.notes && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-3">Notes</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{sub.notes}</p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Contact */}
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4">Contact</h3>
                <div className="space-y-3">
                  {sub.contact_name && (
                    <p className="font-medium text-gray-900">{sub.contact_name}</p>
                  )}
                  {sub.phone && (
                    <a 
                      href={`tel:${sub.phone}`}
                      className="flex items-center gap-3 text-gray-600 hover:text-blue-600"
                    >
                      <Phone className="h-4 w-4 text-gray-400" />
                      {sub.phone}
                    </a>
                  )}
                  {sub.email && (
                    <a 
                      href={`mailto:${sub.email}`}
                      className="flex items-center gap-3 text-gray-600 hover:text-blue-600"
                    >
                      <Mail className="h-4 w-4 text-gray-400" />
                      {sub.email}
                    </a>
                  )}
                </div>
              </div>

              {/* Performance */}
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4">Performance</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Rating</span>
                    {sub.rating ? (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                        <span className="font-medium">{sub.rating.toFixed(1)}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">Not rated</span>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Jobs Completed</span>
                    <span className="font-medium">{sub.jobs_completed || 0}</span>
                  </div>
                  {sub.avg_response_days && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Response</span>
                      <span className="font-medium">{sub.avg_response_days} days</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Banking */}
              {(sub.bank_name || sub.iban) && (
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    Banking
                  </h3>
                  <div className="space-y-2 text-sm">
                    {sub.bank_name && (
                      <div>
                        <p className="text-gray-500">Bank</p>
                        <p className="font-medium">{sub.bank_name}</p>
                      </div>
                    )}
                    {sub.account_number && (
                      <div>
                        <p className="text-gray-500">Account</p>
                        <p className="font-mono">{sub.account_number}</p>
                      </div>
                    )}
                    {sub.iban && (
                      <div>
                        <p className="text-gray-500">IBAN</p>
                        <p className="font-mono text-xs">{sub.iban}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Back Link */}
              <Link
                href="/subcontractors"
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to subcontractors
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
