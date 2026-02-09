'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { ArrowLeft, Loader2, Save, DollarSign } from 'lucide-react'
import Link from 'next/link'

const INVOICE_TYPES = [
  { value: 'deposit', label: 'Deposit', description: 'Initial deposit payment' },
  { value: 'progress', label: 'Progress', description: 'Progress payment based on % complete' },
  { value: 'variation', label: 'Variation', description: 'Payment for approved variations' },
  { value: 'final', label: 'Final', description: 'Final payment on completion' },
]

export default function NewInvoicePage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [project, setProject] = useState<{ contract_value: number | null } | null>(null)

  const [formData, setFormData] = useState({
    invoice_type: 'progress',
    amount: '',
    description: '',
    progress_percent: '',
    due_date: '',
  })

  useEffect(() => {
    async function fetchProject() {
      const { data } = await supabase
        .from('projects')
        .select('contract_value')
        .eq('id', projectId)
        .single()
      if (data) setProject(data)
    }
    fetchProject()
  }, [projectId, supabase])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const setInvoiceType = (type: string) => {
    let newData = { ...formData, invoice_type: type }
    
    // Auto-set amounts for common types
    if (type === 'deposit' && project?.contract_value) {
      newData.amount = String(Math.round(project.contract_value * 0.5)) // 50% deposit
      newData.description = '50% deposit payment'
      newData.progress_percent = ''
    } else if (type === 'final' && project?.contract_value) {
      newData.description = 'Final payment on completion'
      newData.progress_percent = ''
    }
    
    setFormData(newData)
  }

  const calculateFromPercent = () => {
    if (project?.contract_value && formData.progress_percent) {
      const percent = parseFloat(formData.progress_percent)
      const amount = Math.round((project.contract_value * percent) / 100)
      setFormData(prev => ({ ...prev, amount: String(amount) }))
    }
  }

  const generateReference = async () => {
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)

    const num = (count || 0) + 1
    return `INV-${new Date().getFullYear()}-${String(num).padStart(3, '0')}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Amount is required')
      return
    }

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const reference = await generateReference()

      // Calculate due date (default 14 days from now)
      const dueDate = formData.due_date || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const { error: insertError } = await supabase
        .from('invoices')
        .insert({
          project_id: projectId,
          invoice_type: formData.invoice_type,
          reference,
          amount: parseFloat(formData.amount),
          description: formData.description.trim() || null,
          progress_percent: formData.progress_percent ? parseInt(formData.progress_percent) : null,
          status: 'draft',
          issued_date: new Date().toISOString().split('T')[0],
          due_date: dueDate,
          created_by: user?.id,
        })

      if (insertError) throw insertError

      router.push(`/projects/${projectId}/invoices`)
      router.refresh()
    } catch (err) {
      console.error('Error creating invoice:', err)
      setError('Failed to create invoice')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="New Invoice"
        breadcrumbs={[
          { label: 'Projects', href: '/projects' },
          { label: 'Project', href: `/projects/${projectId}` },
          { label: 'Invoices', href: `/projects/${projectId}/invoices` },
          { label: 'New Invoice' }
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

            {/* Contract Value Reference */}
            {project?.contract_value && (
              <div className="bg-blue-50 rounded-xl p-4 flex items-center justify-between">
                <span className="text-sm text-blue-700">Contract Value</span>
                <span className="font-semibold text-blue-900">{formatCurrency(project.contract_value)}</span>
              </div>
            )}

            {/* Invoice Type */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Invoice Type</h3>
              
              <div className="grid grid-cols-2 gap-3">
                {INVOICE_TYPES.map(type => {
                  const isSelected = formData.invoice_type === type.value
                  
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setInvoiceType(type.value)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                        {type.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Amount */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Amount</h3>
              
              <div className="space-y-4">
                {formData.invoice_type === 'progress' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Progress Percentage
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        name="progress_percent"
                        value={formData.progress_percent}
                        onChange={handleChange}
                        placeholder="e.g. 30"
                        min="0"
                        max="100"
                        className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={calculateFromPercent}
                        className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Calculate
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Amount (AED) *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Quick Amount Buttons */}
                {project?.contract_value && (
                  <div className="flex flex-wrap gap-2">
                    {[10, 20, 30, 50].map(percent => {
                      const contractValue = project.contract_value!
                      return (
                        <button
                          key={percent}
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            amount: String(Math.round((contractValue * percent) / 100)),
                            progress_percent: String(percent)
                          }))}
                          className="px-3 py-1.5 rounded-lg bg-gray-100 text-sm text-gray-700 hover:bg-gray-200"
                        >
                          {percent}% ({formatCurrency(Math.round((contractValue * percent) / 100))})
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Invoice description..."
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Default: 14 days from today</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <Link
                href={`/projects/${projectId}/invoices`}
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
                    Create Invoice
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
