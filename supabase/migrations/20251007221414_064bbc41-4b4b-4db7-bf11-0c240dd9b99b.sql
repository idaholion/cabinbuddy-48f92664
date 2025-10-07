-- Add 'deferred' to payment_status enum
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'deferred';

-- Add 'use_fee' to payment_type enum
ALTER TYPE payment_type ADD VALUE IF NOT EXISTS 'use_fee';