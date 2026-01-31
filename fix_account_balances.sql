-- ====================================================================
-- FIX ACCOUNT BALANCES SCRIPT
-- ====================================================================
-- This script recalculates all account balances based on transactions
-- Run this in Supabase SQL Editor to fix balance discrepancies
-- ====================================================================

-- Step 1: Reset all account balances to 0
UPDATE finance_accounts SET balance = 0;

-- Step 2: Recalculate balances from transactions table
-- This adds up all donations and subtracts all expenses per account
UPDATE finance_accounts fa
SET balance = COALESCE(
    (
        SELECT SUM(
            CASE 
                WHEN t.transaction_type IN ('Donation', 'Income', 'Transfer In') THEN t.amount
                WHEN t.transaction_type IN ('Expense', 'Transfer Out', 'Withdrawal') THEN -t.amount
                ELSE 0
            END
        )
        FROM transactions t
        WHERE t.account_id = fa.account_id
    ), 0
);

-- Step 3: Verify the results
SELECT 
    account_id,
    account_name,
    account_type,
    balance,
    (SELECT COUNT(*) FROM transactions WHERE account_id = fa.account_id) as transaction_count,
    (SELECT SUM(amount) FROM transactions WHERE account_id = fa.account_id AND transaction_type = 'Donation') as total_donations
FROM finance_accounts fa
ORDER BY account_id;

-- ====================================================================
-- NOTES:
-- - This script assumes all 'Donation' transactions add to the balance
-- - Adjust transaction_type values if you use different names
-- - Run the verification SELECT to check results before committing
-- ====================================================================
