-- Bolsover OS Core Tables Migration
-- Run this in Supabase SQL Editor

-- ============================================
-- DESIGNERS
-- ============================================
CREATE TABLE IF NOT EXISTS designers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  company VARCHAR,
  email VARCHAR,
  phone VARCHAR,
  notes TEXT,
  projects_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- SITE VISITS
-- ============================================
CREATE TABLE IF NOT EXISTS site_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  scheduled_date DATE,
  actual_date DATE,
  attendees UUID[],
  pao_attended BOOLEAN DEFAULT false,
  notes TEXT,
  has_full_drawings BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_visit_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_visit_id UUID REFERENCES site_visits(id) ON DELETE CASCADE,
  file_url VARCHAR NOT NULL,
  caption VARCHAR,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- BOQ (Bill of Quantities)
-- ============================================
CREATE TABLE IF NOT EXISTS boq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  reference VARCHAR,
  status VARCHAR DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'sent', 'superseded')),
  version INTEGER DEFAULT 1,
  total_cost DECIMAL(12,2),
  margin_percent DECIMAL(5,2),
  client_price DECIMAL(12,2),
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  approval_notes TEXT,
  sent_to_client_at TIMESTAMPTZ,
  client_pdf_url VARCHAR,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS boq_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boq_id UUID REFERENCES boq(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  sort_order INTEGER DEFAULT 0,
  subtotal_cost DECIMAL(12,2),
  subtotal_price DECIMAL(12,2)
);

CREATE TABLE IF NOT EXISTS boq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boq_id UUID REFERENCES boq(id) ON DELETE CASCADE,
  category_id UUID REFERENCES boq_categories(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  is_inhouse BOOLEAN DEFAULT false,
  cost DECIMAL(12,2),
  price DECIMAL(12,2),
  subcontractor_id UUID,
  selected_quote_id UUID,
  single_quote_override BOOLEAN DEFAULT false,
  override_reason VARCHAR,
  override_approved_by UUID REFERENCES users(id),
  override_approved_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  notes TEXT
);

-- ============================================
-- SUBCONTRACTORS & RFQs
-- ============================================
CREATE TABLE IF NOT EXISTS subcontractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR NOT NULL,
  contact_name VARCHAR,
  email VARCHAR,
  phone VARCHAR NOT NULL,
  trades VARCHAR[],
  rating DECIMAL(2,1),
  jobs_completed INTEGER DEFAULT 0,
  avg_response_days DECIMAL(3,1),
  bank_name VARCHAR,
  account_number VARCHAR,
  iban VARCHAR,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rfqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  reference VARCHAR,
  scope_text TEXT,
  deadline DATE,
  status VARCHAR DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'partial', 'complete', 'closed')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rfq_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID REFERENCES rfqs(id) ON DELETE CASCADE,
  file_url VARCHAR NOT NULL,
  file_name VARCHAR,
  file_size INTEGER
);

CREATE TABLE IF NOT EXISTS rfq_subcontractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID REFERENCES rfqs(id) ON DELETE CASCADE,
  subcontractor_id UUID REFERENCES subcontractors(id) ON DELETE CASCADE,
  categories_to_price VARCHAR[],
  sent_at TIMESTAMPTZ,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'viewed', 'received', 'declined')),
  reminded_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID REFERENCES rfqs(id) ON DELETE CASCADE,
  subcontractor_id UUID REFERENCES subcontractors(id) ON DELETE CASCADE,
  total_amount DECIMAL(12,2),
  breakdown JSONB,
  lead_time_days INTEGER,
  validity_days INTEGER,
  notes TEXT,
  attachment_url VARCHAR,
  received_at TIMESTAMPTZ DEFAULT now(),
  is_selected BOOLEAN DEFAULT false
);

