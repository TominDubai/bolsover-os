import { Header } from '@/components/layout/Header'
import Link from 'next/link'
import { Plus, Search, Filter } from 'lucide-react'
import { STATUS_LABELS, STATUS_COLORS, HEALTH_ICONS } from '@/types'

// Placeholder data
const projects = [
  {
    id: '1',
    reference: 'BOL-2026-047',
    name: 'Marina Vista Villa',
    client: 'Mr Ahmed Al Maktoum',
    status: 'boq_review' as const,
    health: null,
    value: 450000,
    pm: null,
  },
  {
    id: '2',
    reference: 'BOL-2026-042',
    name: 'Al Barsha Villa',
    client: 'Mr & Mrs Johnson',
    status: 'active' as const,
    health: 'on_track' as const,
    value: 380000,
    pm: 'Rosano',
    progress: 75,
  },
  {
    id: '3',
    reference: 'BOL-2026-039',
    name: 'Springs Renovation',
    client: 'Sarah Williams',
    status: 'active' as const,
    health: 'on_track' as const,
    value: 220000,
    pm: 'Rosano',
    progress: 60,
  },
  {
    id: '4',
    reference: 'BOL-2026-038',
    name: 'Downtown Penthouse',
    client: 'James Chen',
    status: 'active' as const,
    health: 'minor_delay' as const,
    value: 890000,
    pm: 'Rosano',
    progress: 45,
    delay: -3,
  },
  {
    id: '5',
    reference: 'BOL-2026-044',
    name: 'Emirates Hills Villa',
    client: 'Mohammed Al Rashid',
    status: 'approval_pending' as const,
    health: 'blocked' as const,
    value: 1200000,
    pm: null,
  },
  {
    id: '6',
    reference: 'BOL-2026-041',
    name: 'Jumeirah Fit-out',
    client: 'Dubai Properties LLC',
    status: 'active' as const,
    health: 'on_track' as const,
    value: 175000,
    pm: 'Rosano',
    progress: 40,
  },
  {
    id: '7',
    reference: 'BOL-2026-045',
    name: 'Palm Penthouse',
    client: 'Victoria Sterling',
    status: 'quoted' as const,
    health: null,
    value: 2100000,
    pm: null,
  },
  {
    id: '8',
    reference: 'BOL-2026-048',
    name: 'DIFC Office',
    client: 'Sterling Investments',
    status: 'site_visit_scheduled' as const,
    health: null,
    value: 95000,
    pm: null,
  },
]

const filters = ['All', 'Active', 'Pipeline', 'Snagging', 'Complete', 'On Hold']

function formatCurrency(amount: number) {
  if (amount >= 1000000) {
    return `AED ${(amount / 1000000).toFixed(1)}M`
  }
  return `AED ${(amount / 1000).toFixed(0)}K`
}

export default function ProjectsPage() {
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
                  PM
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Health
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projects.map((project) => (
                <tr 
                  key={project.id} 
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <Link href={`/projects/${project.id}`} className="block">
                      <p className="font-medium text-gray-900">{project.name}</p>
                      <p className="text-sm text-gray-500">{project.client}</p>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[project.status]}`}>
                      {STATUS_LABELS[project.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {formatCurrency(project.value)}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {project.pm || '—'}
                  </td>
                  <td className="px-6 py-4">
                    {project.health ? (
                      <div className="flex items-center gap-2">
                        <span>{HEALTH_ICONS[project.health]}</span>
                        {project.progress !== undefined && (
                          <span className="text-sm text-gray-600">{project.progress}%</span>
                        )}
                        {project.delay && (
                          <span className="text-sm text-red-600">{project.delay}d</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-sm text-gray-500">
          Showing {projects.length} projects
        </div>
      </div>
    </div>
  )
}
