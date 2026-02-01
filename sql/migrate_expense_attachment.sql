-- Migration: Replace attachment_url with receipt_file in expenses table
-- Run this in Supabase SQL editor

-- Drop the old attachment_url column if it exists
ALTER TABLE public.expenses 
DROP COLUMN IF EXISTS attachment_url;

-- Add the new receipt_file column if it doesn't exist
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS receipt_file text NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.expenses.receipt_file IS 'File path to receipt picture/PDF stored in Supabase Storage (format: expense-receipts/filename.ext)';
