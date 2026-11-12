-- Free selection hold period (run once in the Supabase SQL Editor).
-- Adds settings only; does not change reservations, turns, or usage.
ALTER TABLE public.rotation_orders
  ADD COLUMN IF NOT EXISTS post_rotation_hold_days integer,
  ADD COLUMN IF NOT EXISTS post_rotation_open_time text DEFAULT '19:00',
  ADD COLUMN IF NOT EXISTS post_rotation_opens_at timestamptz,
  ADD COLUMN IF NOT EXISTS post_rotation_announced_at timestamptz,
  ADD COLUMN IF NOT EXISTS post_rotation_reminder_sent_at timestamptz;
