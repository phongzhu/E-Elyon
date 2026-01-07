import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { useBranding } from "../../context/BrandingContext";
import { UserPlus, Calendar, QrCode, RefreshCcw, X, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function AccountManagement() {
  const { branding } = useBranding();
  const navigate = useNavigate();

  const primary = branding?.primary_color || "#0f172a";
  const secondary = branding?.secondary_color || "#9C0808";
  const tertiary = branding?.tertiary_color || "#3b82f6";
  const text = branding?.tertiary_text_color || "#ffffff";

  const branches = ["Vizal Pampanga", "Sampaloc", "San Roque", "Cavite", "Talacsan"];

  const [activeTab, setActiveTab] = useState("list");
  const [users, setUsers] = useState([
    { user_id: 1, email: "admin@e-elyon.com", role: "ADMIN", is_active: true, created_at: "2024-01-15T08:30:00", access_start: null, access_end: null },
    { user_id: 2, email: "bishop@e-elyon.com", role: "BISHOP", is_active: true, created_at: "2024-02-10T09:00:00", access_start: "2024-02-10", access_end: "2025-12-31" },
    { user_id: 3, email: "finance@e-elyon.com", role: "FINANCE", is_active: true, created_at: "2024-03-05T10:15:00", access_start: "2024-03-05", access_end: "2025-12-31" },
    { user_id: 4, email: "ceo@e-elyon.com", role: "CEO", is_active: true, created_at: "2024-01-20T07:45:00", access_start: "2024-01-20", access_end: "2026-01-20" },
    { user_id: 5, email: "staff1@e-elyon.com", role: "STAFF", is_active: true, created_at: "2024-04-12T11:30:00", access_start: "2024-04-12", access_end: "2025-04-12" },
    { user_id: 6, email: "staff2@e-elyon.com", role: "STAFF", is_active: true, created_at: "2024-05-18T14:20:00", access_start: "2024-05-18", access_end: "2025-05-18" },
    { user_id: 7, email: "bishop2@e-elyon.com", role: "BISHOP", is_active: true, created_at: "2024-06-22T09:45:00", access_start: "2024-06-22", access_end: "2025-12-31" },
    { user_id: 8, email: "finance2@e-elyon.com", role: "FINANCE", is_active: false, created_at: "2024-03-15T13:00:00", access_start: "2024-03-15", access_end: "2024-12-31" },
    { user_id: 9, email: "staff3@e-elyon.com", role: "STAFF", is_active: true, created_at: "2024-07-08T10:10:00", access_start: "2024-07-08", access_end: "2025-07-08" },
    { user_id: 10, email: "admin2@e-elyon.com", role: "ADMIN", is_active: true, created_at: "2024-08-01T08:00:00", access_start: null, access_end: null }
  ]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [members, setMembers] = useState([
    { user_details_id: 1, first_name: "John", middle_name: "Paul", last_name: "Santos", suffix: "", contact_number: "09171234567", baptismal_date: "2020-05-15", users: [{ email: "john.santos@gmail.com" }] },
    { user_details_id: 2, first_name: "Maria", middle_name: "Clara", last_name: "Reyes", suffix: "", contact_number: "09181234568", baptismal_date: "2019-08-20", users: [{ email: "maria.reyes@gmail.com" }] },
    { user_details_id: 3, first_name: "Robert", middle_name: "James", last_name: "Cruz", suffix: "Jr.", contact_number: "09191234569", baptismal_date: "2021-03-10", users: [{ email: "robert.cruz@gmail.com" }] },
    { user_details_id: 4, first_name: "Ana", middle_name: "Marie", last_name: "Garcia", suffix: "", contact_number: "09201234570", baptismal_date: "2018-12-25", users: [{ email: "ana.garcia@gmail.com" }] },
    { user_details_id: 5, first_name: "Michael", middle_name: "Angelo", last_name: "Dela Cruz", suffix: "", contact_number: "09211234571", baptismal_date: "2022-01-30", users: [{ email: "michael.delacruz@gmail.com" }] }
  ]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCreatedAccount, setQrCreatedAccount] = useState(null);

  // Form state for Add with Access Dates
  const [form, setForm] = useState({
    role: "STAFF",
    access_start: "",
    access_end: "",
  });

  // Form state for QR Account
  const [qrForm, setQrForm] = useState({
    email: "",
    branch: "Vizal Pampanga"
  });

  useEffect(() => {
    // Using placeholder data - no need to fetch
  }, [activeTab]);

  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleQrChange = (e) => setQrForm({ ...qrForm, [e.target.name]: e.target.value });

  const handleAddWithAccessDates = () => {
    if (!selectedMember) {
      setErr("Please select a member first.");
      return;
    }
    if (!form.access_start || !form.access_end) {
      setErr("Please provide both access start and end dates.");
      return;
    }

    setLoading(true);
    setErr("");

    // Simulate adding account (placeholder)
    setTimeout(() => {
      const baseEmail = selectedMember.users[0]?.email || "";
      const newEmail = `${baseEmail.split('@')[0]}.${form.role.toLowerCase()}@e-elyon.com`;
      const newUser = {
        user_id: users.length + 1,
        email: newEmail,
        role: form.role,
        is_active: true,
        created_at: new Date().toISOString(),
        access_start: form.access_start,
        access_end: form.access_end
      };

      setUsers([newUser, ...users]);
      setSelectedMember(null);
      setForm({ role: "STAFF", access_start: "", access_end: "" });
      setLoading(false);
      setActiveTab("list");
    }, 1000);
  };

  const handleCreateQrAccount = (e) => {
    e.preventDefault();
    
    if (!qrForm.email || !qrForm.branch) {
      setErr("Please fill in all fields.");
      return;
    }

    setErr("");
    setLoading(true);

    // Simulate account creation (placeholder)
    setTimeout(() => {
      const generatedPassword = `QR${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
      const newQrAccount = {
        email: qrForm.email,
        password: generatedPassword,
        branch: qrForm.branch,
        createdAt: new Date().toISOString()
      };

      setQrCreatedAccount(newQrAccount);
      setShowQrModal(true);
      setQrForm({ email: "", branch: "Vizal Pampanga" });
      setLoading(false);
    }, 1000);
  };

  const closeQrModal = () => {
    setShowQrModal(false);
    setQrCreatedAccount(null);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />

        <main className="p-8">
          <div className="max-w-8xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Account Management</h1>
                <p className="text-sm text-gray-600">Manage users and member accounts</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setUsers([...users])}
                  className="flex items-center gap-2 px-3 py-2 rounded-md bg-white/5"
                  style={{ border: `1px solid ${tertiary}` }}
                >
                  <RefreshCcw /> Refresh
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="mb-6">
              <div className="flex gap-2">
                <button
                  onClick={() => handleTabClick("list")}
                  className={`px-4 py-2 rounded-md font-medium ${activeTab === "list" ? "bg-white/10" : "bg-transparent"}`}
                >
                  Account List
                </button>
                <button
                  onClick={() => handleTabClick("add-dates")}
                  className={`px-4 py-2 rounded-md font-medium ${activeTab === "add-dates" ? "bg-white/10" : "bg-transparent"}`}
                >
                  Add User (Access Dates)
                </button>
                <button
                  onClick={() => handleTabClick("qr")}
                  className={`px-4 py-2 rounded-md font-medium ${activeTab === "qr" ? "bg-white/10" : "bg-transparent"}`}
                >
                  QR Account
                </button>
              </div>
            </div>

            {/* Content */}
            <div>
              {err && <div className="mb-4 text-red-600">{err}</div>}

              {activeTab === "list" && (
                <div>
                  {loading ? (
                    <div>Loading accounts…</div>
                  ) : (
                    <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-xs uppercase text-gray-700">
                          <tr>
                            <th className="px-4 py-3">Email</th>
                            <th className="px-4 py-3">Role</th>
                            <th className="px-4 py-3">Active</th>
                            <th className="px-4 py-3">Access Start</th>
                            <th className="px-4 py-3">Access End</th>
                            <th className="px-4 py-3">Created</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-6 text-center text-gray-500">No accounts found.</td>
                            </tr>
                          ) : (
                            users.map((u) => (
                              <tr key={u.user_id} className="border-t hover:bg-gray-50">
                                <td className="px-4 py-3">{u.email}</td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                    u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                                    u.role === 'BISHOP' ? 'bg-blue-100 text-blue-700' :
                                    u.role === 'CEO' ? 'bg-green-100 text-green-700' :
                                    u.role === 'FINANCE' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {u.role}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {u.is_active ? "Active" : "Inactive"}
                                  </span>
                                </td>
                                <td className="px-4 py-3">{u.access_start || "-"}</td>
                                <td className="px-4 py-3">{u.access_end || "-"}</td>
                                <td className="px-4 py-3">{u.created_at ? new Date(u.created_at).toLocaleString() : "-"}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "add-dates" && (
                <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Add User Account with Access Dates</h3>
                    <p className="text-sm text-gray-600">Select a baptized member (full-fledged church member) to grant system access</p>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Search Baptized Members</label>
                    <input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by name or email"
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-200"
                    />
                  </div>

                  <div className="mb-6 max-h-64 overflow-auto border rounded-lg">
                    {membersLoading ? (
                      <div className="p-6 text-center">Loading members…</div>
                    ) : members.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">No baptized members found.</div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-600 sticky top-0">
                          <tr>
                            <th className="px-4 py-3 text-left">Name</th>
                            <th className="px-4 py-3 text-left">Email</th>
                            <th className="px-4 py-3 text-left">Baptismal Date</th>
                            <th className="px-4 py-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {members
                            .filter((m) => {
                              const q = searchTerm.toLowerCase();
                              const name = `${m.first_name || ""} ${m.middle_name || ""} ${m.last_name || ""}`.toLowerCase();
                              const email = (m.users?.[0]?.email || "").toLowerCase();
                              return name.includes(q) || email.includes(q);
                            })
                            .map((m) => (
                              <tr key={m.user_details_id} className="border-t hover:bg-gray-50">
                                <td className="px-4 py-3">{`${m.first_name || ""} ${m.middle_name || ""} ${m.last_name || ""} ${m.suffix || ""}`.trim()}</td>
                                <td className="px-4 py-3">{m.users?.[0]?.email || "-"}</td>
                                <td className="px-4 py-3">{m.baptismal_date ? new Date(m.baptismal_date).toLocaleDateString() : "-"}</td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() => setSelectedMember(m)}
                                    className="px-3 py-1 rounded-lg text-white text-sm font-medium transition-all hover:scale-105"
                                    style={{ backgroundColor: primary }}
                                  >
                                    Select
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <div className="border-t pt-6">
                    <h4 className="font-semibold text-lg mb-4">Selected Member & Account Details</h4>
                    {selectedMember ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
                            <div className="p-3 border rounded-lg bg-gray-50">{`${selectedMember.first_name} ${selectedMember.middle_name || ""} ${selectedMember.last_name} ${selectedMember.suffix || ""}`.trim()}</div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Contact Number</label>
                            <div className="p-3 border rounded-lg bg-gray-50">{selectedMember.contact_number || "-"}</div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Baptismal Date</label>
                            <div className="p-3 border rounded-lg bg-gray-50">{selectedMember.baptismal_date ? new Date(selectedMember.baptismal_date).toLocaleDateString() : "-"}</div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                            <div className="p-3 border rounded-lg bg-gray-50">{selectedMember.users?.[0]?.email || "-"}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                          <div>
                            <label className="block text-sm font-medium mb-2">Select Role *</label>
                            <select
                              name="role"
                              value={form.role}
                              onChange={handleChange}
                              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-200"
                            >
                              <option value="BISHOP">Bishop</option>
                              <option value="CEO">CEO</option>
                              <option value="FINANCE">Finance</option>
                              <option value="ADMIN">Admin</option>
                              <option value="STAFF">Staff</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Access Start Date *</label>
                            <input
                              type="date"
                              name="access_start"
                              value={form.access_start}
                              onChange={handleChange}
                              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-200"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Access End Date *</label>
                            <input
                              type="date"
                              name="access_end"
                              value={form.access_end}
                              onChange={handleChange}
                              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-200"
                            />
                          </div>
                        </div>

                        <div className="flex gap-3 justify-end mt-6">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMember(null);
                              setForm({ role: "STAFF", access_start: "", access_end: "" });
                            }}
                            className="px-6 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium"
                          >
                            Clear
                          </button>
                          <button
                            onClick={handleAddWithAccessDates}
                            disabled={loading}
                            className="px-6 py-2 rounded-lg text-white font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ backgroundColor: primary }}
                          >
                            {loading ? "Creating..." : "Create Account"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-gray-500 border-2 border-dashed rounded-lg">
                        No member selected. Please select a baptized member from the table above.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "qr" && (
                <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Create QR Account for Attendance</h3>
                    <p className="text-sm text-gray-600">Generate QR accounts for church members to track attendance</p>
                  </div>

                  <form onSubmit={handleCreateQrAccount} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Email Address *</label>
                      <input
                        type="email"
                        name="email"
                        value={qrForm.email}
                        onChange={handleQrChange}
                        placeholder="member@example.com"
                        required
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Select Branch *</label>
                      <select
                        name="branch"
                        value={qrForm.branch}
                        onChange={handleQrChange}
                        required
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-200"
                      >
                        {branches.map((branch) => (
                          <option key={branch} value={branch}>{branch}</option>
                        ))}
                      </select>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                      <strong>Note:</strong> A temporary password will be generated for this account. The user can change it after their first login.
                    </div>

                    <div className="flex gap-3 justify-end pt-4">
                      <button
                        type="button"
                        onClick={() => setQrForm({ email: "", branch: "Vizal Pampanga" })}
                        className="px-6 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium"
                      >
                        Reset
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 rounded-lg text-white font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ backgroundColor: secondary }}
                      >
                        {loading ? "Creating..." : "Create QR Account"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* QR Account Success Modal */}
              {showQrModal && qrCreatedAccount && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-full bg-green-100">
                          <CheckCircle size={24} className="text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800">QR Account Created!</h3>
                      </div>
                      <button
                        onClick={closeQrModal}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <X size={24} />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <p className="text-sm text-gray-600 mb-3">Account successfully created for attendance tracking:</p>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
                            <div className="p-2 bg-white rounded border text-sm font-mono">
                              {qrCreatedAccount.email}
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Temporary Password</label>
                            <div className="p-2 bg-white rounded border text-sm font-mono">
                              {qrCreatedAccount.password}
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Branch</label>
                            <div className="p-2 bg-white rounded border text-sm">
                              {qrCreatedAccount.branch}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                        <strong>Important:</strong> Please save these credentials. The password is only shown once for security.
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={closeQrModal}
                        className="px-6 py-2 rounded-lg font-medium text-white transition-all hover:scale-105"
                        style={{ backgroundColor: primary }}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
