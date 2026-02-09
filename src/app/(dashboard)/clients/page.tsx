import { Header } from '@/components/layout/Header'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Phone, Mail, MapPin, ChevronRight, Users, Search } from 'lucide-react'

export default async function ClientsPage() {
  const supabase = await createClient()

  const { data: clients, error } = await supabase
    .from('clients')
    .select('*')
    .order('name', { ascending: true })

  // Get project counts per client
  const { data: projectCounts } = await supabase
    .from('projects')
    .select('client_id')

  const clientProjectCounts = projectCounts?.reduce((acc, p) => {
    if (p.client_id) {
      acc[p.client_id] = (acc[p.client_id] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>) || {}

  if (error) {
    console.error('Error fetching clients:', error)
  }

  return (
    <div className="min-h-screen">
      <Header 
        title="Clients" 
        subtitle={`${clients?.length || 0} clients`}
        actions={
          <Link
            href="/clients/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Client
          </Link>
        }
      />

      <div className="p-6">
        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search clients..."
              className="h-10 w-full rounded-lg border border-gray-200 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Clients Grid */}
        {clients && clients.length > 0 ? (
          <div className="grid grid-cols-3 gap-4">
            {clients.map((client) => (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{client.name}</h3>
                    {client.community && (
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {client.community}
                      </p>
                    )}
                  </div>
                  {clientProjectCounts[client.id] > 0 && (
                    <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded">
                      {clientProjectCounts[client.id]} project{clientProjectCounts[client.id] > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  {client.phone && (
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      {client.phone}
                    </p>
                  )}
                  {client.email && (
                    <p className="text-sm text-gray-600 flex items-center gap-2 truncate">
                      <Mail className="h-4 w-4 text-gray-400" />
                      {client.email}
                    </p>
                  )}
                </div>

                {client.source && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      Source: <span className="text-gray-700">{client.source}</span>
                    </p>
                  </div>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No clients yet</h3>
            <p className="text-gray-500 mb-6">Add your first client to get started</p>
            <Link
              href="/clients/new"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Client
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
