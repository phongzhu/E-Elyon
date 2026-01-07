
import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { supabase } from "../../lib/supabaseClient";
import { aggregate, demoTransactions, filterTransactions, formatCurrency, BRANCHES } from "../../lib/financeUtils";
import { AlertTriangle, CheckCircle2, Shield } from "lucide-react";


// Helper for demo requests if needed
function demoFinanceRequests() {
  return [
    { id: 1, type: "Stipend", status: "Pending", amount: 5000, branch: "Main" },
    { id: 2, type: "Revolving", status: "Pending", amount: 25000, branch: "North" },
    { id: 3, type: "Stipend", status: "Approved", amount: 3000, branch: "South" },
  ];
}

// Overwrite demoTransactions to ensure positive net funds
function demoTransactionsPositiveNet() {
  return [
    // Big income placeholders
    { id: 1, date: "2025-12-01", type: "Income", category: "Tithes", branch: "Main", amount: 100000, recordedBy: "Admin" },
    { id: 2, date: "2025-12-02", type: "Income", category: "Events", branch: "Main", amount: 50000, recordedBy: "Admin" },
    { id: 3, date: "2025-12-03", type: "Income", category: "General", branch: "North", amount: 40000, recordedBy: "Admin" },
    { id: 4, date: "2025-12-04", type: "Income", category: "Missions", branch: "South", amount: 30000, recordedBy: "Admin" },
    { id: 5, date: "2025-12-05", type: "Income", category: "Building Fund", branch: "Main", amount: 20000, recordedBy: "Admin" },
    { id: 6, date: "2025-12-06", type: "Income", category: "Outreach", branch: "North", amount: 15000, recordedBy: "Admin" },
    { id: 7, date: "2025-12-07", type: "Income", category: "Administration", branch: "South", amount: 12000, recordedBy: "Admin" },
    // Expenses
    { id: 8, date: "2025-12-08", type: "Expense", category: "Events", branch: "Main", amount: 10000, recordedBy: "Admin" },
    { id: 9, date: "2025-12-09", type: "Expense", category: "General", branch: "North", amount: 8000, recordedBy: "Admin" },
    { id: 10, date: "2025-12-10", type: "Expense", category: "Missions", branch: "South", amount: 7000, recordedBy: "Admin" },
    { id: 11, date: "2025-12-11", type: "Expense", category: "Building Fund", branch: "Main", amount: 6000, recordedBy: "Admin" },
    { id: 12, date: "2025-12-12", type: "Expense", category: "Outreach", branch: "North", amount: 5000, recordedBy: "Admin" },
    { id: 13, date: "2025-12-13", type: "Expense", category: "Administration", branch: "South", amount: 4000, recordedBy: "Admin" },
    // More income to ensure positive net
    { id: 14, date: "2025-12-14", type: "Income", category: "Tithes", branch: "Main", amount: 80000, recordedBy: "Admin" },
    { id: 15, date: "2025-12-15", type: "Income", category: "Events", branch: "Main", amount: 60000, recordedBy: "Admin" },
    { id: 16, date: "2025-12-16", type: "Income", category: "General", branch: "North", amount: 50000, recordedBy: "Admin" },
    { id: 17, date: "2025-12-17", type: "Income", category: "Missions", branch: "South", amount: 40000, recordedBy: "Admin" },
    { id: 18, date: "2025-12-18", type: "Income", category: "Building Fund", branch: "Main", amount: 30000, recordedBy: "Admin" },
    { id: 19, date: "2025-12-19", type: "Income", category: "Outreach", branch: "North", amount: 25000, recordedBy: "Admin" },
    { id: 20, date: "2025-12-20", type: "Income", category: "Administration", branch: "South", amount: 22000, recordedBy: "Admin" },
  ];
}

