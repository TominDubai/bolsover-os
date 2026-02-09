'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  CheckCircle2, 
  Send, 
  DollarSign,
  Loader2,
  XCircle
} from 'lucide-react'

interface Variation {
  id: string
  status: string
  payment_status: string | null
  internal_status: string | null
}

interface VariationActionsProps {
  variation: Variation
  projectId: string
}

export function VariationActions({ variation, projectId }: VariationActionsProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const updateVariation = async (updates: Partial<Variation> & Record<string, unknown>) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('variations')
        .update(updates)
        .eq('id', variation.id)

      if (error) throw error
      router.refresh()
    } catch (error) {
      console.error('Error updating variation:', error)
      alert('Failed to update variation')
    } finally {
      setLoading(false)
    }
  }

  const handleApproveInternal = () => {
    updateVariation({
      internal_status: 'approved',
      internal_approved_at: new Date().toISOString(),
      status: 'internal_review'
    })
  }

  const handleSendToClient = () => {
    updateVariation({
      status: 'sent_to_client'
    })
  }

  const handleClientApproved = () => {
    updateVariation({
      status: 'client_approved',
      client_signed_at: new Date().toISOString()
    })
  }

  const handleMarkPaid = () => {
    updateVariation({
      payment_status: 'paid',
      payment_date: new Date().toISOString().split('T')[0],
      status: 'approved_to_proceed',
      work_status: 'approved'
    })
  }

  const handleMarkComplete = () => {
    updateVariation({
      status: 'complete',
      work_status: 'complete'
    })
  }

  const handleReject = () => {
    if (confirm('Are you sure you want to reject this variation?')) {
      updateVariation({
        status: 'rejected',
        internal_status: 'rejected'
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Updating...
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {/* Draft or Pricing - can approve internally */}
      {['draft', 'pricing'].includes(variation.status) && (
        <>
          <button
            onClick={handleApproveInternal}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            <CheckCircle2 className="h-4 w-4" />
            Approve
          </button>
          <button
            onClick={handleReject}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            <XCircle className="h-4 w-4" />
            Reject
          </button>
        </>
      )}

      {/* Internal review - can send to client */}
      {variation.status === 'internal_review' && (
        <button
          onClick={handleSendToClient}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Send className="h-4 w-4" />
          Send to Client
        </button>
      )}

      {/* Sent to client - can mark as client approved */}
      {variation.status === 'sent_to_client' && (
        <button
          onClick={handleClientApproved}
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          <CheckCircle2 className="h-4 w-4" />
          Client Approved
        </button>
      )}

      {/* Client approved but not paid - can mark as paid */}
      {['client_approved', 'awaiting_payment'].includes(variation.status) && 
       variation.payment_status !== 'paid' && (
        <button
          onClick={handleMarkPaid}
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          <DollarSign className="h-4 w-4" />
          Mark as Paid
        </button>
      )}

      {/* Approved to proceed or in progress - can mark complete */}
      {['approved_to_proceed', 'in_progress'].includes(variation.status) && (
        <button
          onClick={handleMarkComplete}
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          <CheckCircle2 className="h-4 w-4" />
          Mark Complete
        </button>
      )}
    </div>
  )
}
