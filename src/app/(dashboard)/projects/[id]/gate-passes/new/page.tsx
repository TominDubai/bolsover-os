'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { ArrowLeft, Loader2, Save, User, Building2, Truck } from 'lucide-react'
import Link from 'next/link'

const PASS_TYPES = [
  { value: 'main_site', label: 'Main Site Access', icon: Building2, description: 'General site access for the project' },
  { value: 'individual', label: 'Individual', icon: User, description: 'Single person access pass' },
  { value: 'subcontractor', label: 'Subcontractor', icon: Building2, description: 'For subcontractor companies' },
  { value: 'vehicle', label: 'Vehicle', icon: Truck, description: 'Vehicle entry permit' },
]

export default function NewGatePassPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    pass_type: 'individual',
    name: '',
    company: '',
    emirates_id: '',
    valid_from: new Date().toISOString().split('T')[0],
    valid_to: '',
    notes: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const setPassType = (type: string) => {
    setFormData(prev => ({ ...prev, pass_type: type }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.name.trim()) {
      setError('Name is required')
      return
    }
    if (!formData.valid_from || !formData.valid_to) {
      setError('Valid period is required')
      return
    }

    setLoading(true)

    try {
      const { error: insertError } = await supabase
        .from('gate_passes')
        .insert({
          project_id: projectId,
          pass_type: formData.pass_type,
          name: formData.name.trim(),
          company: formData.company.trim() || null,
          emirates_id: formData.emirates_id.trim() || null,
          valid_from: formData.valid_from,
          valid_to: formData.valid_to,
          status: 'active',
          notes: formData.notes.trim() || null,
        })

      if (insertError) throw insertError

      router.push(`/projects/${projectId}/gate-passes`)
      router.refresh()
    } catch (err) {
      console.error('Error creating gate pass:', err)
      setError('Failed to create gate pass')
    } finally {
      setLoading(false)
    }
  }

  // Auto-set 3-month validity
  const setThreeMonthValidity = () => {
    const start = new Date(formData.valid_from || new Date())
    const end = new Date(start)
    end.setMonth(end.getMonth() + 3)
    setFormData(prev => ({ 
      ...prev, 
      valid_to: end.toISOString().split('T')[0] 
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="New Gate Pass"
        breadcrumbs={[
          { label: 'Projects', href: '/projects' },
          { label: 'Project', href: `/projects/${projectId}` },
          { label: 'Gate Passes', href: `/projects/${projectId}/gate-passes` },
          { label: 'New Pass' }
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

            {/* Pass Type */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Pass Type</h3>
              
              <div className="grid grid-cols-2 gap-3">
                {PASS_TYPES.map(type => {
                  const Icon = type.icon
                  const isSelected = formData.pass_type === type.value
                  
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setPassType(type.value)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className={`h-5 w-5 mb-2 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                      <p className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                        {type.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Details */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Pass Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.pass_type === 'vehicle' ? 'Vehicle / Plate Number' : 'Name'} *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder={formData.pass_type === 'vehicle' ? 'e.g. White Toyota Hiace - A 12345' : 'Full name'}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    placeholder="Company name"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {formData.pass_type !== 'vehicle' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Emirates ID
                    </label>
                    <input
                      type="text"
                      name="emirates_id"
                      value={formData.emirates_id}
                      onChange={handleChange}
                      placeholder="784-XXXX-XXXXXXX-X"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Validity */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Validity Period</h3>
                <button
                  type="button"
                  onClick={setThreeMonthValidity}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Set 3 months
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid From *
                  </label>
                  <input
                    type="date"
                    name="valid_from"
                    value={formData.valid_from}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid To *
                  </label>
                  <input
                    type="date"
                    name="valid_to"
                    value={formData.valid_to}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Notes</h3>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                placeholder="Any additional notes..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <Link
                href={`/projects/${projectId}/gate-passes`}
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
                    Create Pass
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
