-- Add missing host features
INSERT INTO default_features (feature_key, title, description, icon, category, sort_order, is_active)
VALUES 
  ('shopping_list', 'Shopping List', 'Coordinate cabin supplies with shared shopping lists that update in real-time for the whole family.', 'shoppingcart', 'host', 11, true),
  ('shared_notes', 'Shared Notes', 'Leave notes for the next guests about cabin conditions, recommendations, and helpful tips.', 'stickynote', 'host', 12, true),
  ('stay_history', 'Stay History', 'View your complete cabin stay history with visit dates, guests, and payment records.', 'history', 'host', 13, true),
  ('guest_access', 'Guest Access', 'Share limited cabin access with guests using secure access codes and customizable permissions.', 'usercheck', 'host', 14, true),
  ('faq_help', 'FAQ & Help Center', 'Find answers to common questions about cabin operations and family procedures.', 'helpCircle', 'host', 15, true);

-- Add missing admin features  
INSERT INTO default_features (feature_key, title, description, icon, category, sort_order, is_active)
VALUES
  ('billing_dashboard', 'Billing Dashboard', 'Comprehensive billing management with invoices, payment tracking, and financial reporting by billing cycle.', 'receipt', 'admin', 4, true),
  ('stay_history_snapshots', 'Stay History Snapshots', 'Protect your data with automatic and manual snapshots of stay history for easy recovery.', 'database', 'admin', 5, true),
  ('data_backup', 'Data Backup', 'Export and backup organization data including reservations, payments, and settings.', 'download', 'admin', 6, true),
  ('guest_cost_splitting', 'Guest Cost Splitting', 'Split stay costs with guests and automatically track who owes what.', 'split', 'admin', 7, true),
  ('season_summary', 'Season Summary', 'View comprehensive season-end reports with usage statistics and financial summaries.', 'barchart', 'admin', 8, true);

-- Update existing admin features to have higher sort_order to maintain logical grouping
UPDATE default_features SET sort_order = 9 WHERE feature_key = 'maintenance_tracking';
UPDATE default_features SET sort_order = 10 WHERE feature_key = 'admin_controls';