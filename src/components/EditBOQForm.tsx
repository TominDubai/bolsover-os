'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Save, ArrowLeft, Loader2 } from 'lucide-react'

interface BOQItem {
  id: string
  description: string
  quantity: number
  unit: string
  unit_cost: number | null
  client_unit_price: number | null
  is_inhouse: boolean
  notes: string | null
  sort_order: number
  item_code: string | null
  image_url: string | null
}

interface BOQCategory {
  id: string
  name: string
  items: BOQItem[]
}

interface BOQ {
  id: string
  project_id: string
  status: string
  version: number
}

interface EditBOQFormProps {
  projectId: string
  boq: BOQ
  categories: any[]
}

export function EditBOQForm({ projectId, boq, categories: initialCategories }: EditBOQFormProps) {
  const [categories, setCategories] = useState<BOQCategory[]>(initialCategories)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Add new item to category
  const addItem = async (categoryId: string) => {
    const newItem: Partial<BOQItem> = {
      description: 'New Item',
      quantity: 1,
      unit: 'unit',
      unit_cost: 0,
      client_unit_price: 0,
      is_inhouse: false,
      notes: '',
      sort_order: categories.find(c => c.id === categoryId)?.items.length || 0
    }

    const { data, error } = await supabase
      .from('boq_items')
      .insert({
        ...newItem,
        boq_id: boq.id,
        category_id: categoryId,
      })
      .select()
      .single()

    if (!error && data) {
      setCategories(categories.map(cat => 
        cat.id === categoryId 
          ? { ...cat, items: [...cat.items, data] }
          : cat
      ))
    }
  }

  // Update item
  const updateItem = async (item: BOQItem, field: keyof BOQItem, value: any) => {
    const updatedItem = { ...item, [field]: value }
    
    // Auto-calculate client price if unit_cost changes
    if (field === 'unit_cost' || field === 'quantity') {
      updatedItem.client_unit_price = (updatedItem.unit_cost || 0) * (updatedItem.quantity || 0)
    }

    const { error } = await supabase
      .from('boq_items')
      .update(updatedItem)
      .eq('id', item.id)

    if (!error) {
      setCategories(categories.map(cat => ({
        ...cat,
        items: cat.items.map(i => i.id === item.id ? updatedItem : i)
      })))
    }
  }

  // Delete item
  const deleteItem = async (itemId: string) => {
    const { error } = await supabase
      .from('boq_items')
      .delete()
      .eq('id', itemId)

    if (!error) {
      setCategories(categories.map(cat => 
        ({ ...cat, items: cat.items.filter(i => i.id !== itemId) })
      ))
    }
  }

  // Save changes
  const saveChanges = async () => {
    setLoading(true)
    
    // Update BOQ version and status
    const { error } = await supabase
      .from('boq')
      .update({
        version: boq.version + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', boq.id)

    if (!error) {
      router.push(`/projects/${projectId}/boq`)
    }
    
    setLoading(false)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to BOQ
        </button>
        <button
          onClick={saveChanges}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </button>
      </div>

      <div className="space-y-6">
        {categories.map((category) => (
          <div key={category.id} className="border border-gray-200 rounded-lg">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
            </div>

            <div className="divide-y divide-gray-200">
              {category.items.map((item, index) => (
                <div key={item.id} className="p-4 space-y-3">
                  <div className="grid grid-cols-12 gap-4 items-start">
                    <div className="col-span-5">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <input
                        type="text"
                        value={item.description || ''}
                        onChange={(e) => updateItem(item, 'description', e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Qty</label>
                      <input
                        type="number"
                        value={item.quantity || 0}
                        onChange={(e) => updateItem(item, 'quantity', parseFloat(e.target.value))}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                      <input
                        type="text"
                        value={item.unit || ''}
                        onChange={(e) => updateItem(item, 'unit', e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost</label>
                      <input
                        type="number"
                        value={item.unit_cost || 0}
                        onChange={(e) => updateItem(item, 'unit_cost', parseFloat(e.target.value))}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div className="col-span-1">
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price (Client)</label>
                      <input
                        type="number"
                        value={item.client_unit_price || 0}
                        onChange={(e) => updateItem(item, 'client_unit_price', parseFloat(e.target.value))}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50 focus:border-blue-500 focus:outline-none"
                        min="0"
                        step="0.01"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <input
                        type="text"
                        value={item.notes || ''}
                        onChange={(e) => updateItem(item, 'notes', e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                        placeholder="Additional notes..."
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="p-4 border-t">
                <button
                  onClick={() => addItem(category.id)}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}