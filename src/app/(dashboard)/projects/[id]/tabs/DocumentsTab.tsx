'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, UploadCloud, FileText, Image, Download, Trash2, Search } from 'lucide-react'
import Link from 'next/link'

interface DocumentsTabProps {
  projectId: string
}

interface Document {
  id: string
  name: string
  description: string | null
  category: string
  file_url: string
  file_size: number
  file_type: string
  uploaded_by: string
  uploaded_at: string
  tags: string[]
  metadata: any
}

const CATEGORIES = [
  { value: 'contracts', label: 'Contracts', icon: FileText },
  { value: 'specifications', label: 'Specifications', icon: FileText },
  { value: 'drawings', label: 'Drawings', icon: FileText },
  { value: 'photos', label: 'Photos', icon: Image },
  { value: 'reports', label: 'Reports', icon: FileText },
  { value: 'approvals', label: 'Approvals', icon: FileText },
  { value: 'variations', label: 'Variations', icon: FileText },
  { value: 'other', label: 'Other', icon: FileText },
]

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function DocumentsTab({ projectId }: DocumentsTabProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchDocuments()
  }, [projectId])

  const fetchDocuments = async () => {
    setLoading(true)
    
    let query = supabase
      .from('documents')
      .select('*')
      .eq('project_id', projectId)
      .order('uploaded_at', { ascending: false })

    if (selectedCategory !== 'all') {
      query = query.eq('category', selectedCategory)
    }

    if (searchQuery) {
      query = query.ilike('name', `%${searchQuery}%`)
    }

    const { data, error } = await query
    
    if (!error && data) {
      setDocuments(data)
    }
    
    setLoading(false)
  }

  const handleFileUpload = async (file: File, category: string, description?: string) => {
    if (!file) return

    setUploading(true)
    
    try {
      const fileName = `${Date.now()}-${file.name}`
      const filePath = `${projectId}/${fileName}`

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(filePath, file)

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
        })

      if (dbError) throw dbError

      await fetchDocuments()
    } catch (err) {
      console.error('Upload failed:', err)
      alert('Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (documentId: string) => {
    if (!confirm('Delete this document?')) return

    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)

    if (!error) {
      await fetchDocuments()
    }
  }

  const filteredDocuments = documents.filter(doc => {
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Documents</h3>
          <p className="text-sm text-gray-500">Manage project documents and files</p>
        </div>
        
        <Link
          href={`/projects/${projectId}/documents/upload`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <UploadCloud className="h-4 w-4" />
          Upload Document
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
        
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}

      {/* Documents Grid */}
      {!loading && filteredDocuments.length === 0 && (
        <div className="text-center py-12">
          <UploadCloud className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents</h3>
          <p className="text-gray-500 mb-6">Upload your first document to get started</p>
          <Link
            href={`/projects/${projectId}/documents/upload`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <UploadCloud className="h-4 w-4" />
            Upload Document
          </Link>
        </div>
      )}

      {/* Documents List */}
      {!loading && filteredDocuments.length > 0 && (
        <div className="grid gap-4">
          {filteredDocuments.map((doc) => {
            const CategoryIcon = CATEGORIES.find(c => c.value === doc.category)?.icon || FileText
            
            return (
              <div key={doc.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <CategoryIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900">{doc.name}</h4>
                      {doc.description && (
                        <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="capitalize">{doc.category}</span>
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                      </div>
                      
                      {doc.tags && doc.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {doc.tags.map((tag, idx) => (
                            <span key={idx} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}