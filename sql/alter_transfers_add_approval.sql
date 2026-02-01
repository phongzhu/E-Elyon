-- Add approval fields to transfers table

ALTER TABLE public.transfers
ADD COLUMN requires_approval boolean DEFAULT true,
ADD COLUMN approved_by integer NULL,
ADD COLUMN approved_at timestamp without time zone NULL,
ADD CONSTRAINT transfers_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES users(user_id);

-- Add comment for purpose field (transfer_method is already being used for this)
COMMENT ON COLUMN public.transfers.transfer_method IS 'Purpose of transfer (e.g., Revolving Funds, Emergency Fund, etc.)';

-- Optional: Rename transfer_method to purpose for clarity
-- ALTER TABLE public.transfers RENAME COLUMN transfer_method TO purpose;
