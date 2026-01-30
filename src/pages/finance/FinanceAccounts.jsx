import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { useBranding } from "../../context/BrandingContext";
import { Plus, Edit2, X, Power, PowerOff, Search, Filter } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import {
  fetchFinanceAccounts,
  createFinanceAccount,
  updateFinanceAccount,
  deactivateFinanceAccount,
  reactivateFinanceAccount,
  fetchBranches,
  fetchMinistriesByBranch,
  calculateAccountBalance,
} from "../../lib/financeAccountsService";

export default function FinanceAccounts() {
  const { branding } = useBranding();

  const MAIN_BRANCH_ID = 2;

  const primary = branding?.primary_color || "#0f172a";
  const secondary = branding?.secondary_color || "#9C0808";

  // State
  const [accounts, setAccounts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentAccount, setCurrentAccount] = useState(null);
  const [userBranchId, setUserBranchId] = useState(null);
  const [userBranchName, setUserBranchName] = useState("");
  const [isMainBranch, setIsMainBranch] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    branch_id: "",
    branch_ministry_id: "",
    account_name: "",
    account_type: "",
    account_number: "",
  });

  const [ministries, setMinistries] = useState([]);
  const [showBranchFilter, setShowBranchFilter] = useState(false);

  // Notification modal state
  const [notification, setNotification] = useState({ show: false, message: "", type: "success" });

  // Account types
  const accountTypes = ["Bank", "Cash", "E-Wallet", "Petty Cash", "Savings", "Checking"];

  // Fetch branches on mount
  useEffect(() => {
    loadBranches();
    loadUserBranch();
  }, []);

  // Fetch accounts when branch filter changes
  useEffect(() => {
    if (userBranchId === null) return;
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranches, userBranchId, isMainBranch]);

  const loadUserBranch = async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Not authenticated");

      const { data: userRows, error: userError } = await supabase
        .from("users")
        .select("user_details_id, role")
        .eq("auth_user_id", user.id);

      if (userError) throw userError;
      if (!userRows || userRows.length === 0) throw new Error("User details not found");

      const financeRow =
        userRows.find((r) => String(r.role || "").toUpperCase() === "FINANCE") ||
        userRows[0];

      if (!financeRow?.user_details_id) throw new Error("User details not found");

      const { data: detailsData, error: detailsError } = await supabase
        .from("users_details")
        .select("branch_id, branches:branch_id(name, city, province)")
        .eq("user_details_id", financeRow.user_details_id)
        .limit(1)
        .maybeSingle();

      if (detailsError) throw detailsError;
      if (!detailsData?.branch_id) {
        throw new Error("You are not assigned to a branch. Please contact the administrator.");
      }

      const branchId = Number(detailsData.branch_id);
      setUserBranchId(branchId);
      setUserBranchName(detailsData.branches?.name || "Your Branch");
      const main = branchId === MAIN_BRANCH_ID;
      setIsMainBranch(main);
      if (!main) {
        setSelectedBranches([branchId]);
      }
    } catch (error) {
      console.error("Error loading user branch:", error);
      setNotification({
        show: true,
        message: error.message || "Failed to load your branch information.",
        type: "error",
      });
    }
  };

  const loadBranches = async () => {
    try {
      const data = await fetchBranches();
      setBranches(data);
    } catch (error) {
      console.error("Error loading branches:", error);
      setNotification({ show: true, message: "Failed to load branches. Please try again.", type: "error" });
    }
  };

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const branchFilter = isMainBranch
        ? selectedBranches.length > 0
          ? selectedBranches
          : null
        : userBranchId
          ? [userBranchId]
          : null;
      const data = await fetchFinanceAccounts(branchFilter);

      // Calculate real-time balance for each account
      const accountsWithBalance = await Promise.all(
        data.map(async (account) => {
          try {
            const balance = await calculateAccountBalance(account.account_id);
            return { ...account, balance: balance };
          } catch (error) {
            console.error(`Error calculating balance for account ${account.account_id}:`, error);
            return account;
          }
        })
      );

      setAccounts(accountsWithBalance);
    } catch (error) {
      console.error("Error loading accounts:", error);
      setNotification({ show: true, message: "Failed to load finance accounts. Please try again.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const loadMinistries = async (branchId) => {
    if (!branchId) {
      setMinistries([]);
      return;
    }
    try {
      const data = await fetchMinistriesByBranch(branchId);
      setMinistries(data);
    } catch (error) {
      console.error("Error loading ministries:", error);
      setMinistries([]);
    }
  };

  const handleBranchChange = (e) => {
    const branchId = e.target.value;
    setFormData({ ...formData, branch_id: branchId, branch_ministry_id: "" });
    if (branchId) {
      loadMinistries(branchId);
    } else {
      setMinistries([]);
    }
  };

  const handleOpenModal = (account = null) => {
    if (account) {
      setEditMode(true);
      setCurrentAccount(account);
      setFormData({
        branch_id: account.branch_id,
        branch_ministry_id: account.branch_ministry_id || "",
        account_name: account.account_name,
        account_type: account.account_type,
        account_number: account.account_number || "",
      });
      loadMinistries(account.branch_id);
    } else {
      setEditMode(false);
      setCurrentAccount(null);
      setFormData({
        branch_id: "",
        branch_ministry_id: "",
        account_name: "",
        account_type: "",
        account_number: "",
      });
      setMinistries([]);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditMode(false);
    setCurrentAccount(null);
    setFormData({
      branch_id: "",
      branch_ministry_id: "",
      account_name: "",
      account_type: "",
      account_number: "",
    });
    setMinistries([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.branch_id || !formData.account_name || !formData.account_type || !formData.account_number) {
      setNotification({ show: true, message: "Please fill in all required fields.", type: "error" });
      return;
    }

    try {
      if (editMode) {
        await updateFinanceAccount(currentAccount.account_id, formData);
        setNotification({ show: true, message: "Account updated successfully!", type: "success" });
      } else {
        await createFinanceAccount(formData);
        setNotification({ show: true, message: "Account created successfully!", type: "success" });
      }
      handleCloseModal();
      loadAccounts();
    } catch (error) {
      console.error("Error saving account:", error);
      setNotification({ show: true, message: "Failed to save account. Please try again.", type: "error" });
    }
  };

  const handleToggleActive = async (account) => {
    try {
      if (account.is_active) {
        if (!window.confirm(`Are you sure you want to deactivate ${account.account_name}?`)) {
          return;
        }
        await deactivateFinanceAccount(account.account_id);
        setNotification({ show: true, message: "Account deactivated successfully!", type: "success" });
      } else {
        await reactivateFinanceAccount(account.account_id);
        setNotification({ show: true, message: "Account reactivated successfully!", type: "success" });
      }
      loadAccounts();
    } catch (error) {
      console.error("Error toggling account status:", error);
      setNotification({ show: true, message: "Failed to update account status. Please try again.", type: "error" });
    }
  };

  const toggleBranchSelection = (branchId) => {
    if (!isMainBranch) return;
    setSelectedBranches((prev) =>
      prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId]
    );
  };

  const clearBranchFilter = () => {
    if (!isMainBranch) return;
    setSelectedBranches([]);
  };

  // Filter accounts by search term
  const filteredAccounts = accounts.filter((account) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      account.account_name?.toLowerCase().includes(searchLower) ||
      account.account_type?.toLowerCase().includes(searchLower) ||
      account.account_number?.toLowerCase().includes(searchLower) ||
      account.branches?.name?.toLowerCase().includes(searchLower) ||
      account.branch_ministries?.ministries?.name?.toLowerCase().includes(searchLower) ||
      account.assigned_finance_user?.full_name?.toLowerCase().includes(searchLower) ||
      account.assigned_finance_user?.email?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar userRole="finance" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div>
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold" style={{ color: primary }}>
                Finance Accounts
              </h1>
              <p className="text-gray-600 mt-1">
                Manage all finance accounts across branches
              </p>
            </div>

            {/* Toolbar */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <div className="flex flex-wrap gap-4 items-center justify-between">
                {/* Search */}
                <div className="flex-1 min-w-[200px] max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search accounts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Branch Filter */}
                {isMainBranch ? (
                  <div className="relative">
                    <button
                      onClick={() => setShowBranchFilter(!showBranchFilter)}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Filter className="w-5 h-5" />
                      Branch Filter
                      {selectedBranches.length > 0 && (
                        <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {selectedBranches.length}
                        </span>
                      )}
                    </button>

                    {showBranchFilter && (
                      <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-96 overflow-y-auto">
                        <div className="p-3 border-b border-gray-200 flex justify-between items-center">
                          <span className="font-semibold">Select Branches</span>
                          <button
                            onClick={() => setShowBranchFilter(false)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="p-2">
                          {branches.map((branch) => (
                            <label
                              key={branch.branch_id}
                              className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedBranches.includes(branch.branch_id)}
                                onChange={() => toggleBranchSelection(branch.branch_id)}
                                className="mr-3 w-4 h-4"
                              />
                              <div>
                                <div className="font-medium">{branch.name}</div>
                                <div className="text-xs text-gray-500">
                                  {[branch.street, branch.city, branch.province].filter(Boolean).join(', ')}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                        {selectedBranches.length > 0 && (
                          <div className="p-2 border-t border-gray-200">
                            <button
                              onClick={clearBranchFilter}
                              className="w-full text-center text-sm text-blue-600 hover:text-blue-800"
                            >
                              Clear Filter
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700">
                    Viewing branch: <span className="font-semibold">{userBranchName || "Your Branch"}</span>
                  </div>
                )}

                {/* Add Account Button */}
                <button
                  onClick={() => handleOpenModal()}
                  className="flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: secondary }}
                >
                  <Plus className="w-5 h-5" />
                  Add Account
                </button>
              </div>
            </div>

            {/* Accounts Table */}
            {loading ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading accounts...</p>
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <p className="text-gray-500 text-lg">No finance accounts found</p>
                <p className="text-gray-400 text-sm mt-2">
                  {searchTerm || selectedBranches.length > 0
                    ? "Try adjusting your filters"
                    : "Click 'Add Account' to create one"}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 text-xs uppercase text-gray-700">
                    <tr>
                      <th className="px-4 py-3">
                        Account Name
                      </th>
                      <th className="px-4 py-3">
                        Type
                      </th>
                      <th className="px-4 py-3">
                        Account Number
                      </th>
                      <th className="px-4 py-3">
                        Balance
                      </th>
                      <th className="px-4 py-3">
                        Branch
                      </th>
                      <th className="px-4 py-3">
                        Assigned Finance
                      </th>
                      <th className="px-4 py-3">
                        Ministry
                      </th>
                      <th className="px-4 py-3">
                        Status
                      </th>
                      <th className="px-4 py-3">
                        Actions
                      </th>
                    </tr>
                  </thead>
                    <tbody>
                      {filteredAccounts.map((account) => (
                        <tr key={account.account_id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{account.account_name}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              {account.account_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {account.account_number || "-"}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-semibold ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ₱{parseFloat(account.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900">{account.branches?.name}</div>
                            <div className="text-xs text-gray-500">
                              {[account.branches?.street, account.branches?.city, account.branches?.province].filter(Boolean).join(', ')}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {account.assigned_finance_user ? (
                              <div className="flex items-center gap-3">
                                <img
                                  src={account.assigned_finance_user.photo_url}
                                  alt={account.assigned_finance_user.full_name || account.assigned_finance_user.email || "Finance User"}
                                  className="w-9 h-9 rounded-full object-cover ring-1 ring-gray-200"
                                />
                                <div className="min-w-0">
                                  <div className="font-medium text-gray-900 truncate">
                                    {account.assigned_finance_user.full_name || account.assigned_finance_user.email || "Finance User"}
                                  </div>
                                  {account.assigned_finance_user.email && (
                                    <div className="text-xs text-gray-500 truncate">
                                      {account.assigned_finance_user.email}
                                    </div>
                                  )}
                                  {account.assigned_finance_user_count > 1 && (
                                    <div className="text-[11px] text-gray-400">
                                      +{account.assigned_finance_user_count - 1} more in branch
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">Unassigned</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {account.branch_ministries?.ministries?.name || (
                              <span className="text-gray-400 italic">Main Branch</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                account.is_active
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {account.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenModal(account)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit Account"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleToggleActive(account)}
                                className={`p-2 rounded-lg transition-colors ${
                                  account.is_active
                                    ? "text-red-600 hover:bg-red-50"
                                    : "text-green-600 hover:bg-green-50"
                                }`}
                                title={account.is_active ? "Deactivate" : "Reactivate"}
                              >
                                {account.is_active ? (
                                  <PowerOff className="w-4 h-4" />
                                ) : (
                                  <Power className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-xl">
              <div>
                <h2 className="text-2xl font-bold" style={{ color: primary }}>
                  {editMode ? "Edit Account" : "Create New Account"}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {editMode ? "Update account information" : "Add a new finance account to the system"}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-white rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Branch Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Branch <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.branch_id}
                  onChange={handleBranchChange}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">Select Branch</option>
                  {branches.map((branch) => (
                    <option key={branch.branch_id} value={branch.branch_id}>
                      {branch.name} - {[branch.city, branch.province].filter(Boolean).join(', ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ministry Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ministry <span className="text-gray-400 text-xs font-normal">(Optional - Leave blank for main branch account)</span>
                </label>
                <select
                  value={formData.branch_ministry_id}
                  onChange={(e) => setFormData({ ...formData, branch_ministry_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  disabled={!formData.branch_id}
                >
                  <option value="">Main Branch Account (No Ministry)</option>
                  {ministries.map((ministry) => (
                    <option key={ministry.branch_ministry_id} value={ministry.branch_ministry_id}>
                      {ministry.ministry_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Account Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.account_name}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                  required
                  placeholder="e.g., Main Operating Account"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Account Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Account Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.account_type}
                  onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">Select Type</option>
                  {accountTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  required
                  placeholder={
                    formData.account_type === "Bank" || formData.account_type === "Savings" || formData.account_type === "Checking"
                      ? "e.g., 1234-5678-9012-3456"
                      : formData.account_type === "E-Wallet"
                      ? "e.g., +63 912 345 6789 or email@example.com"
                      : formData.account_type === "Cash" || formData.account_type === "Petty Cash"
                      ? "e.g., CASH-001 or Safe Location"
                      : "Enter account identifier"
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {formData.account_type && (
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.account_type === "Bank" || formData.account_type === "Savings" || formData.account_type === "Checking"
                      ? "Enter the bank account number"
                      : formData.account_type === "E-Wallet"
                      ? "Enter mobile number or email associated with e-wallet"
                      : formData.account_type === "Cash" || formData.account_type === "Petty Cash"
                      ? "Enter a reference code or location identifier"
                      : "Enter unique identifier for this account"}
                  </p>
                )}
              </div>

              {editMode && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">
                      i
                    </div>
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> Account balance is automatically calculated from transactions and cannot be manually edited.
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 text-white font-semibold rounded-lg hover:opacity-90 transition-all duration-200 shadow-lg"
                  style={{ backgroundColor: secondary }}
                >
                  {editMode ? "Update Account" : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      {notification.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                notification.type === "success" ? "bg-green-100" : "bg-red-100"
              }`}>
                {notification.type === "success" ? (
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <h3 className={`text-lg font-semibold ${
                  notification.type === "success" ? "text-green-800" : "text-red-800"
                }`}>
                  {notification.type === "success" ? "Success" : "Error"}
                </h3>
                <p className="mt-1 text-gray-600">{notification.message}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setNotification({ show: false, message: "", type: "success" })}
                className="px-6 py-2.5 text-white font-semibold rounded-lg hover:opacity-90 transition-all"
                style={{ backgroundColor: notification.type === "success" ? "#10b981" : secondary }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
