'use client'

import { useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import * as XLSX from 'xlsx'
import {
  Upload,
  FileSpreadsheet,
  ArrowLeft,
  ArrowRight,
  Check,
  AlertCircle,
  Loader2,
  X,
  Download
} from 'lucide-react'
import Link from 'next/link'

type Step = 'upload' | 'preview' | 'mapping' | 'importing' | 'done'

interface ParsedRow {
  [key: string]: string | number | null
}

interface ColumnMapping {
  description: string | null
  quantity: string | null
  unit: string | null
  rate: string | null
  category: string | null
}

const REQUIRED_FIELDS = ['description', 'rate'] as const
const OPTIONAL_FIELDS = ['quantity', 'unit', 'category'] as const

export default function BOQImportPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const supabase = createClient()

  const [step, setStep] = useState<Step>('upload')
  const [fileName, setFileName] = useState<string>('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [mapping, setMapping] = useState<ColumnMapping>({
    description: null,
    quantity: null,
    unit: null,
    rate: null,
    category: null,
  })
  const [marginPercent, setMarginPercent] = useState(25)
  const [boqReference, setBOQReference] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importStats, setImportStats] = useState({ categories: 0, items: 0 })

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }, [])

  const processFile = async (file: File) => {
    setError(null)
    setFileName(file.name)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      
      // Convert to JSON with headers
      const jsonData = XLSX.utils.sheet_to_json<ParsedRow>(worksheet, { 
        defval: null,
        raw: false 
      })

      if (jsonData.length === 0) {
        setError('The file appears to be empty')
        return
      }

      // Extract headers from first row keys
      const extractedHeaders = Object.keys(jsonData[0])
      setHeaders(extractedHeaders)
      setRows(jsonData)

      // Try to auto-detect column mappings
      const autoMapping: ColumnMapping = {
        description: null,
        quantity: null,
        unit: null,
        rate: null,
        category: null,
      }

      extractedHeaders.forEach(header => {
        const lower = header.toLowerCase()
        if (lower.includes('desc') || lower.includes('item') || lower.includes('work')) {
          autoMapping.description = header
        } else if (lower.includes('qty') || lower.includes('quantity')) {
          autoMapping.quantity = header
        } else if (lower.includes('unit') && !lower.includes('rate')) {
          autoMapping.unit = header
        } else if (lower.includes('rate') || lower.includes('cost') || lower.includes('price')) {
          autoMapping.rate = header
        } else if (lower.includes('cat') || lower.includes('section') || lower.includes('trade')) {
          autoMapping.category = header
        }
      })

      setMapping(autoMapping)
      setStep('preview')
    } catch (err) {
      console.error('Error parsing file:', err)
      setError('Failed to parse file. Make sure it\'s a valid Excel or CSV file.')
    }
  }

  const canProceedToImport = mapping.description && mapping.rate

  const handleImport = async () => {
    if (!canProceedToImport) return

    setImporting(true)
    setStep('importing')

    try {
      // Create the BOQ
      const { data: boq, error: boqError } = await supabase
        .from('boq')
        .insert({
          project_id: projectId,
          reference: boqReference || `BOQ-${Date.now()}`,
          status: 'draft',
          version: 1,
          margin_percent: marginPercent,
        })
        .select()
        .single()

      if (boqError) throw boqError

      // Group items by category if category column is mapped
      const categoriesMap = new Map<string, ParsedRow[]>()
      
      rows.forEach(row => {
        const categoryName = mapping.category 
          ? String(row[mapping.category] || 'Uncategorised')
          : 'Uncategorised'
        
        if (!categoriesMap.has(categoryName)) {
          categoriesMap.set(categoryName, [])
        }
        categoriesMap.get(categoryName)!.push(row)
      })

      // Create categories and items
      let categoryOrder = 0
      let totalItemsCreated = 0

      for (const [categoryName, categoryRows] of categoriesMap) {
        // Create category
        const { data: category, error: catError } = await supabase
          .from('boq_categories')
          .insert({
            boq_id: boq.id,
            name: categoryName,
            sort_order: categoryOrder++,
          })
          .select()
          .single()

        if (catError) throw catError

        // Create items for this category
        let itemOrder = 0
        const itemsToInsert = categoryRows.map(row => {
          const description = String(row[mapping.description!] || '')
          const quantity = mapping.quantity ? parseFloat(String(row[mapping.quantity] || '1')) || 1 : 1
          const unit = mapping.unit ? String(row[mapping.unit] || 'item') : 'item'
          const rate = parseFloat(String(row[mapping.rate!] || '0').replace(/[^0-9.-]/g, '')) || 0
          const cost = quantity * rate
          const price = cost * (1 + marginPercent / 100)

          return {
            boq_id: boq.id,
            category_id: category.id,
            description,
            quantity,
            unit,
            unit_cost: rate,
            cost,
            price,
            is_inhouse: false,
            sort_order: itemOrder++,
          }
        }).filter(item => item.description.trim() !== '')

        if (itemsToInsert.length > 0) {
          const { error: itemsError } = await supabase
            .from('boq_items')
            .insert(itemsToInsert)

          if (itemsError) throw itemsError
          totalItemsCreated += itemsToInsert.length
        }
      }

      // Update BOQ totals
      const { data: itemsData } = await supabase
        .from('boq_items')
        .select('cost, price')
        .eq('boq_id', boq.id)

      if (itemsData) {
        const totalCost = itemsData.reduce((sum, item) => sum + (item.cost || 0), 0)
        const totalPrice = itemsData.reduce((sum, item) => sum + (item.price || 0), 0)

        await supabase
          .from('boq')
          .update({
            total_cost: totalCost,
            client_price: totalPrice,
          })
          .eq('id', boq.id)
      }

      // Update category subtotals
      for (const [categoryName] of categoriesMap) {
        const { data: catData } = await supabase
          .from('boq_categories')
          .select('id')
          .eq('boq_id', boq.id)
          .eq('name', categoryName)
          .single()

        if (catData) {
          const { data: catItems } = await supabase
            .from('boq_items')
            .select('cost, price')
            .eq('category_id', catData.id)

          if (catItems) {
            const subtotalCost = catItems.reduce((sum, item) => sum + (item.cost || 0), 0)
            const subtotalPrice = catItems.reduce((sum, item) => sum + (item.price || 0), 0)

            await supabase
              .from('boq_categories')
              .update({
                subtotal_cost: subtotalCost,
                subtotal_price: subtotalPrice,
              })
              .eq('id', catData.id)
          }
        }
      }

      setImportStats({
        categories: categoriesMap.size,
        items: totalItemsCreated,
      })
      setStep('done')
    } catch (err) {
      console.error('Import error:', err)
      setError('Failed to import BOQ. Please try again.')
      setStep('mapping')
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const template = [
      { Category: 'Demolition', Description: 'Remove existing flooring', Quantity: 1, Unit: 'lot', Rate: 5000 },
      { Category: 'Demolition', Description: 'Remove partition walls', Quantity: 3, Unit: 'nos', Rate: 1500 },
      { Category: 'MEP', Description: 'AC supply and install', Quantity: 4, Unit: 'nos', Rate: 3500 },
      { Category: 'Joinery', Description: 'Custom wardrobes', Quantity: 2, Unit: 'nos', Rate: 8000 },
    ]
    
    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'BOQ Template')
    XLSX.writeFile(wb, 'boq-template.xlsx')
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">Import BOQ from Excel</h1>
        <p className="text-gray-500 mt-1">Upload an Excel or CSV file to create a Bill of Quantities</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-8">
        {['Upload', 'Preview', 'Map Columns', 'Import'].map((label, index) => {
          const stepNames: Step[] = ['upload', 'preview', 'mapping', 'done']
          const currentIndex = stepNames.indexOf(step === 'importing' ? 'mapping' : step)
          const isActive = index <= currentIndex
          const isCurrent = index === currentIndex

          return (
            <div key={label} className="flex items-center">
              <div className={`flex items-center gap-2 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  isCurrent ? 'bg-blue-600 text-white' : isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  {step === 'done' && index < 3 ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                <span className="text-sm font-medium hidden sm:inline">{label}</span>
              </div>
              {index < 3 && (
                <div className={`w-12 h-0.5 mx-2 ${isActive && index < currentIndex ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Error</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="h-4 w-4 text-red-400 hover:text-red-600" />
          </button>
        </div>
      )}

      {/* Step: Upload */}
      {step === 'upload' && (
        <div className="space-y-6">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer"
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              Drop your Excel file here
            </p>
            <p className="text-sm text-gray-500 mb-4">
              or click to browse
            </p>
            <p className="text-xs text-gray-400">
              Supports .xlsx, .xls, and .csv files
            </p>
          </div>

          <div className="flex items-center justify-center gap-4 pt-4">
            <span className="text-sm text-gray-500">Need a template?</span>
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <Download className="h-4 w-4" />
              Download BOQ Template
            </button>
          </div>
        </div>
      )}

      {/* Step: Preview */}
      {step === 'preview' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <FileSpreadsheet className="h-8 w-8 text-green-600" />
            <div>
              <p className="font-medium text-gray-900">{fileName}</p>
              <p className="text-sm text-gray-500">{rows.length} rows found</p>
            </div>
            <button
              onClick={() => {
                setStep('upload')
                setRows([])
                setHeaders([])
              }}
              className="ml-auto text-sm text-gray-500 hover:text-gray-700"
            >
              Change file
            </button>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-3">Preview (first 5 rows)</h3>
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {headers.map((header) => (
                      <th key={header} className="px-4 py-2 text-left font-medium text-gray-700 whitespace-nowrap">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-t">
                      {headers.map((header) => (
                        <td key={header} className="px-4 py-2 text-gray-600 whitespace-nowrap">
                          {String(row[header] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 5 && (
              <p className="text-sm text-gray-500 mt-2">
                ...and {rows.length - 5} more rows
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setStep('upload')}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Back
            </button>
            <button
              onClick={() => setStep('mapping')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              Continue to Mapping
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step: Mapping */}
      {step === 'mapping' && (
        <div className="space-y-6">
          <div className="bg-white border rounded-lg p-6 space-y-4">
            <h3 className="font-medium text-gray-900">Map Your Columns</h3>
            <p className="text-sm text-gray-500">
              Tell us which columns in your file correspond to BOQ fields
            </p>

            <div className="grid grid-cols-2 gap-4">
              {/* Required fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <select
                  value={mapping.description || ''}
                  onChange={(e) => setMapping({ ...mapping, description: e.target.value || null })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select column...</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rate / Cost <span className="text-red-500">*</span>
                </label>
                <select
                  value={mapping.rate || ''}
                  onChange={(e) => setMapping({ ...mapping, rate: e.target.value || null })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select column...</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Optional fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity <span className="text-gray-400">(optional)</span>
                </label>
                <select
                  value={mapping.quantity || ''}
                  onChange={(e) => setMapping({ ...mapping, quantity: e.target.value || null })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Not in file (default: 1)</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit <span className="text-gray-400">(optional)</span>
                </label>
                <select
                  value={mapping.unit || ''}
                  onChange={(e) => setMapping({ ...mapping, unit: e.target.value || null })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Not in file (default: item)</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category / Trade <span className="text-gray-400">(optional)</span>
                </label>
                <select
                  value={mapping.category || ''}
                  onChange={(e) => setMapping({ ...mapping, category: e.target.value || null })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Not in file (all items in "Uncategorised")</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  If your file has a category/trade column, items will be grouped automatically
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-lg p-6 space-y-4">
            <h3 className="font-medium text-gray-900">BOQ Settings</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  BOQ Reference
                </label>
                <input
                  type="text"
                  value={boqReference}
                  onChange={(e) => setBOQReference(e.target.value)}
                  placeholder="e.g., BOQ-001"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Margin %
                </label>
                <input
                  type="number"
                  value={marginPercent}
                  onChange={(e) => setMarginPercent(Number(e.target.value))}
                  min={0}
                  max={100}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Applied to calculate client price from cost
                </p>
              </div>
            </div>
          </div>

          {/* Preview of mapped data */}
          {canProceedToImport && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Ready to import</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• {rows.length} items will be created</li>
                {mapping.category && (
                  <li>• Items will be grouped by "{mapping.category}" column</li>
                )}
                <li>• {marginPercent}% margin will be applied to all items</li>
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setStep('preview')}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Back
            </button>
            <button
              onClick={handleImport}
              disabled={!canProceedToImport || importing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Import BOQ
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step: Importing */}
      {step === 'importing' && (
        <div className="text-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900">Importing your BOQ...</p>
          <p className="text-gray-500">This may take a moment</p>
        </div>
      )}

      {/* Step: Done */}
      {step === 'done' && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Import Complete!</h2>
          <p className="text-gray-500 mb-6">
            Created {importStats.categories} categories and {importStats.items} items
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                setStep('upload')
                setRows([])
                setHeaders([])
                setMapping({
                  description: null,
                  quantity: null,
                  unit: null,
                  rate: null,
                  category: null,
                })
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Import Another
            </button>
            <Link
              href={`/projects/${projectId}?tab=boq`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              View BOQ
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
