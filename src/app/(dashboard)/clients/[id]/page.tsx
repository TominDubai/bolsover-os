import { Header } from '@/components/layout/Header'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { 
  Phone, 
  Mail, 
  MapPin, 
  Edit, 
  ArrowLeft,
  FolderOpen,
  Calendar,
  ChevronRight
} from 'lucide-react'
import { STATUS_LABELS, STATUS_COLORS, type ProjectStatus } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !client) {
    notFound()
  }

  // Get projects for this client
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('client_id', id)
    .order('created_at', { ascending: false })

  const formatDate = (date: string | null) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '—'
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const totalValue = projects?.reduce((sum, p) => sum + (p.contract_value || 0), 0) || 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title={client.name}
        breadcrumbs={[
          { label: 'Clients', href: '/clients' },
          { label: client.name }
        ]}
        actions={
          <Link
            href={`/clients/${id}/edit`}
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
              {/* Projects */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Projects</h3>
                  <Link
                    href={`/projects/new?client=${id}`}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + New Project
                  </Link>
                </div>

                {projects && projects.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {projects.map((project) => (
                      <Link
                        key={project.id}
                        href={`/projects/${project.id}`}
                        className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-3">
                            <p className="font-medium text-gray-900">{project.reference || 'No reference'}</p>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[project.status as ProjectStatus] || 'bg-gray-100 text-gray-800'}`}>
                              {STATUS_LABELS[project.status as ProjectStatus] || project.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                            {project.community && <span>{project.community}</span>}
                            <span>{formatCurrency(project.contract_value)}</span>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <FolderOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p>No projects with this client yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Contact Info */}
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4">Contact</h3>
                <div className="space-y-3">
                  {client.phone && (
                    <a 
                      href={`tel:${client.phone}`}
                      className="flex items-center gap-3 text-gray-600 hover:text-blue-600"
                    >
                      <Phone className="h-4 w-4 text-gray-400" />
                      {client.phone}
                    </a>
                  )}
                  {client.email && (
                    <a 
                      href={`mailto:${client.email}`}
                      className="flex items-center gap-3 text-gray-600 hover:text-blue-600"
                    >
                      <Mail className="h-4 w-4 text-gray-400" />
                      {client.email}
                    </a>
                  )}
                  {(client.address || client.community) && (
                    <div className="flex items-start gap-3 text-gray-600">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div>
                        {client.community && <p>{client.community}</p>}
                        {client.address && <p className="text-sm">{client.address}</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4">Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Projects</span>
                    <span className="font-medium">{projects?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Value</span>
                    <span className="font-medium">{formatCurrency(totalValue)}</span>
                  </div>
                  {client.source && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Source</span>
                      <span className="font-medium capitalize">{client.source}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Added</span>
                    <span>{formatDate(client.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {client.notes && (
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-3">Notes</h3>
                  <p className="text-gray-600 text-sm whitespace-pre-wrap">{client.notes}</p>
                </div>
              )}

              {/* Back Link */}
              <Link
                href="/clients"
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to clients
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
