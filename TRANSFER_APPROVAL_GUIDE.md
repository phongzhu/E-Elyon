# Transfer Funds with Approval Workflow - Implementation Guide

## Overview
Transfer requests will require bishop approval. The flow is:
1. User submits transfer request → Status: Pending
2. Bishop reviews and approves → Status: Completed + Balance updated
3. Reference number auto-generated using edge function

---

## Step 1: Database Schema Changes

**Run SQL file:** `alter_transfers_add_approval.sql`

This adds:
- `requires_approval` (boolean, default true)
- `approved_by` (integer FK to users)
- `approved_at` (timestamp)

**Already have in transactions table:**
- `reference_id` ✓
- `status` ✓
- `notes` ✓
- `amount` ✓
- `created_by` ✓

---

## Step 2: Update InterAccountTransfers.jsx

**Changes needed:**
1. Save transfers with `status = 'Pending'` (not Completed)
2. Don't deduct balance immediately (wait for approval)
3. Generate reference_id format: `TRF-{YYYYMMDD}-{sequence}`

---

## Step 3: Create Transfer Approval Page (Bishop)

**New file:** `src/pages/bishop/TransferApprovals.jsx`

Features:
- Show all pending transfers
- Display: From branch → To branches, amount, purpose, notes
- Approve/Reject buttons
- On approve: Update status + Deduct balance

---

## Step 4: Edge Function for Reference Number Generation (Optional)

**If you want auto-increment reference numbers:**

### 4.1 Create sequence table:
```sql
CREATE TABLE transfer_sequences (
  date_key VARCHAR(8) PRIMARY KEY,
  last_sequence INTEGER DEFAULT 0
);
```

### 4.2 Create Edge Function:
```bash
# In Supabase Dashboard → Edge Functions → New Function
```

**Function: generate-transfer-reference**
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  
  // Get or create sequence
  const { data: seq } = await supabase
    .from('transfer_sequences')
    .select('last_sequence')
    .eq('date_key', today)
    .single()

  let nextSeq = 1
  if (seq) {
    nextSeq = seq.last_sequence + 1
    await supabase
      .from('transfer_sequences')
      .update({ last_sequence: nextSeq })
      .eq('date_key', today)
  } else {
    await supabase
      .from('transfer_sequences')
      .insert({ date_key: today, last_sequence: 1 })
  }

  const referenceId = `TRF-${today}-${String(nextSeq).padStart(4, '0')}`
  
  return new Response(
    JSON.stringify({ reference_id: referenceId }),
    { headers: { "Content-Type": "application/json" } }
  )
})
```

### 4.3 Deploy Edge Function:
```bash
supabase functions deploy generate-transfer-reference
```

### 4.4 Call from frontend:
```javascript
const { data } = await supabase.functions.invoke('generate-transfer-reference')
const referenceId = data.reference_id
```

---

## Step 5: PayMongo Integration (Future)

**For bank transfers:**
1. Create PayMongo account → Get API keys
2. Store in environment variables
3. Use PayMongo Send Money API
4. Update transaction with PayMongo reference

**Note:** PayMongo Send Money requires business verification

---

## Simpler Alternative: Client-side Reference Generation

**No edge function needed:**

```javascript
const generateReferenceId = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `TRF-${date}-${random}`
}
```

---

## Recommended Implementation Order

1. ✅ Run SQL to add approval fields
2. ✅ Update InterAccountTransfers.jsx to save as Pending
3. ✅ Create TransferApprovals.jsx page for bishop
4. ✅ Add reference number generation (client-side first)
5. 🔄 Later: Add edge function for sequential numbers
6. 🔄 Later: Integrate PayMongo when ready

---

## What to do NOW:

1. Execute the SQL file in Supabase SQL Editor
2. I'll update InterAccountTransfers.jsx to save transfers as Pending
3. I'll create the TransferApprovals.jsx page for bishop approval

Ready to proceed?
