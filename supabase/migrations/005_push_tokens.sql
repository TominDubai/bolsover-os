-- Push notification tokens for mobile app
CREATE TABLE IF NOT EXISTS push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform VARCHAR(20) NOT NULL, -- 'ios' or 'android'
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Delay notices table (for tracking sent notifications)
CREATE TABLE IF NOT EXISTS delay_notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    phase_id UUID REFERENCES schedule_phases(id) ON DELETE SET NULL,
    task_id UUID REFERENCES schedule_tasks(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    days_delayed INTEGER,
    new_date DATE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_delay_notices_project ON delay_notices(project_id);

-- Function to get all push tokens for a project's assigned users
CREATE OR REPLACE FUNCTION get_project_push_tokens(p_project_id UUID)
RETURNS TABLE(token TEXT, platform VARCHAR(20)) AS $$
BEGIN
    RETURN QUERY
    SELECT pt.token, pt.platform
    FROM push_tokens pt
    INNER JOIN project_team pm ON pm.user_id = pt.user_id
    WHERE pm.project_id = p_project_id;
END;
$$ LANGUAGE plpgsql;
