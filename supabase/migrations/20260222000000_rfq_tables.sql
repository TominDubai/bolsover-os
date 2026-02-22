-- RFQ System tables

-- 1. RFQs table — one consolidated RFQ per subcontractor per BOQ
CREATE TABLE IF NOT EXISTS rfqs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    boq_id uuid REFERENCES boq(id) ON DELETE CASCADE,
    subcontractor_id uuid REFERENCES subcontractors(id) ON DELETE CASCADE,
    reference text,
    status text DEFAULT 'draft' CHECK (status IN ('draft','sent','received','accepted','rejected','expired')),
    sent_at timestamptz,
    due_date date,
    received_at timestamptz,
    notes text,
    total_quoted numeric(12,2),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(boq_id, subcontractor_id)
);

-- 2. RFQ Items table — line items within an RFQ
CREATE TABLE IF NOT EXISTS rfq_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rfq_id uuid REFERENCES rfqs(id) ON DELETE CASCADE,
    boq_item_id uuid REFERENCES boq_items(id) ON DELETE CASCADE,
    description text,
    quantity numeric,
    unit text,
    our_unit_cost numeric,
    our_cost numeric,
    quoted_unit_cost numeric,
    quoted_cost numeric,
    notes text,
    UNIQUE(rfq_id, boq_item_id)
);

-- 3. Add procurement_type column to boq_items
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'boq_items' AND column_name = 'procurement_type'
    ) THEN
        ALTER TABLE boq_items ADD COLUMN procurement_type text DEFAULT 'unclassified'
            CHECK (procurement_type IN ('unclassified', 'in_house', 'subcontracted'));
    END IF;
END $$;

-- Enable RLS
ALTER TABLE rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_items ENABLE ROW LEVEL SECURITY;

-- RLS policies — allow authenticated users full access
CREATE POLICY "Authenticated users can manage rfqs"
    ON rfqs FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can manage rfq_items"
    ON rfq_items FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rfqs_boq_id ON rfqs(boq_id);
CREATE INDEX IF NOT EXISTS idx_rfqs_subcontractor_id ON rfqs(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_rfqs_status ON rfqs(status);
CREATE INDEX IF NOT EXISTS idx_rfq_items_rfq_id ON rfq_items(rfq_id);
CREATE INDEX IF NOT EXISTS idx_rfq_items_boq_item_id ON rfq_items(boq_item_id);
CREATE INDEX IF NOT EXISTS idx_boq_items_procurement_type ON boq_items(procurement_type);
