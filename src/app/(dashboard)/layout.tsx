'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Menu, X } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile, visible on lg+ */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Mobile header with menu button */}
        <div className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-white px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="text-lg font-semibold text-gray-900">Bolsover OS</span>
        </div>
        
        {children}
      </main>
    </div>
  )
}
