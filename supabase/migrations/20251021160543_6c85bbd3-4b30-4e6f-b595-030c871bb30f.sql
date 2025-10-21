-- Add configurable booking limit columns to rotation_orders table
ALTER TABLE rotation_orders
ADD COLUMN IF NOT EXISTS use_virtual_weeks_system BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS total_nights_allowed_primary INTEGER DEFAULT 14,
ADD COLUMN IF NOT EXISTS total_weeks_allowed_primary INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS total_weeks_allowed_secondary INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS min_nights_per_booking INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS max_consecutive_nights_primary INTEGER DEFAULT 14,
ADD COLUMN IF NOT EXISTS max_consecutive_nights_secondary INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS post_rotation_min_nights INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS post_rotation_max_consecutive_nights INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS post_rotation_max_weeks INTEGER DEFAULT NULL;

-- Add helpful comment
COMMENT ON COLUMN rotation_orders.use_virtual_weeks_system IS 'When true, uses Friday boundaries to count weeks; when false, uses traditional calendar weeks';
COMMENT ON COLUMN rotation_orders.total_nights_allowed_primary IS 'Total nights budget enforced during primary selection (typically 14)';
COMMENT ON COLUMN rotation_orders.total_weeks_allowed_primary IS 'Maximum virtual weeks allowed during primary selection (typically 2)';
COMMENT ON COLUMN rotation_orders.total_weeks_allowed_secondary IS 'Maximum virtual weeks allowed during secondary selection (typically 1)';
COMMENT ON COLUMN rotation_orders.max_consecutive_nights_primary IS 'Maximum consecutive nights per booking in primary selection (typically 14)';
COMMENT ON COLUMN rotation_orders.max_consecutive_nights_secondary IS 'Maximum consecutive nights per booking in secondary selection (typically 7)';
COMMENT ON COLUMN rotation_orders.post_rotation_max_weeks IS 'Maximum virtual weeks in post-rotation period (NULL = unlimited)';
COMMENT ON COLUMN rotation_orders.post_rotation_max_consecutive_nights IS 'Maximum consecutive nights per booking in post-rotation (NULL = unlimited)';