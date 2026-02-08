import { Header } from '@/components/layout/Header'
import Link from 'next/link'
import { Plus, Search, Filter } from 'lucide-react'
import { STATUS_LABELS, STATUS_COLORS, HEALTH_ICONS, type ProjectStatus, type ProjectHealth } from '@/types'
import { createClient } from '@/lib/supabase/server'

function formatCurrency(amount: number) {
  if (amount >= 1000000) {
    return `AED ${(amount / 1000000).toFixed(1)}M`
  }
  return `AED ${(amount / 1000).toFixed(0)}K`
}

const filters = ['All', 'Active', 'Pipeline', 'Snagging', 'Complete', 'On Hold']

export default async function ProjectsPage() {
  const supabase = await createClient()
  
  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      *,
      client:clients(name)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching projects:', error)
  }

  return (
    <div className="min-h-screen">
      <Header 
        title="Projects" 
        actions={
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New Project
          </Link>
        }
      />
      
      <div className="p-6">
        {/* Filters */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  filter === 'All'
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects..."
                className="h-10 w-64 rounded-lg border border-gray-200 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              <Filter className="h-4 w-4" />
              Filter
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Health
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projects && projects.length > 0 ? (
                projects.map((project) => (
                  <tr 
                    key={project.id} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <Link href={`/projects/${project.id}`} className="block">
                        <p className="font-medium text-gray-900">{project.reference || 'No reference'}</p>
                        <p className="text-sm text-gray-500">{project.client?.name || 'No client'}</p>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[project.status as ProjectStatus] || 'bg-gray-100 text-gray-800'}`}>
                        {STATUS_LABELS[project.status as ProjectStatus] || project.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {project.contract_value ? formatCurrency(project.contract_value) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      {project.health ? (
                        <span>{HEALTH_ICONS[project.health as ProjectHealth]}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No projects found. Create your first project!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-sm text-gray-500">
          Showing {projects?.length || 0} projects
        </div>
      </div>
    </div>
  )
}
