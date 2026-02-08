'use client'

import { Header } from '@/components/layout/Header'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function NewProjectPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const supabase = createClient()

    // First, create or find the client
    const clientName = formData.get('client_name') as string
    const clientPhone = formData.get('client_phone') as string
    const clientEmail = formData.get('client_email') as string

    let clientId = null

    if (clientName && clientPhone) {
      // Check if client exists
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('phone', clientPhone)
        .single()

      if (existingClient) {
        clientId = existingClient.id
      } else {
        // Create new client
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            name: clientName,
            phone: clientPhone,
            email: clientEmail || null,
            community: formData.get('community') as string || null,
          })
          .select('id')
          .single()

        if (clientError) {
          setError('Failed to create client: ' + clientError.message)
          setLoading(false)
          return
        }
        clientId = newClient.id
      }
    }

    // Generate reference number
    const { count } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
    
    const refNumber = String((count || 0) + 1).padStart(3, '0')
    const reference = `BOL-2026-${refNumber}`

    // Create project
    const { error: projectError } = await supabase
      .from('projects')
      .insert({
        reference,
        client_id: clientId,
        status: 'enquiry',
        source: formData.get('source') as string,
        source_detail: formData.get('source_detail') as string || null,
        property_type: formData.get('property_type') as string,
        has_design: formData.get('has_design') as string,
        has_drawings: formData.get('has_drawings') as string,
        address: formData.get('address') as string || null,
        community: formData.get('community') as string || null,
        scope_summary: formData.get('scope_summary') as string || null,
        enquiry_date: new Date().toISOString().split('T')[0],
      })

    if (projectError) {
      setError('Failed to create project: ' + projectError.message)
      setLoading(false)
      return
    }

    router.push('/projects')
    router.refresh()
  }

  return (
    <div className="min-h-screen">
      <Header title="New Project" subtitle="Create a new enquiry" />
      
      <div className="p-6 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
              {error}
            </div>
          )}

          {/* Client Details */}
          <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Client Details</h2>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Name *
                </label>
                <input
                  type="text"
                  name="client_name"
                  required
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Mr Ahmed Al Maktoum"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone *
                </label>
                <input
                  type="tel"
                  name="client_phone"
                  required
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="+971 50 XXX XXXX"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="client_email"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="ahmed@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Community
                </label>
                <input
                  type="text"
                  name="community"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Dubai Marina"
                />
              </div>
            </div>
          </div>

          {/* Project Details */}
          <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Details</h2>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property Type *
                </label>
                <select
                  name="property_type"
                  required
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="villa">Villa</option>
                  <option value="apartment">Apartment</option>
                  <option value="office">Office</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="123 Marina Walk, Tower A, Unit 1501"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Has Design?
                </label>
                <select
                  name="has_design"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                  <option value="partial">Partial</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Has Drawings?
                </label>
                <select
                  name="has_drawings"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                  <option value="pending">Will Provide</option>
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scope of Work
                </label>
                <textarea
                  name="scope_summary"
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Full villa renovation including kitchen, bathrooms, flooring..."
                />
              </div>
            </div>
          </div>

          {/* Source */}
          <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Enquiry Source</h2>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  How did they find us? *
                </label>
                <select
                  name="source"
                  required
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="referral">Referral (client)</option>
                  <option value="designer">Designer Referral</option>
                  <option value="instagram">Instagram</option>
                  <option value="website">Website</option>
                  <option value="whatsapp">WhatsApp to Tom</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Referred by / Details
                </label>
                <input
                  type="text"
                  name="source_detail"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="John Smith (previous client)"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-gray-200 bg-white px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