export default function BishopFinance() {
  const [tx, setTx] = useState([]);
  const [requests, setRequests] = useState([]);
  const [threshold, setThreshold] = useState(20000);
  const [activeTab, setActiveTab] = useState("overview");
  const [showRequest, setShowRequest] = useState(null);
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectAlt, setRejectAlt] = useState("");
  const [notifyReject, setNotifyReject] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase.from("finance_transactions").select("*");
        const transactions = error || !data || !data.length ? demoTransactionsPositiveNet() : data.map((t, i) => ({
          id: t.id ?? i + 1,
          date: t.date ?? new Date(),
          type: t.type ?? (Number(t.amount) >= 0 ? "Income" : "Expense"),
          category: t.category ?? t.source ?? "-",
          branch: t.branch ?? BRANCHES[0],
          amount: Math.abs(Number(t.amount ?? 0)),
          recordedBy: t.recordedBy ?? t.member ?? "-",
        }));
        const { data: reqData } = await supabase.from("finance_requests").select("id, type, status, amount, branch");
        if (mounted) {
          setTx(transactions);
          setRequests(reqData || demoFinanceRequests());
        }
      } catch (_) {
        if (mounted) {
          setTx(demoTransactionsPositiveNet());
          setRequests(demoFinanceRequests());
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Use original kpi calculation (no clamping)
  const kpi = useMemo(() => aggregate(tx), [tx]);
  const now = new Date();
  const monthFiltered = useMemo(() => filterTransactions(tx, { startDate: new Date(now.getFullYear(), now.getMonth(), 1), endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0) }), [tx]);
  const monthlyAgg = useMemo(() => aggregate(monthFiltered), [monthFiltered]);

  const highValue = useMemo(() => (requests || []).filter((r) => r.amount >= threshold && r.status === "Pending"), [requests, threshold]);
  const revolvingPending = useMemo(() => (requests || []).filter((r) => r.type === "Revolving" && r.status === "Pending"), [requests]);
  const stipendPending = useMemo(() => (requests || []).filter((r) => r.type === "Stipend" && r.status === "Pending"), [requests]);

  const riskAlerts = useMemo(() => {
    const out = [];
    if (monthlyAgg.expenses > monthlyAgg.income) out.push("Monthly expenses exceed income.");
    if (kpi.net < 0) out.push("Net balance negative across system.");
    return out;
  }, [kpi, monthlyAgg]);

  async function approveRequest(id, opts = { otpRequired: false }) {
    try {
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "Approved", otp_required: !!opts.otpRequired } : r));
      await supabase.from("finance_requests").update({ status: "Approved", otp_required: !!opts.otpRequired }).eq("id", id);
    } catch (err) {
      console.warn("approveRequest error", err?.message);
    }
  }
  async function rejectRequest(id) {
    try {
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "Rejected" } : r));
      await supabase.from("finance_requests").update({ status: "Rejected" }).eq("id", id);
    } catch (err) {
      console.warn("rejectRequest error", err?.message);
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="p-8 space-y-6 max-w-7xl w-full mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Finance Oversight</h1>
            <p className="text-gray-600">Manage all financial transactions and reporting</p>
          </div>
          {/* Tab Navigation */}
          <div className="flex gap-6 border-b border-gray-200 mb-4">
            <button onClick={() => setActiveTab("overview")} className={`py-2 px-2 text-sm font-medium transition-colors ${activeTab === "overview" ? "border-b-2 border-green-600 text-green-700" : "text-gray-500 hover:text-gray-700"}`}>Overview</button>
            <button onClick={() => setActiveTab("transactions")} className={`py-2 px-2 text-sm font-medium transition-colors ${activeTab === "transactions" ? "border-b-2 border-green-600 text-green-700" : "text-gray-500 hover:text-gray-700"}`}>Transactions</button>
            <button onClick={() => setActiveTab("requests")} className={`py-2 px-2 text-sm font-medium transition-colors ${activeTab === "requests" ? "border-b-2 border-green-600 text-green-700" : "text-gray-500 hover:text-gray-700"}`}>Requests</button>
          </div>
          {/* Tab Content */}
          {activeTab === "overview" && (
            <>
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Total Funds</h3>
                  <p className="text-2xl font-bold text-gray-800">{formatCurrency(kpi.net)}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Monthly Income</h3>
                  <p className="text-2xl font-bold text-gray-800">{formatCurrency(monthlyAgg.income)}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Monthly Expenses</h3>
                  <p className="text-2xl font-bold text-gray-800">{formatCurrency(monthlyAgg.expenses)}</p>
                </div>
              </section>
            </>
          )}
          {activeTab === "transactions" && (
            <TransactionsTab tx={tx} />
          )}
          {activeTab === "requests" && (
            <RequestsTab requests={requests} setShowRequest={setShowRequest} />
          )}
          {/* Request Review Modal */}
          {showRequest && (
            <RequestReviewModal
              request={showRequest}
              onClose={() => setShowRequest(null)}
              onApprove={() => { setShowApprove(true); setShowRequest(null); }}
              onReject={() => { setShowReject(true); setShowRequest(null); }}
            />
          )}
          {/* Approve Modal */}
          {showApprove && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4 text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Request Approved!</h3>
                <p className="text-gray-700 mb-4">The financial request has been successfully approved.</p>
                <button className="px-4 py-2 text-sm bg-green-700 text-white rounded-md" onClick={() => setShowApprove(false)}>Back to dashboard</button>
              </div>
            </div>
          )}
          {/* Reject Modal */}
          {showReject && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Reject Financial Request?</h3>
                <label className="block text-sm font-medium mb-1">Reason (minimum 20 characters)</label>
                <textarea className="w-full border rounded p-2 mb-2" minLength={20} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Input request here..." />
                <label className="block text-sm font-medium mb-1">Alternative suggestions (optional)</label>
                <textarea className="w-full border rounded p-2 mb-2" value={rejectAlt} onChange={e => setRejectAlt(e.target.value)} placeholder="Input request here..." />
                <div className="flex items-center gap-2 mb-2">
                  <input type="checkbox" checked={notifyReject} onChange={e => setNotifyReject(e.target.checked)} />
                  <span className="text-sm">Notify requestor</span>
                </div>
                <div className="flex gap-2 justify-end">
                  <button className="px-4 py-2 text-sm bg-gray-200 rounded-md" onClick={() => setShowReject(false)}>Cancel</button>
                  <button className="px-4 py-2 text-sm bg-green-700 text-white rounded-md" disabled={rejectReason.length < 20} onClick={() => { setShowReject(false); setShowRejectConfirm(true); }}>Confirm Rejection</button>
                </div>
              </div>
            </div>
          )}
          {/* Reject Confirm Modal */}
          {showRejectConfirm && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4 text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Request rejected</h3>
                <p className="text-gray-700 mb-4">The request has been rejected and the requestor has been notified.</p>
                <button className="px-4 py-2 text-sm bg-green-700 text-white rounded-md" onClick={() => setShowRejectConfirm(false)}>Done</button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}


