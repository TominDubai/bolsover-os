-- Site photos table for mobile app
CREATE TABLE IF NOT EXISTS site_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    daily_report_id UUID REFERENCES daily_reports(id) ON DELETE SET NULL,
    url TEXT NOT NULL,
    caption TEXT,
    taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_site_photos_project ON site_photos(project_id);
CREATE INDEX IF NOT EXISTS idx_site_photos_report ON site_photos(daily_report_id);

-- Create storage bucket for site photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-photos', 'site-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Allow authenticated uploads to site-photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'site-photos');

CREATE POLICY "Allow public read from site-photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'site-photos');

CREATE POLICY "Allow authenticated delete from site-photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'site-photos');
