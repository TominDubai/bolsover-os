'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Upload, FileText, MessageSquare, Download, Plus, CheckCircle, Clock, AlertTriangle } from 'lucide-react'

interface BOQPDFManagerProps {
  projectId: string
  boqPdfs: any[]
  editRequests: any[]
  currentUser: any
}

interface BOQPDF {
  id: string
  version: number
  file_name: string
  file_url: string
  status: string
  uploaded_by_name: string
  uploaded_at: string
  notes: string
  change_summary: string
}

interface EditRequest {
  id: string
  change_description: string
  priority: string
  status: string
  requested_by_name: string
  assigned_to_name: string
  requested_at: string
}

export function BOQPDFManager({ projectId, boqPdfs, editRequests, currentUser }: BOQPDFManagerProps) {
  const [uploading, setUploading] = useState(false)
  const [newRequest, setNewRequest] = useState('')
  const [priority, setPriority] = useState('normal')
  const [notes, setNotes] = useState('')
  const supabase = createClient()
  const router = useRouter()

  const handlePDFUpload = async (file: File, notes: string = '') => {
    if (!file) return

    setUploading(true)
    
    try {
      const fileName = `${Date.now()}-${file.name}`
      const filePath = `${projectId}/boq/${fileName}`

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('boq-pdfs')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('boq-pdfs')
        .getPublicUrl(filePath)

      // Get next version number
      const nextVersion = boqPdfs.length > 0 ? Math.max(...boqPdfs.map(p => p.version)) + 1 : 1

      // Create BOQ PDF record
      const { error: dbError } = await supabase
        .from('boq_pdfs')
        .insert({
          project_id: projectId,
          version: nextVersion,
          file_name: file.name,
          file_url: publicUrl,
          file_size: file.size,
          uploaded_by: currentUser.id,
          uploaded_by_name: currentUser.user_metadata?.full_name || currentUser.email,
          notes: notes,
          change_summary: notes || `Version ${nextVersion} uploaded`,
          status: 'draft'
        })

      if (dbError) throw dbError

      router.refresh()
    } catch (err) {
      console.error('Upload failed:', err)
      alert('Failed to upload BOQ PDF')
    } finally {
      setUploading(false)
    }
  }

  const handleEditRequest = async () => {
    if (!newRequest.trim()) return

    try {
      const { error } = await supabase
        .from('boq_edit_requests')
        .insert({
          project_id: projectId,
          boq_pdf_id: boqPdfs[0]?.id, // Link to latest BOQ
          change_description: newRequest,
          priority: priority,
          requested_by: currentUser.id,
          requested_by_name: currentUser.user_metadata?.full_name || currentUser.email,
          status: 'pending'
        })

      if (error) throw error

      setNewRequest('')
      setPriority('normal')
      router.refresh()
    } catch (err) {
      console.error('Request failed:', err)
      alert('Failed to create edit request')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-700',
      submitted: 'bg-blue-100 text-blue-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      superseded: 'bg-gray-100 text-gray-500',
      pending: 'bg-amber-100 text-amber-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-gray-100 text-gray-500',
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-700',
      normal: 'bg-blue-100 text-blue-700',
      high: 'bg-amber-100 text-amber-700',
      urgent: 'bg-red-100 text-red-700',
    }
    return colors[priority] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="p-6 space-y-8">
      {/* Upload New BOQ */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload New BOQ</h2>
        
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

      {/* BOQ Versions */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">BOQ Versions</h2>
        </div>
        
        <div className="divide-y divide-gray-100">
          {boqPdfs.map((pdf) => (
            <div key={pdf.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-blue-100">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      Version {pdf.version} - {pdf.file_name}
                    </h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span>Uploaded by {pdf.uploaded_by_name}</span>
                      <span>·</span>
                      <span>{new Date(pdf.uploaded_at).toLocaleDateString()}</span>
                      <span>·</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${getStatusColor(pdf.status)}`}>
                        {pdf.status}
                      </span>
                    </div>
                    {pdf.notes && (
                      <p className="text-sm text-gray-600 mt-1">{pdf.notes}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={pdf.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          ))}
          
          {boqPdfs.length === 0 && (
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No BOQ files uploaded yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Requests */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Edit Requests</h2>
        </div>
        
        <div className="p-6">
          {/* New Request Form */}
          <div className="mb-6">
            <textarea
              value={newRequest}
              onChange={(e) => setNewRequest(e.target.value)}
              placeholder="Describe the changes needed..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              rows={3}
            />
            
            <div className="flex items-center gap-4 mt-3">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="low">Low Priority</option>
                <option value="normal">Normal Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
              
              <button
                onClick={handleEditRequest}
                disabled={!newRequest.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <MessageSquare className="h-4 w-4" />
                Request Edit
              </button>
            </div>
          </div>

          {/* Existing Requests */}
          <div className="space-y-4">
            {editRequests.map((request) => (
              <div key={request.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-900">{request.change_description}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>Requested by {request.requested_by_name}</span>
                      <span>·</span>
                      <span>{new Date(request.requested_at).toLocaleDateString()}</span>
                      <span>·</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${getPriorityColor(request.priority)}`}>
                        {request.priority}
                      </span>
                      <span>·</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                    </div>
                    {request.assigned_to_name && (
                      <p className="text-sm text-gray-500 mt-1">
                        Assigned to {request.assigned_to_name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {editRequests.length === 0 && (
              <div className="text-center py-4">
                <MessageSquare className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No edit requests yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}