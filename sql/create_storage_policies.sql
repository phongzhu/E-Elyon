-- Storage bucket RLS policies for expense-receipts
-- Run this in Supabase SQL editor AFTER creating the bucket via Dashboard

-- Note: The bucket must be created first via Supabase Dashboard:
-- Storage > Create bucket > name: "expense-receipts" > Public: OFF

-- Enable RLS on storage.objects (if not already enabled)
-- This may already be done, just ensuring it
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to recreate)
DROP POLICY IF EXISTS "Authenticated users can upload expense receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view expense receipts" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can delete expense receipts" ON storage.objects;

-- Policy 1: Allow authenticated users to INSERT (upload)
CREATE POLICY "Authenticated users can upload expense receipts"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'expense-receipts'
);

-- Policy 2: Allow authenticated users to SELECT (view/download)
CREATE POLICY "Users can view expense receipts"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'expense-receipts'
);

-- Policy 3: Allow authenticated users to UPDATE
CREATE POLICY "Users can update expense receipts"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'expense-receipts'
)
WITH CHECK (
    bucket_id = 'expense-receipts'
);

-- Policy 4: Allow only admins to DELETE
CREATE POLICY "Only admins can delete expense receipts"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'expense-receipts' AND
    auth.uid() IN (
        SELECT auth_user_id FROM public.users WHERE role = 'Admin'
    )
);
