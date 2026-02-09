'use client'

import { useState } from 'react'
import { 
  LayoutDashboard, 
  FileText, 
  Calendar, 
  ClipboardList,
  AlertTriangle,
  FileCheck,
  BadgeCheck,
  FolderOpen,
  Clock,
  DollarSign
} from 'lucide-react'
import { OverviewTab } from './tabs/OverviewTab'
import { BOQTab } from './tabs/BOQTab'
import { ScheduleTab } from './tabs/ScheduleTab'
import { ReportsTab } from './tabs/ReportsTab'
import { VariationsTab } from './tabs/VariationsTab'
import { SnaggingTab } from './tabs/SnaggingTab'
import { ApprovalsTab } from './tabs/ApprovalsTab'
import { DocumentsTab } from './tabs/DocumentsTab'
import { ActivityTab } from './tabs/ActivityTab'
import { InvoicesTab } from './tabs/InvoicesTab'

interface ProjectTabsProps {
  projectId: string
  counts: {
    siteVisits: number
    variations: number
    dailyReports: number
    documents: number
  }
}

const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'boq', label: 'BOQ', icon: FileText },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'reports', label: 'Reports', icon: ClipboardList, countKey: 'dailyReports' as const },
  { id: 'variations', label: 'Variations', icon: AlertTriangle, countKey: 'variations' as const },
  { id: 'invoices', label: 'Invoices', icon: DollarSign },
  { id: 'snagging', label: 'Snagging', icon: FileCheck },
  { id: 'approvals', label: 'Approvals', icon: BadgeCheck },
  { id: 'documents', label: 'Documents', icon: FolderOpen, countKey: 'documents' as const },
  { id: 'activity', label: 'Activity', icon: Clock },
]

export function ProjectTabs({ projectId, counts }: ProjectTabsProps) {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Tab Navigation */}
      <div className="border-b border-gray-100">
        <nav className="flex overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const count = tab.countKey ? counts[tab.countKey] : null
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-5 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                  ${isActive 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {count !== null && count > 0 && (
                  <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${
                    isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'overview' && <OverviewTab projectId={projectId} />}
        {activeTab === 'boq' && <BOQTab projectId={projectId} />}
        {activeTab === 'schedule' && <ScheduleTab projectId={projectId} />}
        {activeTab === 'reports' && <ReportsTab projectId={projectId} />}
        {activeTab === 'variations' && <VariationsTab projectId={projectId} />}
        {activeTab === 'invoices' && <InvoicesTab projectId={projectId} />}
        {activeTab === 'snagging' && <SnaggingTab projectId={projectId} />}
        {activeTab === 'approvals' && <ApprovalsTab projectId={projectId} />}
        {activeTab === 'documents' && <DocumentsTab projectId={projectId} />}
        {activeTab === 'activity' && <ActivityTab projectId={projectId} />}
      </div>
    </div>
  )
}
