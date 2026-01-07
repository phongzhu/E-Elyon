import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { supabase } from "../../lib/supabaseClient";
import { Search, Download } from "lucide-react";

export default function BishopMembership() {
  const [activeTab, setActiveTab] = useState("overview");
  const [members, setMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [qrEnabled, setQrEnabled] = useState(false);
  const [demographics, setDemographics] = useState({ youth: 0, adults: 0, seniors: 0 });
  const [ministries, setMinistries] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: memData } = await supabase.from("members").select("id, name, last_attendance, attendance_rate, status, age_group");
        const { data: demoData } = await supabase.from("demographics").select("youth, adults, seniors");
        const { data: minData } = await supabase.from("ministry_members").select("ministry_name, member_count");
        
        if (mounted) {
          const membersList = memData || demoMembers();
          setMembers(membersList);
          
          // Calculate demographics from members if not in DB
          if (demoData && demoData[0]) {
            setDemographics(demoData[0]);
          } else {
            const demo = { youth: 0, adults: 0, seniors: 0 };
            membersList.forEach((m) => {
              if (m.age_group === "youth") demo.youth++;
              else if (m.age_group === "adult") demo.adults++;
              else if (m.age_group === "senior") demo.seniors++;
            });
            setDemographics(demo);
          }
          
          setMinistries(minData || demoMinistries());
        }
      } catch (_) {
        if (mounted) {
          setMembers(demoMembers());
          setDemographics({ youth: 45, adults: 120, seniors: 35 });
          setMinistries(demoMinistries());
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (searchQuery && !m.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (statusFilter && m.status !== statusFilter) return false;
      return true;
    });
  }, [members, searchQuery, statusFilter]);

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="p-8 space-y-6 max-w-7xl w-full mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attendance & Membership</h1>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search members"
                className="flex-1 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === "overview" ? "border-b-2 border-emerald-600 text-emerald-600" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab("methods")}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === "methods" ? "border-b-2 border-emerald-600 text-emerald-600" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Attendance Methods
              </button>
              <button
                onClick={() => setActiveTab("status")}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === "status" ? "border-b-2 border-emerald-600 text-emerald-600" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Member Status
              </button>
              <button
                onClick={() => setActiveTab("reports")}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === "reports" ? "border-b-2 border-emerald-600 text-emerald-600" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Reports
              </button>
            </div>

            <div className="p-6">
              {activeTab === "overview" && (
                <OverviewTab members={filteredMembers} statusFilter={statusFilter} setStatusFilter={setStatusFilter} dateRange={dateRange} setDateRange={setDateRange} demographics={demographics} ministries={ministries} />
              )}
              {activeTab === "methods" && (
                <AttendanceMethodsTab qrEnabled={qrEnabled} setQrEnabled={setQrEnabled} />
              )}
              {activeTab === "status" && (
                <MemberStatusTab members={filteredMembers} />
              )}
              {activeTab === "reports" && (
                <ReportsTab dateRange={dateRange} setDateRange={setDateRange} />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function OverviewTab({ members, statusFilter, setStatusFilter, dateRange, setDateRange, demographics, ministries }) {
  // Ensure at least one absent member (from demoMembers) has no appeal
  const [absentAppeals, setAbsentAppeals] = React.useState([
    { id: 3, name: "Noah Carter", appeal: "Was sick, doctor's note attached." },
    { id: 5, name: "Ethan Foster", appeal: "Family emergency, will catch up next week." }
    // No entry for id: 6 (see below)
  ]);

  // For demo: add a fake absent member with no appeal if not present
  const absentMembers = members.filter((m) => m.status === "Inactive");
  // Find an absent member with no appeal
  const absentWithNoAppeal = absentMembers.find(
    (m) => !absentAppeals.some((a) => a.id === m.id)
  );
  // If none, add a placeholder
  if (!absentWithNoAppeal && absentMembers.length > absentAppeals.length) {
    // This means there is an absent member with no appeal, but not in absentAppeals
    // No action needed, UI will show 'Assign Follow-up Team' for that member
  }
  const [followupAssigned, setFollowupAssigned] = React.useState([]);
  const [showAppeal, setShowAppeal] = React.useState(null);
  const [showFollowupMsg, setShowFollowupMsg] = React.useState(null);

  function handleAssignFollowup(member) {
    setFollowupAssigned((prev) => [...prev, member.id]);
    setShowFollowupMsg(member.id);
    setTimeout(() => setShowFollowupMsg(null), 2500);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <select
          className="border border-gray-200 rounded-md px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        <select className="border border-gray-200 rounded-md px-3 py-2 text-sm">
          <option value="">Date Range</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Demographic Breakdown</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Age Groups</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-white border border-gray-100 rounded-lg px-4 py-3">
                <span className="text-sm text-gray-700">Youth</span>
                <span className="text-sm font-semibold text-gray-900">{demographics.youth}</span>
              </div>
              <div className="flex items-center justify-between bg-white border border-gray-100 rounded-lg px-4 py-3">
                <span className="text-sm text-gray-700">Adults</span>
                <span className="text-sm font-semibold text-gray-900">{demographics.adults}</span>
              </div>
              <div className="flex items-center justify-between bg-white border border-gray-100 rounded-lg px-4 py-3">
                <span className="text-sm text-gray-700">Seniors</span>
                <span className="text-sm font-semibold text-gray-900">{demographics.seniors}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Ministry Members</h4>
            <div className="space-y-2">
              {ministries.map((ministry) => (
                <div key={ministry.ministry_name} className="flex items-center justify-between bg-white border border-gray-100 rounded-lg px-4 py-3">
                  <span className="text-sm text-gray-700">{ministry.ministry_name}</span>
                  <span className="text-sm font-semibold text-gray-900">{ministry.member_count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Absent Members Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Absent Members</h3>
        <div className="space-y-2">
          {absentMembers.length === 0 && <p className="text-sm text-gray-500">No absent members.</p>}
          {absentMembers.map((member) => {
            const appeal = absentAppeals.find((a) => a.id === member.id);
            return (
              <div key={member.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-2">
                <span className="text-gray-800 font-medium">{member.name}</span>
                {appeal ? (
                  <button
                    className="text-xs text-emerald-700 border border-emerald-200 rounded px-3 py-1 hover:bg-emerald-50"
                    onClick={() => setShowAppeal(appeal)}
                  >
                    View Appeal
                  </button>
                ) : followupAssigned.includes(member.id) ? (
                  <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-1">Follow-up Team Assigned</span>
                ) : (
                  <button
                    className="text-xs text-blue-700 border border-blue-200 rounded px-3 py-1 hover:bg-blue-50"
                    onClick={() => handleAssignFollowup(member)}
                  >
                    Assign Follow-up Team
                  </button>
                )}
                {showFollowupMsg === member.id && (
                  <span className="ml-3 text-xs text-emerald-700">Member notified: A follow-up team will be sent.</span>
                )}
              </div>
            );
          })}
          {/* If no absent member without appeal, add a placeholder for demo */}
          {absentMembers.length > 0 && !absentMembers.some((m) => !absentAppeals.find((a) => a.id === m.id)) && (
            <div className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-2 opacity-60">
              <span className="text-gray-800 font-medium">Demo Absent (No Appeal)</span>
              <button
                className="text-xs text-blue-700 border border-blue-200 rounded px-3 py-1 hover:bg-blue-50"
                disabled
              >
                Assign Follow-up Team
              </button>
            </div>
          )}
        </div>
      </div>

      {showAppeal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Absence Appeal</h3>
            <p className="text-gray-700 mb-4">{showAppeal.appeal}</p>
            <div className="flex items-center justify-end">
              <button className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-md" onClick={() => setShowAppeal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Last Attendance</th>
              <th className="px-4 py-3 text-left font-medium">Attendance Rate</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-900">{member.name}</td>
                <td className="px-4 py-3 text-gray-600">{member.last_attendance}</td>
                <td className="px-4 py-3">
                  <span className={`${parseInt(member.attendance_rate) >= 80 ? "text-emerald-600" : parseInt(member.attendance_rate) >= 50 ? "text-amber-600" : "text-red-600"}`}>
                    {member.attendance_rate}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs ${member.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                    {member.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AttendanceMethodsTab({ qrEnabled, setQrEnabled }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">QR Code Attendance</h3>
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-gray-900">Enable QR Code Attendance</p>
            <p className="text-xs text-gray-500">Enable or disable QR code attendance.</p>
          </div>
          <button
            onClick={() => setQrEnabled(!qrEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${qrEnabled ? "bg-emerald-600" : "bg-gray-200"}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${qrEnabled ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
      </div>

      <div className="border-t pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center justify-center bg-gray-50 rounded-lg p-8">
            <div className="w-48 h-48 bg-white border-8 border-black p-2">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <rect width="100" height="100" fill="white" />
                <rect x="0" y="0" width="20" height="20" fill="black" />
                <rect x="80" y="0" width="20" height="20" fill="black" />
                <rect x="0" y="80" width="20" height="20" fill="black" />
                <rect x="25" y="10" width="5" height="5" fill="black" />
                <rect x="35" y="10" width="5" height="5" fill="black" />
                <rect x="45" y="10" width="5" height="5" fill="black" />
                <rect x="55" y="10" width="5" height="5" fill="black" />
                <rect x="65" y="10" width="5" height="5" fill="black" />
                <rect x="10" y="25" width="5" height="5" fill="black" />
                <rect x="25" y="25" width="5" height="5" fill="black" />
                <rect x="40" y="30" width="20" height="20" fill="black" />
                <rect x="70" y="25" width="5" height="5" fill="black" />
              </svg>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">QR Code</h4>
              <p className="text-sm text-gray-600">Members can generate their QR Code on their mobile application.</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <p className="text-sm text-emerald-800"><strong>If toggled:</strong> QR User can scan member's attendance</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-700"><strong>If Not Toggled:</strong> Geofencing is the only mode of attendance.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MemberStatusTab({ members }) {
  const activeMembers = members.filter((m) => m.status === "Active");
  const inactiveMembers = members.filter((m) => m.status === "Inactive");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Active Members</h3>
          <p className="text-3xl font-bold text-gray-900">{activeMembers.length}</p>
        </div>
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Inactive Members</h3>
          <p className="text-3xl font-bold text-gray-900">{inactiveMembers.length}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Last Attendance</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-900">{member.name}</td>
                <td className="px-4 py-3 text-gray-600">{member.last_attendance}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs ${member.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                    {member.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportsTab({ dateRange, setDateRange }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
          <input
            type="date"
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
            placeholder="Select start date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
          <input
            type="date"
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
            placeholder="Select end date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
          />
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Records</h3>
        <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-lg p-12 text-center">
          <div className="text-red-400 text-9xl font-bold mb-4" style={{ fontFamily: 'serif' }}>Aa</div>
          <p className="text-sm text-gray-600 mb-4">Your report is ready for download. Click the button below to download the report.</p>
          <button className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-md hover:bg-emerald-700">
            <Download size={16} />
            Download
          </button>
        </div>
      </div>
    </div>
  );
}

function demoMembers() {
  return [
    { id: 1, name: "Liam Harper", last_attendance: "2023-11-15", attendance_rate: "90%", status: "Active", age_group: "adult" },
    { id: 2, name: "Olivia Bennett", last_attendance: "2023-11-22", attendance_rate: "75%", status: "Active", age_group: "youth" },
    { id: 3, name: "Noah Carter", last_attendance: "2023-10-20", attendance_rate: "50%", status: "Inactive", age_group: "adult" },
    { id: 4, name: "Emma Hayes", last_attendance: "2023-11-29", attendance_rate: "85%", status: "Active", age_group: "senior" },
    { id: 5, name: "Ethan Foster", last_attendance: "2023-10-05", attendance_rate: "30%", status: "Inactive", age_group: "adult" },
  ];
}

function demoMinistries() {
  return [
    { ministry_name: "Worship Team", member_count: 24 },
    { ministry_name: "Youth Ministry", member_count: 45 },
    { ministry_name: "Prayer Group", member_count: 18 },
    { ministry_name: "Outreach Team", member_count: 32 },
    { ministry_name: "Children's Ministry", member_count: 28 },
  ];
}
