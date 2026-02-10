-- Daily report attendance tracking
-- Bolsover staff attendance
CREATE TABLE IF NOT EXISTS daily_report_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL, -- Store name in case user deleted
    present BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subcontractor attendance
CREATE TABLE IF NOT EXISTS daily_report_subcontractors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
    subcontractor_id UUID REFERENCES subcontractors(id) ON DELETE SET NULL,
    company_name VARCHAR(255) NOT NULL, -- Store name in case subcontractor deleted
    trade VARCHAR(100),
    workers_count INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_staff_report ON daily_report_staff(daily_report_id);
CREATE INDEX IF NOT EXISTS idx_daily_subs_report ON daily_report_subcontractors(daily_report_id);

-- Add total counts to daily_reports for quick access
ALTER TABLE daily_reports 
ADD COLUMN IF NOT EXISTS staff_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS subcontractor_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS subcontractor_workers INTEGER DEFAULT 0;
