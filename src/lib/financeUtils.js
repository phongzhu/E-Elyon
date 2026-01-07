// Shared finance utilities: filtering, aggregation, and PDF export
import { parseISO, isAfter, isBefore, isEqual } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const BRANCHES = [
  "Vizal Pampanga",
  "Sampaloc (Main Branch)",
  "San Roque",
  "Bustos",
  "Cavite",
];

export function safeParseDate(input) {
  try {
    if (input instanceof Date) return input;
    // Accept ISO strings or display strings (fallback to Date)
    const d = typeof input === "string" ? parseISO(input) : new Date(input);
    return isNaN(d.getTime()) ? new Date() : d;
  } catch (_) {
    return new Date();
  }
}

export function withinRange(date, start, end) {
  const d = safeParseDate(date);
  const s = start ? safeParseDate(start) : null;
  const e = end ? safeParseDate(end) : null;
  if (s && !e) return isAfter(d, s) || isEqual(d, s);
  if (!s && e) return isBefore(d, e) || isEqual(d, e);
  if (s && e) return (isAfter(d, s) || isEqual(d, s)) && (isBefore(d, e) || isEqual(d, e));
  return true;
}

export function filterTransactions(transactions, { branch, startDate, endDate, type, category }) {
  return (transactions || []).filter((t) => {
    const matchBranch = branch ? t.branch === branch : true;
    const matchType = type ? t.type === type : true;
    const matchCategory = category ? t.category === category : true;
    const matchDate = withinRange(t.date, startDate, endDate);
    return matchBranch && matchType && matchCategory && matchDate;
  });
}

export function aggregate(transactions) {
  const out = {
    income: 0,
    expenses: 0,
    tithes: 0,
    offerings: 0,
    donations: 0,
    otherIncome: 0,
  };
  for (const t of transactions || []) {
    const amt = Number(t.amount) || 0;
    if (t.type === "Income") out.income += amt;
    if (t.type === "Expense") out.expenses += amt;
    if (t.category === "Tithe") out.tithes += amt;
    if (t.category === "Offering") out.offerings += amt;
    if (t.category === "Special Donation") out.donations += amt;
    if (t.type === "Income" && !["Tithe", "Offering", "Special Donation"].includes(t.category)) {
      out.otherIncome += amt;
    }
  }
  out.net = Math.abs(out.income - out.expenses);
  return out;
}

export function toRows(transactions) {
  return (transactions || []).map((t) => [
    formatDate(t.date),
    t.type,
    t.category || t.source || "-",
    t.branch,
    formatCurrency(t.amount),
    t.recordedBy || t.member || "-",
  ]);
}

export function formatCurrency(n) {
  const v = Number(n) || 0;
  return `₱${v.toLocaleString()}`;
}

export function formatDate(d) {
  try {
    const dd = safeParseDate(d);
    return dd.toLocaleDateString();
  } catch (_) {
    return String(d);
  }
}

export function exportToPDF({ title, columns, rows }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setFontSize(14);
  doc.text(title || "Finance Report", 40, 40);
  autoTable(doc, {
    head: [columns || ["Date", "Type", "Category", "Branch", "Amount", "Recorded By"]],
    body: rows || [],
    startY: 60,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [13, 101, 22] },
  });
  doc.save(`${(title || "report").toLowerCase().replace(/\s+/g, "-")}.pdf`);
}

