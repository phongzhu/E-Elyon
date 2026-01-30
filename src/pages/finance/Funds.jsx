import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { useBranding } from "../../context/BrandingContext";
import { 
  Plus, 
  Sparkles, 
  Download, 
  Heart,
  Gift,
  Receipt,
  TrendingUp,
  Calendar,
  PieChart,
  BarChart3,
  X
} from "lucide-react";
import DateRangePicker from "../../components/DateRangePicker";
import { supabase } from "../../lib/supabaseClient";
import {
  exportToPDF,
  filterTransactions,
  formatCurrency,
} from "../../lib/financeUtils";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

export default function FinanceFunds() {
  const { branding } = useBranding();
  const primaryColor = branding?.primary_color || "#0B6516";
  const secondaryColor = branding?.secondary_color || "#9C0808";
  const [tab, setTab] = useState("summary");
  // Set default date range: first day of current month to today
  const [dateRange, setDateRange] = useState({ 
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [allTx, setAllTx] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userBranchId, setUserBranchId] = useState(null);
  const [userBranchName, setUserBranchName] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("success");
  const [showModal, setShowModal] = useState(false);
  const [chartModal, setChartModal] = useState({ show: false, type: null, data: null });

  // Load user's branch on mount
  useEffect(() => {
    loadUserBranch();
  }, []);

  // Load transactions when user branch is loaded
  useEffect(() => {
    if (userBranchId) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userBranchId]);

  const loadUserBranch = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
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
        .select("branch_id, branches:branch_id(name)")
        .eq("user_details_id", financeRow.user_details_id)
        .limit(1)
        .maybeSingle();

      if (detailsError) throw detailsError;
      if (!detailsData?.branch_id) {
        throw new Error("You are not assigned to a branch. Please contact the administrator.");
      }

      setUserBranchId(detailsData.branch_id);
      setUserBranchName(detailsData.branches?.name || "Your Branch");
    } catch (error) {
      console.error("Error loading user branch:", error);
      alert(error.message || "Failed to load your branch information.");
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Load accounts for this branch (no ministry only)
      const { data: accountsData, error: accountsError } = await supabase
        .from("finance_accounts")
        .select("account_id, account_name, account_type, is_active")
        .eq("branch_id", userBranchId)
        .is("branch_ministry_id", null)
        .eq("is_active", true);

      if (accountsError) throw accountsError;

      // Calculate balance for each account
      const accountIds = (accountsData || []).map(a => a.account_id);
      
      let accountsWithBalance = [];
      if (accountIds.length > 0) {
        // Get all transactions for these accounts
        const { data: txData, error: txError } = await supabase
          .from("transactions")
          .select("account_id, amount")
          .in("account_id", accountIds);

        if (txError) throw txError;

        // Calculate balance per account
        const balanceMap = new Map();
        (txData || []).forEach(tx => {
          const current = balanceMap.get(tx.account_id) || 0;
          balanceMap.set(tx.account_id, current + Number(tx.amount || 0));
        });

        accountsWithBalance = (accountsData || []).map(acc => ({
          ...acc,
          balance: balanceMap.get(acc.account_id) || 0
        }));
      }

      setAccounts(accountsWithBalance);

      // Load transactions with full details - show ALL transactions for this branch
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select(`
          transaction_id,
          branch_id,
          account_id,
          transaction_type,
          amount,
          transaction_date,
          created_at,
          created_by,
          notes,
          donation_id,
          expense_id,
          transfer_id,
          refence_id,
          created_by_user:created_by (
            user_id,
            users_details (
              first_name,
              last_name
            )
          ),
          donations:donation_id (
            donation_id,
            donor_name
          ),
          expenses:expense_id (
            expense_id,
            category,
            description
          ),
          transfers:transfer_id (
            transfer_id,
            from_account_id,
            to_account_id,
            amount
          )
        `)
        .eq("branch_id", userBranchId)
        .order("transaction_date", { ascending: false });

      if (txError) throw txError;

      const normalized = (txData || []).map((t, i) => {
          let txType = "Debit";
          let category = "-";
          let description = t.notes || "";
          
          // Determine transaction type and category based on linked records
          if (t.donation_id && t.donations) {
            txType = "Credit";
            // Extract category from notes
            if (t.notes?.includes("Tithe")) category = "Tithe";
            else if (t.notes?.includes("Offering")) category = "Offering";
            else if (t.notes?.includes("Love Gift")) category = "Love Gift";
            else category = "Donation";
            description = t.donations.donor_name || "Anonymous";
          } else if (t.expense_id && t.expenses) {
            txType = "Debit";
            category = t.expenses.category || "Expense";
            description = t.expenses.description || t.notes || "";
          } else if (t.transfer_id && t.transfers) {
            // For transfers, check if this account is sender or receiver
            if (t.account_id === t.transfers.from_account_id) {
              txType = "Debit";
              category = "Transfer Out";
              description = `Transfer to account ${t.transfers.to_account_id}`;
            } else {
              txType = "Credit";
              category = "Transfer In";
              description = `Transfer from account ${t.transfers.from_account_id}`;
            }
          } else {
            // Fallback based on amount
            txType = Number(t.amount) >= 0 ? "Credit" : "Debit";
          }

          return {
            id: t.transaction_id ?? i + 1,
            transactionId: t.transaction_id,
            branchId: t.branch_id,
            date: t.transaction_date ?? new Date(),
            type: txType,
            category: category,
            branch: userBranchName,
            amount: Math.abs(Number(t.amount ?? 0)),
            recordedBy: description,
            description: description,
            accountId: t.account_id,
            accountName: accountsWithBalance.find(acc => acc.account_id === t.account_id)?.account_name || 'Unknown Account',
            donation_id: t.donation_id,
            expense_id: t.expense_id,
            transfer_id: t.transfer_id,
            refence_id: t.refence_id,
            createdAt: t.created_at,
            transactionDate: t.transaction_date,
            transactionType: t.transaction_type,
            createdBy: t.created_by,
            createdByName: t.created_by_user?.users_details ? 
              `${t.created_by_user.users_details.first_name} ${t.created_by_user.users_details.last_name}` : 
              'System',
            notes: t.notes,
          };
      });

      setAllTx(normalized);
    } catch (error) {
      console.error("Error loading data:", error);
      setAllTx([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    // Show all transactions without date filtering
    return allTx;
  }, [allTx]);

  const agg = useMemo(() => {
    const donationTxs = allTx.filter(t => t.donation_id);
    console.log('Donation transactions:', donationTxs);
    const donations = donationTxs.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    console.log('Total donations:', donations);
    const expenses = allTx.filter(t => t.expense_id).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const transfers = allTx.filter(t => t.transfer_id).reduce((sum, t) => sum + 1, 0);
    const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance || 0), 0);
    
    return {
      donations,
      expenses,
      transfers,
      totalBalance
    };
  }, [allTx, accounts]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50 font-[Inter]">
        <Sidebar userRole="finance" />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="p-8">
            <div className="flex justify-center items-center h-64">
              <div className="text-gray-500">Loading fund management...</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 font-[Inter]">
      <Sidebar userRole="finance" />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="p-8 space-y-6">
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Church Fund Management</h1>
              <p className="text-gray-600 mt-2">
                Manage tithes, offerings, and ministry expenses for <span className="font-semibold" style={{ color: primaryColor }}>{userBranchName}</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                "Each of you should give what you have decided in your heart to give" - 2 Corinthians 9:7
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => exportToPDF({
                  title: "Church Fund Management - Transaction Report",
                  columns: ["Date", "Type", "Category", "Amount", "Description"],
                  rows: filtered.map(t => [
                    new Date(t.date).toLocaleDateString(),
                    t.type,
                    t.category,
                    formatCurrency(t.amount),
                    t.description
                  ]),
                })}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg shadow hover:opacity-90 transition text-white"
                style={{ backgroundColor: primaryColor }}
              >
                <Download size={18} /> Export PDF
              </button>
            </div>
          </div>

          {/* Date Filter */}
          <div className="flex flex-wrap items-center gap-3 bg-white rounded-lg shadow p-4 border border-gray-200">
            <Calendar size={20} className="text-gray-500" />
            <DateRangePicker
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onChange={setDateRange}
            />
            <button
              onClick={() => setDateRange({ 
                startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0]
              })}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition border border-gray-300"
            >
              Reset to This Month
            </button>
            <div className="ml-auto flex items-center gap-3">
              <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
                <span className="text-sm text-blue-700">Showing: </span>
                <span className="font-semibold text-blue-900">{filtered.length} transactions</span>
              </div>
              <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                <span className="text-sm text-gray-600">Active Fund Accounts: </span>
                <span className="font-semibold text-gray-900">{accounts.length}</span>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="flex border-b border-gray-200">
              {[
                { key: "summary", label: "Summary", icon: <TrendingUp size={18} /> },
                { key: "recording", label: "Record Donations/Expenses", icon: <Receipt size={18} /> },
                { key: "transfer", label: "Transfer Funds", icon: <TrendingUp size={18} /> },
                { key: "utilities", label: "Utilities & Bills", icon: <Receipt size={18} /> },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex-1 px-6 py-4 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${
                    tab === t.key 
                      ? "border-emerald-600 text-emerald-700 bg-emerald-50" 
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {tab === "summary" && (
            <>
              {/* Summary Cards */}
              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard 
                  label="Total Donations" 
                  value={agg.donations} 
                  icon={<Heart size={20} style={{ color: primaryColor }} />}
                  subtitle="All Contributions"
                  onClick={() => openChartModal('donations')}
                />
                <SummaryCard 
                  label="Expenses" 
                  value={agg.expenses} 
                  icon={<Receipt size={20} style={{ color: secondaryColor }} />}
                  negative 
                  subtitle="Ministry Operations"
                  onClick={() => openChartModal('expenses')}
                />
                <SummaryCard 
                  label="Transfers" 
                  value={agg.transfers} 
                  icon={<TrendingUp size={20} style={{ color: primaryColor }} />}
                  subtitle="Fund Movements"
                  isCount
                />
                <SummaryCard 
                  label="Available Funds" 
                  value={agg.totalBalance} 
                  icon={<TrendingUp size={20} style={{ color: primaryColor }} />}
                  subtitle="Current Balance"
                  onClick={() => openChartModal('accounts')}
                />
              </section>
            </>
          )}

          {tab === "recording" && (
            <AddForms onAdd={loadData} accounts={accounts} branchName={userBranchName} primaryColor={primaryColor} secondaryColor={secondaryColor} />
          )}

          {tab === "transfer" && (
            <TransferForm onAdd={loadData} accounts={accounts} primaryColor={primaryColor} />
          )}

          {tab === "utilities" && (
            <UtilitiesForm onAdd={loadData} accounts={accounts} secondaryColor={secondaryColor} />
          )}

          {/* Transaction Records Table - Show on Summary Tab */}
          {tab === "summary" && (
          <section className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Transaction Records</h2>
                  <p className="text-sm text-gray-600 mt-1">Complete history of church donations and expenses</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">
                    Total: {allTx.length}
                  </span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                    Filtered: {filtered.length}
                  </span>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-xs uppercase text-gray-700 sticky top-0">
                  <tr>
                    <th className="px-3 py-3">Trans ID</th>
                    <th className="px-3 py-3">Branch</th>
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Category</th>
                    <th className="px-3 py-3">Account</th>
                    <th className="px-3 py-3">Amount</th>
                    <th className="px-3 py-3">Description</th>
                    <th className="px-3 py-3">Created By</th>
                    <th className="px-3 py-3">Ref ID</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="px-4 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                          <Receipt size={48} className="text-gray-300" />
                          <p className="font-medium">No transactions found</p>
                          <p className="text-sm">Start by recording tithes, offerings, or ministry expenses below</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((t) => (
                      <tr key={t.id} className="border-t hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-3 text-gray-600 font-mono text-xs">
                          #{t.transactionId}
                        </td>
                        <td className="px-3 py-3 text-gray-600 text-xs">
                          {t.branch}
                        </td>
                        <td className="px-3 py-3 text-gray-700 text-xs">
                          {new Date(t.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            t.type === "Credit" 
                              ? "bg-emerald-100 text-emerald-800" 
                              : t.category.includes("Transfer") 
                                ? "bg-blue-100 text-blue-800"
                                : "bg-rose-100 text-rose-800"
                          }`}>
                            {t.category.includes("Transfer") ? t.category : (t.type === "Credit" ? t.category : "Expense")}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-gray-700 font-medium text-xs">
                          {t.category.includes("Transfer") ? "Fund Transfer" : t.category}
                        </td>
                        <td className="px-3 py-3 text-gray-600 text-xs">
                          {t.accountName}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`font-semibold text-sm ${
                            t.type === "Credit" ? "text-emerald-700" : "text-rose-700"
                          }`}>
                            {t.type === "Credit" ? "+" : "-"}₱{t.amount.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-gray-500 text-xs max-w-xs truncate">{t.description || t.recordedBy || "-"}</td>
                        <td className="px-3 py-3 text-gray-600 text-xs">
                          {t.createdByName}
                        </td>
                        <td className="px-3 py-3 text-gray-400 text-xs font-mono">
                          {t.donation_id ? `D-${t.donation_id}` : t.expense_id ? `E-${t.expense_id}` : t.transfer_id ? `T-${t.transfer_id}` : "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
          )}
        </main>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              {modalType === "success" ? (
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
              <div>
                <h3 className={`text-lg font-semibold ${modalType === "success" ? "text-green-900" : "text-red-900"}`}>
                  {modalType === "success" ? "Success" : "Error"}
                </h3>
              </div>
            </div>
            <p className="text-gray-700 mb-6">{modalMessage}</p>
            <button
              onClick={() => setShowModal(false)}
              className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Chart Modal */}
      {chartModal.show && (
        <ChartModal 
          type={chartModal.type} 
          data={chartModal.data} 
          onClose={() => setChartModal({ show: false, type: null, data: null })}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
        />
      )}
    </div>
  );

  function openChartModal(type) {
    let data = {};
    
    if (type === 'donations') {
      // Group donations by category
      const donationsByCategory = {};
      const donationsByMonth = {};
      
      allTx.filter(t => t.donation_id).forEach(t => {
        // By category
        const cat = t.category || 'Other';
        donationsByCategory[cat] = (donationsByCategory[cat] || 0) + t.amount;
        
        // By month
        const month = new Date(t.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        donationsByMonth[month] = (donationsByMonth[month] || 0) + t.amount;
      });
      
      data = {
        title: 'Donations Analysis',
        total: agg.donations,
        byCategory: donationsByCategory,
        byMonth: donationsByMonth,
        transactions: allTx.filter(t => t.donation_id),
      };
    } else if (type === 'expenses') {
      // Group expenses by category
      const expensesByCategory = {};
      const expensesByMonth = {};
      
      allTx.filter(t => t.expense_id).forEach(t => {
        // By category
        const cat = t.category || 'Other';
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + t.amount;
        
        // By month
        const month = new Date(t.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        expensesByMonth[month] = (expensesByMonth[month] || 0) + t.amount;
      });
      
      data = {
        title: 'Expenses Breakdown',
        total: agg.expenses,
        byCategory: expensesByCategory,
        byMonth: expensesByMonth,
        transactions: allTx.filter(t => t.expense_id),
      };
    } else if (type === 'accounts') {
      data = {
        title: 'Fund Accounts Overview',
        total: agg.totalBalance,
        accounts: accounts,
      };
    }
    
    setChartModal({ show: true, type, data });
  }
}

  function SummaryCard({ label, value, negative, icon, subtitle, isCount, onClick }) {
    return (
      <div 
        className={`bg-white rounded-lg shadow p-6 border border-gray-100 transition-all ${
          onClick ? 'cursor-pointer hover:shadow-lg hover:scale-105 hover:border-emerald-300' : 'hover:shadow-md'
        }`}
        onClick={onClick}
      >
        <div className="flex items-center gap-3 mb-3">
          {icon}
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500">{label}</p>
            {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
          </div>
          {onClick && <PieChart size={16} className="text-gray-400" />}
        </div>
        <p className={`text-3xl font-bold ${negative ? "text-rose-700" : "text-gray-900"}`}>
          {isCount ? value : `₱${value.toLocaleString()}`}
        </p>
        {onClick && <p className="text-xs text-gray-400 mt-2">Click for details</p>}
      </div>
    );
  }

  function ChartModal({ type, data, onClose, primaryColor, secondaryColor }) {
    if (!data) return null;

    const renderChart = () => {
      if (type === 'donations' || type === 'expenses') {
        const categoryLabels = Object.keys(data.byCategory);
        const categoryValues = Object.values(data.byCategory);
        const monthLabels = Object.keys(data.byMonth);
        const monthValues = Object.values(data.byMonth);

        const pieData = {
          labels: categoryLabels,
          datasets: [{
            data: categoryValues,
            backgroundColor: [
              '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', 
              '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'
            ],
            borderWidth: 2,
            borderColor: '#fff',
          }],
        };

        const barData = {
          labels: monthLabels,
          datasets: [{
            label: type === 'donations' ? 'Donations' : 'Expenses',
            data: monthValues,
            backgroundColor: type === 'donations' ? primaryColor + 'CC' : secondaryColor + 'CC',
            borderColor: type === 'donations' ? primaryColor : secondaryColor,
            borderWidth: 2,
          }],
        };

        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">By Category</h4>
                <div className="h-64">
                  <Pie data={pieData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Monthly Trend</h4>
                <div className="h-64">
                  <Bar data={barData} options={{ 
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: { beginAtZero: true, ticks: { callback: (value) => '₱' + value.toLocaleString() } }
                    }
                  }} />
                </div>
              </div>
            </div>

            {/* Top Categories */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Top Categories</h4>
              <div className="space-y-2">
                {categoryLabels.slice(0, 5).map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{cat}</span>
                    <span className="text-sm font-bold text-gray-900">₱{categoryValues[idx].toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Recent Transactions (Last 5)</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {data.transactions.slice(0, 5).map((t, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-50 rounded p-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{t.category}</p>
                      <p className="text-xs text-gray-500">{new Date(t.date).toLocaleDateString()}</p>
                    </div>
                    <span className="text-sm font-bold text-gray-900">₱{t.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        );
      } else if (type === 'accounts') {
        const accountLabels = data.accounts.map(a => a.account_name);
        const accountBalances = data.accounts.map(a => Number(a.balance || 0));

        const barData = {
          labels: accountLabels,
          datasets: [{
            label: 'Balance',
            data: accountBalances,
            backgroundColor: primaryColor + 'CC',
            borderColor: primaryColor,
            borderWidth: 2,
          }],
        };

        return (
          <>
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Account Balances</h4>
              <div className="h-64">
                <Bar data={barData} options={{ 
                  maintainAspectRatio: false,
                  indexAxis: 'y',
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { beginAtZero: true, ticks: { callback: (value) => '₱' + value.toLocaleString() } }
                  }
                }} />
              </div>
            </div>

            {/* Account Details */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Account Details</h4>
              <div className="space-y-3">
                {data.accounts.map((acc, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white rounded p-3 shadow-sm">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{acc.account_name}</p>
                      <p className="text-xs text-gray-500">{acc.account_type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">₱{Number(acc.balance || 0).toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{acc.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        );
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">{data.title}</h3>
              <p className="text-3xl font-bold mt-1" style={{ color: type === 'expenses' ? secondaryColor : primaryColor }}>
                ₱{data.total.toLocaleString()}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <X size={24} className="text-gray-600" />
            </button>
          </div>
          <div className="p-6">
            {renderChart()}
          </div>
        </div>
      </div>
    );
  }

  function ForecastRow({ label, value, isPositive, isNegative, isNet, netValue }) {
    let colorClass = "text-gray-900";
    if (isPositive) colorClass = "text-emerald-700";
    if (isNegative) colorClass = "text-rose-700";
    if (isNet) colorClass = netValue >= 0 ? "text-emerald-700" : "text-rose-700";
    
    return (
      <div className="border border-gray-200 bg-white rounded-lg p-4">
        <p className="text-gray-600 font-medium">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${colorClass}`}>
          ₱{Math.abs(value).toLocaleString()}
        </p>
      </div>
    );
  }

  function AddForms({ onAdd, accounts, branchName, primaryColor, secondaryColor }) {
    const [isAnonymous, setIsAnonymous] = useState(true);
    const [memberName, setMemberName] = useState("");
    const [amount, setAmount] = useState("");
    const [accountId, setAccountId] = useState("");
    const [category, setCategory] = useState("Donation");
    const [dateSel, setDateSel] = useState("");
    const [description, setDescription] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const [expenseCategory, setExpenseCategory] = useState("Event");
    const [expenseAmount, setExpenseAmount] = useState("");
    const [expenseAccount, setExpenseAccount] = useState("");
    const [expenseDate, setExpenseDate] = useState("");
    const [expenseNote, setExpenseNote] = useState("");
    const [expenseSubmitting, setExpenseSubmitting] = useState(false);

    const [modalMessage, setModalMessage] = useState("");
    const [modalType, setModalType] = useState("success");
    const [showModal, setShowModal] = useState(false);

    async function addTitheOrOffering() {
      if (!amount || Number(amount) <= 0) {
        setModalMessage("Please enter a valid amount");
        setModalType("error");
        setShowModal(true);
        return;
      }
      if (!accountId) {
        setModalMessage("Please select an account");
        setModalType("error");
        setShowModal(true);
        return;
      }
      if (!isAnonymous && !memberName.trim()) {
        setModalMessage("Please enter member name or select anonymous");
        setModalType("error");
        setShowModal(true);
        return;
      }

      setSubmitting(true);
      try {
        // Get current user and branch info
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;

        const { data: userRows, error: userError } = await supabase
          .from("users")
          .select("user_id, user_details_id, role")
          .eq("auth_user_id", user.id);

        if (userError) throw userError;
        if (!userRows || userRows.length === 0) throw new Error("User details not found");

        const financeRow =
          userRows.find((r) => String(r.role || "").toUpperCase() === "FINANCE") ||
          userRows[0];

        if (!financeRow?.user_details_id) throw new Error("User details not found");

        const { data: detailsData, error: detailsError } = await supabase
          .from("users_details")
          .select("branch_id")
          .eq("user_details_id", financeRow.user_details_id)
          .limit(1)
          .maybeSingle();

        if (detailsError) throw detailsError;

        const donationDate = dateSel || new Date().toISOString().split('T')[0];
        const donorName = isAnonymous ? "Anonymous" : memberName.trim();
        const notes = `${category} - ${donorName}`;

        // Step 1: Insert into donations table
        const { data: donationData, error: donationError } = await supabase
          .from("donations")
          .insert({
            branch_id: detailsData.branch_id,
            donor_id: null, // Always null for now (can be linked to members later)
            donor_name: donorName,
            account_id: Number(accountId),
            amount: Number(amount),
            donation_date: donationDate,
            notes: notes,
          })
          .select()
          .single();

        if (donationError) throw donationError;

        // Step 2: Insert into transactions table with donation reference
        const { error: transactionError } = await supabase
          .from("transactions")
          .insert({
            branch_id: detailsData.branch_id,
            account_id: Number(accountId),
            transaction_type: "Donation",
            donation_id: donationData.donation_id,
            expense_id: null,
            transfer_id: null,
            amount: Number(amount), // Positive for income
            transaction_date: donationDate,
            created_by: financeRow.user_id,
            notes: notes,
          });

        if (transactionError) throw transactionError;

        setModalMessage(`${category} recorded successfully!`);
        setModalType("success");
        setShowModal(true);
        
        // Reset form
        setAmount("");
        setMemberName("");
        setDescription("");
        setDateSel("");
        
        // Reload data
        onAdd?.();
      } catch (error) {
        console.error("Error adding donation:", error);
        setModalMessage(`Failed to add donation: ${error.message || 'Please try again.'}`);
        setModalType("error");
        setShowModal(true);
      } finally {
        setSubmitting(false);
      }
    }

    async function addExpense() {
      if (!expenseAmount || Number(expenseAmount) <= 0) {
        setModalMessage("Please enter a valid amount");
        setModalType("error");
        setShowModal(true);
        return;
      }
      if (!expenseAccount) {
        setModalMessage("Please select an account");
        setModalType("error");
        setShowModal(true);
        return;
      }

      setExpenseSubmitting(true);
      try {
        // Get current user and branch info
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;

        const { data: userRows, error: userError } = await supabase
          .from("users")
          .select("user_id, user_details_id, role")
          .eq("auth_user_id", user.id);

        if (userError) throw userError;
        if (!userRows || userRows.length === 0) throw new Error("User details not found");

        const financeRow =
          userRows.find((r) => String(r.role || "").toUpperCase() === "FINANCE") ||
          userRows[0];

        if (!financeRow?.user_details_id) throw new Error("User details not found");

        const { data: detailsData, error: detailsError } = await supabase
          .from("users_details")
          .select("branch_id")
          .eq("user_details_id", financeRow.user_details_id)
          .limit(1)
          .maybeSingle();

        if (detailsError) throw detailsError;

        const expenseDateValue = expenseDate || new Date().toISOString().split('T')[0];
        const expenseNotes = expenseNote.trim() || expenseCategory;

        // Step 1: Insert into expenses table
        const { data: expenseData, error: expenseError } = await supabase
          .from("expenses")
          .insert({
            branch_id: detailsData.branch_id,
            category: expenseCategory,
            amount: Number(expenseAmount),
            description: expenseNotes,
          })
          .select()
          .single();

        if (expenseError) throw expenseError;

        // Step 2: Insert into transactions table with expense reference
        const { error: transactionError } = await supabase
          .from("transactions")
          .insert({
            branch_id: detailsData.branch_id,
            account_id: Number(expenseAccount),
            transaction_type: "Expense",
            expense_id: expenseData.expense_id,
            donation_id: null,
            transfer_id: null,
            amount: -Number(expenseAmount), // Negative for expense
            transaction_date: expenseDateValue,
            created_by: financeRow.user_id,
            notes: expenseNotes,
          });

        if (transactionError) throw transactionError;

        setModalMessage("Expense recorded successfully!");
        setModalType("success");
        setShowModal(true);
        
        // Reset form
        setExpenseAmount("");
        setExpenseNote("");
        setExpenseDate("");
        
        // Reload data
        onAdd?.();
      } catch (error) {
        console.error("Error adding expense:", error);
        setModalMessage(`Failed to add expense: ${error.message || 'Please try again.'}`);
        setModalType("error");
        setShowModal(true);
      } finally {
        setExpenseSubmitting(false);
      }
    }

    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        {/* Tithe/Offering Form */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Heart size={20} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Record Donation / Offering</h3>
                <p className="text-xs text-gray-500">Add church member contributions</p>
              </div>
            </div>
          </div>
        
          <div className="space-y-4 text-sm">
            {/* Anonymous Toggle */}
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <input 
                type="checkbox" 
                id="anonymous"
                checked={isAnonymous} 
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="anonymous" className="text-sm font-medium text-gray-700 cursor-pointer flex-1">
                Anonymous Donation (member name not required)
              </label>
            </div>

            {/* Member Name - Only show if not anonymous */}
            {!isAnonymous && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Member Name <span className="text-red-500">*</span>
                </label>
                <input 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-transparent" 
                  placeholder="Enter member's full name" 
                  value={memberName} 
                  onChange={(e) => setMemberName(e.target.value)} 
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-transparent" 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="Donation">Donation</option>
                  <option value="Offering">Offering</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">₱</span>
                  <input 
                    type="number" 
                    className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-transparent" 
                    placeholder="0.00" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fund Account <span className="text-red-500">*</span>
                </label>
                <select 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-transparent" 
                  value={accountId} 
                  onChange={(e) => setAccountId(e.target.value)}
                >
                  <option value="">Select account</option>
                  {accounts.map((acc) => (
                    <option key={acc.account_id} value={acc.account_id}>
                      {acc.account_name} ({acc.account_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input 
                  type="date" 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-transparent" 
                  value={dateSel} 
                  onChange={(e) => setDateSel(e.target.value)} 
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <button 
              onClick={addTitheOrOffering} 
              disabled={submitting}
              className="w-full px-4 py-3 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed shadow"
              style={{ backgroundColor: primaryColor }}
            >
              {submitting ? "Recording..." : "✓ Record Donation"}
            </button>
          </div>
        </div>

        {/* Expense Form */}
        <div className="border-t border-gray-200 pt-6 mt-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                <Receipt size={20} className="text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Record Ministry Expense</h3>
                <p className="text-xs text-gray-500">Track church operational costs</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-500 focus:border-transparent" 
                value={expenseCategory} 
                onChange={(e) => setExpenseCategory(e.target.value)}
              >
                <option>Event / Activity</option>
                <option>Outreach / Mission</option>
                <option>Equipment / Supplies</option>
                <option>Utilities / Bills</option>
                <option>Maintenance / Repairs</option>
                <option>Staff / Ministry Workers</option>
                <option>Miscellaneous</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">₱</span>
                <input 
                  type="number" 
                  className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-rose-500 focus:border-transparent" 
                  placeholder="0.00" 
                  value={expenseAmount} 
                  onChange={(e) => setExpenseAmount(e.target.value)} 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fund Account <span className="text-red-500">*</span>
              </label>
              <select 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-500 focus:border-transparent" 
                value={expenseAccount} 
                onChange={(e) => setExpenseAccount(e.target.value)}
              >
                <option value="">Select account</option>
                {accounts.map((acc) => (
                  <option key={acc.account_id} value={acc.account_id}>
                    {acc.account_name} ({acc.account_type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input 
                type="date" 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-500 focus:border-transparent" 
                value={expenseDate} 
                onChange={(e) => setExpenseDate(e.target.value)} 
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description / Purpose
              </label>
              <input 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-500 focus:border-transparent" 
                placeholder="e.g., Christmas outreach supplies, Youth event snacks" 
                value={expenseNote} 
                onChange={(e) => setExpenseNote(e.target.value)} 
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <button 
              onClick={addExpense} 
              disabled={expenseSubmitting}
              className="w-full px-4 py-3 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed shadow"
              style={{ backgroundColor: secondaryColor }}
            >
              {expenseSubmitting ? "Recording..." : "✓ Record Expense"}
            </button>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                {modalType === "success" ? (
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
                <div>
                  <h3 className={`text-lg font-semibold ${modalType === "success" ? "text-green-900" : "text-red-900"}`}>
                    {modalType === "success" ? "Success" : "Error"}
                  </h3>
                </div>
              </div>
              <p className="text-gray-700 mb-6">{modalMessage}</p>
              <button
                onClick={() => setShowModal(false)}
                className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function TransferForm({ onAdd, accounts, primaryColor }) {
    const [transferFromAccount, setTransferFromAccount] = useState("");
    const [transferToAccount, setTransferToAccount] = useState("");
    const [transferAmount, setTransferAmount] = useState("");
    const [transferDate, setTransferDate] = useState("");
    const [transferNotes, setTransferNotes] = useState("");
    const [transferSubmitting, setTransferSubmitting] = useState(false);
    const [modalMessage, setModalMessage] = useState("");
    const [modalType, setModalType] = useState("success");
    const [showModal, setShowModal] = useState(false);

    async function processTransfer() {
      if (!transferFromAccount || !transferToAccount) {
        setModalMessage("Please select both source and destination accounts");
        setModalType("error");
        setShowModal(true);
        return;
      }
      if (transferFromAccount === transferToAccount) {
        setModalMessage("Source and destination accounts must be different");
        setModalType("error");
        setShowModal(true);
        return;
      }
      if (!transferAmount || Number(transferAmount) <= 0) {
        setModalMessage("Please enter a valid amount");
        setModalType("error");
        setShowModal(true);
        return;
      }

      setTransferSubmitting(true);
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;

        const { data: userRows, error: userError } = await supabase
          .from("users")
          .select("user_id, user_details_id, role")
          .eq("auth_user_id", user.id);

        if (userError) throw userError;
        if (!userRows || userRows.length === 0) throw new Error("User details not found");

        const financeRow =
          userRows.find((r) => String(r.role || "").toUpperCase() === "FINANCE") ||
          userRows[0];

        if (!financeRow?.user_details_id) throw new Error("User details not found");

        const { data: detailsData, error: detailsError } = await supabase
          .from("users_details")
          .select("branch_id")
          .eq("user_details_id", financeRow.user_details_id)
          .limit(1)
          .maybeSingle();

        if (detailsError) throw detailsError;

        const transferDateValue = transferDate || new Date().toISOString().split('T')[0];
        const notes = transferNotes.trim() || "Fund Transfer";

        const { data: transferData, error: transferError } = await supabase
          .from("transfers")
          .insert({
            from_account_id: Number(transferFromAccount),
            to_account_id: Number(transferToAccount),
            amount: Number(transferAmount),
          })
          .select()
          .single();

        if (transferError) throw transferError;

        const { error: debitError } = await supabase
          .from("transactions")
          .insert({
            branch_id: detailsData.branch_id,
            account_id: Number(transferFromAccount),
            transaction_type: "Transfer Out",
            transfer_id: transferData.transfer_id,
            donation_id: null,
            expense_id: null,
            amount: -Number(transferAmount),
            transaction_date: transferDateValue,
            created_by: financeRow.user_id,
            notes: `Transfer to account ${transferToAccount}: ${notes}`,
          });

        if (debitError) throw debitError;

        const { error: creditError } = await supabase
          .from("transactions")
          .insert({
            branch_id: detailsData.branch_id,
            account_id: Number(transferToAccount),
            transaction_type: "Transfer In",
            transfer_id: transferData.transfer_id,
            donation_id: null,
            expense_id: null,
            amount: Number(transferAmount),
            transaction_date: transferDateValue,
            created_by: financeRow.user_id,
            notes: `Transfer from account ${transferFromAccount}: ${notes}`,
          });

        if (creditError) throw creditError;

        setModalMessage("Transfer completed successfully!");
        setModalType("success");
        setShowModal(true);
        
        setTransferFromAccount("");
        setTransferToAccount("");
        setTransferAmount("");
        setTransferDate("");
        setTransferNotes("");
        
        onAdd?.();
      } catch (error) {
        console.error("Error processing transfer:", error);
        setModalMessage(`Failed to process transfer: ${error.message || 'Please try again.'}`);
        setModalType("error");
        setShowModal(true);
      } finally {
        setTransferSubmitting(false);
      }
    }

    return (
      <>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-200 mb-6">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <TrendingUp size={24} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Transfer Between Accounts</h2>
              <p className="text-sm text-gray-500">Move funds between church accounts</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Account <span className="text-red-500">*</span>
              </label>
              <select 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                value={transferFromAccount} 
                onChange={(e) => setTransferFromAccount(e.target.value)}
              >
                <option value="">Select source account</option>
                {accounts.map((acc) => (
                  <option key={acc.account_id} value={acc.account_id}>
                    {acc.account_name} - ₱{(acc.balance || 0).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Account <span className="text-red-500">*</span>
              </label>
              <select 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                value={transferToAccount} 
                onChange={(e) => setTransferToAccount(e.target.value)}
              >
                <option value="">Select destination account</option>
                {accounts.map((acc) => (
                  <option key={acc.account_id} value={acc.account_id} disabled={acc.account_id === Number(transferFromAccount)}>
                    {acc.account_name} ({acc.account_type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">₱</span>
                <input 
                  type="number" 
                  className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  placeholder="0.00" 
                  value={transferAmount} 
                  onChange={(e) => setTransferAmount(e.target.value)} 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <input 
                type="date" 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                value={transferDate} 
                onChange={(e) => setTransferDate(e.target.value)} 
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes / Purpose
              </label>
              <input 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                placeholder="e.g., Move funds for building project" 
                value={transferNotes} 
                onChange={(e) => setTransferNotes(e.target.value)} 
              />
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <button 
              onClick={processTransfer} 
              disabled={transferSubmitting}
              className="w-full px-4 py-3 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed shadow bg-blue-600"
            >
              {transferSubmitting ? "Processing..." : "✓ Process Transfer"}
            </button>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                {modalType === "success" ? (
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
                <div>
                  <h3 className={`text-lg font-semibold ${modalType === "success" ? "text-green-900" : "text-red-900"}`}>
                    {modalType === "success" ? "Success" : "Error"}
                  </h3>
                </div>
              </div>
              <p className="text-gray-700 mb-6">{modalMessage}</p>
              <button
                onClick={() => setShowModal(false)}
                className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  function UtilitiesForm({ onAdd, accounts, secondaryColor }) {
    const [utilityType, setUtilityType] = useState("Electricity");
    const [amount, setAmount] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [bills, setBills] = useState([]);
    const [filter, setFilter] = useState("all"); // all, pending, paid
    const [modalMessage, setModalMessage] = useState("");
    const [modalType, setModalType] = useState("success");
    const [showModal, setShowModal] = useState(false);
    const [loadingBills, setLoadingBills] = useState(true);
    const [selectedAccount, setSelectedAccount] = useState({});

    useEffect(() => {
      loadBills();
    }, []);

    async function loadBills() {
      setLoadingBills(true);
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;

        const { data: userRows, error: userError } = await supabase
          .from("users")
          .select("user_id, user_details_id, role")
          .eq("auth_user_id", user.id);

        if (userError) throw userError;
        if (!userRows || userRows.length === 0) throw new Error("User details not found");

        const financeRow =
          userRows.find((r) => String(r.role || "").toUpperCase() === "FINANCE") ||
          userRows[0];

        if (!financeRow?.user_details_id) throw new Error("User details not found");

        const { data: detailsData, error: detailsError } = await supabase
          .from("users_details")
          .select("branch_id")
          .eq("user_details_id", financeRow.user_details_id)
          .limit(1)
          .maybeSingle();

        if (detailsError) throw detailsError;

        // Get all utility expenses
        const { data: expenseData, error: expenseError } = await supabase
          .from("expenses")
          .select("*")
          .eq("branch_id", detailsData.branch_id)
          .eq("category", "Utilities / Bills")
          .order("created_at", { ascending: false });

        if (expenseError) throw expenseError;

        // Get associated transactions to check payment status
        const expenseIds = expenseData.map(e => e.expense_id);
        
        if (expenseIds.length > 0) {
          const { data: transactionData, error: transactionError } = await supabase
            .from("transactions")
            .select("expense_id, transaction_id, transaction_date, account_id")
            .in("expense_id", expenseIds);

          if (transactionError) throw transactionError;

          // Map bills with payment status
          const billsWithStatus = expenseData.map(expense => {
            const transaction = transactionData?.find(t => t.expense_id === expense.expense_id);
            return {
              ...expense,
              status: transaction ? "paid" : "pending",
              payment_date: transaction?.transaction_date,
              transaction_id: transaction?.transaction_id,
              paid_from_account: transaction?.account_id,
            };
          });

          setBills(billsWithStatus);
        } else {
          setBills([]);
        }
      } catch (error) {
        console.error("Error loading bills:", error);
        setModalMessage("Failed to load bills");
        setModalType("error");
        setShowModal(true);
      } finally {
        setLoadingBills(false);
      }
    }

    async function recordBill() {
      if (!utilityType || !amount || !dueDate) {
        setModalMessage("Please fill in all required fields (Type, Amount, Due Date)");
        setModalType("error");
        setShowModal(true);
        return;
      }

      setSubmitting(true);
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;

        const { data: userRows, error: userError } = await supabase
          .from("users")
          .select("user_id, user_details_id, role")
          .eq("auth_user_id", user.id);

        if (userError) throw userError;
        if (!userRows || userRows.length === 0) throw new Error("User details not found");

        const financeRow =
          userRows.find((r) => String(r.role || "").toUpperCase() === "FINANCE") ||
          userRows[0];

        if (!financeRow?.user_details_id) throw new Error("User details not found");

        const { data: detailsData, error: detailsError } = await supabase
          .from("users_details")
          .select("branch_id")
          .eq("user_details_id", financeRow.user_details_id)
          .limit(1)
          .maybeSingle();

        if (detailsError) throw detailsError;

        // Insert as expense (pending payment - no transaction yet)
        const { error: expenseError } = await supabase
          .from("expenses")
          .insert({
            branch_id: detailsData.branch_id,
            category: "Utilities / Bills",
            amount: Number(amount),
            description: `${utilityType}${notes ? ` - ${notes}` : ""} (Due: ${dueDate})`,
          });

        if (expenseError) throw expenseError;

        setModalMessage(`${utilityType} bill recorded as pending!`);
        setModalType("success");
        setShowModal(true);
        
        // Reset form
        setAmount("");
        setNotes("");
        setDueDate("");
        
        // Reload bills
        loadBills();
      } catch (error) {
        console.error("Error recording bill:", error);
        setModalMessage(`Failed to record bill: ${error.message || 'Please try again.'}`);
        setModalType("error");
        setShowModal(true);
      } finally {
        setSubmitting(false);
      }
    }

    async function markAsPaid(bill) {
      const accountId = selectedAccount[bill.expense_id];
      
      if (!accountId) {
        setModalMessage("Please select an account to pay from");
        setModalType("error");
        setShowModal(true);
        return;
      }

      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;

        const { data: userRows, error: userError } = await supabase
          .from("users")
          .select("user_id, user_details_id, role")
          .eq("auth_user_id", user.id);

        if (userError) throw userError;
        if (!userRows || userRows.length === 0) throw new Error("User details not found");

        const financeRow =
          userRows.find((r) => String(r.role || "").toUpperCase() === "FINANCE") ||
          userRows[0];

        if (!financeRow?.user_details_id) throw new Error("User details not found");

        const { data: detailsData, error: detailsError } = await supabase
          .from("users_details")
          .select("branch_id")
          .eq("user_details_id", financeRow.user_details_id)
          .limit(1)
          .maybeSingle();

        if (detailsError) throw detailsError;

        // Create transaction (payment)
        const { error: transactionError } = await supabase
          .from("transactions")
          .insert({
            branch_id: detailsData.branch_id,
            account_id: Number(accountId),
            transaction_type: "Expense",
            expense_id: bill.expense_id,
            donation_id: null,
            transfer_id: null,
            amount: -Number(bill.amount),
            transaction_date: new Date().toISOString().split('T')[0],
            created_by: financeRow.user_id,
            notes: `Utility Payment: ${bill.description}`,
          });

        if (transactionError) throw transactionError;

        setModalMessage("Bill marked as paid successfully!");
        setModalType("success");
        setShowModal(true);
        
        // Reload bills and parent data
        loadBills();
        onAdd?.();
      } catch (error) {
        console.error("Error marking bill as paid:", error);
        setModalMessage(`Failed to mark as paid: ${error.message || 'Please try again.'}`);
        setModalType("error");
        setShowModal(true);
      }
    }

    const filteredBills = bills.filter(bill => {
      if (filter === "all") return true;
      return bill.status === filter;
    });

    const totalPending = bills.filter(b => b.status === "pending").reduce((sum, b) => sum + Number(b.amount), 0);
    const totalPaid = bills.filter(b => b.status === "paid").reduce((sum, b) => sum + Number(b.amount), 0);

    return (
      <>
        <div className="space-y-6">
          {/* Record New Bill Form */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-200 mb-6">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Receipt size={24} className="text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Record New Utility Bill</h2>
                <p className="text-sm text-gray-500">Add bills for pending approval and payment</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Utility Type <span className="text-red-500">*</span>
                </label>
                <select 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent" 
                  value={utilityType} 
                  onChange={(e) => setUtilityType(e.target.value)}
                >
                  <option>Electricity</option>
                  <option>Water</option>
                  <option>Internet</option>
                  <option>Phone</option>
                  <option>Gas</option>
                  <option>Waste Management</option>
                  <option>Security Services</option>
                  <option>Maintenance</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">₱</span>
                  <input 
                    type="number" 
                    className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent" 
                    placeholder="0.00" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input 
                  type="date" 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent" 
                  value={dueDate} 
                  onChange={(e) => setDueDate(e.target.value)} 
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes / Reference Number
                </label>
                <input 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent" 
                  placeholder="e.g., Account #123456, Meter reading" 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <button 
                onClick={recordBill} 
                disabled={submitting}
                className="w-full px-4 py-3 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed shadow"
                style={{ backgroundColor: secondaryColor }}
              >
                {submitting ? "Recording..." : "➕ Record Bill (Pending)"}
              </button>
            </div>
          </div>

          {/* Bills Summary & List */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Utility Bills</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setFilter("all")}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                    filter === "all" 
                      ? "bg-orange-600 text-white" 
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  All ({bills.length})
                </button>
                <button 
                  onClick={() => setFilter("pending")}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                    filter === "pending" 
                      ? "bg-yellow-600 text-white" 
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Pending ({bills.filter(b => b.status === "pending").length})
                </button>
                <button 
                  onClick={() => setFilter("paid")}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                    filter === "paid" 
                      ? "bg-green-600 text-white" 
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Paid ({bills.filter(b => b.status === "paid").length})
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-700 mb-1">Pending Bills</p>
                <p className="text-2xl font-bold text-yellow-900">₱{totalPending.toLocaleString()}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-700 mb-1">Paid This Period</p>
                <p className="text-2xl font-bold text-green-900">₱{totalPaid.toLocaleString()}</p>
              </div>
            </div>

            {/* Bills List */}
            {loadingBills ? (
              <div className="text-center py-8 text-gray-500">Loading bills...</div>
            ) : filteredBills.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No {filter !== "all" ? filter : ""} bills found
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBills.map(bill => (
                  <div 
                    key={bill.expense_id} 
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-gray-900">{bill.description}</h4>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            bill.status === "paid" 
                              ? "bg-green-100 text-green-700" 
                              : "bg-yellow-100 text-yellow-700"
                          }`}>
                            {bill.status === "paid" ? "✓ Paid" : "⏱ Pending"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {bill.status === "paid" 
                            ? `Paid on ${new Date(bill.payment_date).toLocaleDateString()}`
                            : `Recorded ${new Date(bill.created_at).toLocaleDateString()}`
                          }
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">₱{Number(bill.amount).toLocaleString()}</p>
                        {bill.status === "pending" && (
                          <div className="mt-2 flex items-center gap-2">
                            <select 
                              className="text-xs border border-gray-300 rounded px-2 py-1"
                              value={selectedAccount[bill.expense_id] || ""}
                              onChange={(e) => setSelectedAccount({...selectedAccount, [bill.expense_id]: e.target.value})}
                            >
                              <option value="">Select Account</option>
                              {accounts.map((acc) => (
                                <option key={acc.account_id} value={acc.account_id}>
                                  {acc.account_name}
                                </option>
                              ))}
                            </select>
                            <button 
                              onClick={() => markAsPaid(bill)}
                              className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition"
                            >
                              Mark Paid
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                {modalType === "success" ? (
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
                <div>
                  <h3 className={`text-lg font-semibold ${modalType === "success" ? "text-green-900" : "text-red-900"}`}>
                    {modalType === "success" ? "Success" : "Error"}
                  </h3>
                </div>
              </div>
              <p className="text-gray-700 mb-6">{modalMessage}</p>
              <button
                onClick={() => setShowModal(false)}
                className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }