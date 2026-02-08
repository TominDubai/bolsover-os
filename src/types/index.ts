// User types
export type UserRole = 'ceo' | 'coordinator' | 'qs' | 'pm' | 'site_staff'

export interface User {
  id: string
  email: string
  name: string
  phone?: string
  role: UserRole
  avatar_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Project types
export type ProjectStatus = 
  | 'enquiry' | 'qualifying' | 'awaiting_design'
  | 'ready_for_visit' | 'site_visit_scheduled' | 'visited'
  | 'boq_in_progress' | 'boq_review' | 'quoted'
  | 'accepted' | 'contract_sent' | 'contract_signed'
  | 'deposit_pending' | 'deposit_paid'
  | 'approval_pending' | 'scheduling' | 'scheduled'
  | 'active' | 'snagging' | 'final_invoice_sent'
  | 'complete' | 'closed' | 'on_hold' | 'lost'

export type ProjectHealth = 'on_track' | 'minor_delay' | 'behind' | 'blocked'

export type ProjectSource = 'referral' | 'designer' | 'instagram' | 'website' | 'whatsapp' | 'other'

export type PropertyType = 'villa' | 'apartment' | 'office' | 'other'

export interface Project {
  id: string
  reference: string
  client_id: string
  designer_id?: string
  status: ProjectStatus
  health?: ProjectHealth
  source: ProjectSource
  source_detail?: string
  has_design: 'yes' | 'no' | 'partial'
  has_drawings: 'yes' | 'no' | 'pending'
  property_type: PropertyType
  address?: string
  community?: string
  scope_summary?: string
  contract_value?: number
  variation_total: number
  total_invoiced: number
  total_paid: number
  enquiry_date?: string
  site_visit_date?: string
  quote_sent_date?: string
  accepted_date?: string
  start_date?: string
  due_date?: string
  completed_date?: string
  assigned_pm?: string
  assigned_qs?: string
  assigned_coordinator?: string
  lost_reason?: string
  on_hold_reason?: string
  notes?: string
  created_at: string
  updated_at: string
  // Joined data
  client?: Client
  designer?: Designer
}

// Client types
export interface Client {
  id: string
  name: string
  email?: string
  phone: string
  address?: string
  community?: string
  notes?: string
  source?: string
  referred_by?: string
  created_at: string
  updated_at: string
}

// Designer types
export interface Designer {
  id: string
  name: string
  company?: string
  email?: string
  phone?: string
  notes?: string
  projects_count: number
  created_at: string
}

// Subcontractor types
export interface Subcontractor {
  id: string
  company_name: string
  contact_name?: string
  email?: string
  phone: string
  trades: string[]
  rating?: number
  jobs_completed: number
  avg_response_days?: number
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Status display helpers
export const STATUS_LABELS: Record<ProjectStatus, string> = {
  enquiry: 'Enquiry',
  qualifying: 'Qualifying',
  awaiting_design: 'Awaiting Design',
  ready_for_visit: 'Ready for Visit',
  site_visit_scheduled: 'Visit Scheduled',
  visited: 'Visited',
  boq_in_progress: 'BOQ in Progress',
  boq_review: 'BOQ Review',
  quoted: 'Quoted',
  accepted: 'Accepted',
  contract_sent: 'Contract Sent',
  contract_signed: 'Contract Signed',
  deposit_pending: 'Deposit Pending',
  deposit_paid: 'Deposit Paid',
  approval_pending: 'Approval Pending',
  scheduling: 'Scheduling',
  scheduled: 'Scheduled',
  active: 'Active',
  snagging: 'Snagging',
  final_invoice_sent: 'Final Invoice',
  complete: 'Complete',
  closed: 'Closed',
  on_hold: 'On Hold',
  lost: 'Lost',
}

export const STATUS_COLORS: Record<ProjectStatus, string> = {
  enquiry: 'bg-blue-100 text-blue-800',
  qualifying: 'bg-blue-100 text-blue-800',
  awaiting_design: 'bg-yellow-100 text-yellow-800',
  ready_for_visit: 'bg-blue-100 text-blue-800',
  site_visit_scheduled: 'bg-blue-100 text-blue-800',
  visited: 'bg-blue-100 text-blue-800',
  boq_in_progress: 'bg-purple-100 text-purple-800',
  boq_review: 'bg-purple-100 text-purple-800',
  quoted: 'bg-indigo-100 text-indigo-800',
  accepted: 'bg-green-100 text-green-800',
  contract_sent: 'bg-green-100 text-green-800',
  contract_signed: 'bg-green-100 text-green-800',
  deposit_pending: 'bg-yellow-100 text-yellow-800',
  deposit_paid: 'bg-green-100 text-green-800',
  approval_pending: 'bg-yellow-100 text-yellow-800',
  scheduling: 'bg-blue-100 text-blue-800',
  scheduled: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  snagging: 'bg-orange-100 text-orange-800',
  final_invoice_sent: 'bg-yellow-100 text-yellow-800',
  complete: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
  on_hold: 'bg-gray-100 text-gray-800',
  lost: 'bg-red-100 text-red-800',
}

export const HEALTH_COLORS: Record<ProjectHealth, string> = {
  on_track: 'text-green-600',
  minor_delay: 'text-yellow-600',
  behind: 'text-red-600',
  blocked: 'text-gray-600',
}

export const HEALTH_ICONS: Record<ProjectHealth, string> = {
  on_track: '✅',
  minor_delay: '⚠️',
  behind: '🔴',
  blocked: '⏸️',
}