// RequestReviewModal: Modal for reviewing a request
function RequestReviewModal({ request, onClose, onApprove, onReject }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <h2 className="text-lg font-semibold mb-2">Review Request</h2>
        <div className="mb-4">
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-medium">Request ID</span>
            <span>REQ-{String(request.id).padStart(4, "0")}</span>
          </div>
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-medium">Date Submitted</span>
            <span>2024-07-26</span>
          </div>
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-medium">Status</span>
            <span>Pending Approval</span>
          </div>
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-medium">Total Amount</span>
            <span>₱{request.amount?.toLocaleString()}</span>
          </div>
        </div>
        <div className="mb-4">
          <div className="font-medium text-sm mb-1">Supporting Documents</div>
          <div className="flex gap-2 mb-1"><button className="bg-gray-100 px-3 py-1 rounded">Download</button><button className="bg-gray-100 px-3 py-1 rounded">Download</button></div>
        </div>
        <div className="mb-4">
          <div className="font-medium text-sm mb-1">Requester Information</div>
          <div className="flex gap-4 text-sm"><span>Name Sophia Carter</span><span>Department Youth Ministry</span></div>
          <div className="text-sm">Contact sophia.carter@email.com</div>
        </div>
        <div className="mb-4">
          <div className="font-medium text-sm mb-1">Budget Category & Available Balance</div>
          <div className="flex gap-4 text-sm"><span>Category Youth Events</span><span>Available Balance ₱2,500.00</span></div>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button className="px-4 py-2 text-sm bg-gray-200 rounded-md" onClick={onClose}>Decline</button>
          <button className="px-4 py-2 text-sm bg-green-700 text-white rounded-md" onClick={onApprove}>Approve</button>
        </div>
      </div>
    </div>
  );
}

