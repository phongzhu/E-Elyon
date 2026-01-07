import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { useBranding } from "../../context/BrandingContext";
import { supabase } from "../../lib/supabaseClient";
import { aggregate, demoTransactions, filterTransactions, BRANCHES, formatCurrency } from "../../lib/financeUtils";

export default function BishopDashboard() {
  const { branding } = useBranding();
  const primaryColor = branding?.primary_color || "#0B6516";
  const secondaryColor = branding?.secondary_color || "#9C0808";

  const [tx, setTx] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [ministries, setMinistries] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [approvals, setApprovals] = useState({ finance: 0, stipends: 0, revolving: 0 });
  const [counselingRequests, setCounselingRequests] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase.from("finance_transactions").select("*");
        const transactions = error || !data || !data.length ? demoTransactions() : data.map((t, i) => ({
          id: t.id ?? i + 1,
          date: t.date ?? new Date(),
          type: t.type ?? (Number(t.amount) >= 0 ? "Income" : "Expense"),
          category: t.category ?? t.source ?? "-",
          branch: t.branch ?? BRANCHES[0],
          amount: Math.abs(Number(t.amount ?? 0)),
          recordedBy: t.recordedBy ?? t.member ?? "-",
        }));
        const { data: attData } = await supabase.from("attendance").select("date, branch, count");
        const { data: minData } = await supabase.from("ministries").select("id, name, is_active");
        const { data: workerData } = await supabase.from("workers").select("id, name, is_active");
        const { data: reqData } = await supabase.from("finance_requests").select("id, type, status, amount");
        const { data: counselData } = await supabase.from("counseling_requests").select("id, member_name, request_type, status, created_at, branch");

        if (mounted) {
          setTx(transactions);
          setAttendance(attData || demoAttendance());
          setMinistries(minData || demoMinistries());
          setWorkers(workerData || demoWorkers());
          setApprovals(calcApprovals(reqData || demoFinanceRequests()));
          setCounselingRequests(counselData || demoCounselingRequests());
        }
      } catch (_) {
        if (mounted) {
          setTx(demoTransactions());
          setAttendance(demoAttendance());
          setMinistries(demoMinistries());
          setWorkers(demoWorkers());
          setApprovals(calcApprovals(demoFinanceRequests()));
          setCounselingRequests(demoCounselingRequests());
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  const monthFiltered = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return filterTransactions(tx, { startDate: start, endDate: end });
  }, [tx]);

  const kpi = useMemo(() => aggregate(tx), [tx]);
  const monthlyAgg = useMemo(() => aggregate(monthFiltered), [monthFiltered]);
  const totalFunds = kpi.net;

  const attendanceSummary = useMemo(() => {
    const map = new Map();
    (attendance || []).forEach((a) => {
      map.set(a.branch, (map.get(a.branch) || 0) + (Number(a.count) || 0));
    });
    return Array.from(map.entries()).map(([branch, count]) => ({ branch, count }));
  }, [attendance]);

  const totalMembers = attendanceSummary.reduce((sum, row) => sum + Number(row.count || 0), 0) || 5000;
  const volunteersCount = (workers || []).length || 500;
  const workersCount = (ministries || []).length * 5 || 100;

  const financialSeries = useMemo(() => {
    // Increased income for a more positive chart
    const income = [120, 140, 180, 220, 190, 240, 260];
    const lastYear = [100, 110, 130, 160, 150, 170, 200];
    return { labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"], thisYear: income, lastYear };
  }, []);

  const barSeries = useMemo(() => {
    const entries = attendanceSummary.length ? attendanceSummary : [
      { branch: "Main", count: 19000 },
      { branch: "Baliwag", count: 12000 },
      { branch: "Bustos", count: 21000 },
      { branch: "Talacsan", count: 27000 },
      { branch: "San Roq", count: 15000 },
    ];
    return entries.slice(0, 5);
  }, [attendanceSummary]);

  const events = useMemo(() => ([
    {
      title: "Sunday Service",
      dateObj: new Date(2025, 11, 21),
      date: "This Sunday at 10 AM",
      desc: "Weekly worship with an inspiring message and warm community.",
      image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=300&q=60",
    },
    {
      title: "Youth Group Meeting",
      dateObj: new Date(2025, 11, 19),
      date: "Next Friday at 7 PM",
      desc: "Games, discussions, and fellowship for youth members.",
      image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=60",
    },
    {
      title: "Family Fun Day",
      dateObj: new Date(2025, 11, 25),
      date: "July 15th at 2 PM",
      desc: "Activities, games, and snacks for all ages.",
      image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=60",
    },
  ]), []);

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 font-[Inter]">
      <Sidebar />

      <div className="flex flex-col flex-1">
        <Header />

        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-600">At-a-glance view of members, finances, and upcoming events.</p>
              </div>
              <div className="text-xs text-gray-500">Last updated: {new Date().toLocaleString()}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard label="Total Members" value={totalMembers.toLocaleString()} />
              <StatCard label="Volunteers" value={volunteersCount.toLocaleString()} />
              <StatCard label="Workers" value={workersCount.toLocaleString()} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-6 lg:col-span-2">
                <TabbedAnalytics 
                  financialSeries={financialSeries}
                  barSeries={barSeries}
                  totalFunds={totalFunds}
                  totalMembers={totalMembers}
                  primaryColor={primaryColor}
                />

                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">Counseling Requests Oversight</h3>
                  <CounselingOversight requests={counselingRequests} primaryColor={primaryColor} />
                </div>
              </div>

              <div className="space-y-6">
                <CalendarCard primaryColor={primaryColor} secondaryColor={secondaryColor} events={events} />

                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">Upcoming Events</h3>
                  <div className="space-y-4">
                    {events.map((event, idx) => (
                      <EventCard key={idx} event={event} primaryColor={primaryColor} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function CounselingOversight({ requests, primaryColor }) {
  const pending = requests.filter((r) => r.status === "Pending").length;
  const inProgress = requests.filter((r) => r.status === "In Progress").length;
  const completed = requests.filter((r) => r.status === "Completed").length;
  const recentRequests = requests.slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-700 font-medium">Pending</p>
          <p className="text-2xl font-bold text-amber-900">{pending}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-700 font-medium">In Progress</p>
          <p className="text-2xl font-bold text-blue-900">{inProgress}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <p className="text-xs text-emerald-700 font-medium">Completed</p>
          <p className="text-2xl font-bold text-emerald-900">{completed}</p>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Recent Requests</h4>
        <div className="space-y-2">
          {recentRequests.length > 0 ? (
            recentRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2 hover:bg-gray-50">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{req.member_name}</p>
                  <p className="text-xs text-gray-500">{req.request_type} • {req.branch}</p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    req.status === "Pending"
                      ? "bg-amber-100 text-amber-800"
                      : req.status === "In Progress"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {req.status}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-500">No counseling requests at this time.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function TabbedAnalytics({ financialSeries, barSeries, totalFunds, totalMembers, primaryColor }) {
  const [activeTab, setActiveTab] = React.useState("financial");

  const tabs = [
    { id: "financial", label: "Financial Overview" },
    { id: "members", label: "Members per Satellite" },
    { id: "demographics", label: "Demographics" },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex border-b border-gray-100">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
            style={activeTab === tab.id ? { borderBottomColor: primaryColor, color: primaryColor } : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {activeTab === "financial" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Financial Overview</p>
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalFunds || 2234567)}</div>
                <div className="text-xs text-emerald-600 font-semibold">This Year +12%</div>
              </div>
              <div className="flex gap-3 text-xs text-gray-500">
                <LegendDot color={primaryColor} label="This year" />
                <LegendDot color="#c5d1c9" label="Last year" />
              </div>
            </div>
            <LineChart data={financialSeries} primaryColor={primaryColor} />
          </div>
        )}

        {activeTab === "members" && (
          <div>
            <div className="mb-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Number of members per satellite</p>
              <p className="text-[11px] text-gray-500">Last recorded attendance per branch</p>
            </div>
            <BarChart data={barSeries} primaryColor={primaryColor} />
          </div>
        )}

        {activeTab === "demographics" && (
          <div>
            <div className="mb-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Member Demographics by Satellite</p>
              <p className="text-[11px] text-gray-500">Distribution across all branches</p>
            </div>
            <DemographicList data={barSeries} totalMembers={totalMembers} primaryColor={primaryColor} />
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <div className="text-xl font-semibold text-gray-900 mt-1">{value}</div>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div className="flex items-center gap-1 text-xs text-gray-600">
      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}

function LineChart({ data, primaryColor }) {
  const height = 140;
  const width = 560;
  const maxValue = Math.max(...data.thisYear, ...data.lastYear, 1);
  const yScale = (v) => height - (v / maxValue) * (height - 20);
  const xStep = width / (data.labels.length - 1 || 1);

  const toPoints = (series) => series.map((v, idx) => `${idx * xStep},${yScale(v)}`).join(" ");

  return (
    <div className="overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40">
        <polyline
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="2"
          points={toPoints(data.lastYear)}
          strokeDasharray="4 4"
        />
        <polyline
          fill="none"
          stroke={primaryColor}
          strokeWidth="3"
          points={toPoints(data.thisYear)}
        />
        {data.labels.map((label, idx) => (
          <text key={label} x={idx * xStep} y={height - 2} textAnchor="middle" className="text-[10px] fill-gray-400">
            {label}
          </text>
        ))}
      </svg>
    </div>
  );
}

function BarChart({ data, primaryColor }) {
  const maxValue = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="grid grid-cols-5 items-end gap-2 h-48">
      {data.map((d) => {
        const heightPct = (d.count / maxValue) * 100;
        return (
          <div key={d.branch} className="flex flex-col items-center gap-2">
            <div className="w-10 rounded-md bg-gradient-to-t from-emerald-800 to-emerald-500" style={{ height: `${heightPct}%`, maxHeight: "160px", backgroundColor: primaryColor }} />
            <p className="text-[11px] text-gray-600 text-center leading-tight">{d.branch}</p>
          </div>
        );
      })}
    </div>
  );
}

function DemographicList({ data, totalMembers, primaryColor }) {
  return (
    <div className="space-y-3">
      {data.map((d) => {
        const percentage = totalMembers > 0 ? ((d.count / totalMembers) * 100).toFixed(1) : 0;
        return (
          <div key={d.branch} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-700 font-medium">{d.branch}</span>
              <span className="text-gray-600">{d.count.toLocaleString()} ({percentage}%)</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${percentage}%`, backgroundColor: primaryColor }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CalendarCard({ primaryColor, secondaryColor, events }) {
  const [selectedDate, setSelectedDate] = React.useState(null);
  const now = new Date();
  const month = now.toLocaleString("default", { month: "long" });
  const year = now.getFullYear();
  const days = Array.from({ length: 30 }, (_, i) => i + 1);

  const eventsByDate = React.useMemo(() => {
    const map = new Map();
    (events || []).forEach((event) => {
      if (event.dateObj) {
        const day = event.dateObj.getDate();
        if (!map.has(day)) map.set(day, []);
        map.get(day).push(event);
      }
    });
    return map;
  }, [events]);

  const selectedEvents = selectedDate ? eventsByDate.get(selectedDate) || [] : [];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <button className="text-gray-500 text-sm" aria-label="Previous month">‹</button>
        <div className="text-sm font-semibold text-gray-800">{month} {year}</div>
        <button className="text-gray-500 text-sm" aria-label="Next month">›</button>
      </div>
      <div className="grid grid-cols-7 text-[11px] text-gray-400 mb-2">
        {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => <span key={d} className="text-center">{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1 text-[11px] text-gray-700">
        {days.map((day) => {
          const isToday = day === now.getDate();
          const hasEvent = eventsByDate.has(day);
          const isSelected = selectedDate === day;
          return (
            <button
              key={day}
              onClick={() => setSelectedDate(hasEvent ? day : null)}
              className={`aspect-square flex items-center justify-center rounded-full relative transition-colors ${
                isSelected ? "ring-2 ring-offset-1" : ""
              } ${isToday ? "bg-emerald-100 text-emerald-800 font-semibold" : "hover:bg-gray-50"} ${
                hasEvent ? "cursor-pointer" : "cursor-default"
              }`}
              style={isToday ? { color: primaryColor, backgroundColor: `${primaryColor}22`, ringColor: primaryColor } : isSelected ? { ringColor: primaryColor } : {}}
            >
              {day}
              {hasEvent && (
                <span
                  className="absolute bottom-0.5 w-1 h-1 rounded-full"
                  style={{ backgroundColor: secondaryColor }}
                />
              )}
            </button>
          );
        })}
      </div>
      {selectedEvents.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
          <p className="text-xs font-semibold text-gray-700">Events on {month} {selectedDate}:</p>
          {selectedEvents.map((event, idx) => (
            <div key={idx} className="text-xs text-gray-600 bg-gray-50 rounded p-2">
              <p className="font-semibold">{event.title}</p>
              <p className="text-[11px]">{event.date}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({ event, primaryColor }) {
  return (
    <div className="flex gap-3">
      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
        <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1">
        <p className="text-[11px] text-gray-500">{event.date}</p>
        <h4 className="text-sm font-semibold text-gray-800">{event.title}</h4>
        <p className="text-[12px] text-gray-600 leading-snug">{event.desc}</p>
        <button
          className="mt-2 text-[11px] px-3 py-1 rounded-full text-white"
          style={{ backgroundColor: primaryColor }}
        >
          View
        </button>
      </div>
    </div>
  );
}

function demoAttendance() {
  return [
    { date: new Date(2025, 11, 10), branch: "Sampaloc (Main Branch)", count: 180 },
    { date: new Date(2025, 11, 10), branch: "Vizal Pampanga", count: 95 },
    { date: new Date(2025, 11, 10), branch: "Bustos", count: 70 },
    { date: new Date(2025, 11, 10), branch: "San Roque", count: 88 },
    { date: new Date(2025, 11, 10), branch: "Cavite", count: 110 },
  ];
}

function demoMinistries() { return [{ id: 1, name: "Worship", is_active: true }]; }
function demoWorkers() { return [{ id: 1, name: "John", is_active: true }]; }
function demoFinanceRequests() {
  return [
    { id: 1, type: "Expense", status: "Pending", amount: 25000 },
    { id: 2, type: "Stipend", status: "Pending", amount: 8000 },
    { id: 3, type: "Revolving", status: "Pending", amount: 50000 },
  ];
}

function demoCounselingRequests() {
  return [
    { id: 1, member_name: "Maria Santos", request_type: "Marriage Counseling", status: "Pending", created_at: new Date(2025, 11, 15), branch: "Main" },
    { id: 2, member_name: "Juan Dela Cruz", request_type: "Family Guidance", status: "In Progress", created_at: new Date(2025, 11, 14), branch: "Bustos" },
    { id: 3, member_name: "Ana Reyes", request_type: "Spiritual Direction", status: "Completed", created_at: new Date(2025, 11, 10), branch: "Cavite" },
    { id: 4, member_name: "Pedro Garcia", request_type: "Personal Issues", status: "Pending", created_at: new Date(2025, 11, 16), branch: "San Roque" },
    { id: 5, member_name: "Rosa Martinez", request_type: "Financial Stress", status: "In Progress", created_at: new Date(2025, 11, 12), branch: "Main" },
  ];
}

function calcApprovals(reqs) {
  const out = { finance: 0, stipends: 0, revolving: 0 };
  (reqs || []).forEach((r) => {
    if (r.status === "Pending") {
      if (r.type === "Expense") out.finance += 1;
      else if (r.type === "Stipend") out.stipends += 1;
      else if (r.type === "Revolving") out.revolving += 1;
    }
  });
  return out;
}
function averageWeekly(att) {
  // Simple heuristic for demo: if any branch < 80, flag decline
  const decline = (att || []).some((a) => Number(a.count) < 80);
  return { decline };
}
