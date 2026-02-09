import { Header } from '@/components/layout/Header'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Phone, Mail, Star, ChevronRight, Search, Building2, Filter } from 'lucide-react'

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

export default async function SubcontractorsPage() {
  const supabase = await createClient()

  const { data: subcontractors, error } = await supabase
    .from('subcontractors')
    .select('*')
    .eq('is_active', true)
    .order('company_name', { ascending: true })

  if (error) {
    console.error('Error fetching subcontractors:', error)
  }

  // Get unique trades for filter
  const allTrades = new Set<string>()
  subcontractors?.forEach(sub => {
    sub.trades?.forEach((trade: string) => allTrades.add(trade))
  })

  return (
    <div className="min-h-screen">
      <Header 
        title="Subcontractors" 
        subtitle={`${subcontractors?.length || 0} active subcontractors`}
        actions={
          <Link
            href="/subcontractors/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Subcontractor
          </Link>
        }
      />

      <div className="p-6">
        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search subcontractors..."
              className="h-10 w-full rounded-lg border border-gray-200 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            {Array.from(allTrades).slice(0, 6).map(trade => (
              <button
                key={trade}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${TRADE_COLORS[trade] || 'bg-gray-100 text-gray-700'}`}
              >
                {trade}
              </button>
            ))}
            {allTrades.size > 6 && (
              <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600">
                +{allTrades.size - 6} more
              </button>
            )}
          </div>
        </div>

        {/* Subcontractors Table */}
        {subcontractors && subcontractors.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Trades
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Jobs
                  </th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subcontractors.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/subcontractors/${sub.id}`} className="block">
                        <p className="font-medium text-gray-900">{sub.company_name}</p>
                        {sub.contact_name && (
                          <p className="text-sm text-gray-500">{sub.contact_name}</p>
                        )}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {sub.phone && (
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {sub.phone}
                          </p>
                        )}
                        {sub.email && (
                          <p className="text-sm text-gray-600 flex items-center gap-1 truncate max-w-[200px]">
                            <Mail className="h-3 w-3" />
                            {sub.email}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {sub.trades?.slice(0, 3).map((trade: string) => (
                          <span 
                            key={trade}
                            className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${TRADE_COLORS[trade] || 'bg-gray-100 text-gray-700'}`}
                          >
                            {trade}
                          </span>
                        ))}
                        {sub.trades?.length > 3 && (
                          <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-500">
                            +{sub.trades.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {sub.rating ? (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                          <span className="font-medium">{sub.rating.toFixed(1)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600">{sub.jobs_completed || 0}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Link 
                        href={`/subcontractors/${sub.id}`}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
            <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No subcontractors yet</h3>
            <p className="text-gray-500 mb-6">Add your subcontractor database to get started</p>
            <Link
              href="/subcontractors/new"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Subcontractor
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
