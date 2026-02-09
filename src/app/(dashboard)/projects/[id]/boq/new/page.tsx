'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { 
  ArrowLeft, 
  Loader2, 
  Save, 
  Plus, 
  Trash2, 
  GripVertical,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'

interface BOQItem {
  id: string
  description: string
  is_inhouse: boolean
  cost: number
  price: number
}

interface BOQCategory {
  id: string
  name: string
  items: BOQItem[]
  expanded: boolean
}

const DEFAULT_MARGIN = 0.25 // 25%

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

export default function NewBOQPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [marginPercent, setMarginPercent] = useState(25)

  const [categories, setCategories] = useState<BOQCategory[]>([
    { id: generateId(), name: 'Preliminaries', items: [], expanded: true }
  ])

  const addCategory = () => {
    setCategories([
      ...categories,
      { id: generateId(), name: '', items: [], expanded: true }
    ])
  }

  const updateCategoryName = (categoryId: string, name: string) => {
    setCategories(categories.map(cat => 
      cat.id === categoryId ? { ...cat, name } : cat
    ))
  }

  const toggleCategory = (categoryId: string) => {
    setCategories(categories.map(cat => 
      cat.id === categoryId ? { ...cat, expanded: !cat.expanded } : cat
    ))
  }

  const removeCategory = (categoryId: string) => {
    if (categories.length <= 1) return
    setCategories(categories.filter(cat => cat.id !== categoryId))
  }

  const addItem = (categoryId: string) => {
    setCategories(categories.map(cat => {
      if (cat.id !== categoryId) return cat
      return {
        ...cat,
        items: [
          ...cat.items,
          { id: generateId(), description: '', is_inhouse: false, cost: 0, price: 0 }
        ]
      }
    }))
  }

  const updateItem = (categoryId: string, itemId: string, updates: Partial<BOQItem>) => {
    setCategories(categories.map(cat => {
      if (cat.id !== categoryId) return cat
      return {
        ...cat,
        items: cat.items.map(item => {
          if (item.id !== itemId) return item
          const updated = { ...item, ...updates }
          // Auto-calculate price if cost changed and price wasn't manually set
          if ('cost' in updates && updates.cost !== undefined) {
            updated.price = Math.round(updates.cost * (1 + marginPercent / 100))
          }
          return updated
        })
      }
    }))
  }

  const removeItem = (categoryId: string, itemId: string) => {
    setCategories(categories.map(cat => {
      if (cat.id !== categoryId) return cat
      return {
        ...cat,
        items: cat.items.filter(item => item.id !== itemId)
      }
    }))
  }

  // Calculate totals
  const totalCost = categories.reduce((sum, cat) => 
    sum + cat.items.reduce((itemSum, item) => itemSum + (item.cost || 0), 0), 0
  )
  const totalPrice = categories.reduce((sum, cat) => 
    sum + cat.items.reduce((itemSum, item) => itemSum + (item.price || 0), 0), 0
  )
  const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0)
  const actualMargin = totalCost > 0 ? ((totalPrice - totalCost) / totalCost * 100).toFixed(1) : '0'

  const generateReference = async () => {
    const { count } = await supabase
      .from('boq')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)

    const num = (count || 0) + 1
    return `BOQ-${new Date().getFullYear()}-${String(num).padStart(3, '0')}`
  }

  const handleSubmit = async () => {
    setError(null)

    // Validate
    if (categories.some(cat => !cat.name.trim())) {
      setError('All categories must have a name')
      return
    }

    if (totalItems === 0) {
      setError('Add at least one item to the BOQ')
      return
    }

    setLoading(true)

    try {
      const reference = await generateReference()

      // Create BOQ
      const { data: boq, error: boqError } = await supabase
        .from('boq')
        .insert({
          project_id: projectId,
          reference,
          status: 'draft',
          version: 1,
          total_cost: totalCost,
          margin_percent: parseFloat(actualMargin),
          client_price: totalPrice,
        })
        .select()
        .single()

      if (boqError) throw boqError

      // Create categories and items
      for (let i = 0; i < categories.length; i++) {
        const cat = categories[i]
        
        const { data: category, error: catError } = await supabase
          .from('boq_categories')
          .insert({
            boq_id: boq.id,
            name: cat.name,
            sort_order: i,
            subtotal_cost: cat.items.reduce((sum, item) => sum + (item.cost || 0), 0),
            subtotal_price: cat.items.reduce((sum, item) => sum + (item.price || 0), 0),
          })
          .select()
          .single()

        if (catError) throw catError

        // Create items
        if (cat.items.length > 0) {
          const { error: itemsError } = await supabase
            .from('boq_items')
            .insert(
              cat.items.map((item, j) => ({
                boq_id: boq.id,
                category_id: category.id,
                description: item.description,
                is_inhouse: item.is_inhouse,
                cost: item.cost,
                price: item.price,
                sort_order: j,
              }))
            )

          if (itemsError) throw itemsError
        }
      }

      router.push(`/projects/${projectId}`)
      router.refresh()
    } catch (err) {
      console.error('Error creating BOQ:', err)
      setError('Failed to create BOQ')
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
        title="Create BOQ"
        breadcrumbs={[
          { label: 'Projects', href: '/projects' },
          { label: 'Project', href: `/projects/${projectId}` },
          { label: 'New BOQ' }
        ]}
      />

      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-600 mb-6">
              {error}
            </div>
          )}

          {/* Summary Bar */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6 sticky top-16 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Total Cost</p>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(totalCost)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Client Price</p>
                  <p className="text-lg font-semibold text-blue-600">{formatCurrency(totalPrice)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Margin</p>
                  <p className="text-lg font-semibold text-green-600">{actualMargin}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Items</p>
                  <p className="text-lg font-semibold text-gray-900">{totalItems}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Default margin:</label>
                  <input
                    type="number"
                    value={marginPercent}
                    onChange={(e) => setMarginPercent(parseInt(e.target.value) || 0)}
                    className="w-16 rounded border border-gray-300 px-2 py-1 text-sm text-center"
                  />
                  <span className="text-sm text-gray-600">%</span>
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save BOQ
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-4">
            {categories.map((category, catIndex) => (
              <div key={category.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Category Header */}
                <div className="flex items-center gap-3 p-4 bg-gray-50 border-b">
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    {category.expanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                  <input
                    type="text"
                    value={category.name}
                    onChange={(e) => updateCategoryName(category.id, e.target.value)}
                    placeholder="Category name"
                    className="flex-1 bg-transparent border-none text-lg font-semibold text-gray-900 focus:outline-none focus:ring-0 placeholder-gray-400"
                  />
                  <span className="text-sm text-gray-500">
                    {category.items.length} items · {formatCurrency(
                      category.items.reduce((sum, item) => sum + (item.price || 0), 0)
                    )}
                  </span>
                  {categories.length > 1 && (
                    <button
                      onClick={() => removeCategory(category.id)}
                      className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Items */}
                {category.expanded && (
                  <div className="p-4">
                    {category.items.length > 0 && (
                      <div className="mb-4">
                        <div className="grid grid-cols-12 gap-3 text-xs text-gray-500 uppercase mb-2 px-2">
                          <div className="col-span-5">Description</div>
                          <div className="col-span-2 text-center">Type</div>
                          <div className="col-span-2 text-right">Cost</div>
                          <div className="col-span-2 text-right">Price</div>
                          <div className="col-span-1"></div>
                        </div>
                        {category.items.map((item) => (
                          <div key={item.id} className="grid grid-cols-12 gap-3 items-center py-2 border-b border-gray-100 last:border-0">
                            <div className="col-span-5">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => updateItem(category.id, item.id, { description: e.target.value })}
                                placeholder="Item description"
                                className="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                            <div className="col-span-2 text-center">
                              <button
                                onClick={() => updateItem(category.id, item.id, { is_inhouse: !item.is_inhouse })}
                                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                                  item.is_inhouse
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {item.is_inhouse ? 'In-house' : 'Subcontract'}
                              </button>
                            </div>
                            <div className="col-span-2">
                              <input
                                type="number"
                                value={item.cost || ''}
                                onChange={(e) => updateItem(category.id, item.id, { cost: parseFloat(e.target.value) || 0 })}
                                placeholder="0"
                                className="w-full rounded border border-gray-200 px-3 py-2 text-sm text-right focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                            <div className="col-span-2">
                              <input
                                type="number"
                                value={item.price || ''}
                                onChange={(e) => updateItem(category.id, item.id, { price: parseFloat(e.target.value) || 0 })}
                                placeholder="0"
                                className="w-full rounded border border-gray-200 px-3 py-2 text-sm text-right focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                            <div className="col-span-1 text-right">
                              <button
                                onClick={() => removeItem(category.id, item.id)}
                                className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => addItem(category.id)}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Plus className="h-4 w-4" />
                      Add item
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Add Category Button */}
            <button
              onClick={addCategory}
              className="w-full py-4 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-gray-300 hover:text-gray-600 flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Category
            </button>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between mt-8">
            <Link
              href={`/projects/${projectId}`}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
