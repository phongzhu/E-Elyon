-- Storage bucket for expense receipts and attachments
-- IMPORTANT: Storage buckets must be created via Supabase Dashboard, not SQL

-- ============================================
-- STEP 1: Create bucket via Supabase Dashboard
-- ============================================
-- Go to: Storage > Create a new bucket
-- Bucket name: expense-receipts
-- Public bucket: OFF (private)
-- File size limit: 5MB (or as needed)
-- Allowed MIME types: image/*, application/pdf

-- ============================================
-- STEP 2: Configure policies in Dashboard
-- ============================================
-- Go to: Storage > expense-receipts > Policies
-- Add these policies:

-- Policy 1: Upload (INSERT)
-- Name: "Authenticated users can upload"
-- Policy: bucket_id = 'expense-receipts'

-- Policy 2: View (SELECT) 
-- Name: "Authenticated users can view"
-- Policy: bucket_id = 'expense-receipts'

-- Policy 3: Delete (DELETE)
-- Name: "Only admins can delete"
-- Policy: bucket_id = 'expense-receipts' AND auth.uid() IN (SELECT auth_user_id FROM users WHERE role = 'Admin')

-- ============================================
-- STEP 3: Run this SQL to add column
-- ============================================

-- Add receipt_file column to expenses table
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS receipt_file text NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.expenses.receipt_file IS 'File path to receipt picture/PDF stored in Supabase Storage (format: expense-receipts/filename.ext)';
