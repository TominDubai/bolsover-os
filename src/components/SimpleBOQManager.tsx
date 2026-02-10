'use client'

import { useState } from 'react'
import { Upload, FileText, MessageSquare } from 'lucide-react'

interface SimpleBOQManagerProps {
  projectId: string
}

export function SimpleBOQManager({ projectId }: SimpleBOQManagerProps) {
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    
    // Simple file handling - just simulate for now
    setTimeout(() => {
      alert(`Uploaded ${file.name} for project ${projectId}`)
      setUploading(false)
    }, 1000)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">BOQ Management</h1>
      
      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Upload Pao's BOQ</h2>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <input
            type="file"
            accept=".pdf,.xlsx,.xls"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileUpload(file)
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
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-blue-500">
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium">Import Excel</p>
            <p className="text-xs text-gray-500">Upload Pao's Excel file</p>
          </div>
          
          <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-blue-500">
            <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium">Request Changes</p>
            <p className="text-xs text-gray-500">Message Pao for edits</p>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">📋 Simple Workflow</h3>
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