// Demo transactions when backend is not available
export function demoTransactions() {
  const base = [
    {
      id: 1,
      date: new Date(2025, 11, 12),
      type: "Income",
      category: "Tithe",
      branch: "Sampaloc (Main Branch)",
      amount: 18500,
      recordedBy: "Finance Admin",
    },
    {
      id: 2,
      date: new Date(2025, 11, 12),
      type: "Income",
      category: "Offering",
      branch: "Cavite",
      amount: 6500,
      recordedBy: "Finance Coordinator",
    },
    {
      id: 3,
      date: new Date(2025, 11, 11),
      type: "Expense",
      category: "Equipment",
      branch: "San Roque",
      amount: 7400,
      recordedBy: "Finance Admin",
    },
    {
      id: 4,
      date: new Date(2025, 11, 10),
      type: "Income",
      category: "Special Donation",
      branch: "Vizal Pampanga",
      amount: 15000,
      recordedBy: "Finance Admin",
    },
    {
      id: 5,
      date: new Date(2025, 11, 9),
      type: "Expense",
      category: "Outreach",
      branch: "Bustos",
      amount: 4600,
      recordedBy: "Finance Coordinator",
    },
    {
      id: 6,
      date: new Date(2025, 11, 8),
      type: "Expense",
      category: "Miscellaneous",
      branch: "Sampaloc (Main Branch)",
      amount: 2200,
      recordedBy: "Finance Admin",
    },
    {
      id: 7,
      date: new Date(2025, 11, 7),
      type: "Expense",
      category: "Event",
      branch: "Cavite",
      amount: 9800,
      recordedBy: "Finance Coordinator",
    },
    {
      id: 8,
      date: new Date(2025, 11, 6),
      type: "Expense",
      category: "Electricity",
      branch: "Sampaloc (Main Branch)",
      amount: 3500,
      recordedBy: "Finance Admin",
    },
    {
      id: 9,
      date: new Date(2025, 11, 5),
      type: "Expense",
      category: "Electricity",
      branch: "Vizal Pampanga",
      amount: 2200,
      recordedBy: "Finance Coordinator",
    },
    {
      id: 10,
      date: new Date(2025, 11, 4),
      type: "Expense",
      category: "Electricity",
      branch: "Bustos",
      amount: 1800,
      recordedBy: "Finance Admin",
    },
    {
      id: 11,
      date: new Date(2025, 11, 6),
      type: "Expense",
      category: "Water",
      branch: "Sampaloc (Main Branch)",
      amount: 900,
      recordedBy: "Finance Admin",
    },
    {
      id: 12,
      date: new Date(2025, 11, 5),
      type: "Expense",
      category: "Water",
      branch: "Vizal Pampanga",
      amount: 650,
      recordedBy: "Finance Coordinator",
    },
    {
      id: 13,
      date: new Date(2025, 11, 3),
      type: "Expense",
      category: "Internet",
      branch: "San Roque",
      amount: 1200,
      recordedBy: "Finance Admin",
    },
    {
      id: 14,
      date: new Date(2025, 11, 2),
      type: "Expense",
      category: "Rent",
      branch: "Cavite",
      amount: 8000,
      recordedBy: "Finance Coordinator",
    },
    {
      id: 15,
      date: new Date(2025, 11, 1),
      type: "Expense",
      category: "Payroll",
      branch: "Sampaloc (Main Branch)",
      amount: 15000,
      recordedBy: "Finance Admin",
    },
    {
      id: 16,
      date: new Date(2025, 10, 28),
      type: "Expense",
      category: "Payroll",
      branch: "Bustos",
      amount: 7500,
      recordedBy: "Finance Admin",
    },
  ];
  return base;
}

export async function fetchTransactionsFromSupabase(supabase) {
  try {
    if (!supabase) return { data: demoTransactions(), error: null };
    const { data, error } = await supabase.from("finance_transactions").select("*");
    if (error) return { data: demoTransactions(), error };
    if (!data || !data.length) return { data: demoTransactions(), error: null };
    // Ensure expected keys
    const normalized = data.map((t, i) => ({
      id: t.id ?? i + 1,
      date: t.date ?? new Date(),
      type: t.type ?? (t.amount >= 0 ? "Income" : "Expense"),
      category: t.category ?? t.source ?? "-",
      branch: t.branch ?? BRANCHES[0],
      amount: Math.abs(Number(t.amount ?? 0)),
      recordedBy: t.recordedBy ?? t.member ?? "-",
    }));
    return { data: normalized, error: null };
  } catch (err) {
    return { data: demoTransactions(), error: err };
  }
}
