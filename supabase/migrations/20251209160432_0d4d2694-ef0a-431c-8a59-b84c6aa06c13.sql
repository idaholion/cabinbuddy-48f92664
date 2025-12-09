-- Add snapshot_source column to backup_metadata to distinguish manual vs auto snapshots
ALTER TABLE backup_metadata ADD COLUMN IF NOT EXISTS snapshot_source text DEFAULT 'manual';

-- Add automatic snapshot settings to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stay_history_snapshot_frequency text DEFAULT 'off';
-- Values: 'off', 'daily', 'weekly', 'biweekly', 'monthly'

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stay_history_snapshot_retention integer DEFAULT 4;
-- How many AUTO snapshots to keep per year

-- Add season_year to backup_metadata for easier filtering
ALTER TABLE backup_metadata ADD COLUMN IF NOT EXISTS season_year integer;

-- Add comment for documentation
COMMENT ON COLUMN backup_metadata.snapshot_source IS 'Source of snapshot: manual (user-created, never auto-deleted) or auto (system-created, subject to retention)';
COMMENT ON COLUMN organizations.stay_history_snapshot_frequency IS 'Automatic snapshot frequency: off, daily, weekly, biweekly, monthly';
COMMENT ON COLUMN organizations.stay_history_snapshot_retention IS 'Number of auto-generated snapshots to keep per year (manual snapshots are never deleted automatically)';