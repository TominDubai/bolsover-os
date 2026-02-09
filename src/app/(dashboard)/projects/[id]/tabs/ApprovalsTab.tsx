'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, 
  FileCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Building
} from 'lucide-react'
import Link from 'next/link'

interface ApprovalsTabProps {
  projectId: string
}

interface Approval {
  id: string
  approval_type: string
  scope: string
  status: string
  handled_by: string
  consultant_name: string | null
  submitted_date: string | null
  expected_date: string | null
  approved_date: string | null
  reference_number: string | null
  notes: string | null
}

const APPROVAL_TYPES: Record<string, { label: string; icon: typeof Building }> = {
  building_management: { label: 'Building Management', icon: Building },
  master_developer: { label: 'Master Developer', icon: Building },
  municipality: { label: 'Municipality', icon: Building },
  trakhees: { label: 'Trakhees', icon: Building },
  completion_cert: { label: 'Completion Certificate', icon: FileCheck },
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  not_started: { label: 'Not Started', color: 'bg-gray-100 text-gray-700', icon: Clock },
  preparing: { label: 'Preparing', color: 'bg-blue-100 text-blue-700', icon: Clock },
  submitted: { label: 'Submitted', color: 'bg-amber-100 text-amber-700', icon: Clock },
  under_review: { label: 'Under Review', color: 'bg-purple-100 text-purple-700', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
  resubmit: { label: 'Resubmit Required', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
}

export function ApprovalsTab({ projectId }: ApprovalsTabProps) {
  const [loading, setLoading] = useState(true)
  const [approvals, setApprovals] = useState<Approval[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function fetchApprovals() {
      setLoading(true)

      const { data } = await supabase
        .from('approvals')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (data) setApprovals(data)
      setLoading(false)
    }

    fetchApprovals()
  }, [projectId, supabase])

  const formatDate = (date: string | null) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  // Group by type
  const approvalsByType = approvals.reduce((acc, approval) => {
    if (!acc[approval.approval_type]) acc[approval.approval_type] = []
    acc[approval.approval_type].push(approval)
    return acc
  }, {} as Record<string, Approval[]>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Authority Approvals</h3>
        <Link
          href={`/projects/${projectId}/approvals/new`}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Approval
        </Link>
      </div>

      {/* Summary */}
      {approvals.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{approvals.length}</p>
            <p className="text-sm text-gray-500">Total</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-amber-700">
              {approvals.filter(a => ['submitted', 'under_review', 'preparing'].includes(a.status)).length}
            </p>
            <p className="text-sm text-amber-600">In Progress</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-700">
              {approvals.filter(a => a.status === 'approved').length}
            </p>
            <p className="text-sm text-green-600">Approved</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-red-700">
              {approvals.filter(a => ['rejected', 'resubmit'].includes(a.status)).length}
            </p>
            <p className="text-sm text-red-600">Action Needed</p>
          </div>
        </div>
      )}

      {/* Approvals List */}
      {approvals.length > 0 ? (
        <div className="space-y-4">
          {approvals.map((approval) => {
            const typeConfig = APPROVAL_TYPES[approval.approval_type] || { label: approval.approval_type, icon: Building }
            const statusConfig = STATUS_CONFIG[approval.status] || STATUS_CONFIG.not_started
            const StatusIcon = statusConfig.icon

            return (
              <div
                key={approval.id}
                className="p-4 bg-white border border-gray-100 rounded-lg hover:border-gray-200 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-medium text-gray-900">{typeConfig.label}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        approval.scope === 'major' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {approval.scope}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                      <div>
                        <p className="text-gray-500">Handled by</p>
                        <p className="font-medium text-gray-900 capitalize">
                          {approval.handled_by === 'consultant' 
                            ? approval.consultant_name || 'Consultant' 
                            : 'Internal'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Submitted</p>
                        <p className="font-medium text-gray-900">{formatDate(approval.submitted_date)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Expected</p>
                        <p className="font-medium text-gray-900">{formatDate(approval.expected_date)}</p>
                      </div>
                    </div>

                    {approval.reference_number && (
                      <p className="mt-3 text-sm text-gray-500">
                        Ref: <span className="font-mono">{approval.reference_number}</span>
                      </p>
                    )}

                    {approval.notes && (
                      <p className="mt-2 text-sm text-gray-600">{approval.notes}</p>
                    )}
                  </div>

                  <Link
                    href={`/projects/${projectId}/approvals/${approval.id}`}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    View
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Approvals Tracked</h3>
          <p className="text-gray-500 mb-6">Track building management and authority approvals here</p>
          <Link
            href={`/projects/${projectId}/approvals/new`}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add First Approval
          </Link>
        </div>
      )}
    </div>
  )
}
