-- Create documents table and storage bucket
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('contracts', 'specifications', 'drawings', 'photos', 'reports', 'approvals', 'variations', 'other')),
    file_url TEXT NOT NULL,
    file_size BIGINT,
    file_type VARCHAR(100),
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT false
);

-- Create index for project-specific documents
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);

-- Storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES ('project-documents', 'project-documents', true, 52428800, ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/zip',
    'text/plain',
    'application/json'
]) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload project documents" ON storage.objects FOR INSERT 
    WITH CHECK (bucket_id = 'project-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view project documents" ON storage.objects FOR SELECT 
    USING (bucket_id = 'project-documents');

CREATE POLICY "Users can delete their own documents" ON storage.objects FOR DELETE 
    USING (bucket_id = 'project-documents' AND auth.uid() = (storage.foldername(name))[1]::uuid);