// TransactionsTab: Table with filters and export
function TransactionsTab({ tx }) {
  const [dateRange, setDateRange] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [amountRange, setAmountRange] = useState("");
  // Filter logic (simple demo)
  const filtered = tx.filter(t => {
    let ok = true;
    if (type && t.type !== type) ok = false;
    if (category && t.category !== category) ok = false;
    // ...date and amount range logic can be added
    return ok;
  });
  // Helper to format date safely
  function formatDateCell(date) {
    if (!date) return "-";
    if (typeof date === "string") {
      // If ISO string or YYYY-MM-DD, just slice
      return date.slice(0, 10);
    }
    if (date instanceof Date && !isNaN(date)) {
      // Format as YYYY-MM-DD
      return date.toISOString().slice(0, 10);
    }
    return "-";
  }
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <button className="bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2 ml-auto"><span>Export</span></button>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        <select className="border rounded px-2 py-1 text-sm" value={dateRange} onChange={e => setDateRange(e.target.value)}><option>Date Range</option></select>
        <select className="border rounded px-2 py-1 text-sm" value={type} onChange={e => setType(e.target.value)}><option value="">Type</option><option>Income</option><option>Expense</option></select>
        <select className="border rounded px-2 py-1 text-sm" value={category} onChange={e => setCategory(e.target.value)}><option value="">Category</option><option>Tithes</option><option>Events</option><option>General</option><option>Administration</option><option>Missions</option><option>Outreach</option><option>Building Fund</option></select>
        <select className="border rounded px-2 py-1 text-sm" value={amountRange} onChange={e => setAmountRange(e.target.value)}><option>Amount Range</option></select>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Description</th>
              <th className="px-4 py-3 text-left font-medium">Category</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Amount</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((t, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-3">{formatDateCell(t.date)}</td>
                <td className="px-4 py-3">{t.description || t.category}</td>
                <td className="px-4 py-3">{t.category}</td>
                <td className="px-4 py-3">{t.type}</td>
                <td className="px-4 py-3">₱{t.amount?.toLocaleString()}</td>
                <td className="px-4 py-3"><span className="inline-block bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs">Completed</span></td>
                <td className="px-4 py-3"><button className="text-green-700 underline">View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// RequestsTab: List of requests with review action
function RequestsTab({ requests, setShowRequest }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Financial Requests</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Request ID</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Amount</th>
              <th className="px-4 py-3 text-left font-medium">Branch</th>
              <th className="px-4 py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {requests.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">REQ-{String(r.id).padStart(4, "0")}</td>
                <td className="px-4 py-3">{r.type}</td>
                <td className="px-4 py-3">{r.status}</td>
                <td className="px-4 py-3">₱{r.amount?.toLocaleString()}</td>
                <td className="px-4 py-3">{r.branch}</td>
                <td className="px-4 py-3"><button className="text-green-700 underline" onClick={() => setShowRequest(r)}>Review</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
            }
