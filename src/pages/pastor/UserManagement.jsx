// src/pages/Pastor/UserManagement.jsx
import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { supabase } from "../../lib/supabaseClient";
import { Eye, CheckCircle2, Info, X, User } from "lucide-react";

export default function PastorUserManagement() {
  // =========================
  // State
  // =========================
  const [err, setErr] = useState("");

  const [pastorCtx, setPastorCtx] = useState({
    auth_user_id: null,
    user_id: null,
    user_details_id: null,
    branch_id: null,
    branch_name: "",
    email: "",
    full_name: "",
  });

  const [mainTab, setMainTab] = useState("add-user"); // add-user | members

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

  const safeFullName = (d) =>
    [d?.first_name, d?.middle_name, d?.last_name, d?.suffix]
      .filter(Boolean)
      .join(" ")
      .trim();

  const fmtDateOnly = (val) => {
    if (!val) return "-";
    const d = new Date(val);
    return isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
  };

  const fmtDateTime = (val) => {
    if (!val) return "-";
    const d = new Date(val);
    return isNaN(d.getTime()) ? "-" : d.toLocaleString();
  };

  const PROFILE_BUCKET = "profiles"; // change if needed
  const getPublicImageUrl = (photo_path) => {
    if (!photo_path) return null;
    if (/^https?:\/\//i.test(photo_path)) return photo_path;
    const { data } = supabase.storage
      .from(PROFILE_BUCKET)
      .getPublicUrl(photo_path);
    return data?.publicUrl || null;
  };

  const DEFAULT_PROFILE_IMG =
    "https://ui-avatars.com/api/?name=User&background=e5e7eb&color=111827&rounded=true&size=80";

  // ✅ IMPORTANT: This extracts the real JSON error from Edge Functions invoke()
  const readEdgeFunctionError = async (maybeErr) => {
    try {
      // Supabase Functions error usually has: { message, context: { status, ... , json(), text() } }
      const ctx = maybeErr?.context;

      if (ctx?.json) {
        const j = await ctx.json();
        return j?.error || JSON.stringify(j);
      }

      if (ctx?.text) {
        const t = await ctx.text();
        return t;
      }

      return maybeErr?.message || "Edge Function failed (non-2xx).";
    } catch {
      return maybeErr?.message || "Edge Function failed (non-2xx).";
    }
  };

  // =========================
  // Pastor context
  // =========================
  const loadPastorContext = async () => {
    setErr("");

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr) throw authErr;

    const authUser = auth?.user;
    if (!authUser?.id)
      throw new Error("Not authenticated. Please login again.");

    const { data: rows, error: userErr } = await supabase
      .from("users")
      .select(
        `
          user_id,
          email,
          role,
          user_details_id,
          auth_user_id,
          user_details:users_details (
            user_details_id,
            branch_id,
            photo_path,
            first_name,
            middle_name,
            last_name,
            suffix,
            branch:branches ( branch_id, name )
          )
        `
      )
      .eq("auth_user_id", authUser.id);

    if (userErr) throw userErr;
    if (!rows || rows.length === 0) {
      throw new Error("No user record found for this account (users table).");
    }

    const pastorRow =
      rows.find((r) => String(r.role || "").toUpperCase() === "PASTOR") ||
      rows[0];

    if (String(pastorRow.role || "").toUpperCase() !== "PASTOR") {
      throw new Error("Access denied. This page is for Pastor accounts only.");
    }

    const d = pastorRow.user_details || null;
    const branchId = d?.branch_id || null;
    const branchName = d?.branch?.name || "";

    if (!branchId) {
      throw new Error(
        "Your account has no branch assigned yet. Please contact the Bishop to assign your branch."
      );
    }

    setPastorCtx({
      auth_user_id: authUser.id,
      user_id: pastorRow.user_id,
      user_details_id: pastorRow.user_details_id,
      branch_id: branchId,
      branch_name: branchName,
      email: pastorRow.email || "",
      full_name: safeFullName(d) || "Pastor",
    });

    return { branchId, branchName };
  };

  // =========================
  // ADD USER (Pastor)
  // =========================
  const [membersLoading, setMembersLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [eligibleMembers, setEligibleMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);

  const [createForm, setCreateForm] = useState({
    role: "FINANCE",
    access_start: "",
    access_end: "",
  });
  const [creatingUser, setCreatingUser] = useState(false);

  const fetchEligibleMembers = async (branchId, { silent = false } = {}) => {
    try {
      setMembersLoading(true);
      if (!silent) setErr("");

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
        .eq("branch_id", branchId)
        .not("baptismal_date", "is", null)
        .order("last_name", { ascending: true });

      if (error) throw error;

      const mapped = (data || []).map((m) => {
        const accounts = m.accounts || [];
        const preferred =
          accounts.find(
            (a) => /_member(?=@)/i.test(a.email) || /_member$/i.test(a.email)
          ) || accounts[0];

        const isSelf =
          String(m.user_details_id) === String(pastorCtx.user_details_id) ||
          (preferred?.auth_user_id &&
            String(preferred.auth_user_id) === String(pastorCtx.auth_user_id));

        return {
          ...m,
          accounts,
          is_self: isSelf,
          photo_url: m.photo_path ? getPublicImageUrl(m.photo_path) : null,
          branch_name: m.branch?.name || "-",
          full_name: safeFullName(m),
          display_member_email: stripMemberSuffixEmail(preferred?.email || ""),
          preferred_auth_user_id: preferred?.auth_user_id || null,
          has_accounts_count: accounts.length,
        };
      });

      setEligibleMembers(mapped);
    } catch (e) {
      console.error(e);
      if (!silent) setErr(e?.message || "Failed to load baptized members.");
    } finally {
      setMembersLoading(false);
    }
  };

  // ✅ Create account + ✅ Send email
  const handleCreateAccountForMember = async () => {
    try {
      setErr("");

      if (!pastorCtx.branch_id) return setErr("Missing branch assignment.");
      if (!selectedMember) return setErr("Please select a member first.");

      if (selectedMember.is_self) {
        return setErr("You cannot create role access for yourself.");
      }

      if (!createForm.access_start || !createForm.access_end) {
        return setErr("Please provide both access start and end dates.");
      }

      if (String(selectedMember.branch_id) !== String(pastorCtx.branch_id)) {
        return setErr(
          "You can only create accounts for members in your assigned branch."
        );
      }

      const baseEmail = stripMemberSuffixEmail(
        selectedMember.display_member_email
      );
      if (!baseEmail) return setErr("Selected member has no email.");

      if (!selectedMember.preferred_auth_user_id) {
        return setErr(
          "Selected member has no linked Auth account. (auth_user_id missing)"
        );
      }

      setCreatingUser(true);

      // Only allow FINANCE or STAFF roles
      const allowedRole = ["FINANCE", "STAFF"].includes(createForm.role)
        ? createForm.role
        : "STAFF";

      // 1) Create role access row
      const { error: insertErr } = await supabase.from("users").insert({
        user_details_id: selectedMember.user_details_id,
        auth_user_id: selectedMember.preferred_auth_user_id,
        email: baseEmail,
        role: allowedRole,
        access_start: new Date(createForm.access_start).toISOString(),
        access_end: new Date(createForm.access_end).toISOString(),
        is_active: true,
      });

      if (insertErr) throw insertErr;

      // 2) Notify via PHP mailer endpoint
      let mailOk = false;
      let mailError = "";
      try {
        const res = await fetch(
          `${process.env.REACT_APP_MAILER_URL}/send-account-created`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              toEmail: baseEmail,
              roleName: allowedRole,
              branchName: pastorCtx.branch_name,
              memberName: selectedMember.full_name,
            }),
          }
        );
        const mailData = await res.json();
        mailOk = mailData?.ok === true;
        mailError = mailData?.error || "";
      } catch (err) {
        mailError = err?.message || "Failed to send email.";
      }

      if (!mailOk) {
        setErr(`Account created, but email failed to send. ${mailError}`);
      }

      // reset UI
      setSelectedMember(null);
      setCreateForm({ role: "FINANCE", access_start: "", access_end: "" });

      // refresh without wiping the error message
      await fetchEligibleMembers(pastorCtx.branch_id, { silent: true });
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to create user account.");
    } finally {
      setCreatingUser(false);
    }
  };

  const filteredEligibleMembers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return eligibleMembers;
    return eligibleMembers.filter((m) => {
      const name = (m.full_name || "").toLowerCase();
      const email = (m.display_member_email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [eligibleMembers, searchTerm]);

  // =========================
  // MEMBERS TAB — ONLY pastor branch
  // =========================
  const [membersTabLoading, setMembersTabLoading] = useState(false);
  const [memberUsers, setMemberUsers] = useState([]);
  const [drawerUser, setDrawerUser] = useState(null);

  const fetchMemberRoleUsers = async (branchId) => {
    try {
      setMembersTabLoading(true);
      setErr("");

      const { data, error } = await supabase
        .from("users")
        .select(
          `
            user_id,
            email,
            role,
            is_active,
            created_at,
            auth_user_id,
            user_details:users_details!inner (
              user_details_id,
              branch_id,
              photo_path,
              first_name,
              middle_name,
              last_name,
              suffix,
              contact_number,
              baptismal_date,
              last_attended,
              branch:branches ( branch_id, name )
            )
          `
        )
        .eq("role", "member")
        .eq("user_details.branch_id", branchId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((u) => {
        const d = u.user_details || null;
        const isSelf =
          String(u.auth_user_id) === String(pastorCtx.auth_user_id) ||
          String(d?.user_details_id) === String(pastorCtx.user_details_id);

        return {
          ...u,
          is_self: isSelf,
          branch_id: d?.branch_id || null,
          branch_name: d?.branch?.name || "-",
          user_details_id: d?.user_details_id || null,
          full_name: safeFullName(d) || "-",
          photo_url: d?.photo_path ? getPublicImageUrl(d.photo_path) : null,
          contact_number: d?.contact_number || null,
          baptismal_date: d?.baptismal_date || null,
          last_attended: d?.last_attended || null,
        };
      });

      setMemberUsers(mapped);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load members.");
    } finally {
      setMembersTabLoading(false);
    }
  };

  // Baptism modal
  const [baptismModal, setBaptismModal] = useState({
    open: false,
    user_details_id: null,
    full_name: "",
    baptismal_date: "",
  });
  const [baptismSaving, setBaptismSaving] = useState(false);

  const openBaptismModal = (userRow) => {
    setErr("");

    if (String(userRow.branch_id) !== String(pastorCtx.branch_id)) {
      return setErr("You can only edit members from your assigned branch.");
    }

    if (userRow.is_self) {
      return setErr("You cannot set your own baptismal date here.");
    }

    if (userRow.baptismal_date) {
      return setErr("This member already has a baptismal date.");
    }

    setBaptismModal({
      open: true,
      user_details_id: userRow.user_details_id,
      full_name: userRow.full_name,
      baptismal_date: "",
    });
  };

  const saveBaptismalDate = async () => {
    try {
      setErr("");
      if (!baptismModal.user_details_id)
        return setErr("Missing user_details_id.");
      if (!baptismModal.baptismal_date)
        return setErr("Please select a baptismal date.");

      setBaptismSaving(true);

      const { error } = await supabase
        .from("users_details")
        .update({ baptismal_date: baptismModal.baptismal_date })
        .eq("user_details_id", baptismModal.user_details_id);

      if (error) throw error;

      setMemberUsers((prev) =>
        prev.map((u) =>
          u.user_details_id === baptismModal.user_details_id
            ? { ...u, baptismal_date: baptismModal.baptismal_date }
            : u
        )
      );

      setBaptismModal({
        open: false,
        user_details_id: null,
        full_name: "",
        baptismal_date: "",
      });
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to update baptismal date.");
    } finally {
      setBaptismSaving(false);
    }
  };

  // =========================
  // Init + tab fetch
  // =========================
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { branchId } = await loadPastorContext();
        if (!mounted) return;
        await fetchEligibleMembers(branchId);
      } catch (e) {
        console.error(e);
        if (mounted) setErr(e?.message || "Failed to load pastor context.");
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pastorCtx.branch_id) return;
    if (mainTab === "add-user") fetchEligibleMembers(pastorCtx.branch_id);
    if (mainTab === "members") fetchMemberRoleUsers(pastorCtx.branch_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainTab, pastorCtx.branch_id]);

  // =========================
  // UI
  // =========================
  return (
    <div className="flex min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />

        <main className="p-6 md:p-8 space-y-6 w-full">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Pastor User Management
              </h1>
              <p className="text-sm text-gray-600">
                You can only manage members within your assigned branch.
              </p>

              <div className="inline-flex items-center gap-2 mt-2 text-xs">
                <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                  Assigned Branch
                </span>
                <span className="text-gray-700 font-medium">
                  {pastorCtx.branch_name || "—"}
                </span>
              </div>
            </div>

            <div className="text-xs text-gray-500">
              {pastorCtx.email ? (
                <>
                  Signed in as{" "}
                  <span className="font-semibold text-gray-700">
                    {stripMemberSuffixEmail(pastorCtx.email)}
                  </span>
                </>
              ) : (
                " "
              )}
            </div>
          </div>

          {err && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-3 text-sm">
              {err}
            </div>
          )}

          {/* ... UI kept the same as your original ... */}
          {/* (No other changes below this point) */}

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setMainTab("add-user")}
                className={`flex-1 px-6 py-3 text-sm font-semibold transition-colors ${
                  mainTab === "add-user"
                    ? "border-b-2 border-emerald-600 text-emerald-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Add User (Level 2)
              </button>

              <button
                onClick={() => setMainTab("members")}
                className={`flex-1 px-6 py-3 text-sm font-semibold transition-colors ${
                  mainTab === "members"
                    ? "border-b-2 border-emerald-600 text-emerald-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Members (Your Branch)
              </button>
            </div>

            <div className="p-6 md:p-8 space-y-8">
              {mainTab === "add-user" && (
                <div className="space-y-6">
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900 flex items-start gap-2">
                    <Info size={18} className="mt-0.5 text-amber-700" />
                    <div>
                      <div className="font-semibold">
                        Add User (Pastor View)
                      </div>
                      <div className="text-amber-800">
                        Only baptized members within your branch can be
                        selected. You cannot assign access to yourself.
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-7 bg-white border border-gray-100 rounded-2xl overflow-hidden">
                      <div className="p-4 border-b border-gray-100">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="w-full md:w-2/3">
                            <label className="block text-sm font-semibold mb-2 text-gray-800">
                              Search Baptized Members (Branch:{" "}
                              {pastorCtx.branch_name || "—"})
                            </label>
                            <input
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              placeholder="Search by name or email"
                              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-200"
                            />
                          </div>
                          <div className="text-sm text-gray-500">
                            {membersLoading
                              ? "Loading..."
                              : `${filteredEligibleMembers.length} member(s) found`}
                          </div>
                        </div>
                      </div>

                      <div className="max-h-[420px] overflow-auto">
                        {membersLoading ? (
                          <div className="p-6 text-center text-gray-600">
                            Loading members…
                          </div>
                        ) : filteredEligibleMembers.length === 0 ? (
                          <div className="p-6 text-center text-gray-500">
                            No baptized members found in your branch.
                          </div>
                        ) : (
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs text-gray-600 sticky top-0 z-10">
                              <tr>
                                <th className="px-4 py-3 text-left">Member</th>
                                <th className="px-4 py-3 text-left">Email</th>
                                <th className="px-4 py-3 text-left">
                                  Baptismal Date
                                </th>
                                <th className="px-4 py-3 text-center">
                                  Accounts
                                </th>
                                <th className="px-4 py-3 text-center">Auth</th>
                                <th className="px-4 py-3 text-center">
                                  Action
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredEligibleMembers.map((m) => {
                                const disabledSelf = !!m.is_self;
                                return (
                                  <tr
                                    key={m.user_details_id}
                                    className="border-t hover:bg-gray-50"
                                  >
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-3">
                                        <img
                                          src={
                                            m.photo_url || DEFAULT_PROFILE_IMG
                                          }
                                          alt="profile"
                                          className="w-9 h-9 rounded-full object-cover border"
                                        />
                                        <div className="space-y-0.5">
                                          <div className="font-semibold text-gray-900">
                                            {m.full_name}
                                          </div>
                                          {disabledSelf && (
                                            <span className="inline-flex text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold">
                                              You (Pastor)
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      {m.display_member_email || "-"}
                                    </td>
                                    <td className="px-4 py-3">
                                      {fmtDateOnly(m.baptismal_date)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      {m.has_accounts_count}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <span
                                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                          m.preferred_auth_user_id
                                            ? "bg-emerald-50 text-emerald-700"
                                            : "bg-rose-50 text-rose-700"
                                        }`}
                                      >
                                        {m.preferred_auth_user_id
                                          ? "Yes"
                                          : "No"}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <button
                                        onClick={() => setSelectedMember(m)}
                                        disabled={disabledSelf}
                                        className={`px-3 py-1.5 rounded-xl text-white text-xs font-semibold transition-all ${
                                          disabledSelf
                                            ? "bg-gray-300 cursor-not-allowed"
                                            : "hover:scale-[1.02] bg-emerald-600 hover:bg-emerald-700"
                                        }`}
                                        title={
                                          disabledSelf
                                            ? "You cannot select yourself."
                                            : "Select member"
                                        }
                                      >
                                        Select
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>

                    <div className="lg:col-span-5">
                      <div className="bg-white border border-gray-100 rounded-2xl p-5 md:p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-lg text-gray-900">
                            Selected Member & Create Account
                          </h4>
                          {selectedMember && (
                            <button
                              className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                              onClick={() => {
                                setSelectedMember(null);
                                setCreateForm({
                                  role: "FINANCE",
                                  access_start: "",
                                  access_end: "",
                                });
                              }}
                            >
                              Clear
                            </button>
                          )}
                        </div>

                        {!selectedMember ? (
                          <div className="p-8 text-center text-gray-500 border-2 border-dashed rounded-2xl">
                            Select a baptized member from the list to create an
                            account.
                          </div>
                        ) : selectedMember.is_self ? (
                          <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
                            You selected yourself. Pastors cannot assign access
                            roles to themselves.
                          </div>
                        ) : (
                          <div className="space-y-5">
                            <div className="grid grid-cols-1 gap-3">
                              <InfoBox
                                label="Full Name"
                                value={selectedMember.full_name}
                              />
                              <InfoBox
                                label="Contact Number"
                                value={selectedMember.contact_number || "-"}
                              />
                              <InfoBox
                                label="Member Email"
                                value={
                                  selectedMember.display_member_email || "-"
                                }
                              />
                              <InfoBox
                                label="Branch"
                                value={pastorCtx.branch_name || "-"}
                              />
                              <InfoBox
                                label="Baptismal Date"
                                value={fmtDateOnly(
                                  selectedMember.baptismal_date
                                )}
                              />
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                              <div>
                                <label className="block text-sm font-semibold mb-2">
                                  Role *
                                </label>
                                <select
                                  value={createForm.role}
                                  onChange={(e) =>
                                    setCreateForm((p) => ({
                                      ...p,
                                      role: e.target.value,
                                    }))
                                  }
                                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-200"
                                >
                                  {/* <option value="WORKER">worker</option> */}
                                  <option value="FINANCE">finance</option>
                                  <option value="STAFF">staff</option>
                                </select>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-semibold mb-2">
                                    Access Start Date *
                                  </label>
                                  <input
                                    type="date"
                                    value={createForm.access_start}
                                    onChange={(e) =>
                                      setCreateForm((p) => ({
                                        ...p,
                                        access_start: e.target.value,
                                      }))
                                    }
                                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-200"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-semibold mb-2">
                                    Access End Date *
                                  </label>
                                  <input
                                    type="date"
                                    value={createForm.access_end}
                                    onChange={(e) =>
                                      setCreateForm((p) => ({
                                        ...p,
                                        access_end: e.target.value,
                                      }))
                                    }
                                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-200"
                                  />
                                </div>
                              </div>

                              <button
                                onClick={handleCreateAccountForMember}
                                disabled={creatingUser}
                                className="w-full px-6 py-3 rounded-xl text-white font-bold transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-700"
                              >
                                {creatingUser
                                  ? "Creating..."
                                  : "Create Account"}
                              </button>

                              {!selectedMember.preferred_auth_user_id && (
                                <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-xl">
                                  This member has no linked Auth account. They
                                  must exist in Supabase Auth first.
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {mainTab === "members" && (
                <div className="space-y-5">
                  {/* (your members tab UI unchanged) */}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <UserDetailsModal
        user={drawerUser}
        onClose={() => setDrawerUser(null)}
        stripEmail={stripMemberSuffixEmail}
      />
    </div>
  );
}

// =========================
// Small components
// =========================
function InfoBox({ label, value, mono }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">
        {label}
      </label>
      <div
        className={`p-3 border rounded-xl bg-gray-50 ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value || "-"}
      </div>
    </div>
  );
}

function UserDetailsModal({ user, onClose, stripEmail }) {
  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Member Details</h3>
            <p className="text-xs text-gray-500">Read-only view</p>
          </div>
          <button
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
            onClick={onClose}
          >
            <X size={18} /> Close
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center gap-4">
            <img
              src={
                user.photo_url ||
                "https://ui-avatars.com/api/?name=User&background=e5e7eb&color=111827&rounded=true&size=96"
              }
              alt="profile"
              className="w-16 h-16 rounded-2xl object-cover border"
            />
            <div className="min-w-0">
              <div className="text-xl font-bold text-gray-900 truncate">
                {user.full_name}
              </div>
              <div className="text-sm text-gray-600 truncate">
                {stripEmail(user.email) || "-"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
