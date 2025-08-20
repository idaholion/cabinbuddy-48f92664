-- Update the receipt-images bucket to be public so images can be displayed
UPDATE storage.buckets 
SET public = true 
WHERE id = 'receipt-images';