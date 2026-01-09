-- Add execution tracking fields to trade_requests
ALTER TABLE trade_requests 
ADD COLUMN IF NOT EXISTS executed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS execution_status TEXT DEFAULT 'pending' CHECK (execution_status IN ('pending', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS execution_notes TEXT;