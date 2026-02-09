-- Add item_code, quantity, unit, and internal pricing columns to boq_items
-- These internal columns (supplier costs, markup) are never shown to clients

ALTER TABLE boq_items 
ADD COLUMN IF NOT EXISTS item_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS quantity DECIMAL(12,3) DEFAULT 1,
ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'item',
ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS supplier_unit_cost DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS supplier_unit_cost_vat DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS markup_percent DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS markup_value DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS client_unit_price DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS client_unit_price_vat DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS profit_margin_percent DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS profit DECIMAL(12,2);
