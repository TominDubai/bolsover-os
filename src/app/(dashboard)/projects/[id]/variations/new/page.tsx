'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import Link from 'next/link'

const REQUEST_TYPES = [
  { value: 'client_on_site', label: 'Client Request (On Site)' },
  { value: 'design_change', label: 'Design Change' },
  { value: 'unforeseen', label: 'Unforeseen Works' },
  { value: 'other', label: 'Other' },
]

export default function NewVariationPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    description: '',
    requested_by: 'client_on_site',
    request_notes: '',
    cost: '',
    price: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const generateReference = async () => {
    // Get count of existing variations for this project
    const { count } = await supabase
      .from('variations')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)

    const num = (count || 0) + 1
    return `VAR-${String(num).padStart(3, '0')}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.description.trim()) {
      setError('Description is required')
      return
    }

    setLoading(true)

    try {
      const reference = await generateReference()

      const { error: insertError } = await supabase
        .from('variations')
        .insert({
          project_id: projectId,
          reference,
          description: formData.description.trim(),
          requested_by: formData.requested_by,
          request_notes: formData.request_notes.trim() || null,
          cost: formData.cost ? parseFloat(formData.cost) : null,
          price: formData.price ? parseFloat(formData.price) : null,
          status: formData.cost && formData.price ? 'pricing' : 'draft',
          payment_status: 'pending',
          internal_status: 'pending',
          request_date: new Date().toISOString(),
        })

      if (insertError) throw insertError

      router.push(`/projects/${projectId}`)
      router.refresh()
    } catch (err) {
      console.error('Error creating variation:', err)
      setError('Failed to create variation')
    } finally {
      setLoading(false)
    }
  }

  // Auto-calculate price with 25% margin
  const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cost = e.target.value
    setFormData(prev => ({
      ...prev,
      cost,
      price: cost ? String(Math.round(parseFloat(cost) * 1.25)) : ''
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="New Variation"
        breadcrumbs={[
          { label: 'Projects', href: '/projects' },
          { label: 'Project', href: `/projects/${projectId}` },
          { label: 'New Variation' }
        ]}
      />

      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Request Type */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Request Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Request Type *
                  </label>
                  <select
                    name="requested_by"
                    value={formData.requested_by}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {REQUEST_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Describe the variation work required..."
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Notes
                  </label>
                  <textarea
                    name="request_notes"
                    value={formData.request_notes}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Any additional context or notes..."
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Pricing</h3>
              <p className="text-sm text-gray-500 mb-4">
                Optional — you can add pricing now or later
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost (AED)
                  </label>
                  <input
                    type="number"
                    name="cost"
                    value={formData.cost}
                    onChange={handleCostChange}
                    placeholder="0"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price to Client (AED)
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="0"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {formData.cost && formData.price && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Margin</span>
                    <span className="font-medium text-green-600">
                      {(((parseFloat(formData.price) - parseFloat(formData.cost)) / parseFloat(formData.cost)) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <Link
                href={`/projects/${projectId}`}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Cancel
              </Link>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Create Variation
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
