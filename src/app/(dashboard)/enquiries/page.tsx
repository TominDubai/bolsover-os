import { Header } from '@/components/layout/Header'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Phone, Mail, Calendar, ChevronRight, MessageSquare } from 'lucide-react'

const ENQUIRY_STATUSES = ['enquiry', 'qualifying', 'awaiting_design', 'ready_for_visit', 'site_visit_scheduled', 'visited', 'boq_in_progress']

const STATUS_LABELS: Record<string, string> = {
  enquiry: 'New Enquiry',
  qualifying: 'Qualifying',
  awaiting_design: 'Awaiting Design',
  ready_for_visit: 'Ready for Visit',
  site_visit_scheduled: 'Visit Scheduled',
  visited: 'Visited',
  boq_in_progress: 'BOQ In Progress',
}

const STATUS_COLORS: Record<string, string> = {
  enquiry: 'bg-blue-100 text-blue-700',
  qualifying: 'bg-purple-100 text-purple-700',
  awaiting_design: 'bg-amber-100 text-amber-700',
  ready_for_visit: 'bg-green-100 text-green-700',
  site_visit_scheduled: 'bg-cyan-100 text-cyan-700',
  visited: 'bg-teal-100 text-teal-700',
  boq_in_progress: 'bg-orange-100 text-orange-700',
}

const SOURCE_LABELS: Record<string, string> = {
  referral: 'Referral',
  designer: 'Designer',
  instagram: 'Instagram',
  website: 'Website',
  whatsapp: 'WhatsApp',
  other: 'Other',
}

export default async function EnquiriesPage() {
  const supabase = await createClient()

  const { data: enquiries, error } = await supabase
    .from('projects')
    .select(`
      *,
      client:clients(name, phone, email)
    `)
    .in('status', ENQUIRY_STATUSES)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching enquiries:', error)
  }

  const formatDate = (date: string | null) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short'
    })
  }

  // Group by status for kanban-style view
  const groupedEnquiries = ENQUIRY_STATUSES.reduce((acc, status) => {
    acc[status] = enquiries?.filter(e => e.status === status) || []
    return acc
  }, {} as Record<string, typeof enquiries>)

  return (
    <div className="min-h-screen">
      <Header 
        title="Enquiries" 
        subtitle="Pipeline of potential projects"
        actions={
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New Enquiry
          </Link>
        }
      />

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-2xl font-bold text-gray-900">{enquiries?.length || 0}</p>
            <p className="text-sm text-gray-500">Total Enquiries</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-2xl font-bold text-blue-700">
              {enquiries?.filter(e => e.status === 'enquiry').length || 0}
            </p>
            <p className="text-sm text-blue-600">New</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-4">
            <p className="text-2xl font-bold text-amber-700">
              {enquiries?.filter(e => ['ready_for_visit', 'site_visit_scheduled'].includes(e.status)).length || 0}
            </p>
            <p className="text-sm text-amber-600">Pending Visit</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-2xl font-bold text-green-700">
              {enquiries?.filter(e => e.status === 'boq_in_progress').length || 0}
            </p>
            <p className="text-sm text-green-600">Quoting</p>
          </div>
        </div>

        {/* Enquiries List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">All Enquiries</h3>
          </div>

          {enquiries && enquiries.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {enquiries.map((enquiry) => (
                <Link
                  key={enquiry.id}
                  href={`/projects/${enquiry.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="font-medium text-gray-900">
                          {enquiry.client?.name || 'No client'}
                        </p>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[enquiry.status]}`}>
                          {STATUS_LABELS[enquiry.status] || enquiry.status}
                        </span>
                        {enquiry.source && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {SOURCE_LABELS[enquiry.source] || enquiry.source}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        {enquiry.community && (
                          <span>{enquiry.community}</span>
                        )}
                        {enquiry.client?.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {enquiry.client.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(enquiry.enquiry_date || enquiry.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="font-medium text-gray-900">No enquiries yet</p>
              <p className="text-sm mt-1">New project enquiries will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
