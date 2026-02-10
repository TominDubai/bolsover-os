'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, 
  FileText,
  CheckCircle2,
  Clock,
  Send,
  Loader2,
  ChevronDown,
  ChevronRight,
  Upload,
  Trash2
} from 'lucide-react'
import Link from 'next/link'

interface BOQTabProps {
  projectId: string
}

interface BOQ {
  id: string
  reference: string | null
  status: string
  version: number
  total_cost: number | null
  margin_percent: number | null
  client_price: number | null
  submitted_at: string | null
  approved_at: string | null
  sent_to_client_at: string | null
  created_at: string
}

interface BOQCategory {
  id: string
  name: string
  sort_order: number
  subtotal_cost: number | null
  subtotal_price: number | null
}

interface BOQItem {
  id: string
  category_id: string
  item_code: string | null
  description: string
  quantity: number | null
  unit: string | null
  is_inhouse: boolean
  cost: number | null
  price: number | null
  image_url: string | null
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_approval: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  sent: 'bg-blue-100 text-blue-700',
  superseded: 'bg-gray-100 text-gray-500',
}

export function BOQTab({ projectId }: BOQTabProps) {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [boqs, setBOQs] = useState<BOQ[]>([])
  const [activeBOQ, setActiveBOQ] = useState<BOQ | null>(null)
  const [categories, setCategories] = useState<BOQCategory[]>([])
  const [items, setItems] = useState<BOQItem[]>([])
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const supabase = createClient()

  const handleSubmitForApproval = async () => {
    if (!activeBOQ) return
    setSubmitting(true)
    
    try {
      const { error } = await supabase
        .from('boq')
        .update({
          status: 'pending_approval',
          submitted_at: new Date().toISOString(),
        })
        .eq('id', activeBOQ.id)

      if (error) throw error

      // Update local state
      setActiveBOQ({ ...activeBOQ, status: 'pending_approval', submitted_at: new Date().toISOString() })
      setBOQs(boqs.map(b => b.id === activeBOQ.id ? { ...b, status: 'pending_approval' } : b))
    } catch (err) {
      console.error('Failed to submit:', err)
      alert('Failed to submit BOQ for approval')
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async () => {
    if (!activeBOQ) return
    setSubmitting(true)
    
    try {
      const { error } = await supabase
        .from('boq')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('id', activeBOQ.id)

      if (error) throw error

      setActiveBOQ({ ...activeBOQ, status: 'approved', approved_at: new Date().toISOString() })
      setBOQs(boqs.map(b => b.id === activeBOQ.id ? { ...b, status: 'approved' } : b))
    } catch (err) {
      console.error('Failed to approve:', err)
      alert('Failed to approve BOQ')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSendToClient = async () => {
    if (!activeBOQ) return
    setSubmitting(true)
    
    try {
      const { error } = await supabase
        .from('boq')
        .update({
          status: 'sent',
          sent_to_client_at: new Date().toISOString(),
        })
        .eq('id', activeBOQ.id)

      if (error) throw error

      setActiveBOQ({ ...activeBOQ, status: 'sent', sent_to_client_at: new Date().toISOString() })
      setBOQs(boqs.map(b => b.id === activeBOQ.id ? { ...b, status: 'sent' } : b))
    } catch (err) {
      console.error('Failed to send:', err)
      alert('Failed to mark as sent')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteBOQ = async (boqId: string) => {
    if (!confirm('Delete this BOQ? This cannot be undone.')) return
    setSubmitting(true)
    
    try {
      // Delete BOQ (cascade will handle items and categories)
      const { error } = await supabase
        .from('boq')
        .delete()
        .eq('id', boqId)

      if (error) throw error

      // Update local state
      const remainingBOQs = boqs.filter(b => b.id !== boqId)
      setBOQs(remainingBOQs)
      
      // If we deleted the active BOQ, switch to another
      if (activeBOQ?.id === boqId) {
        setActiveBOQ(remainingBOQs[0] || null)
        setCategories([])
        setItems([])
      }
    } catch (err) {
      console.error('Failed to delete:', err)
      alert('Failed to delete BOQ')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    async function fetchBOQs() {
      setLoading(true)
      
      const { data } = await supabase
        .from('boq')
        .select('*')
        .eq('project_id', projectId)
        .order('version', { ascending: false })

      if (data && data.length > 0) {
        setBOQs(data)
        // Set the latest non-superseded BOQ as active
        const active = data.find(b => b.status !== 'superseded') || data[0]
        setActiveBOQ(active)
      }
      
      setLoading(false)
    }

    fetchBOQs()
  }, [projectId, supabase])

  useEffect(() => {
    async function fetchBOQDetails() {
      if (!activeBOQ) return

      const [categoriesResult, itemsResult] = await Promise.all([
        supabase
          .from('boq_categories')
          .select('*')
          .eq('boq_id', activeBOQ.id)
          .order('sort_order'),
        supabase
          .from('boq_items')
          .select('*')
          .eq('boq_id', activeBOQ.id)
          .order('sort_order')
      ])

      if (categoriesResult.data) setCategories(categoriesResult.data)
      if (itemsResult.data) setItems(itemsResult.data)
    }

    fetchBOQDetails()
  }, [activeBOQ, supabase])

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '—'
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (boqs.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No BOQ Created</h3>
        <p className="text-gray-500 mb-6">Create a Bill of Quantities to start pricing this project</p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href={`/projects/${projectId}/boq/import`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Upload className="h-4 w-4" />
            Import from Excel
          </Link>
          <Link
            href={`/projects/${projectId}/boq/new`}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create Manually
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* BOQ Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-medium text-gray-900">
            {activeBOQ?.reference || 'BOQ'}
          </h3>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[activeBOQ?.status || 'draft']}`}>
            {activeBOQ?.status.replace('_', ' ')}
          </span>
          <span className="text-sm text-gray-500">v{activeBOQ?.version}</span>
        </div>
        <div className="flex items-center gap-2">
          {activeBOQ?.status === 'draft' && (
            <button 
              onClick={handleSubmitForApproval}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
              Submit for Approval
            </button>
          )}
          {activeBOQ?.status === 'pending_approval' && (
            <button 
              onClick={handleApprove}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Approve BOQ
            </button>
          )}
          {activeBOQ?.status === 'approved' && (
            <button 
              onClick={handleSendToClient}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send to Client
            </button>
          )}
          <Link
            href={`/projects/${projectId}/boq/import`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Upload className="h-4 w-4" />
            Import
          </Link>
          <Link
            href={`/projects/${projectId}/boq/pdf`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Manage BOQ PDFs
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">Total Cost</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(activeBOQ?.total_cost)}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">Margin</p>
          <p className="text-lg font-semibold text-gray-900">
            {activeBOQ?.margin_percent ? `${activeBOQ.margin_percent}%` : '—'}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">Client Price</p>
          <p className="text-lg font-semibold text-blue-600">
            {formatCurrency(activeBOQ?.client_price)}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">Items</p>
          <p className="text-lg font-semibold text-gray-900">{items.length}</p>
        </div>
      </div>

      {/* Categories & Items */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {categories.length > 0 ? (
          categories.map((category) => {
            const categoryItems = items.filter(i => i.category_id === category.id)
            const isExpanded = expandedCategories.has(category.id)

            return (
              <div key={category.id} className="border-b last:border-b-0">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="font-medium text-gray-900">{category.name}</span>
                    <span className="text-sm text-gray-500">({categoryItems.length} items)</span>
                  </div>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(category.subtotal_price)}
                  </span>
                </button>

                {isExpanded && categoryItems.length > 0 && (
                  <div className="bg-gray-50 border-t">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-gray-500 uppercase">
                          <th className="text-left px-4 py-2 w-16">Code</th>
                          <th className="text-left px-4 py-2">Description</th>
                          <th className="text-right px-4 py-2 w-20">Qty</th>
                          <th className="text-left px-4 py-2 w-16">Unit</th>
                          <th className="text-right px-4 py-2 w-28">Cost</th>
                          <th className="text-right px-4 py-2 w-28">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoryItems.map((item) => (
                          <tr key={item.id} className="border-t border-gray-200">
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {item.item_code || '—'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              <div className="flex items-start gap-3">
                                {item.image_url && (
                                  <a 
                                    href={item.image_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex-shrink-0"
                                  >
                                    <img 
                                      src={item.image_url} 
                                      alt="" 
                                      className="w-36 h-36 object-cover rounded border border-gray-200 hover:border-blue-400 transition-colors"
                                    />
                                  </a>
                                )}
                                <span>{item.description}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-600">
                              {item.quantity || 1}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {item.unit || 'item'}
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-600">
                              {formatCurrency(item.cost)}
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                              {formatCurrency(item.price)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Link
                                href={`/projects/${projectId}/boq/${activeBOQ.id}/edit#item-${item.id}`}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                Edit
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <div className="p-8 text-center text-gray-500">
            No categories added yet
          </div>
        )}
      </div>

      {/* Version History & Management */}
      {boqs.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-3">
            {boqs.length > 1 ? 'Version History' : 'BOQ Management'}
          </h4>
          <div className="space-y-2">
            {boqs.map((boq) => (
              <div
                key={boq.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  activeBOQ?.id === boq.id 
                    ? 'border-blue-200 bg-blue-50' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <button
                  onClick={() => setActiveBOQ(boq)}
                  className="flex items-center gap-3 flex-1"
                >
                  <span className="font-medium">v{boq.version}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[boq.status]}`}>
                    {boq.status.replace('_', ' ')}
                  </span>
                  <span className="text-sm text-gray-500">
                    {formatCurrency(boq.client_price)}
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteBOQ(boq.id)
                  }}
                  disabled={submitting}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                  title="Delete this BOQ"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
