// src/lib/financeAccountsService.js
import { supabase } from './supabaseClient';

const PROFILE_BUCKET = 'profiles';

function buildFullName(details) {
  const name = [details?.first_name, details?.middle_name, details?.last_name, details?.suffix]
    .filter(Boolean)
    .join(' ')
    .trim();
  return name || null;
}

function getPublicImageUrl(photoPath) {
  if (!photoPath) return null;
  if (/^https?:\/\//i.test(photoPath)) return photoPath;
  const { data } = supabase.storage.from(PROFILE_BUCKET).getPublicUrl(photoPath);
  return data?.publicUrl || null;
}

function buildAvatarUrl(name) {
  const safeName = encodeURIComponent(name || 'Finance');
  return `https://ui-avatars.com/api/?name=${safeName}&background=e5e7eb&color=111827&rounded=true&size=80`;
}

function mapFinanceUser(row) {
  const details = row?.user_details || null;
  const fullName = buildFullName(details) || row?.email || `Finance #${row?.user_id}`;
  const photoUrl = getPublicImageUrl(details?.photo_path) || buildAvatarUrl(fullName);

  return {
    user_id: row?.user_id ?? null,
    email: row?.email ?? null,
    role: row?.role ?? null,
    created_at: row?.created_at ?? null,
    branch_id: details?.branch_id ?? null,
    full_name: fullName,
    photo_url: photoUrl,
    photo_path: details?.photo_path ?? null,
    user_details_id: details?.user_details_id ?? row?.user_details_id ?? null,
  };
}

function mapFinanceUsersByBranch(users) {
  const byBranch = new Map();
  for (const user of users || []) {
    const key = user?.branch_id != null ? String(user.branch_id) : null;
    if (!key) continue;
    const existing = byBranch.get(key) || [];
    existing.push(user);
    byBranch.set(key, existing);
  }
  return byBranch;
}

function mapDetailsByAuthId(detailsRows) {
  const map = new Map();
  for (const d of detailsRows || []) {
    if (!d?.auth_user_id) continue;
    map.set(String(d.auth_user_id), d);
  }
  return map;
}

function rolePriority(role) {
  const r = String(role || '').trim().toLowerCase();
  if (r.startsWith('finance')) return 0;
  if (r.startsWith('admin')) return 1;
  return 2;
}

async function fetchActiveFinanceUsers(branchIds = null) {
  try {
    // Debug: First check what users exist with what roles
    const { data: allUsersDebug, error: debugError } = await supabase
      .from('users')
      .select('user_id, email, role, is_active, user_details_id')
      .order('created_at', { ascending: true });
    
    if (!debugError) {
      console.log('[DEBUG] All users in database:', allUsersDebug);
      console.log('[DEBUG] Roles found:', [...new Set(allUsersDebug.map(u => u.role))]);
    }

    const { data, error } = await supabase
      .from('users')
      .select(`
        user_id,
        user_details_id,
        auth_user_id,
        email,
        role,
        is_active,
        created_at,
        user_details:users_details (
          user_details_id,
          auth_user_id,
          branch_id,
          first_name,
          middle_name,
          last_name,
          suffix,
          photo_path
        )
      `)
      // Fetch FINANCE or ADMIN role users that are active or NULL
      .or(
        'and(role.ilike.finance%,is_active.eq.true),and(role.ilike.finance%,is_active.is.null),and(role.ilike.admin%,is_active.eq.true),and(role.ilike.admin%,is_active.is.null)'
      )
      .order('created_at', { ascending: true });

    if (error) throw error;

    console.log('[DEBUG] Query returned users:', data?.length || 0);
    console.log('[DEBUG] Users after RLS filter:', data);

    const raw = data || [];

    // Fallback: some rows may not have user_details_id linked yet, but do have auth_user_id.
    const missingDetailsAuthIds = raw
      .filter((u) => !u?.user_details?.branch_id && u?.auth_user_id)
      .map((u) => String(u.auth_user_id));

    let detailsByAuthId = new Map();
    if (missingDetailsAuthIds.length > 0) {
      const { data: detailsRows, error: detailsError } = await supabase
        .from('users_details')
        .select(`
          user_details_id,
          auth_user_id,
          branch_id,
          first_name,
          middle_name,
          last_name,
          suffix,
          photo_path
        `)
        .in('auth_user_id', missingDetailsAuthIds);

      if (!detailsError) {
        detailsByAuthId = mapDetailsByAuthId(detailsRows);
      } else {
        console.error('Error fetching users_details by auth_user_id:', detailsError);
      }
    }

    const patched = raw.map((u) => {
      if (u?.user_details?.branch_id) return u;
      if (!u?.auth_user_id) return u;
      const fallbackDetails = detailsByAuthId.get(String(u.auth_user_id)) || null;
      return { ...u, user_details: fallbackDetails };
    });

    const mapped = patched.map(mapFinanceUser).filter((u) => u.branch_id != null);

    if (!branchIds || branchIds.length === 0) return mapped;
    const allowed = new Set(branchIds.map((id) => String(id)));
    return mapped.filter((u) => allowed.has(String(u.branch_id)));
  } catch (error) {
    console.error('Error fetching active finance users:', error);
    // Degrade gracefully: accounts can still load even if this fails.
    return [];
  }
}

/**
 * Fetch all finance accounts with branch and ministry details
 * @param {Array} branchIds - Optional array of branch IDs to filter
 * @returns {Promise<Array>} Array of finance accounts
 */
export async function fetchFinanceAccounts(branchIds = null) {
  try {
    let query = supabase
      .from('finance_accounts')
      .select(`
        *,
        branches:branch_id (
          branch_id,
          name,
          street,
          city,
          province
        ),
        branch_ministries:branch_ministry_id (
          branch_ministry_id,
          ministries:ministry_id (
            id,
            name
          )
        )
      `)
      .order('created_at', { ascending: false });

    // Apply branch filter if provided
    if (branchIds && branchIds.length > 0) {
      query = query.in('branch_id', branchIds);
    }

    const [{ data, error }, financeUsers] = await Promise.all([
      query,
      fetchActiveFinanceUsers(branchIds),
    ]);

    if (error) throw error;

    const financeUsersByBranch = mapFinanceUsersByBranch(financeUsers);

    try {
      // Helpful when RLS/policies filter out users silently.
      console.log('[financeAccountsService] finance users fetched:', financeUsers.length);
      console.log('[financeAccountsService] finance users:', financeUsers);
      console.log(
        '[financeAccountsService] branch ids with users:',
        Array.from(new Set(financeUsers.map((u) => String(u.branch_id))))
      );
      console.log('[financeAccountsService] accounts branch_ids:', (data || []).map(a => a.branch_id));
    } catch (err) {
      console.error('Debug logging error:', err);
    }

    const accountsWithAssignments = (data || []).map((account) => {
      const branchKey = account?.branch_id != null ? String(account.branch_id) : null;
      const branchFinanceUsers = branchKey ? financeUsersByBranch.get(branchKey) || [] : [];
      const branchFinanceUsersSorted = [...branchFinanceUsers].sort((a, b) => {
        const byRole = rolePriority(a.role) - rolePriority(b.role);
        if (byRole !== 0) return byRole;
        const aTime = a?.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b?.created_at ? new Date(b.created_at).getTime() : 0;
        return aTime - bTime;
      });
      const assignedFinanceUser = branchFinanceUsersSorted[0] || null;

      return {
        ...account,
        branch_finance_users: branchFinanceUsersSorted,
        assigned_finance_user: assignedFinanceUser,
        assigned_finance_user_count: branchFinanceUsersSorted.length,
      };
    });

    return accountsWithAssignments;
  } catch (error) {
    console.error('Error fetching finance accounts:', error);
    throw error;
  }
}

/**
 * Create a new finance account
 * @param {Object} accountData - Account data
 * @returns {Promise<Object>} Created account
 */
export async function createFinanceAccount(accountData) {
  try {
    const { data, error } = await supabase
      .from('finance_accounts')
      .insert([
        {
          branch_id: accountData.branch_id,
          branch_ministry_id: accountData.branch_ministry_id || null,
          account_name: accountData.account_name,
          account_type: accountData.account_type,
          account_number: accountData.account_number || null,
          balance: 0.00, // Start with 0, will be calculated from transactions
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating finance account:', error);
    throw error;
  }
}

/**
 * Update an existing finance account
 * @param {Number} accountId - Account ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated account
 */
export async function updateFinanceAccount(accountId, updates) {
  try {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Don't allow balance updates (should be calculated)
    delete updateData.balance;

    const { data, error } = await supabase
      .from('finance_accounts')
      .update(updateData)
      .eq('account_id', accountId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating finance account:', error);
    throw error;
  }
}

/**
 * Deactivate a finance account (soft delete)
 * @param {Number} accountId - Account ID
 * @returns {Promise<Object>} Updated account
 */
export async function deactivateFinanceAccount(accountId) {
  try {
    const { data, error } = await supabase
      .from('finance_accounts')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('account_id', accountId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error deactivating finance account:', error);
    throw error;
  }
}

/**
 * Reactivate a finance account
 * @param {Number} accountId - Account ID
 * @returns {Promise<Object>} Updated account
 */
export async function reactivateFinanceAccount(accountId) {
  try {
    const { data, error } = await supabase
      .from('finance_accounts')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('account_id', accountId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error reactivating finance account:', error);
    throw error;
  }
}

/**
 * Fetch all branches for dropdown
 * @returns {Promise<Array>} Array of branches
 */
export async function fetchBranches() {
  try {
    const { data, error } = await supabase
      .from('branches')
      .select('branch_id, name, street, city, province')
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching branches:', error);
    throw error;
  }
}

/**
 * Fetch ministries for a specific branch
 * @param {Number} branchId - Branch ID
 * @returns {Promise<Array>} Array of ministries
 */
export async function fetchMinistriesByBranch(branchId) {
  try {
    const { data, error } = await supabase
      .from('branch_ministries')
      .select(`
        branch_ministry_id,
        ministries:ministry_id (
          id,
          name
        )
      `)
      .eq('branch_id', branchId)
      .eq('is_active', true)
      .order('ministries(name)');

    if (error) throw error;
    
    // Transform data to flatten ministry info
    const transformed = (data || []).map(item => ({
      branch_ministry_id: item.branch_ministry_id,
      ministry_name: item.ministries?.name || 'Unknown'
    }));
    
    return transformed;
  } catch (error) {
    console.error('Error fetching ministries:', error);
    throw error;
  }
}

/**
 * Calculate account balance from transactions
 * @param {Number} accountId - Account ID
 * @returns {Promise<Number>} Calculated balance
 */
export async function calculateAccountBalance(accountId) {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('amount')
      .eq('account_id', accountId);

    if (error) throw error;

    // Sum all transaction amounts
    const balance = (data || []).reduce((sum, transaction) => {
      return sum + parseFloat(transaction.amount || 0);
    }, 0);

    return balance;
  } catch (error) {
    console.error('Error calculating account balance:', error);
    throw error;
  }
}
