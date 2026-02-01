-- Add requires_approval boolean column to expenses table
-- This tracks whether an expense needs approval from a bishop
-- If false, the expense is auto-approved and approved_by is not needed

ALTER TABLE expenses 
ADD COLUMN requires_approval boolean DEFAULT true;

-- Add comment to explain the column
COMMENT ON COLUMN expenses.requires_approval IS 'Indicates if the expense requires approval from a bishop. If false, expense is auto-approved.';