-- ============================================
-- SCHEDULES & TASKS
-- ============================================
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  start_date DATE,
  end_date DATE,
  status VARCHAR DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'complete', 'delayed')),
  progress_percent INTEGER DEFAULT 0,
  subcontractor_id UUID REFERENCES subcontractors(id),
  sort_order INTEGER DEFAULT 0,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS phase_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID REFERENCES phases(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID REFERENCES phases(id) ON DELETE CASCADE,
  description VARCHAR NOT NULL,
  assigned_to UUID REFERENCES users(id),
  due_date DATE,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'complete')),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id),
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS material_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES phases(id),
  description VARCHAR NOT NULL,
  expected_date DATE,
  actual_date DATE,
  status VARCHAR DEFAULT 'ordered' CHECK (status IN ('ordered', 'confirmed', 'delivered', 'delayed')),
  supplier VARCHAR,
  notes TEXT
);

-- ============================================
-- DAILY REPORTS
-- ============================================
CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  submitted_by UUID REFERENCES users(id),
  submitted_at TIMESTAMPTZ,
  progress_status VARCHAR DEFAULT 'on_track' CHECK (progress_status IN ('on_track', 'minor_delay', 'major_issue')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_report_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id UUID REFERENCES daily_reports(id) ON DELETE CASCADE,
  file_url VARCHAR NOT NULL,
  caption VARCHAR
);

CREATE TABLE IF NOT EXISTS daily_report_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id UUID REFERENCES daily_reports(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS daily_report_subs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id UUID REFERENCES daily_reports(id) ON DELETE CASCADE,
  subcontractor_id UUID REFERENCES subcontractors(id) ON DELETE CASCADE,
  worker_count INTEGER,
  worker_names TEXT
);

CREATE TABLE IF NOT EXISTS daily_report_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id UUID REFERENCES daily_reports(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE
);

-- ============================================
-- VARIATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  reference VARCHAR,
  description TEXT NOT NULL,
  requested_by VARCHAR CHECK (requested_by IN ('client_on_site', 'design_change', 'unforeseen', 'other')),
  request_notes TEXT,
  request_date TIMESTAMPTZ DEFAULT now(),
  requested_by_user UUID REFERENCES users(id),
  cost DECIMAL(12,2),
  price DECIMAL(12,2),
  priced_by UUID REFERENCES users(id),
  priced_at TIMESTAMPTZ,
  internal_status VARCHAR DEFAULT 'pending' CHECK (internal_status IN ('pending', 'approved', 'rejected')),
  internal_approved_by UUID REFERENCES users(id),
  internal_approved_at TIMESTAMPTZ,
  docusign_envelope_id VARCHAR,
  client_signed_at TIMESTAMPTZ,
  payment_status VARCHAR DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
  payment_date DATE,
  invoice_id UUID,
  work_status VARCHAR DEFAULT 'blocked' CHECK (work_status IN ('blocked', 'approved', 'in_progress', 'complete')),
  status VARCHAR DEFAULT 'draft' CHECK (status IN ('draft', 'pricing', 'internal_review', 'sent_to_client', 'client_approved', 'awaiting_payment', 'approved_to_proceed', 'in_progress', 'complete', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS variation_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variation_id UUID REFERENCES variations(id) ON DELETE CASCADE,
  file_url VARCHAR NOT NULL,
  caption VARCHAR,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- SNAGGING
-- ============================================
CREATE TABLE IF NOT EXISTS snagging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  walkthrough_date DATE,
  conducted_by UUID REFERENCES users(id),
  client_present BOOLEAN DEFAULT true,
  status VARCHAR DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'complete')),
  total_items INTEGER DEFAULT 0,
  completed_items INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS snag_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snagging_id UUID REFERENCES snagging(id) ON DELETE CASCADE,
  room VARCHAR NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  assigned_type VARCHAR CHECK (assigned_type IN ('bolsover', 'subcontractor')),
  assigned_user UUID REFERENCES users(id),
  assigned_sub UUID REFERENCES subcontractors(id),
  due_date DATE,
  status VARCHAR DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'complete')),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS snag_item_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snag_item_id UUID REFERENCES snag_items(id) ON DELETE CASCADE,
  file_url VARCHAR NOT NULL,
  photo_type VARCHAR CHECK (photo_type IN ('issue', 'fixed')),
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- GATE PASSES
-- ============================================
CREATE TABLE IF NOT EXISTS gate_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  pass_type VARCHAR CHECK (pass_type IN ('main_site', 'individual', 'subcontractor', 'vehicle')),
  name VARCHAR NOT NULL,
  company VARCHAR,
  emirates_id VARCHAR,
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'expiring_soon', 'expired', 'renewed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gate_pass_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_pass_id UUID REFERENCES gate_passes(id) ON DELETE CASCADE,
  document_type VARCHAR CHECK (document_type IN ('emirates_id', 'passport', 'photo', 'other')),
  file_url VARCHAR NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- APPROVALS (Authority)
