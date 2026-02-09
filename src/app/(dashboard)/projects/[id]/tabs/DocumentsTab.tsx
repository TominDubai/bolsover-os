'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, 
  FileText,
  Image,
  FileSpreadsheet,
  File,
  Upload,
  Loader2,
  Download,
  Eye,
  Trash2,
  FolderOpen
} from 'lucide-react'

interface DocumentsTabProps {
  projectId: string
}

interface Document {
  id: string
  name: string
  file_url: string
  category: string
  file_size: number | null
  mime_type: string | null
  version: number
  uploaded_at: string
  uploaded_by_user?: {
    name: string
  }
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  drawing: { label: 'Drawings', color: 'bg-blue-100 text-blue-700' },
  contract: { label: 'Contracts', color: 'bg-purple-100 text-purple-700' },
  invoice: { label: 'Invoices', color: 'bg-green-100 text-green-700' },
  approval: { label: 'Approvals', color: 'bg-amber-100 text-amber-700' },
  gate_pass: { label: 'Gate Passes', color: 'bg-pink-100 text-pink-700' },
  correspondence: { label: 'Correspondence', color: 'bg-cyan-100 text-cyan-700' },
  photo: { label: 'Photos', color: 'bg-indigo-100 text-indigo-700' },
  report: { label: 'Reports', color: 'bg-orange-100 text-orange-700' },
  other: { label: 'Other', color: 'bg-gray-100 text-gray-700' },
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return File
  if (mimeType.startsWith('image/')) return Image
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return FileSpreadsheet
  return FileText
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentsTab({ projectId }: DocumentsTabProps) {
  const [loading, setLoading] = useState(true)
  const [documents, setDocuments] = useState<Document[]>([])
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function fetchDocuments() {
      setLoading(true)

      const { data } = await supabase
        .from('documents')
        .select(`
          *,
          uploaded_by_user:users!documents_uploaded_by_fkey(name)
        `)
        .eq('project_id', projectId)
        .eq('is_latest', true)
        .order('uploaded_at', { ascending: false })

      if (data) setDocuments(data)
      setLoading(false)
    }

    fetchDocuments()
  }, [projectId, supabase])

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // Get unique categories from documents
  const categories = [...new Set(documents.map(d => d.category))]

  // Filter documents
  const filteredDocs = filterCategory 
    ? documents.filter(d => d.category === filterCategory)
    : documents

  // Group by category
  const docsByCategory = filteredDocs.reduce((acc, doc) => {
    if (!acc[doc.category]) acc[doc.category] = []
    acc[doc.category].push(doc)
    return acc
  }, {} as Record<string, Document[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Documents</h3>
        <button
          onClick={() => {/* TODO: Open upload modal */}}
          disabled={uploading}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Upload
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCategory(null)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            !filterCategory
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All ({documents.length})
        </button>
        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
          const count = documents.filter(d => d.category === key).length
          if (count === 0) return null
          return (
            <button
              key={key}
              onClick={() => setFilterCategory(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterCategory === key
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {config.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Documents Grid */}
      {filteredDocs.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(docsByCategory).map(([category, docs]) => {
            const categoryConfig = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other

            return (
              <div key={category}>
                <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  {categoryConfig.label}
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {docs.map((doc) => {
                    const FileIcon = getFileIcon(doc.mime_type)

                    return (
                      <div
                        key={doc.id}
                        className="flex items-start gap-3 p-3 bg-white border border-gray-100 rounded-lg hover:border-gray-200 transition-colors group"
                      >
                        <div className={`p-2 rounded-lg ${categoryConfig.color}`}>
                          <FileIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{doc.name}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <span>{formatFileSize(doc.file_size)}</span>
                            <span>•</span>
                            <span>{formatDate(doc.uploaded_at)}</span>
                            {doc.version > 1 && (
                              <>
                                <span>•</span>
                                <span>v{doc.version}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-gray-100"
                            title="View"
                          >
                            <Eye className="h-4 w-4 text-gray-400" />
                          </a>
                          <a
                            href={doc.file_url}
                            download
                            className="p-1.5 rounded hover:bg-gray-100"
                            title="Download"
                          >
                            <Download className="h-4 w-4 text-gray-400" />
                          </a>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FolderOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents</h3>
          <p className="text-gray-500 mb-6">Upload drawings, contracts, and other project files</p>
          <button
            onClick={() => {/* TODO: Open upload modal */}}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Upload className="h-4 w-4" />
            Upload First Document
          </button>
        </div>
      )}
    </div>
  )
}
