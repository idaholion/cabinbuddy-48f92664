-- Remove the old reservation_permission column from family_groups table
-- since we're now storing individual host member permissions in the host_members JSONB field
ALTER TABLE family_groups DROP COLUMN IF EXISTS reservation_permission;