-- ============================================
CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  approval_type VARCHAR CHECK (approval_type IN ('building_management', 'master_developer', 'municipality', 'trakhees', 'completion_cert')),
  scope VARCHAR DEFAULT 'minor' CHECK (scope IN ('minor', 'major')),
  status VARCHAR DEFAULT 'not_started' CHECK (status IN ('not_started', 'preparing', 'submitted', 'under_review', 'approved', 'rejected', 'resubmit')),
  handled_by VARCHAR DEFAULT 'internal' CHECK (handled_by IN ('internal', 'consultant')),
  consultant_name VARCHAR,
  submitted_date DATE,
  expected_date DATE,
  approved_date DATE,
  reference_number VARCHAR,
  certificate_url VARCHAR,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS approval_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id UUID REFERENCES approvals(id) ON DELETE CASCADE,
  file_url VARCHAR NOT NULL,
  file_name VARCHAR,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INVOICES
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  invoice_type VARCHAR CHECK (invoice_type IN ('deposit', 'progress', 'variation', 'final')),
  reference VARCHAR,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  progress_percent INTEGER,
  variation_id UUID REFERENCES variations(id),
  status VARCHAR DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled')),
  issued_date DATE,
  due_date DATE,
  paid_date DATE,
  zoho_invoice_id VARCHAR,
  zoho_sync_at TIMESTAMPTZ,
  docusign_envelope_id VARCHAR,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- DOCUMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  category VARCHAR CHECK (category IN ('drawing', 'contract', 'invoice', 'approval', 'gate_pass', 'correspondence', 'photo', 'report', 'other')),
  name VARCHAR NOT NULL,
  file_url VARCHAR NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR,
  version INTEGER DEFAULT 1,
  is_latest BOOLEAN DEFAULT true,
  docusign_envelope_id VARCHAR,
  docusign_status VARCHAR CHECK (docusign_status IN ('pending', 'sent', 'signed', 'declined')),
  expiry_date DATE,
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);

-- ============================================
-- ACTIVITY LOG & NOTIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action VARCHAR NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  message TEXT,
  project_id UUID REFERENCES projects(id),
  link_to VARCHAR,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_site_visits_project ON site_visits(project_id);
CREATE INDEX IF NOT EXISTS idx_boq_project ON boq(project_id);
CREATE INDEX IF NOT EXISTS idx_boq_items_boq ON boq_items(boq_id);
CREATE INDEX IF NOT EXISTS idx_phases_schedule ON phases(schedule_id);
CREATE INDEX IF NOT EXISTS idx_tasks_phase ON tasks(phase_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_project_date ON daily_reports(project_id, report_date);
CREATE INDEX IF NOT EXISTS idx_variations_project ON variations(project_id);
CREATE INDEX IF NOT EXISTS idx_variations_status ON variations(status);
CREATE INDEX IF NOT EXISTS idx_gate_passes_project ON gate_passes(project_id);
CREATE INDEX IF NOT EXISTS idx_gate_passes_expiry ON gate_passes(valid_to);
CREATE INDEX IF NOT EXISTS idx_activity_project ON activity_log(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_approvals_project ON approvals(project_id);

-- ============================================
-- RLS POLICIES (basic - can enhance later)
-- ============================================
ALTER TABLE designers ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE boq ENABLE ROW LEVEL SECURITY;
ALTER TABLE boq_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE boq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcontractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE snagging ENABLE ROW LEVEL SECURITY;
ALTER TABLE snag_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/write all tables (basic policy for now)
-- In production, you'd want role-based policies

CREATE POLICY "Allow authenticated access" ON designers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON site_visits FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON boq FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON boq_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON boq_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON subcontractors FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON rfqs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON quotes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON phases FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON daily_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON variations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON snagging FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON snag_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON gate_passes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON approvals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON activity_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
