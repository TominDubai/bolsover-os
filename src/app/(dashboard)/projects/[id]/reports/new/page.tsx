'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { ArrowLeft, Loader2, Save, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

const PROGRESS_OPTIONS = [
  { value: 'on_track', label: 'On Track', icon: CheckCircle2, color: 'border-green-500 bg-green-50' },
  { value: 'minor_delay', label: 'Minor Delay', icon: Clock, color: 'border-amber-500 bg-amber-50' },
  { value: 'major_issue', label: 'Major Issue', icon: AlertTriangle, color: 'border-red-500 bg-red-50' },
]

export default function NewReportPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    report_date: new Date().toISOString().split('T')[0],
    progress_status: 'on_track',
    notes: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleStatusChange = (status: string) => {
    setFormData(prev => ({ ...prev, progress_status: status }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()

      const { error: insertError } = await supabase
        .from('daily_reports')
        .insert({
          project_id: projectId,
          report_date: formData.report_date,
          progress_status: formData.progress_status,
          notes: formData.notes.trim() || null,
          submitted_by: user?.id,
          submitted_at: new Date().toISOString(),
        })

      if (insertError) throw insertError

      router.push(`/projects/${projectId}`)
      router.refresh()
    } catch (err) {
      console.error('Error creating report:', err)
      setError('Failed to create report')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="Daily Report"
        breadcrumbs={[
          { label: 'Projects', href: '/projects' },
          { label: 'Project', href: `/projects/${projectId}` },
          { label: 'New Report' }
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

            {/* Date */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Report Date
              </label>
              <input
                type="date"
                name="report_date"
                value={formData.report_date}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Progress Status */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Progress Status
              </label>
              <div className="grid grid-cols-3 gap-4">
                {PROGRESS_OPTIONS.map(option => {
                  const Icon = option.icon
                  const isSelected = formData.progress_status === option.value
                  
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleStatusChange(option.value)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        isSelected 
                          ? option.color + ' border-current' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className={`h-6 w-6 mx-auto mb-2 ${
                        isSelected 
                          ? option.value === 'on_track' ? 'text-green-600' 
                            : option.value === 'minor_delay' ? 'text-amber-600' 
                            : 'text-red-600'
                          : 'text-gray-400'
                      }`} />
                      <p className={`text-sm font-medium ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>
                        {option.label}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Progress Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={5}
                placeholder="What was accomplished today? Any issues or blockers?"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* TODO: Photo upload would go here */}

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
                    Submitting...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Submit Report
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
