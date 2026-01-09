-- Add fields to trade_requests to track the specific host for the requested dates
ALTER TABLE trade_requests 
ADD COLUMN target_host_email TEXT,
ADD COLUMN target_host_name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN trade_requests.target_host_email IS 'Email of the primary host for the requested dates';
COMMENT ON COLUMN trade_requests.target_host_name IS 'Name of the primary host for the requested dates';