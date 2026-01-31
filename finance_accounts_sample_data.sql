-- ====================================================================
-- FINANCE ACCOUNTS SETUP SCRIPT
-- ====================================================================
-- INSTRUCTIONS:
-- 1. Copy the update_account_balance function (lines 25-57) below
-- 2. Go to Supabase Dashboard → SQL Editor
-- 3. Paste and run the function creation code
-- 4. Verify it appears in Database → Functions
-- 5. Then you can run the INSERT statements to add sample data
-- ====================================================================

-- Sample data for finance_accounts table
-- Run these INSERT statements in your Supabase SQL Editor

-- Insert sample finance accounts
INSERT INTO finance_accounts (branch_id, account_name, account_type, account_number, balance, is_active) VALUES
(1, 'General Fund', 'Cash', 'GF-001', 50000.00, true),
(1, 'Tithes Account', 'Cash', 'TT-001', 75000.00, true),
(1, 'Offerings Account', 'Cash', 'OF-001', 35000.00, true),
(1, 'Building Fund', 'Savings', 'BF-001', 150000.00, true),
(1, 'Mission Fund', 'Savings', 'MF-001', 25000.00, true),
(1, 'Special Projects', 'Cash', 'SP-001', 10000.00, true),
(1, 'Ministry Fund', 'Cash', 'MIN-001', 20000.00, true),
(1, 'Love Gift Fund', 'Cash', 'LG-001', 15000.00, true),
(2, 'General Fund - Branch 2', 'Cash', 'GF-002', 30000.00, true),
(2, 'Tithes Account - Branch 2', 'Cash', 'TT-002', 45000.00, true);

-- Note: Replace branch_id values (1, 2) with actual branch IDs from your branches table

-- Create function to update account balance
-- This function safely updates account balances and prevents negative balances
-- IMPORTANT: Run this in Supabase SQL Editor to create the function
CREATE OR REPLACE FUNCTION public.update_account_balance(
    p_account_id BIGINT,
    p_amount NUMERIC(15,2),
    p_operation TEXT -- 'add' or 'subtract'
)
RETURNS VOID 
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS policies
AS $$
BEGIN
    IF p_operation = 'add' THEN
        UPDATE finance_accounts 
        SET balance = balance + p_amount,
            updated_at = NOW()
        WHERE account_id = p_account_id;
    ELSIF p_operation = 'subtract' THEN
        -- Check if sufficient balance
        IF (SELECT balance FROM finance_accounts WHERE account_id = p_account_id) >= p_amount THEN
            UPDATE finance_accounts 
            SET balance = balance - p_amount,
                updated_at = NOW()
            WHERE account_id = p_account_id;
        ELSE
            RAISE EXCEPTION 'Insufficient balance in account';
        END IF;
    ELSE
        RAISE EXCEPTION 'Invalid operation. Use "add" or "subtract"';
    END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_account_balance(BIGINT, NUMERIC, TEXT) TO authenticated;

-- Verify the data was inserted
SELECT account_id, account_name, account_type, balance, is_active 
FROM finance_accounts 
ORDER BY account_id;
