'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, FileText, MessageSquare, Download, Plus } from 'lucide-react'
import Link from 'next/link'

interface BOQPDFManagerProps {
  projectId: string
}

export function BOQPDFManager({ projectId }: BOQPDFManagerProps) {
  const [uploading, setUploading] = useState(false)
  const [newRequest, setNewRequest] = useState('')
  const supabase = createClient()

  const handlePDFUpload = async (file: File) => {
    if (!file) return

    setUploading(true)
    
    try {
      const fileName = `${Date.now()}-${file.name}`
      const filePath = `${projectId}/boq/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('boq-pdfs')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('boq-pdfs')
        .getPublicUrl(filePath)

      alert('BOQ PDF uploaded successfully!')
      window.location.reload()
    } catch (err) {
      console.error('Upload failed:', err)
      alert('Failed to upload BOQ PDF')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-6 space-y-8">
      {/* Simple PDF Upload */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload BOQ PDF</h2>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <input
            type="file"
            accept=".pdf,.xlsx,.xls"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handlePDFUpload(file)
            }}
            className="hidden"
            id="boq-upload"
          />
          <label htmlFor="boq-upload" className="cursor-pointer">
            <p className="text-sm text-gray-600 mb-2">
              Upload PDF or Excel file (max 10MB)
            </p>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Upload className="h-4 w-4" />
              {uploading ? 'Uploading...' : 'Choose File'}
            </button>
          </label>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href={`/projects/${projectId}/boq/import`}
            className="flex-1 p-4 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-blue-500"
          >
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium">Import Excel</p>
            <p className="text-xs text-gray-500">Upload Pao's Excel file</p>
          </Link>
          
          <Link
            href={`/projects/${projectId}/boq/new`}
            className="flex-1 p-4 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-blue-500"
          >
            <Plus className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium">Create New</p>
            <p className="text-xs text-gray-500">Start from scratch</p>
          </Link>
        </div>
      </div>

      {/* Simple Message System */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Request Changes</h2>
        
        <div className="space-y-4">
          <textarea
            value={newRequest}
            onChange={(e) => setNewRequest(e.target.value)}
            placeholder="Describe changes needed for Pao..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            rows={3}
          />
          
          <button
            onClick={() => {
              if (newRequest.trim()) {
                alert(`Edit request sent to Pao: ${newRequest}`)
                setNewRequest('')
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <MessageSquare className="h-4 w-4" />
            Send to Pao
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">📋 How to use BOQ system</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>1. Upload Pao's Excel/PDF file</li>
          <li>2. System tracks versions automatically</li>
          <li>3. Request changes via message form</li>
          <li>4. Pao uploads new version</li>
        </ul>
      </div>
    </div>
  )
}