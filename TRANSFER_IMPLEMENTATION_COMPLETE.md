# Transfer Approval System with PayMongo - Setup Guide

## ✅ Implementation Complete!

I've implemented a complete transfer approval workflow with PayMongo integration support.

---

## 📁 Files Created/Modified

### 1. **InterAccountTransfers.jsx** (Modified)
- ✅ Generates auto-reference ID: `TRF-YYYYMMDD-XXXX`
- ✅ Saves transfers with `status='Pending'`
- ✅ Creates paired debit/credit transactions
- ✅ Does NOT deduct balance (waits for approval)
- ✅ Shows success message about awaiting approval

### 2. **TransferApprovals.jsx** (New)
Location: `src/pages/bishop/TransferApprovals.jsx`

Features:
- ✅ Shows all transfer requests (Pending/Completed/Rejected)
- ✅ Groups transactions by transfer_id
- ✅ Displays source account, destination branches, amounts
- ✅ Approve button → Updates status, deducts balance
- ✅ Reject button → Marks as rejected (no balance change)
- ✅ PayMongo integration ready (commented code included)

### 3. **paymongoUtils.js** (New)
Location: `src/lib/paymongoUtils.js`

Functions:
- `createPayMongoSource()` - For receiving payments
- `createPayMongoPayout()` - For sending funds to bank accounts
- `createPayMongoRecipient()` - Register branch bank accounts
- `getPayoutStatus()` - Check payout status
- `BANK_CODES` - Philippine bank codes (BDO, BPI, UnionBank, etc.)

### 4. **App.js** (Modified)
- ✅ Added TransferApprovals import
- ✅ Added route: `/bishop/transfer-approvals`

---

## 🔑 Environment Setup

### Step 1: Get PayMongo API Keys
1. Sign up at https://dashboard.paymongo.com/
2. Complete business verification
3. Get your Secret Key from API Keys section

### Step 2: Add to Environment Variables
Create `.env` file in project root:

```env
REACT_APP_PAYMONGO_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
```

**Production:**
```env
REACT_APP_PAYMONGO_SECRET_KEY=sk_live_YOUR_SECRET_KEY_HERE
```

---

## 🏦 PayMongo Integration Steps

### Current Implementation:
- ✅ Transfer requests saved as Pending
- ✅ Bishop can approve/reject
- ✅ Balance deducted on approval
- ✅ Reference ID auto-generated

### To Enable PayMongo Bank Transfers:

#### Option 1: Manual Bank Transfer (Current - No PayMongo needed)
The system works without PayMongo. Bishops approve transfers manually, then process bank transfers through their bank's online system using the reference ID.

#### Option 2: Automated PayMongo Payouts (Recommended)

**Prerequisites:**
1. Complete PayMongo business verification
2. Each branch must have registered bank accounts

**Database Addition (Optional):**
```sql
CREATE TABLE branch_bank_accounts (
  branch_id INTEGER REFERENCES branches(branch_id),
  bank_name VARCHAR,
  account_number VARCHAR,
  account_name VARCHAR,
  bank_code VARCHAR,
  paymongo_recipient_id VARCHAR,
  is_active BOOLEAN DEFAULT true
);
```

**Activate PayMongo in TransferApprovals.jsx:**
Uncomment lines 173-196 in `handleApprove()` function.

---

## 🚀 How to Use

### For Branch Users:
1. Go to **Finance** → **Transfer Funds**
2. Select source account
3. Enter amount per branch
4. Select destination branches (only with bank accounts)
5. Add purpose and notes
6. Click "Distribute Funds to X Branches"
7. System creates Pending transfer request

### For Bishop:
1. Go to **Transfer Approvals** (new menu item)
2. View all Pending transfers
3. Review details: amount, branches, purpose
4. Click **Approve** → Deducts balance, marks as Completed
5. Click **Reject** → Marks as Rejected (no balance change)

---

## 📊 Database Schema (Already Applied)

```sql
-- transfers table
ALTER TABLE transfers
ADD COLUMN requires_approval BOOLEAN DEFAULT true,
ADD COLUMN approved_by INTEGER REFERENCES users(user_id),
ADD COLUMN approved_at TIMESTAMP;

-- transactions.reference_id is used for PayMongo reference
-- transactions.status: Pending → Completed/Rejected
```

---

## 🔧 Testing Workflow

1. **Create Transfer Request:**
   - Login as branch user
   - Go to Transfer Funds
   - Fill form and submit
   - Check: Transfers saved with status='Pending'

2. **Approve Transfer:**
   - Login as bishop
   - Go to Transfer Approvals
   - Click Approve on pending transfer
   - Check: Status changes to Completed, balance deducted

3. **Verify Database:**
```sql
-- Check transfers
SELECT * FROM transfers WHERE transfer_id = X;

-- Check transactions
SELECT * FROM transactions WHERE transfer_id = X;

-- Check account balance
SELECT balance FROM finance_accounts WHERE account_id = X;
```

---

## 🎨 UI Features

### InterAccountTransfers:
- Shows bank account count per branch (✓ 2 Bank Accounts)
- Disables branches without bank accounts
- Excludes user's own branch
- Live balance validation

### TransferApprovals:
- Filter tabs: Pending, Completed, Rejected
- Clean cards with all details
- Confirmation modals for approve/reject
- Loading states during processing
- Auto-refresh after actions

---

## 🔐 Security Notes

1. **API Keys:** Never commit `.env` to git
2. **RLS Policies:** Add row-level security for transfers table:
```sql
-- Only bishops can approve
CREATE POLICY bishop_approve_transfers ON transfers
FOR UPDATE USING (
  auth.uid() IN (
    SELECT auth_user_id FROM users 
    WHERE role = 'bishop'
  )
);
```

3. **PayMongo Secret:** Use environment variables only
4. **Balance Validation:** Check balance before approval

---

## 📝 Next Steps (Optional)

1. **Add Navigation Link:**
   - Update Bishop sidebar to include "Transfer Approvals"

2. **Email Notifications:**
   - Send email when transfer submitted
   - Send email when approved/rejected

3. **PayMongo Webhook:**
   - Create endpoint to receive payout status updates
   - Auto-update transaction status

4. **Reports:**
   - Transfer history page
   - Bishop approval analytics

---

## ❓ Troubleshooting

**Problem:** "Column branches.location does not exist"
- ✅ Fixed: Now uses city, province

**Problem:** User's own branch appears in list
- ✅ Fixed: Filtered out in fetchBranches

**Problem:** Branches without bank accounts selectable
- ✅ Fixed: Disabled with visual feedback

**Problem:** PayMongo 401 Unauthorized
- Check: REACT_APP_PAYMONGO_SECRET_KEY in .env
- Verify: Secret key format (starts with sk_test_ or sk_live_)

---

## 🎉 Summary

The complete transfer approval system is ready to use! 

**Without PayMongo:** Fully functional for manual bank transfers
**With PayMongo:** Add bank accounts + uncomment code for automation

Access Transfer Approvals at: `/bishop/transfer-approvals`

All code follows the existing architecture with proper branch filtering, status management, and balance tracking.
