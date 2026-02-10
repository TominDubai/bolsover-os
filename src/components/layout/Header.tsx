'use client'

import { Bell, Search, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface Breadcrumb {
  label: string
  href?: string
}

interface HeaderProps {
  title: string
  subtitle?: string
  breadcrumbs?: Breadcrumb[]
  actions?: React.ReactNode
}

export function Header({ title, subtitle, breadcrumbs, actions }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-white px-4 md:px-6">
      <div className="min-w-0 flex-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="hidden sm:flex items-center gap-1 text-sm text-gray-500 mb-0.5">
            {breadcrumbs.map((crumb, index) => (
              <span key={index} className="flex items-center gap-1">
                {index > 0 && <ChevronRight className="h-3.5 w-3.5" />}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-gray-900">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-gray-900 font-medium">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-base md:text-lg font-semibold text-gray-900 truncate">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 hidden md:block">{subtitle}</p>}
      </div>
      
      <div className="flex items-center gap-2 md:gap-4">
        {/* Search - hidden on mobile */}
        <div className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="h-9 w-32 lg:w-48 xl:w-64 rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        
        {/* Notifications */}
        <button className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
        </button>
        
        {/* Actions - responsive */}
        <div className="flex items-center gap-2">
          {actions}
        </div>
      </div>
    </header>
  )
}
