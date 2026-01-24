-- Add automated_backups_enabled column to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS automated_backups_enabled boolean DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN organizations.automated_backups_enabled IS 'Whether automatic daily backups are enabled for this organization. Set to false for test organizations to save storage.';