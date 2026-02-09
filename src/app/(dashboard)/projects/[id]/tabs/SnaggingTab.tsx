'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, 
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  Camera,
  User,
  Building2
} from 'lucide-react'
import Link from 'next/link'

interface SnaggingTabProps {
  projectId: string
}

interface Snagging {
  id: string
  walkthrough_date: string | null
  status: string
  total_items: number
  completed_items: number
}

interface SnagItem {
  id: string
  room: string
  description: string
  priority: string
  status: string
  assigned_type: string | null
  due_date: string | null
}

const PRIORITY_COLORS = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-gray-100 text-gray-700',
}

export function SnaggingTab({ projectId }: SnaggingTabProps) {
  const [loading, setLoading] = useState(true)
  const [snagging, setSnagging] = useState<Snagging | null>(null)
  const [snagItems, setSnagItems] = useState<SnagItem[]>([])
  const [filterRoom, setFilterRoom] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchSnagging() {
      setLoading(true)

      const { data: snaggingData } = await supabase
        .from('snagging')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (snaggingData) {
        setSnagging(snaggingData)

        const { data: items } = await supabase
          .from('snag_items')
          .select('*')
          .eq('snagging_id', snaggingData.id)
          .order('sort_order')

        if (items) setSnagItems(items)
      }

      setLoading(false)
    }

    fetchSnagging()
  }, [projectId, supabase])

  const formatDate = (date: string | null) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // Get unique rooms
  const rooms = [...new Set(snagItems.map(i => i.room))]

  // Filter items
  const filteredItems = snagItems.filter(item => {
    if (filterRoom && item.room !== filterRoom) return false
    if (filterStatus && item.status !== filterStatus) return false
    return true
  })

  // Group by room
  const itemsByRoom = filteredItems.reduce((acc, item) => {
    if (!acc[item.room]) acc[item.room] = []
    acc[item.room].push(item)
    return acc
  }, {} as Record<string, SnagItem[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!snagging) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Snagging List</h3>
        <p className="text-gray-500 mb-6">Start a snagging walkthrough to track defects</p>
        <Link
          href={`/projects/${projectId}/snagging/new`}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Start Snagging
        </Link>
      </div>
    )
  }

  const progress = snagging.total_items > 0 
    ? Math.round((snagging.completed_items / snagging.total_items) * 100) 
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Walkthrough: {formatDate(snagging.walkthrough_date)}</p>
        </div>
        <Link
          href={`/projects/${projectId}/snagging/${snagging.id}/add`}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Item
        </Link>
      </div>

      {/* Progress */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Completion Progress</span>
          <span className="text-sm font-semibold text-gray-900">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>{snagging.completed_items} of {snagging.total_items} items resolved</span>
          <span className={`font-medium ${snagging.status === 'complete' ? 'text-green-600' : 'text-amber-600'}`}>
            {snagging.status === 'complete' ? 'Complete' : 'In Progress'}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={filterRoom || ''}
          onChange={(e) => setFilterRoom(e.target.value || null)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="">All Rooms</option>
          {rooms.map(room => (
            <option key={room} value={room}>{room}</option>
          ))}
        </select>
        <select
          value={filterStatus || ''}
          onChange={(e) => setFilterStatus(e.target.value || null)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="complete">Complete</option>
        </select>
      </div>

      {/* Items by Room */}
      <div className="space-y-6">
        {Object.entries(itemsByRoom).map(([room, items]) => (
          <div key={room}>
            <h4 className="font-medium text-gray-900 mb-3">{room}</h4>
            <div className="space-y-2">
              {items.map((item) => (
                <div 
                  key={item.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    item.status === 'complete' 
                      ? 'bg-gray-50 border-gray-100' 
                      : 'bg-white border-gray-200'
                  }`}
                >
                  {item.status === 'complete' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  ) : item.status === 'in_progress' ? (
                    <Clock className="h-5 w-5 text-blue-500 mt-0.5" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-300 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${item.status === 'complete' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                      {item.description}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${PRIORITY_COLORS[item.priority as keyof typeof PRIORITY_COLORS]}`}>
                        {item.priority}
                      </span>
                      {item.assigned_type && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          {item.assigned_type === 'bolsover' ? (
                            <User className="h-3 w-3" />
                          ) : (
                            <Building2 className="h-3 w-3" />
                          )}
                          {item.assigned_type}
                        </span>
                      )}
                      {item.due_date && (
                        <span className="text-xs text-gray-500">
                          Due: {formatDate(item.due_date)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No items match your filters
          </div>
        )}
      </div>
    </div>
  )
}
