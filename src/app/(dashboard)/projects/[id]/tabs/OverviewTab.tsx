'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Calendar, 
  Plus, 
  Camera, 
  MapPin,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react'
import Link from 'next/link'

interface OverviewTabProps {
  projectId: string
}

interface SiteVisit {
  id: string
  scheduled_date: string | null
  actual_date: string | null
  notes: string | null
  pao_attended: boolean
}

interface Project {
  scope_summary: string | null
  notes: string | null
  has_design: string | null
  has_drawings: string | null
  property_type: string | null
}

export function OverviewTab({ projectId }: OverviewTabProps) {
  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState<Project | null>(null)
  const [siteVisits, setSiteVisits] = useState<SiteVisit[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      
      const [projectResult, visitsResult] = await Promise.all([
        supabase
          .from('projects')
          .select('scope_summary, notes, has_design, has_drawings, property_type')
          .eq('id', projectId)
          .single(),
        supabase
          .from('site_visits')
          .select('*')
          .eq('project_id', projectId)
          .order('scheduled_date', { ascending: false })
          .limit(5)
      ])

      if (projectResult.data) setProject(projectResult.data)
      if (visitsResult.data) setSiteVisits(visitsResult.data)
      
      setLoading(false)
    }

    fetchData()
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

  return (
    <div className="space-y-8">
      {/* Scope Summary */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-3">Scope Summary</h3>
        {project?.scope_summary ? (
          <p className="text-gray-900 whitespace-pre-wrap">{project.scope_summary}</p>
        ) : (
          <p className="text-gray-400 italic">No scope summary added</p>
        )}
      </div>

      {/* Quick Info */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">Property Type</p>
          <p className="font-medium text-gray-900 capitalize">
            {project?.property_type || '—'}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">Design Status</p>
          <p className="font-medium text-gray-900 capitalize">
            {project?.has_design?.replace('_', ' ') || '—'}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">Drawings</p>
          <p className="font-medium text-gray-900 capitalize">
            {project?.has_drawings?.replace('_', ' ') || '—'}
          </p>
        </div>
      </div>

      {/* Site Visits */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-500">Site Visits</h3>
          <Link
            href={`/projects/${projectId}/site-visit/new`}
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Visit
          </Link>
        </div>

        {siteVisits.length > 0 ? (
          <div className="space-y-3">
            {siteVisits.map((visit) => (
              <div 
                key={visit.id}
                className="flex items-start justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${visit.actual_date ? 'bg-green-100' : 'bg-amber-100'}`}>
                    {visit.actual_date ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {visit.actual_date ? 'Completed' : 'Scheduled'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(visit.actual_date || visit.scheduled_date)}
                    </p>
                    {visit.notes && (
                      <p className="text-sm text-gray-600 mt-1">{visit.notes}</p>
                    )}
                  </div>
                </div>
                {visit.pao_attended && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    Pao attended
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <Camera className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No site visits recorded</p>
            <Link
              href={`/projects/${projectId}/site-visit/new`}
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-2"
            >
              <Plus className="h-4 w-4" />
              Schedule a visit
            </Link>
          </div>
        )}
      </div>

      {/* Notes */}
      {project?.notes && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-3">Notes</h3>
          <p className="text-gray-900 whitespace-pre-wrap">{project.notes}</p>
        </div>
      )}
    </div>
  )
}
