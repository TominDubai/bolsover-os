'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Upload, X, FileText, Image, CheckCircle } from 'lucide-react'

interface UploadDocumentFormProps {
  projectId: string
}

const CATEGORIES = [
  { value: 'contracts', label: 'Contracts' },
  { value: 'specifications', label: 'Specifications' },
  { value: 'drawings', label: 'Drawings' },
  { value: 'photos', label: 'Photos' },
  { value: 'reports', label: 'Reports' },
  { value: 'approvals', label: 'Approvals' },
  { value: 'variations', label: 'Variations' },
  { value: 'other', label: 'Other' },
]

export function UploadDocumentForm({ projectId }: UploadDocumentFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [category, setCategory] = useState('other')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const router = useRouter()
  const supabase = createClient()

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile)
    setUploadProgress(0)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFileSelect(selectedFile)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    
    try {
      const fileName = `${Date.now()}-${file.name}`
      const filePath = `${projectId}/${fileName}`

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })
      setUploadProgress(1)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('project-documents')
        .getPublicUrl(filePath)

      // Create document record
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          project_id: projectId,
          name: file.name,
          description: description || '',
          category,
          file_url: publicUrl,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id,
          tags: tags ? tags.split(',').map(t => t.trim()) : [],
        })

      if (dbError) throw dbError

      router.push(`/projects/${projectId}/documents`)
    } catch (err) {
      console.error('Upload failed:', err)
      alert('Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return Image
    return FileText
  }

  const isValidFile = (file: File) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/zip',
      'text/plain',
      'application/json'
    ]
    return allowedTypes.includes(file.type)
  }

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        {/* File Upload Area */}
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {file ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                {isValidFile(file) ? (
                  <CheckCircle className="h-12 w-12 text-green-500" />
                ) : (
                  <X className="h-12 w-12 text-red-500" />
                )}
              </div>
              
              <div>
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>

              {!isValidFile(file) && (
                <p className="text-sm text-red-600">
                  This file type is not supported
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="h-12 w-12 text-gray-400 mx-auto" />
              
              <div>
                <label className="cursor-pointer">
                  <span className="font-medium text-blue-600 hover:text-blue-500">Click to upload</span>
                  <span className="text-gray-500"> or drag and drop</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileInput}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.zip,.txt,.json"
                  />
                </label>
              </div>
              
              <p className="text-sm text-gray-500">
                PDF, Word, Excel, images, ZIP files up to 50MB
              </p>
            </div>
          )}
        </div>

        {/* Form Fields */}
        {file && (
          <div className="mt-8 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="Add a description (optional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="e.g. contract, specifications, design"
              />
            </div>

            {/* Upload Progress */}
            {uploading && uploadProgress > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${uploadProgress * 100}%` }}
                ></div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleUpload}
                disabled={uploading || !file || !isValidFile(file)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : 'Upload Document'}
              </button>
              
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}