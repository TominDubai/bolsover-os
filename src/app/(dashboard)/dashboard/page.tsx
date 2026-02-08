import { Header } from '@/components/layout/Header'
import { 
  TrendingUp, 
  FolderKanban, 
  DollarSign, 
  AlertCircle,
  Clock,
  CheckCircle2,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'

// Placeholder data - will come from Supabase
const stats = [
  { 
    name: 'Pipeline', 
    value: 'AED 2.4M', 
    subtext: '12 enquiries',
    icon: TrendingUp,
    color: 'bg-blue-500'
  },
  { 
    name: 'Active Projects', 
    value: '8', 
    subtext: 'AED 4.1M total',
    icon: FolderKanban,
    color: 'bg-green-500'
  },
  { 
    name: 'This Month', 
    value: 'AED 890K', 
    subtext: 'revenue',
    icon: DollarSign,
    color: 'bg-purple-500'
  },
]

const needsAttention = [
  {
    id: '1',
    type: 'boq_approval',
    title: 'BOQ Approval',
    project: 'Marina Vista Villa',
    value: 'AED 450,000',
    time: '2 hours ago',
  },
  {
    id: '2',
    type: 'variation',
    title: 'Variation Approval',
    project: 'Palm Jumeirah Penthouse',
    value: 'AED 28,500',
    time: 'Kitchen island upgrade',
  },
  {
    id: '3',
    type: 'payment',
    title: 'Payment Overdue',
    project: 'JBR Apartment',
    value: 'AED 125,000',
    time: '5 days overdue',
  },
]

const watchList = [
  { project: 'Downtown Penthouse', issue: 'Schedule slipping (3 days)', status: 'warning' },
  { project: 'Emirates Hills Villa', issue: 'Approval delayed', status: 'warning' },
]

const onTrack = [
  { project: 'Al Barsha Villa', progress: 75 },
  { project: 'Springs Renovation', progress: 60 },
  { project: 'Jumeirah Fit-out', progress: 40 },
]

export default function DashboardPage() {
  return (
    <div className="min-h-screen">
      <Header 
        title="Dashboard" 
        subtitle="Good afternoon, Tom"
      />
      
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.name}
              className="rounded-xl bg-white p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-center gap-4">
                <div className={`rounded-lg ${stat.color} p-3`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.subtext}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Needs Attention */}
        <div className="rounded-xl bg-white shadow-sm border border-gray-100">
          <div className="border-b border-gray-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <h2 className="font-semibold text-gray-900">Needs Your Attention</h2>
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                {needsAttention.length}
              </span>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {needsAttention.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-medium text-gray-900">{item.title}</p>
                    <p className="text-sm text-gray-500">{item.project}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{item.value}</p>
                    <p className="text-sm text-gray-500">{item.time}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
                      View
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Two columns */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Watching */}
          <div className="rounded-xl bg-white shadow-sm border border-gray-100">
            <div className="border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                <h2 className="font-semibold text-gray-900">Watching</h2>
                <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                  {watchList.length}
                </span>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {watchList.map((item, i) => (
                <div key={i} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    <div>
                      <p className="font-medium text-gray-900">{item.project}</p>
                      <p className="text-sm text-gray-500">{item.issue}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
              ))}
            </div>
          </div>

          {/* On Track */}
          <div className="rounded-xl bg-white shadow-sm border border-gray-100">
            <div className="border-b border-gray-100 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <h2 className="font-semibold text-gray-900">On Track</h2>
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    {onTrack.length}
                  </span>
                </div>
                <Link 
                  href="/projects" 
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  View all →
                </Link>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {onTrack.map((item, i) => (
                <div key={i} className="px-6 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <p className="font-medium text-gray-900">{item.project}</p>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{item.progress}%</span>
                  </div>
                  <div className="ml-8 h-2 rounded-full bg-gray-100">
                    <div 
                      className="h-2 rounded-full bg-green-500 transition-all"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
