import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { useBranding } from "../../context/BrandingContext";
import {
  DollarSign,
  TrendingUp,
  Wallet,
  PieChart,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import DateRangePicker from "../../components/DateRangePicker";
import { supabase } from "../../lib/supabaseClient";
import { aggregate, filterTransactions, formatCurrency } from "../../lib/financeUtils";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import FinanceCalendar from "../../components/FinanceCalendar";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function FinanceDashboard() {
  const { branding } = useBranding();
  const primaryColor = branding?.primary_color || "#0B6516";
  const secondaryColor = branding?.secondary_color || "#9C0808";
  const neutral = "#e5e7eb";
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [allTx, setAllTx] = useState([]);
  const [insightTab, setInsightTab] = useState("recent");
  const [advisoryTab, setAdvisoryTab] = useState("risk");
  const [userBranchId, setUserBranchId] = useState(null);
  const [userBranchName, setUserBranchName] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load user's branch on mount
  useEffect(() => {
    loadUserBranch();
  }, []);

  // Load transactions and accounts when user branch is loaded
  useEffect(() => {
    if (userBranchId) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userBranchId]);

  const loadUserBranch = async () => {
    try {
      // Get current authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Not authenticated");

      // Get user record to find user_details_id
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

      // Get branch_id from user_details
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

      setUserBranchId(detailsData.branch_id);
      setUserBranchName(detailsData.branches?.name || "Your Branch");
    } catch (error) {
      console.error("Error loading user branch:", error);
      alert(error.message || "Failed to load your branch information.");
    }
  };

  const loadData = async () => {
    let mounted = true;
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
      if (mounted) setAccounts(accountsData || []);

      // Load transactions for this branch's accounts
      const accountIds = (accountsData || []).map(a => a.account_id);
      
      if (accountIds.length > 0) {
        const { data: txData, error: txError } = await supabase
          .from("transactions")
          .select("*")
          .in("account_id", accountIds)
          .order("transaction_date", { ascending: false });

        if (txError) throw txError;

        const normalized = (txData || []).map((t, i) => {
          // Determine transaction type based on amount sign (positive = income, negative = expense)
          const amountValue = Number(t.amount ?? 0);
          let txType = amountValue >= 0 ? "Income" : "Expense";
          let txCategory = t.category ?? "-";
          
          if (t.donation_id) {
            // If linked to a donation, it's income
            txType = "Income";
            txCategory = t.category || "Donation";
          } else if (t.expense_id) {
            // If linked to an expense, it's an expense
            txType = "Expense";
            txCategory = t.category || "Expense";
          } else if (t.transfer_id) {
            // Transfers: positive amount = transfer in (income), negative = transfer out (expense)
            txType = amountValue >= 0 ? "Income" : "Expense";
            txCategory = t.category || "Transfer";
          }

          return {
            id: t.transaction_id ?? i + 1,
            date: t.transaction_date ?? new Date(),
            type: txType,
            category: txCategory,
            branch: userBranchName,
            amount: Math.abs(amountValue),
            recordedBy: t.recorded_by ?? "-",
            description: t.notes || t.description || "",
            account_id: t.account_id, // Include account_id for filtering
          };
        });

        if (mounted) setAllTx(normalized);
      } else {
        if (mounted) setAllTx([]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      if (mounted) setAllTx([]);
    } finally {
      if (mounted) setLoading(false);
    }
  };

  const filtered = useMemo(() => filterTransactions(allTx, {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  }), [allTx, dateRange]);

  const agg = useMemo(() => aggregate(filtered), [filtered]);

  // Calculate total account balances
  const totalBalance = useMemo(() => {
    return filtered.reduce((sum, tx) => {
      return tx.type === "Income" ? sum + tx.amount : sum - tx.amount;
    }, 0);
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50 font-[Inter]">
        <Sidebar userRole="finance" />
        <div className="flex flex-col flex-1">
          <Header />
          <main className="flex-1 p-8 overflow-y-auto">
            <div className="flex justify-center items-center h-64">
              <div className="text-gray-500">Loading dashboard...</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 font-[Inter]">
      <Sidebar userRole="finance" />

      <div className="flex flex-col flex-1">
        <Header />

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-800">Finance Dashboard</h1>
              <p className="text-gray-600 mt-2">
                Financial overview for <span className="font-semibold" style={{ color: primaryColor }}>{userBranchName}</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Showing data for church fund accounts only (no ministry accounts)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-6">
              <DateRangePicker
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                onChange={setDateRange}
              />
              <div className="ml-auto bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
                <span className="text-sm text-gray-600">Active Accounts: </span>
                <span className="font-semibold text-gray-900">{accounts.length}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard icon={<DollarSign size={22} style={{ color: primaryColor }} />} label="Total Donations" value={agg.donationTotal} subtitle="Tithes, Offerings & Gifts" />
              <StatCard icon={<Wallet size={22} style={{ color: secondaryColor }} />} label="Total Expenses" value={agg.expenses} subtitle="Ministry & Operations" />
              <StatCard icon={<TrendingUp size={22} style={{ color: totalBalance >= 0 ? primaryColor : secondaryColor }} />} label="Available Funds" value={Math.abs(totalBalance)} isNegative={totalBalance < 0} subtitle={totalBalance < 0 ? "Deficit" : "Surplus"} />
              <StatCard icon={<PieChart size={22} style={{ color: primaryColor }} />} label="Tithes & Offerings" value={agg.tithes + agg.offerings} subtitle="From Members" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6 lg:col-span-1">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Donations vs Expenses</h2>
                    <p className="text-sm text-gray-600">Church financial summary</p>
                  </div>
                  <span className="text-sm font-medium text-gray-700">{totalBalance >= 0 ? 'Surplus' : 'Deficit'} {formatCurrency(Math.abs(agg.net))}</span>
                </div>
                <div className="h-56">
                  <Bar
                  data={{
                    labels: ["Donations", "Expenses"],
                    datasets: [
                      { label: "Amount", data: [agg.donationTotal, agg.expenses], backgroundColor: [primaryColor, secondaryColor] },
                    ],
                  }}
                  options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }}
                />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-0 lg:col-span-2">
                <div className="border-b px-6 pt-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Insights</h2>
                    <div className="flex gap-2">
                      {[
                        { key: "recent", label: "Recent Transactions" },
                          { key: "accounts", label: "Account Breakdown" },
                      ].map((t) => (
                        <button
                          key={t.key}
                          onClick={() => setInsightTab(t.key)}
                          className={`px-3 py-2 text-sm rounded-t-md ${insightTab === t.key ? "bg-white border-x border-t border-gray-200 text-gray-900" : "text-gray-600"}`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {insightTab === "recent" ? (
                    <ul className="divide-y divide-gray-100">
                      {filtered.length === 0 ? (
                        <li className="py-8 text-center text-gray-500">
                          <p>No transactions found</p>
                          <p className="text-sm mt-1">Start recording transactions to see them here</p>
                        </li>
                      ) : (
                        filtered.slice(0, 8).map((tx) => {
                          const isDonation = tx.type === "Income";
                          return (
                            <li key={tx.id} className="py-3 flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-gray-800">{tx.category}</p>
                                <p className="text-xs text-gray-500">
                                  {new Date(tx.date).toLocaleDateString()}
                                  {tx.description && ` · ${tx.description}`}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {isDonation ? (
                                  <ArrowUpRight size={16} className="text-emerald-600" />
                                ) : (
                                  <ArrowDownLeft size={16} className="text-rose-600" />
                                )}
                                <span className={`text-sm font-semibold ${isDonation ? "text-emerald-700" : "text-rose-700"}`}>
                                  {isDonation ? "+" : "-"}{formatCurrency(tx.amount)}
                                </span>
                              </div>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-600 mb-3">Account breakdown by type</p>
                      <div className="grid grid-cols-1 gap-3">
                        {accounts.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <p>No accounts found</p>
                            <p className="text-sm mt-1">Create accounts to manage your funds</p>
                          </div>
                        ) : (
                          accounts.map((acc) => {
                            // Filter transactions for this specific account
                            const accTx = filtered.filter(tx => tx.account_id === acc.account_id);
                            const accSum = accTx.reduce((sum, tx) => {
                              return tx.type === "Income" ? sum + tx.amount : sum - tx.amount;
                            }, 0);
                            return (
                              <div key={acc.account_id} className="border border-gray-100 rounded-lg p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: neutral }}>
                                    <Wallet size={18} className="text-gray-700" />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-800">{acc.account_name}</p>
                                    <p className="text-xs text-gray-500">{acc.account_type} Fund</p>
                                  </div>
                                </div>
                                <p className={`text-lg font-semibold ${accSum >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  ₱{Math.abs(accSum).toLocaleString()}
                                </p>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
              <div className="lg:col-span-2">
                <FinanceCalendar
                  events={filtered.map((t) => ({
                    date: t.date,
                    label: t.category || t.type,
                    amount: t.amount,
                    type: t.type,
                    branch: t.branch,
                  }))}
                />
              </div>
              <div className="bg-white rounded-lg shadow p-0">
                <div className="border-b px-6 pt-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Advisory</h2>
                    <div className="flex gap-2">
                      {[
                          { key: "risk", label: "Financial Health" },
                          { key: "releases", label: "Upcoming Expenses" },
                      ].map((t) => (
                        <button
                          key={t.key}
                          onClick={() => setAdvisoryTab(t.key)}
                          className={`px-3 py-2 text-sm rounded-t-md ${advisoryTab === t.key ? "bg-white border-x border-t border-gray-200 text-gray-900" : "text-gray-600"}`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  {advisoryTab === "risk" ? (
                    <div>
                      <p className="text-sm text-gray-600 mb-3">Financial health indicators for your branch</p>
                      <div className="space-y-4">
                        {/* Available Funds Status */}
                        <div className={`p-4 rounded-lg border ${
                          totalBalance >= 0 
                            ? "bg-emerald-50 border-emerald-200" 
                            : "bg-rose-50 border-rose-200"
                        }`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-gray-800">Available Funds Status</p>
                              <p className="text-xs text-gray-600 mt-1">
                                Current balance: ₱{Math.abs(totalBalance).toLocaleString()}
                              </p>
                            </div>
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                              totalBalance >= 0 
                                ? "bg-emerald-100 text-emerald-800" 
                                : "bg-rose-100 text-rose-800"
                            }`}>
                              {totalBalance >= 0 ? "Surplus" : "Deficit"}
                            </span>
                          </div>
                        </div>

                        {/* Transaction Activity */}
                        <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-gray-800">Transaction Activity</p>
                              <p className="text-xs text-gray-600 mt-1">
                                {filtered.length} transactions in selected period
                              </p>
                            </div>
                            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-100 text-blue-800">
                              {filtered.length > 10 ? "Active" : "Low Activity"}
                            </span>
                          </div>
                        </div>

                        {/* Expense to Donation Ratio */}
                        {agg.donationTotal > 0 && (
                          <div className={`p-4 rounded-lg border ${
                            (agg.expenses / agg.donationTotal) > 0.8
                              ? "bg-amber-50 border-amber-200"
                              : "bg-emerald-50 border-emerald-200"
                          }`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-gray-800">Expense to Donation Ratio</p>
                                <p className="text-xs text-gray-600 mt-1">
                                  {((agg.expenses / agg.donationTotal) * 100).toFixed(1)}% of donations spent
                                </p>
                              </div>
                              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                                (agg.expenses / agg.donationTotal) > 0.8
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}>
                                {(agg.expenses / agg.donationTotal) > 0.8 ? "High" : "Healthy"}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-4">
                        Advisory indicators based on your branch's financial data
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-600 mb-3">Upcoming expenses in selected period</p>
                      <ul className="divide-y divide-gray-100">
                        {filtered
                          .filter((t) => t.type === "Expense")
                          .sort((a, b) => new Date(a.date) - new Date(b.date))
                          .slice(0, 10)
                          .map((t) => (
                            <li key={`u-${t.id}`} className="py-3 flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-gray-800">{t.category}</p>
                                <p className="text-xs text-gray-500">
                                  {new Date(t.date).toLocaleDateString()}
                                  {t.description && ` · ${t.description}`}
                                </p>
                              </div>
                              <span className="text-sm font-semibold text-rose-700">-{formatCurrency(t.amount)}</span>
                            </li>
                          ))}
                        {filtered.filter((t) => t.type === "Expense").length === 0 && (
                          <li className="py-8 text-center text-gray-500">
                            <p>No expense transactions found</p>
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, isNegative, subtitle }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <div>
          <h4 className="text-sm font-medium text-gray-500">{label}</h4>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>
      <p className={`text-4xl font-bold ${isNegative ? 'text-red-600' : 'text-gray-800'}`}>
        {isNegative && '-'}₱{value.toLocaleString()}
      </p>
    </div>
  );
}

// Removed BarRow in favor of chart for alignment consistency
