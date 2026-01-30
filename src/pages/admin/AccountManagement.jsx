import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { useBranding } from "../../context/BrandingContext";
import {
  RefreshCcw,
  X,
  CheckCircle,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function AccountManagement() {
  const { branding } = useBranding();
  const navigate = useNavigate();

  const primary = branding?.primary_color || "#0f172a";
  const secondary = branding?.secondary_color || "#9C0808";
  const tertiary = branding?.tertiary_color || "#3b82f6";

  // =========================
  // Helpers
  // =========================
  const stripMemberSuffixEmail = (email = "") => {
    if (!email) return "";
    return String(email)
      .replace(/_member(?=@)/gi, "")
      .replace(/_member$/gi, "")
      .trim();
  };

  const fmtDate = (val) => {
    if (!val) return "-";
    const d = new Date(val);
    return isNaN(d.getTime()) ? "-" : d.toLocaleString();
  };

  const fmtDateOnly = (val) => {
    if (!val) return "-";
    const d = new Date(val);
    return isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
  };

  const PROFILE_BUCKET = "profiles"; // change if different bucket

  const getPublicImageUrl = (photo_path) => {
    if (!photo_path) return null;
    if (/^https?:\/\//i.test(photo_path)) return photo_path;
    const { data } = supabase.storage
      .from(PROFILE_BUCKET)
      .getPublicUrl(photo_path);
    return data?.publicUrl || null;
  };

  const safeFullName = (d) =>
    [d?.first_name, d?.middle_name, d?.last_name, d?.suffix]
      .filter(Boolean)
      .join(" ")
      .trim();

  // ✅ Default profile pic (ONLY used in Account List + member list image fallback)
  const DEFAULT_PROFILE_IMG =
    "https://ui-avatars.com/api/?name=User&background=e5e7eb&color=111827&rounded=true&size=80";

  // =========================
  // State
  // =========================
  const [activeTab, setActiveTab] = useState("list");

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // QR_MEMBER singleton
  const [qrMemberAccount, setQrMemberAccount] = useState(null);
  const [qrMemberLoading, setQrMemberLoading] = useState(false);

  // QR create form
  const [qrForm, setQrForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [qrSaving, setQrSaving] = useState(false);
  const [showQrPwd, setShowQrPwd] = useState(false);
  const [showQrConfirmPwd, setShowQrConfirmPwd] = useState(false);

  const [err, setErr] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);

  const [form, setForm] = useState({
    role: "STAFF",
    access_start: "",
    access_end: "",
  });
  const [creatingUser, setCreatingUser] = useState(false);

  // modal: change password
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdTarget, setPwdTarget] = useState(null);
  const [pwdForm, setPwdForm] = useState({ password: "", confirmPassword: "" });
  const [pwdSaving, setPwdSaving] = useState(false);

  // show/hide password (modal)
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  // confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState(
    "Password updated successfully!"
  );

  // ✅ row-level status update loading (Account List only)
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  // =========================
  // Fetch Users (Account List)
  // =========================
  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      setErr("");

      const { data, error } = await supabase
        .from("users")
        .select(
          `
          user_id,
          user_details_id,
          auth_user_id,
          email,
          role,
          access_start,
          access_end,
          is_active,
          created_at,
          user_details:users_details (
            user_details_id,
            first_name,
            middle_name,
            last_name,
            suffix,
            photo_path,
            branch_id,
            branch:branches ( branch_id, name )
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((u) => {
        const d = u.user_details || null;
        return {
          ...u,
          display_email: stripMemberSuffixEmail(u.email),
          full_name: safeFullName(d),
          photo_url: d?.photo_path ? getPublicImageUrl(d.photo_path) : null,
          branch_name: d?.branch?.name || "-",
        };
      });

      setUsers(mapped);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load users.");
    } finally {
      setUsersLoading(false);
    }
  };

  // ✅ Update user status Active/Inactive (Account List only)
  const handleToggleUserStatus = async (userRow) => {
    try {
      setErr("");
      setStatusUpdatingId(userRow.user_id);

      const nextActive = !userRow.is_active;

      const { error } = await supabase
        .from("users")
        .update({ is_active: nextActive })
        .eq("user_id", userRow.user_id);

      if (error) throw error;

      // update UI instantly
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === userRow.user_id ? { ...u, is_active: nextActive } : u
        )
      );

      setConfirmMessage(
        `User has been set to ${nextActive ? "Active" : "Inactive"}.`
      );
      setShowConfirmModal(true);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to update user status.");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // =========================
  // Fetch Members (Add User)
  // =========================
  const fetchMembers = async () => {
    try {
      setMembersLoading(true);
      setErr("");

      const { data, error } = await supabase
        .from("users_details")
        .select(
          `
          user_details_id,
          branch_id,
          photo_path,
          first_name,
          middle_name,
          last_name,
          suffix,
          contact_number,
          baptismal_date,
          branch:branches ( branch_id, name ),
          accounts:users (
            user_id,
            auth_user_id,
            email,
            role,
            is_active,
            access_start,
            access_end,
            created_at
          )
        `
        )
        .not("baptismal_date", "is", null)
        .order("last_name", { ascending: true });

      if (error) throw error;

      const mapped = (data || []).map((m) => {
        const accounts = m.accounts || [];
        const preferred =
          accounts.find(
            (a) => /_member(?=@)/i.test(a.email) || /_member$/i.test(a.email)
          ) || accounts[0];

        return {
          ...m,
          accounts,
          photo_url: m.photo_path ? getPublicImageUrl(m.photo_path) : null,
          branch_name: m.branch?.name || "-",
          member_email: preferred?.email || "",
          display_member_email: stripMemberSuffixEmail(preferred?.email || ""),
            preferred_auth_user_id: preferred?.auth_user_id || null,
          full_name: safeFullName(m),
          has_accounts_count: accounts.length,
        };
      });

      setMembers(mapped);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load members.");
    } finally {
      setMembersLoading(false);
    }
  };

  // =========================
  // Fetch QR_MEMBER singleton
  // =========================
  const fetchQrMember = async () => {
    try {
      setQrMemberLoading(true);
      setErr("");

      const { data, error } = await supabase
        .from("users")
        .select("user_id, auth_user_id, email, role, is_active, created_at")
        .eq("role", "QR_MEMBER")
        .limit(1);

      if (error) throw error;

      const row = (data || [])[0] || null;
      setQrMemberAccount(
        row ? { ...row, display_email: stripMemberSuffixEmail(row.email) } : null
      );

      // if exists, clear form
      if (row) {
        setQrForm({ email: "", password: "", confirmPassword: "" });
        setShowQrPwd(false);
        setShowQrConfirmPwd(false);
      }
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load QR member account.");
    } finally {
      setQrMemberLoading(false);
    }
  };

  // =========================
  // Init / tab fetch
  // =========================
  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === "list") fetchUsers();
    if (activeTab === "add-dates") fetchMembers();
    if (activeTab === "qr") fetchQrMember();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleTabClick = (tab) => {
    setErr("");
    setActiveTab(tab);
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleQrChange = (e) =>
    setQrForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  // =========================
  // Create QR_MEMBER (only when none exists)
  // Edge Function: admin-upsert-qr-member
  // =========================
  const handleCreateQrMember = async (e) => {
    e.preventDefault();
    try {
      setErr("");

      if (qrMemberAccount) {
        setErr("QR_MEMBER already exists. Use Change Password instead.");
        return;
      }

      const email = qrForm.email.trim();
      if (!email) return setErr("Email is required.");
      if (!qrForm.password || !qrForm.confirmPassword)
        return setErr("Please fill in both password fields.");
      if (qrForm.password.length < 6)
        return setErr("Password must be at least 6 characters.");
      if (qrForm.password !== qrForm.confirmPassword)
        return setErr("Passwords do not match.");

      setQrSaving(true);

      const { error } = await supabase.functions.invoke(
        "admin-upsert-qr-member",
        {
          body: { email, password: qrForm.password },
        }
      );

      if (error) throw error;

      await fetchQrMember();
      await fetchUsers();

      setConfirmMessage("QR_MEMBER account created successfully!");
      setShowConfirmModal(true);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to create QR_MEMBER. Check Edge Function.");
    } finally {
      setQrSaving(false);
    }
  };

  // =========================
  // Add User (Access Dates) -> insert into public.users
  // NOTE: This does not set auth password (that needs Edge Function)
  // =========================
  const handleAddWithAccessDates = async () => {
    try {
      setErr("");

      if (!selectedMember) {
        setErr("Please select a member first.");
        return;
      }
      if (!form.access_start || !form.access_end) {
        setErr("Please provide both access start and end dates.");
        return;
      }

      const baseEmail = stripMemberSuffixEmail(
        selectedMember.display_member_email
      );
      if (!baseEmail) {
        setErr("Selected member has no email.");
        return;
      }

      if (!selectedMember.preferred_auth_user_id) {
        setErr("Selected member has no auth_user_id (no Auth account linked).");
        return;
      }


      setCreatingUser(true);

      // create user record for system access
      const { error } = await supabase.from("users").insert({
        user_details_id: selectedMember.user_details_id,
        email: baseEmail, // ✅ no _member stored
        role: form.role,
        access_start: new Date(form.access_start).toISOString(),
        access_end: new Date(form.access_end).toISOString(),
        is_active: true,
          auth_user_id: selectedMember.preferred_auth_user_id || null,
      });

      if (error) throw error;

      setSelectedMember(null);
      setForm({ role: "STAFF", access_start: "", access_end: "" });

      setConfirmMessage("User account record created successfully!");
      setShowConfirmModal(true);

      // refresh list
      await fetchUsers();
      setActiveTab("list");
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to create user account.");
    } finally {
      setCreatingUser(false);
    }
  };

  // =========================
  // Change password modal
  // =========================
  const openPwdModal = (userRow) => {
    setErr("");
    setPwdTarget(userRow);
    setPwdForm({ password: "", confirmPassword: "" });
    setShowPwd(false);
    setShowConfirmPwd(false);
    setShowPwdModal(true);
  };

  const closePwdModal = () => {
    setShowPwdModal(false);
    setPwdTarget(null);
  };

  // =========================
  // Save password (Edge Function: admin-set-user-password)
  // =========================
  const handleSavePassword = async () => {
    try {
      setErr("");

      if (!pwdTarget?.auth_user_id) {
        setErr("This account has no auth_user_id linked yet.");
        return;
      }
      if (!pwdForm.password || !pwdForm.confirmPassword) {
        setErr("Please fill in both password fields.");
        return;
      }
      if (pwdForm.password.length < 6) {
        setErr("Password must be at least 6 characters.");
        return;
      }
      if (pwdForm.password !== pwdForm.confirmPassword) {
        setErr("Passwords do not match.");
        return;
      }

      setPwdSaving(true);

      const { error } = await supabase.functions.invoke(
        "admin-set-user-password",
        {
          body: {
            auth_user_id: pwdTarget.auth_user_id,
            password: pwdForm.password,
          },
        }
      );

      if (error) throw error;

      closePwdModal();

      setConfirmMessage("Password updated successfully!");
      setShowConfirmModal(true);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to update password. Check Edge Function.");
    } finally {
      setPwdSaving(false);
    }
  };

  const filteredMembers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const name = (m.full_name || "").toLowerCase();
      const email = (m.display_member_email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [members, searchTerm]);

  // =========================
  // Render
  // =========================
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
                <p className="text-sm text-gray-600">
                  Manage users and member accounts
                </p>
              </div>

              <button
                onClick={() => {
                  if (activeTab === "list") fetchUsers();
                  if (activeTab === "add-dates") fetchMembers();
                  if (activeTab === "qr") fetchQrMember();
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-md bg-white/5"
                style={{ border: `1px solid ${tertiary}` }}
              >
                <RefreshCcw /> Refresh
              </button>
            </div>

            {/* Tabs */}
            <div className="mb-6">
              <div className="flex gap-2">
                <button
                  onClick={() => handleTabClick("list")}
                  className={`px-4 py-2 rounded-md font-medium ${
                    activeTab === "list" ? "bg-white/10" : "bg-transparent"
                  }`}
                >
                  Account List
                </button>
                <button
                  onClick={() => handleTabClick("add-dates")}
                  className={`px-4 py-2 rounded-md font-medium ${
                    activeTab === "add-dates" ? "bg-white/10" : "bg-transparent"
                  }`}
                >
                  Add User (Access Dates)
                </button>
                <button
                  onClick={() => handleTabClick("qr")}
                  className={`px-4 py-2 rounded-md font-medium ${
                    activeTab === "qr" ? "bg-white/10" : "bg-transparent"
                  }`}
                >
                  QR Member (Single Account)
                </button>
              </div>
            </div>

            {err && <div className="mb-4 text-red-600">{err}</div>}

            {/* =======================
                ACCOUNT LIST TAB (✅ ONLY CHANGED THIS TAB)
               ======================= */}
            {activeTab === "list" && (
              <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                {usersLoading ? (
                  <div className="p-6 text-sm text-gray-600">
                    Loading accounts…
                  </div>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-xs uppercase text-gray-700">
                      <tr>
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Branch</th>
                        <th className="px-4 py-3">Active</th>
                        <th className="px-4 py-3">Access Start</th>
                        <th className="px-4 py-3">Access End</th>
                        <th className="px-4 py-3">Created</th>
                        <th className="px-4 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 ? (
                        <tr>
                          <td
                            colSpan={9}
                            className="px-4 py-6 text-center text-gray-500"
                          >
                            No accounts found.
                          </td>
                        </tr>
                      ) : (
                        users.map((u) => (
                          <tr
                            key={u.user_id}
                            className="border-t hover:bg-gray-50"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {/* ✅ default profile pic if no photo */}
                                <img
                                  src={u.photo_url || DEFAULT_PROFILE_IMG}
                                  alt="profile"
                                  className="w-10 h-10 rounded-full object-cover border"
                                />
                                <div className="leading-tight">
                                  <div className="font-semibold text-gray-800">
                                    {u.full_name || "-"}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    ID: {u.user_id}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">{u.display_email}</td>
                            <td className="px-4 py-3">{u.role}</td>
                            <td className="px-4 py-3">{u.branch_name}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 rounded text-xs font-semibold ${
                                  u.is_active
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {u.is_active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {fmtDateOnly(u.access_start)}
                            </td>
                            <td className="px-4 py-3">
                              {fmtDateOnly(u.access_end)}
                            </td>
                            <td className="px-4 py-3">
                              {fmtDate(u.created_at)}
                            </td>

                            {/* ✅ Action: toggle active/inactive (no password changes) */}
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border text-xs font-medium transition disabled:opacity-60 disabled:cursor-not-allowed ${
                                  u.is_active
                                    ? "bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                                    : "bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                                }`}
                                onClick={() => handleToggleUserStatus(u)}
                                disabled={statusUpdatingId === u.user_id}
                                title={u.is_active ? "Set Inactive" : "Set Active"}
                              >
                                {statusUpdatingId === u.user_id
                                  ? "Updating..."
                                  : u.is_active
                                  ? "Set Inactive"
                                  : "Set Active"}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* =======================
                ADD USER (ACCESS DATES)
               ======================= */}
            {activeTab === "add-dates" && (
              <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">
                    Add User Account with Access Dates
                  </h3>
                  <p className="text-sm text-gray-600">
                    Select a baptized member (from <code>users_details</code>)
                    and create a system account in <code>users</code>.
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Search Baptized Members
                  </label>
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name or email"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div className="mb-6 max-h-72 overflow-auto border rounded-lg">
                  {membersLoading ? (
                    <div className="p-6 text-center text-gray-600">
                      Loading members…
                    </div>
                  ) : filteredMembers.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      No baptized members found.
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-600 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left">Member</th>
                          <th className="px-4 py-3 text-left">Email</th>
                          <th className="px-4 py-3 text-left">Branch</th>
                          <th className="px-4 py-3 text-left">
                            Baptismal Date
                          </th>
                          <th className="px-4 py-3 text-center">
                            Has Account(s)
                          </th>
                          <th className="px-4 py-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMembers.map((m) => (
                          <tr
                            key={m.user_details_id}
                            className="border-t hover:bg-gray-50"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <img
                                  src={m.photo_url || "https://via.placeholder.com/36"}
                                  alt="profile"
                                  className="w-9 h-9 rounded-full object-cover border"
                                />
                                <div className="font-medium">{m.full_name}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {m.display_member_email || "-"}
                            </td>
                            <td className="px-4 py-3">{m.branch_name}</td>
                            <td className="px-4 py-3">
                              {fmtDateOnly(m.baptismal_date)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {m.has_accounts_count}
                            </td>
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
                  <h4 className="font-semibold text-lg mb-4">
                    Selected Member & Account Details
                  </h4>

                  {selectedMember ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Full Name
                          </label>
                          <div className="p-3 border rounded-lg bg-gray-50">
                            {selectedMember.full_name}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Contact Number
                          </label>
                          <div className="p-3 border rounded-lg bg-gray-50">
                            {selectedMember.contact_number || "-"}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Baptismal Date
                          </label>
                          <div className="p-3 border rounded-lg bg-gray-50">
                            {fmtDateOnly(selectedMember.baptismal_date)}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Member Email
                          </label>
                          <div className="p-3 border rounded-lg bg-gray-50">
                            {selectedMember.display_member_email || "-"}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Select Role *
                          </label>
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
                          <label className="block text-sm font-medium mb-2">
                            Access Start Date *
                          </label>
                          <input
                            type="date"
                            name="access_start"
                            value={form.access_start}
                            onChange={handleChange}
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-200"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Access End Date *
                          </label>
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
                            setForm({
                              role: "STAFF",
                              access_start: "",
                              access_end: "",
                            });
                          }}
                          className="px-6 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium"
                        >
                          Clear
                        </button>
                        <button
                          onClick={handleAddWithAccessDates}
                          disabled={creatingUser}
                          className="px-6 py-2 rounded-lg text-white font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ backgroundColor: primary }}
                        >
                          {creatingUser ? "Creating..." : "Create Account"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500 border-2 border-dashed rounded-lg">
                      No member selected. Please select a baptized member from
                      the table above.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* =======================
                QR TAB (unchanged)
               ======================= */}
            {activeTab === "qr" && (
              <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">
                    QR Member (Single Account for ALL Branches)
                  </h3>
                  <p className="text-sm text-gray-600">
                    Only <strong>ONE</strong> account is allowed with role{" "}
                    <code>QR_MEMBER</code>.
                  </p>
                </div>

                <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="text-sm font-semibold text-gray-700 mb-1">
                    Current QR_MEMBER
                  </div>

                  {qrMemberLoading ? (
                    <div className="text-sm text-gray-600">Loading…</div>
                  ) : qrMemberAccount ? (
                    <div className="text-sm text-gray-700">
                      <div>
                        <span className="font-medium">Email:</span>{" "}
                        {qrMemberAccount.display_email}
                      </div>
                      <div>
                        <span className="font-medium">Created:</span>{" "}
                        {fmtDate(qrMemberAccount.created_at)}
                      </div>

                      <div className="mt-3">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-white text-sm font-medium hover:bg-gray-50"
                          onClick={() => openPwdModal(qrMemberAccount)}
                          disabled={!qrMemberAccount.auth_user_id}
                          title={
                            !qrMemberAccount.auth_user_id
                              ? "No auth_user_id linked yet"
                              : "Change password"
                          }
                        >
                          <KeyRound size={16} /> Change Password
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600">
                      No QR_MEMBER account yet.
                    </div>
                  )}
                </div>

                {/* ✅ If QR_MEMBER EXISTS -> hide create fields */}
                {qrMemberAccount ? (
                  <div className="text-sm text-gray-600">
                    QR_MEMBER already exists. Use{" "}
                    <strong>Change Password</strong> to update credentials.
                  </div>
                ) : (
                  <form onSubmit={handleCreateQrMember} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={qrForm.email}
                        onChange={handleQrChange}
                        placeholder="qr@yourdomain.com"
                        required
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-200"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Password *
                        </label>
                        <div className="relative">
                          <input
                            type={showQrPwd ? "text" : "password"}
                            name="password"
                            value={qrForm.password}
                            onChange={handleQrChange}
                            placeholder="Enter password"
                            required
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-200 pr-10"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            onClick={() => setShowQrPwd((v) => !v)}
                          >
                            {showQrPwd ? (
                              <EyeOff size={18} />
                            ) : (
                              <Eye size={18} />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Confirm Password *
                        </label>
                        <div className="relative">
                          <input
                            type={showQrConfirmPwd ? "text" : "password"}
                            name="confirmPassword"
                            value={qrForm.confirmPassword}
                            onChange={handleQrChange}
                            placeholder="Confirm password"
                            required
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-200 pr-10"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            onClick={() => setShowQrConfirmPwd((v) => !v)}
                          >
                            {showQrConfirmPwd ? (
                              <EyeOff size={18} />
                            ) : (
                              <Eye size={18} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setQrForm({
                            email: "",
                            password: "",
                            confirmPassword: "",
                          });
                          setShowQrPwd(false);
                          setShowQrConfirmPwd(false);
                        }}
                        className="px-6 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium"
                      >
                        Reset
                      </button>
                      <button
                        type="submit"
                        disabled={qrSaving}
                        className="px-6 py-2 rounded-lg text-white font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ backgroundColor: secondary }}
                      >
                        {qrSaving ? "Creating..." : "Create QR_MEMBER"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Change Password Modal */}
            {showPwdModal && pwdTarget && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-full bg-blue-100">
                        <KeyRound size={22} className="text-blue-700" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-800">
                        Change Password
                      </h3>
                    </div>
                    <button
                      onClick={closePwdModal}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <div className="mb-4 text-sm text-gray-700">
                    <div className="font-semibold">Account</div>
                    <div className="font-mono">
                      {stripMemberSuffixEmail(pwdTarget.email)}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        New Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showPwd ? "text" : "password"}
                          value={pwdForm.password}
                          onChange={(e) =>
                            setPwdForm((p) => ({
                              ...p,
                              password: e.target.value,
                            }))
                          }
                          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-200 pr-10"
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          onClick={() => setShowPwd((v) => !v)}
                        >
                          {showPwd ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Confirm New Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPwd ? "text" : "password"}
                          value={pwdForm.confirmPassword}
                          onChange={(e) =>
                            setPwdForm((p) => ({
                              ...p,
                              confirmPassword: e.target.value,
                            }))
                          }
                          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-200 pr-10"
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          onClick={() => setShowConfirmPwd((v) => !v)}
                        >
                          {showConfirmPwd ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={closePwdModal}
                      className="px-6 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSavePassword}
                      disabled={pwdSaving}
                      className="px-6 py-2 rounded-lg text-white font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: primary }}
                    >
                      {pwdSaving ? "Saving..." : "Save Password"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Confirmation Modal */}
            {showConfirmModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-full bg-green-100">
                        <CheckCircle size={24} className="text-green-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-800">
                        Success
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowConfirmModal(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <p className="text-sm text-gray-700">{confirmMessage}</p>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => setShowConfirmModal(false)}
                      className="px-6 py-2 rounded-lg font-medium text-white transition-all hover:scale-105"
                      style={{ backgroundColor: primary }}
                    >
                      OK
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
