# PayMongo Integration for Transfer Approvals - Summary

## Changes Implemented

### 1. **InterAccountTransfers.jsx** (Branch User - Request Transfer)

#### Changes:
- ✅ **Only Bank Accounts**: Source account dropdown now filters to show only `Bank` type accounts
  ```javascript
  .ilike('account_type', 'bank')
  ```

- ✅ **No Auto-Generated Reference**: Removed `generateReferenceId()` function
  - Reference ID is now set to `null` when creating transactions
  - Will be filled with PayMongo reference after bishop approval

- ✅ **Modals Instead of Alerts**: 
  - Added `showSuccessModal`, `showErrorModal` states
  - Success/error messages displayed in modal dialogs
  - Better UX with styled modals

#### Flow:
1. User selects Bank account
2. Fills amount, purpose, notes
3. Selects destination branches (with bank account validation)
4. Submits → Creates transfer with `status='Pending'` and `reference_id=null`
5. Shows success modal: "Transfer request submitted! Awaiting bishop approval."

---

### 2. **TransferApprovals.jsx** (Bishop - Approve Transfer)

#### Changes:
- ✅ **PayMongo Integration**: 
  - Imported `createPayMongoSource` function
  - When bishop clicks "Approve", redirects to PayMongo checkout (GCash/GrabPay)
  
- ✅ **Payment Flow**:
  ```
  1. Bishop clicks Approve
  2. Creates PayMongo source (checkout page)
  3. Stores transfer_id in localStorage
  4. Redirects to PayMongo: paymongoSource.attributes.redirect.checkout_url
  5. User pays via GCash/GrabPay
  6. PayMongo redirects back with ?status=success
  7. completeApproval() function runs:
     - Updates transfer as approved
     - Updates transactions with PayMongo reference ID
     - Deducts from source account
     - Credits destination branch accounts
  ```

- ✅ **Reference ID from PayMongo**:
  - `paymongo_source_id` is stored and used as reference_id
  - Updated in transactions table after successful payment

- ✅ **Auto-Complete on Return**:
  - `useEffect` checks URL params on page load
  - If `?status=success`, completes the approval automatically
  - If `?status=failed`, shows error modal

- ✅ **Modals for All Messages**:
  - Success modal: "Transfer approved and funds distributed successfully!"
  - Error modal: Shows payment errors or failures
  - No more alerts

#### Functions Added:
- `handleApprove()`: Initiates PayMongo payment
- `completeApproval(transferId, paymongoReferenceId)`: Completes transfer after payment
- `useEffect()`: Checks for payment callback

---

## PayMongo Setup Required

### Environment Variables (.env):
```env
REACT_APP_PAYMONGO_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
```

### Get PayMongo API Key:
1. Sign up at https://dashboard.paymongo.com/
2. Go to Developers → API Keys
3. Copy Secret Key (starts with `sk_test_` or `sk_live_`)

### PayMongo Source Creation:
The `createPayMongoSource()` function in `paymongoUtils.js` creates a checkout page for:
- GCash payments
- GrabPay payments
- Returns URL for user to complete payment

---

## Flow Diagram

```
Branch User (Transfer Request)
    ↓
[Select Bank Account Only]
    ↓
[Fill Amount, Purpose, Notes]
    ↓
[Select Branches with Bank Accounts]
    ↓
[Submit] → Creates Pending Transfer (no reference yet)
    ↓
[Success Modal] → "Awaiting bishop approval"

---

Bishop (Approval)
    ↓
[View Pending Transfers]
    ↓
[Click Approve]
    ↓
[Redirect to PayMongo GCash/GrabPay]
    ↓
User Pays → PayMongo
    ↓
[Redirect Back with ?status=success]
    ↓
[Auto-Complete]:
  - Save PayMongo Reference ID
  - Update Status to Completed
  - Deduct Source Balance
  - Credit Destination Balances
    ↓
[Success Modal] → "Transfer approved!"
```

---

## Database Schema (No Changes)

Uses existing tables:
- `transfers` (requires_approval, approved_by, approved_at)
- `transactions` (reference_id - now from PayMongo)
- `finance_accounts` (balance updates)

---

## Testing Steps

### 1. Create Transfer Request (Branch User):
- Login as branch user
- Go to Transfer Funds
- Verify only Bank accounts appear
- Select account, amount, purpose
- Select destination branches (only with bank accounts)
- Submit
- Verify success modal appears
- Check database: `reference_id` should be `null`

### 2. Approve Transfer (Bishop):
- Login as bishop
- Go to Transfer Approvals
- Click Approve on pending transfer
- Should redirect to PayMongo checkout
- **Test Mode**: Use test card/GCash credentials from PayMongo docs
- Complete payment
- Should redirect back to `/bishop/transfer-approvals?status=success`
- Verify:
  - Success modal appears
  - Transaction status = 'Completed'
  - reference_id = PayMongo source ID
  - Source account balance deducted
  - Destination account balances credited

### 3. Test Failed Payment:
- Start approval process
- Cancel payment on PayMongo page
- Should redirect with `?status=failed`
- Verify error modal appears
- Transfer should remain Pending

---

## PayMongo Test Credentials

Use these in test mode:
- **GCash Test**: Follow PayMongo docs for test wallet
- **Card Test**: 
  - Number: 4123 4500 0000 1234
  - Expiry: Any future date
  - CVC: 123

---

## Security Notes

1. ✅ Never commit `.env` file
2. ✅ Use `sk_test_` for development
3. ✅ Use `sk_live_` for production only
4. ✅ Add RLS policies for transfers table
5. ✅ Validate amounts and permissions on backend

---

## Future Enhancements (Optional)

1. **Email Notifications**:
   - Send email when transfer submitted
   - Send email when approved/rejected

2. **PayMongo Webhooks**:
   - Auto-update status on payment events
   - No need for URL callback

3. **Multiple Payment Methods**:
   - Add GrabPay option
   - Add PayMaya option
   - Let bishop choose payment method

4. **Batch Transfers**:
   - Approve multiple transfers at once
   - Single PayMongo payment for batch

---

## Support

For PayMongo issues:
- Docs: https://developers.paymongo.com/docs
- Support: support@paymongo.com

For Code Issues:
- Check console for errors
- Verify `.env` file is loaded
- Check PayMongo dashboard for payment status
