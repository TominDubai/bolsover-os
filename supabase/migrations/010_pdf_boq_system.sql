-- Add PDF BOQ system instead of editable items
-- This respects Pao's Excel workflow

CREATE TABLE IF NOT EXISTS boq_pdfs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'superseded')),
    notes TEXT,
    created_by_name VARCHAR(255),
    change_summary TEXT,
    previous_version_id UUID REFERENCES boq_pdfs(id)
);

-- Add edit requests table
CREATE TABLE IF NOT EXISTS boq_edit_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    boq_pdf_id UUID NOT NULL REFERENCES boq_pdfs(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES auth.users(id),
    requested_by_name VARCHAR(255),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    change_description TEXT NOT NULL,
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    assigned_to UUID REFERENCES auth.users(id),
    assigned_to_name VARCHAR(255),
    completed_at TIMESTAMP WITH TIME ZONE,
    response_notes TEXT
);

-- Add storage bucket for BOQ PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES ('boq-pdfs', 'boq-pdfs', true, 10485760, ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
]) ON CONFLICT (id) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_boq_pdfs_project_id ON boq_pdfs(project_id);
CREATE INDEX IF NOT EXISTS idx_boq_pdfs_version ON boq_pdfs(project_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_boq_edit_requests_project_id ON boq_edit_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_boq_edit_requests_status ON boq_edit_requests(status);