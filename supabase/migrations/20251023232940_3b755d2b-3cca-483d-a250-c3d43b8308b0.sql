-- Clean up stale reservation_periods for 2026 rotation year
-- Keep only the current active period (Andrew Family, Oct 22-29, 2025)
DELETE FROM reservation_periods 
WHERE rotation_year = 2026 
  AND organization_id = 'c786936c-6167-451d-9473-1f0ba22d5cfd'
  AND id != '81b85f10-5471-49ca-b5b0-b9b7884a80ba';