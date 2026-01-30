import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { supabase } from "../../lib/supabaseClient";
import { Eye, CheckCircle2, Info, X } from "lucide-react";

export default function BishopUserRoles() {
  const [loading, setLoading] = useState(false);

  // Main tabs
  const [mainTab, setMainTab] = useState("add-user"); // add-user | pastors | members

  // =========================
  // Helpers
  // =========================
  const stripMemberSuffixEmail = (email = "") => {
    if (!email) return "";
    return String(email).replace(/_member(?=@)/gi, "").replace(/_member$/gi, "").trim();
  };

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

  const safeFullName = (d) =>
    [d?.first_name, d?.middle_name, d?.last_name, d?.suffix].filter(Boolean).join(" ").trim();

  const PROFILE_BUCKET = "profiles"; // change if different bucket
  const getPublicImageUrl = (photo_path) => {
    if (!photo_path) return null;
    if (/^https?:\/\//i.test(photo_path)) return photo_path;
    const { data } = supabase.storage.from(PROFILE_BUCKET).getPublicUrl(photo_path);
    return data?.publicUrl || null;
  };

  const DEFAULT_PROFILE_IMG =
    "https://ui-avatars.com/api/?name=User&background=e5e7eb&color=111827&rounded=true&size=80";

  // =========================
  // Branches from DB
  // =========================
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branches, setBranches] = useState([]); // [{branch_id, name}]

  const fetchBranches = async () => {
    try {
      setBranchesLoading(true);
      const { data, error } = await supabase
        .from("branches")
        .select("branch_id, name")
        .order("name", { ascending: true });
      if (error) throw error;
      setBranches(data || []);
    } catch (e) {
      console.error(e);
      setBranches([]);
      setErr((prev) => prev || e?.message || "Failed to load branches.");
    } finally {
      setBranchesLoading(false);
    }
  };

  const branchNameById = useMemo(() => {
    const m = new Map();
    (branches || []).forEach((b) => m.set(String(b.branch_id), b.name));
    return m;
  }, [branches]);

  // =========================
  // ADD USER
  // =========================
  const [membersLoading, setMembersLoading] = useState(false);
  const [err, setErr] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [eligibleMembers, setEligibleMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);

  // ✅ bishop can choose (and update) branch via users_details.branch_id when role is PASTOR
  const [createForm, setCreateForm] = useState({
    role: "STAFF",
    access_start: "",
    access_end: "",
    designated_branch_id: "", // branch_id (users_details)
  });

  const [creatingUser, setCreatingUser] = useState(false);

  // =========================
  // PASTORS TAB
  // =========================
  const [pastorsLoading, setPastorsLoading] = useState(false);
  const [pastors, setPastors] = useState([]); // users.role=PASTOR joined user_details + branch

  // =========================
  // MEMBERS TAB (role = member)
  // =========================
  const [membersTabLoading, setMembersTabLoading] = useState(false);
  const [memberUsers, setMemberUsers] = useState([]);
  const [memberFilter, setMemberFilter] = useState({ branch: "", status: "" });
  const [drawerUser, setDrawerUser] = useState(null);

  // Upgrade baptismal date modal
  const [baptismModal, setBaptismModal] = useState({
    open: false,
    user_details_id: null,
    full_name: "",
    baptismal_date: "",
  });
  const [baptismSaving, setBaptismSaving] = useState(false);

  // Confirmation
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState("Saved!");

  // =========================
  // Fetch: eligible baptized members
  // =========================
  const fetchEligibleMembers = async () => {
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
          accounts.find((a) => /_member(?=@)/i.test(a.email) || /_member$/i.test(a.email)) || accounts[0];

        return {
          ...m,
          accounts,
          photo_url: m.photo_path ? getPublicImageUrl(m.photo_path) : null,
          branch_name: m.branch?.name || "-",
          full_name: safeFullName(m),
          display_member_email: stripMemberSuffixEmail(preferred?.email || ""),
          preferred_auth_user_id: preferred?.auth_user_id || null, // internal only
          has_accounts_count: accounts.length,
        };
      });

      setEligibleMembers(mapped);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load baptized members.");
    } finally {
      setMembersLoading(false);
    }
  };

  // =========================
  // Update users_details.branch_id (for selected member / for pastor assignment)
  // =========================
  const updateUserDetailsBranch = async (userDetailsId, branchId) => {
    if (!userDetailsId) return;

    const normalized = branchId ? Number(branchId) : null;

    const { error } = await supabase
      .from("users_details")
      .update({ branch_id: normalized })
      .eq("user_details_id", userDetailsId);

    if (error) throw error;
  };

  // =========================
  // Create account in public.users
  // ✅ inserts auth_user_id but NEVER shows it to bishop
  // ✅ if role === PASTOR => ensure branch_id is set on users_details
  // =========================
  const handleCreateAccountForMember = async () => {
    try {
      setErr("");

      if (!selectedMember) return setErr("Please select a member first.");
      if (!createForm.access_start || !createForm.access_end) {
        return setErr("Please provide both access start and end dates.");
      }

      const baseEmail = stripMemberSuffixEmail(selectedMember.display_member_email);
      if (!baseEmail) return setErr("Selected member has no email.");

      if (!selectedMember.preferred_auth_user_id) {
        return setErr("Selected member has no linked Auth account. (auth_user_id missing)");
      }

      // ✅ require designated branch only for pastor
      if (createForm.role === "PASTOR" && !createForm.designated_branch_id) {
        return setErr("Please select the designated branch for the Pastor.");
      }

      setCreatingUser(true);

      // 1) If PASTOR: update users_details.branch_id first (this is the "assignment")
      if (createForm.role === "PASTOR") {
        await updateUserDetailsBranch(selectedMember.user_details_id, createForm.designated_branch_id);
      }

      // 2) Insert into users (auth_user_id hidden)
      const { error: insErr } = await supabase.from("users").insert({
        user_details_id: selectedMember.user_details_id,
        auth_user_id: selectedMember.preferred_auth_user_id,
        email: baseEmail,
        role: createForm.role,
        access_start: new Date(createForm.access_start).toISOString(),
        access_end: new Date(createForm.access_end).toISOString(),
        is_active: true,
      });

      if (insErr) throw insErr;

      // 3) Notify via mailer endpoint
      let mailOk = false;
      let mailError = "";
      try {
        const res = await fetch(`${process.env.REACT_APP_MAILER_URL}/send-account-created`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            toEmail: baseEmail,
            roleName: createForm.role,
            branchName: selectedMember.branch_name,
            memberName: selectedMember.full_name,
          }),
        });
        const mailData = await res.json();
        mailOk = mailData?.ok === true;
        mailError = mailData?.error || "";
      } catch (err) {
        mailError = err?.message || "Failed to send email.";
      }

      if (!mailOk) {
        setErr(`Account created, but email failed to send. ${mailError}`);
      }

      setSelectedMember(null);
      setCreateForm({ role: "STAFF", access_start: "", access_end: "", designated_branch_id: "" });

      setConfirmMsg(createForm.role === "PASTOR" ? "Pastor created and assigned to branch!" : "User account created!");
      setShowConfirm(true);

      await fetchEligibleMembers();
      if (createForm.role === "PASTOR") await fetchPastors();
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
  // Fetch: Pastors (assignment is users_details.branch_id)
  // =========================
  const fetchPastors = async () => {
    try {
      setPastorsLoading(true);
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
          user_details:users_details (
            user_details_id,
            branch_id,
            first_name,
            middle_name,
            last_name,
            suffix,
            photo_path,
            branch:branches ( branch_id, name )
          )
        `
        )
        .eq("role", "PASTOR")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((u) => {
        const d = u.user_details || null;
        return {
          ...u,
          user_details_id: d?.user_details_id || null,
          details_branch_id: d?.branch_id || null,
          full_name: safeFullName(d) || "-",
          photo_url: d?.photo_path ? getPublicImageUrl(d.photo_path) : null,
          branch_name: d?.branch?.name || "Unassigned",
          display_email: stripMemberSuffixEmail(u.email),
        };
      });

      setPastors(mapped);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load pastors.");
    } finally {
      setPastorsLoading(false);
    }
  };

  // Change pastor branch => update users_details.branch_id
  const assignPastorToBranch = async (pastorUserDetailsId, branchId) => {
    try {
      setErr("");

      // optimistic UI
      setPastors((prev) =>
        prev.map((p) =>
          String(p.user_details_id) === String(pastorUserDetailsId)
            ? {
                ...p,
                details_branch_id: branchId ? Number(branchId) : null,
                branch_name: branchId ? branchNameById.get(String(branchId)) || "Unassigned" : "Unassigned",
              }
            : p
        )
      );

      await updateUserDetailsBranch(pastorUserDetailsId, branchId);

      setConfirmMsg("Pastor branch updated!");
      setShowConfirm(true);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to update pastor branch.");
      await fetchPastors();
    }
  };

  // =========================
  // Fetch: Members (role = member)
  // =========================
  const fetchMemberRoleUsers = async () => {
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
          user_details:users_details (
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
        .eq("role", "member") // ✅ your requirement
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((u) => {
        const d = u.user_details || null;
        return {
          ...u,
          full_name: safeFullName(d) || "-",
          photo_url: d?.photo_path ? getPublicImageUrl(d.photo_path) : null,
          branch_name: d?.branch?.name || "-",
          user_details_id: d?.user_details_id || null,
          contact_number: d?.contact_number || null,
          baptismal_date: d?.baptismal_date || null,
          last_attended: d?.last_attended || null,
        };
      });

      setMemberUsers(mapped);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load member users.");
    } finally {
      setMembersTabLoading(false);
    }
  };

  const filteredMemberUsers = useMemo(() => {
    return memberUsers.filter((u) => {
      if (memberFilter.branch && u.branch_name !== memberFilter.branch) return false;
      if (memberFilter.status) {
        if (memberFilter.status === "Active" && !u.is_active) return false;
        if (memberFilter.status === "Inactive" && u.is_active) return false;
      }
      return true;
    });
  }, [memberUsers, memberFilter]);

  // =========================
  // Baptismal date modal
  // =========================
  const openBaptismModal = (userRow) => {
    setErr("");
    setBaptismModal({
      open: true,
      user_details_id: userRow.user_details_id,
      full_name: userRow.full_name,
      baptismal_date: userRow.baptismal_date ? String(userRow.baptismal_date).slice(0, 10) : "",
    });
  };

  const saveBaptismalDate = async () => {
    try {
      setErr("");
      if (!baptismModal.user_details_id) return setErr("Missing user_details_id.");
      if (!baptismModal.baptismal_date) return setErr("Please select a baptismal date.");

      setBaptismSaving(true);

      const { error } = await supabase
        .from("users_details")
        .update({ baptismal_date: baptismModal.baptismal_date })
        .eq("user_details_id", baptismModal.user_details_id);

      if (error) throw error;

      setMemberUsers((prev) =>
        prev.map((u) =>
          u.user_details_id === baptismModal.user_details_id ? { ...u, baptismal_date: baptismModal.baptismal_date } : u
        )
      );

      setBaptismModal({ open: false, user_details_id: null, full_name: "", baptismal_date: "" });
      setConfirmMsg("Baptismal date updated successfully!");
      setShowConfirm(true);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to update baptismal date.");
    } finally {
      setBaptismSaving(false);
    }
  };

  // =========================
  // Init + tab-based fetching
  // =========================
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      setLoading(true);
      try {
        await fetchBranches();
        await fetchEligibleMembers();
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mainTab === "add-user") fetchEligibleMembers();
    if (mainTab === "pastors") fetchPastors();
    if (mainTab === "members") fetchMemberRoleUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainTab]);

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />

       <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="w-full space-y-6">
         <div className="flex items-center justify-between gap-3 flex-wrap">

            <div>
              <h1 className="text-3xl font-bold text-gray-900">User & Role Management</h1>
              <p className="text-gray-600 text-sm">
                Bishop view: create accounts for baptized members, assign pastors to branches, and manage member records.
              </p>
            </div>
          </div>

          {err && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-3 text-sm">{err}</div>
          )}

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setMainTab("add-user")}
                className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                  mainTab === "add-user"
                    ? "border-b-2 border-emerald-600 text-emerald-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Add User
              </button>
              <button
                onClick={() => setMainTab("pastors")}
                className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                  mainTab === "pastors"
                    ? "border-b-2 border-emerald-600 text-emerald-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Pastor Assignments
              </button>
              <button
                onClick={() => setMainTab("members")}
                className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                  mainTab === "members"
                    ? "border-b-2 border-emerald-600 text-emerald-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Members
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* =========================
                  ADD USER TAB
                 ========================= */}
              {mainTab === "add-user" && (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 flex items-start gap-2">
                    <Info size={18} className="mt-0.5 text-amber-700" />
                    <div>
                      <div className="font-semibold">Add User</div>
                      <div className="text-amber-800">
                        Select a baptized member and create a system account. (Auth ID is handled internally.)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="w-full md:w-1/2">
                      <label className="block text-sm font-medium mb-2">Search Baptized Members</label>
                      <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by name or email"
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-emerald-200"
                      />
                    </div>
                    <div className="text-sm text-gray-500">
                      {membersLoading ? "Loading..." : `${filteredEligibleMembers.length} member(s) found`}
                    </div>
                  </div>

                  <div className="border rounded-xl overflow-hidden">
                    <div className="max-h-80 overflow-auto">
                      {membersLoading ? (
                        <div className="p-6 text-center text-gray-600">Loading members…</div>
                      ) : filteredEligibleMembers.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">No baptized members found.</div>
                      ) : (
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-xs text-gray-600 sticky top-0">
                            <tr>
                              <th className="px-4 py-3 text-left">Member</th>
                              <th className="px-4 py-3 text-left">Email</th>
                              <th className="px-4 py-3 text-left">Branch</th>
                              <th className="px-4 py-3 text-left">Baptismal Date</th>
                              <th className="px-4 py-3 text-center">Accounts</th>
                              <th className="px-4 py-3 text-center">Auth Linked</th>
                              <th className="px-4 py-3 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredEligibleMembers.map((m) => (
                              <tr key={m.user_details_id} className="border-t hover:bg-gray-50">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <img
                                      src={m.photo_url || DEFAULT_PROFILE_IMG}
                                      alt="profile"
                                      className="w-9 h-9 rounded-full object-cover border"
                                    />
                                    <div className="font-medium">{m.full_name}</div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">{m.display_member_email || "-"}</td>
                                <td className="px-4 py-3">{m.branch_name}</td>
                                <td className="px-4 py-3">{fmtDateOnly(m.baptismal_date)}</td>
                                <td className="px-4 py-3 text-center">{m.has_accounts_count}</td>
                                <td className="px-4 py-3 text-center">
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                      m.preferred_auth_user_id
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-rose-50 text-rose-700"
                                    }`}
                                  >
                                    {m.preferred_auth_user_id ? "Yes" : "No"}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() => {
                                      setSelectedMember(m);
                                      // default designated branch = member current branch (editable)
                                      setCreateForm((p) => ({
                                        ...p,
                                        designated_branch_id: m.branch_id ? String(m.branch_id) : p.designated_branch_id,
                                      }));
                                    }}
                                    className="px-3 py-1 rounded-lg text-white text-sm font-medium transition-all hover:scale-105 bg-emerald-600 hover:bg-emerald-700"
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
                  </div>

                  {/* Better card UI */}
                  <div className="border-t pt-6">
                    <h4 className="font-semibold text-lg mb-4">Selected Member & Create Account</h4>

                    {selectedMember ? (
                      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                          {/* LEFT */}
                          <div className="lg:col-span-7 space-y-4">
                            <div className="flex items-center gap-4">
                              <img
                                src={selectedMember.photo_url || DEFAULT_PROFILE_IMG}
                                alt="profile"
                                className="w-14 h-14 rounded-full object-cover border"
                              />
                              <div>
                                <div className="text-lg font-semibold text-gray-900">{selectedMember.full_name}</div>
                                <div className="text-sm text-gray-500">{selectedMember.display_member_email || "-"}</div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <InfoBox label="Contact Number" value={selectedMember.contact_number || "-"} />
                              <InfoBox label="Baptismal Date" value={fmtDateOnly(selectedMember.baptismal_date)} />
                              <InfoBox label="Current Branch" value={selectedMember.branch_name || "-"} />
                              <InfoBox label="Existing Accounts" value={String(selectedMember.has_accounts_count ?? 0)} />
                            </div>

                            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
                              <div className="font-semibold text-gray-900 mb-1">Note</div>
                              For pastors, the branch you choose below will update <code>users_details.branch_id</code>.
                            </div>
                          </div>

                          {/* RIGHT */}
                          <div className="lg:col-span-5">
                            <div className="rounded-2xl border border-gray-200 p-5 bg-white">
                              <div className="text-sm font-semibold text-gray-900 mb-4">Account Settings</div>

                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium mb-2">Role *</label>
                                  <select
                                    value={createForm.role}
                                    onChange={(e) =>
                                      setCreateForm((p) => ({
                                        ...p,
                                        role: e.target.value,
                                        designated_branch_id:
                                          e.target.value === "PASTOR"
                                            ? p.designated_branch_id || (selectedMember.branch_id ? String(selectedMember.branch_id) : "")
                                            : "",
                                      }))
                                    }
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-emerald-200"
                                  >
                                    <option value="PASTOR">Pastor</option>
                                    <option value="FINANCE">Finance</option>
                                    <option value="STAFF">Staff</option>
                                  </select>
                                </div>

                                {createForm.role === "PASTOR" && (
                                  <div>
                                    <label className="block text-sm font-medium mb-2">Designated Branch (Pastor) *</label>
                                    <select
                                      value={createForm.designated_branch_id}
                                      onChange={(e) => setCreateForm((p) => ({ ...p, designated_branch_id: e.target.value }))}
                                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-emerald-200"
                                      disabled={branchesLoading}
                                    >
                                      <option value="">{branchesLoading ? "Loading branches..." : "Select branch"}</option>
                                      {branches.map((b) => (
                                        <option key={b.branch_id} value={String(b.branch_id)}>
                                          {b.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium mb-2">Access Start Date *</label>
                                    <input
                                      type="date"
                                      value={createForm.access_start}
                                      onChange={(e) => setCreateForm((p) => ({ ...p, access_start: e.target.value }))}
                                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-emerald-200"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium mb-2">Access End Date *</label>
                                    <input
                                      type="date"
                                      value={createForm.access_end}
                                      onChange={(e) => setCreateForm((p) => ({ ...p, access_end: e.target.value }))}
                                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-emerald-200"
                                    />
                                  </div>
                                </div>

                                <div className="flex gap-3 justify-end pt-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedMember(null);
                                      setCreateForm({ role: "STAFF", access_start: "", access_end: "", designated_branch_id: "" });
                                    }}
                                    className="px-5 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium"
                                  >
                                    Clear
                                  </button>

                                  <button
                                    onClick={handleCreateAccountForMember}
                                    disabled={creatingUser}
                                    className="px-5 py-2 rounded-lg text-white font-medium transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-700"
                                    title={
                                      selectedMember.preferred_auth_user_id
                                        ? "Create account"
                                        : "Member has no linked Auth account"
                                    }
                                  >
                                    {creatingUser ? "Creating..." : "Create Account"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-gray-500 border-2 border-dashed rounded-lg">
                        No member selected. Select a baptized member above to create an account.
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* =========================
                  PASTORS TAB
                 ========================= */}
              {mainTab === "pastors" && (
                <>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Pastor Assignments</h3>
                      <p className="text-sm text-gray-600">
                        Changing a pastor’s branch updates <code>users_details.branch_id</code>.
                      </p>
                    </div>
                  </div>

                  {pastorsLoading ? (
                    <div className="p-6 text-center text-gray-600">Loading pastors…</div>
                  ) : pastors.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">No pastors found (role = PASTOR).</div>
                  ) : (
                    <div className="space-y-2 text-sm text-gray-700">
                      {pastors.map((p) => (
                        <div
                          key={`pastor-${p.user_id}`}
                          className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={p.photo_url || DEFAULT_PROFILE_IMG}
                              alt="pastor"
                              className="w-10 h-10 rounded-full object-cover border"
                            />
                            <div>
                              <p className="font-semibold text-gray-900">{p.full_name}</p>
                              <p className="text-xs text-gray-500">
                                Email: {p.display_email} • Current: {p.branch_name}
                              </p>
                            </div>
                          </div>

                          <select
                            className="border rounded-md px-2 py-2"
                            value={p.details_branch_id ? String(p.details_branch_id) : ""}
                            onChange={(e) => assignPastorToBranch(p.user_details_id, e.target.value)}
                            disabled={branchesLoading || !p.user_details_id}
                            title={!p.user_details_id ? "Missing users_details link" : "Assign branch"}
                          >
                            <option value="">{branchesLoading ? "Loading branches..." : "Select branch"}</option>
                            {branches.map((b) => (
                              <option key={b.branch_id} value={String(b.branch_id)}>
                                {b.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* =========================
                  MEMBERS TAB
                 ========================= */}
              {mainTab === "members" && (
                <>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Members (role = member)</h3>
                      <p className="text-sm text-gray-600">
                        View member details and set baptismal date to upgrade their membership record.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        className="border rounded-md px-3 py-2 text-sm"
                        value={memberFilter.branch}
                        onChange={(e) => setMemberFilter((p) => ({ ...p, branch: e.target.value }))}
                      >
                        <option value="">All Branches</option>
                        {branches.map((b) => (
                          <option key={b.branch_id} value={b.name}>
                            {b.name}
                          </option>
                        ))}
                      </select>

                      <select
                        className="border rounded-md px-3 py-2 text-sm"
                        value={memberFilter.status}
                        onChange={(e) => setMemberFilter((p) => ({ ...p, status: e.target.value }))}
                      >
                        <option value="">All Status</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  {membersTabLoading ? (
                    <div className="p-6 text-center text-gray-600">Loading members…</div>
                  ) : filteredMemberUsers.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">No members found.</div>
                  ) : (
                    <div className="border rounded-xl overflow-hidden">
                      <div className="overflow-auto">
                        <table className="min-w-full text-sm text-left">
                          <thead className="bg-gray-50 text-gray-600">
                            <tr>
                              <th className="px-4 py-3 font-semibold">Member</th>
                              <th className="px-4 py-3 font-semibold">Email</th>
                              <th className="px-4 py-3 font-semibold">Branch</th>
                              <th className="px-4 py-3 font-semibold">Contact</th>
                              <th className="px-4 py-3 font-semibold">Baptismal Date</th>
                              <th className="px-4 py-3 font-semibold">Last Attended</th>
                              <th className="px-4 py-3 font-semibold">Status</th>
                              <th className="px-4 py-3 font-semibold">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {filteredMemberUsers.map((u) => (
                              <tr key={u.user_id} className="hover:bg-gray-50">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <img
                                      src={u.photo_url || DEFAULT_PROFILE_IMG}
                                      alt="member"
                                      className="w-10 h-10 rounded-full object-cover border"
                                    />
                                    <div className="leading-tight">
                                      <div className="font-semibold text-gray-900">{u.full_name}</div>
                                      <div className="text-xs text-gray-500">ID: {u.user_id}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">{stripMemberSuffixEmail(u.email) || "-"}</td>
                                <td className="px-4 py-3">{u.branch_name || "-"}</td>
                                <td className="px-4 py-3">{u.contact_number || "-"}</td>
                                <td className="px-4 py-3">{fmtDateOnly(u.baptismal_date)}</td>
                                <td className="px-4 py-3">{fmtDateTime(u.last_attended)}</td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                      u.is_active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                                    }`}
                                  >
                                    {u.is_active ? "Active" : "Inactive"}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {u.baptismal_date ? (
                                      <button
                                        className="inline-flex items-center gap-1 border border-gray-200 px-3 py-2 rounded-md hover:bg-gray-50 text-xs"
                                        onClick={() => setDrawerUser(u)}
                                      >
                                        <Eye size={16} /> View Details
                                      </button>
                                    ) : (
                                      <>
                                        <button
                                          className="inline-flex items-center gap-1 border border-gray-200 px-3 py-2 rounded-md hover:bg-gray-50 text-xs"
                                          onClick={() => setDrawerUser(u)}
                                        >
                                          <Eye size={16} /> View Details
                                        </button>
                                        <button
                                          className="inline-flex items-center gap-1 bg-emerald-600 text-white px-3 py-2 rounded-md hover:bg-emerald-700 text-xs"
                                          onClick={() => openBaptismModal(u)}
                                          disabled={!u.user_details_id}
                                          title={!u.user_details_id ? "Missing user_details link" : "Set baptismal date"}
                                        >
                                          <CheckCircle2 size={16} /> Set Baptismal Date
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
           </div>
        </main>
      </div>

      {/* Drawer */}
      <UserDrawer user={drawerUser} onClose={() => setDrawerUser(null)} />

      {/* Baptism modal */}
      {baptismModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Set Baptismal Date</h3>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setBaptismModal({ open: false, user_details_id: null, full_name: "", baptismal_date: "" })}
              >
                <X size={18} />
              </button>
            </div>

            <div className="text-sm text-gray-700">
              Member: <span className="font-semibold">{baptismModal.full_name}</span>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Baptismal Date *</label>
              <input
                type="date"
                value={baptismModal.baptismal_date}
                onChange={(e) => setBaptismModal((p) => ({ ...p, baptismal_date: e.target.value }))}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-emerald-200"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                className="px-4 py-2 text-sm border rounded-md"
                onClick={() => setBaptismModal({ open: false, user_details_id: null, full_name: "", baptismal_date: "" })}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-md disabled:opacity-50"
                disabled={!baptismModal.baptismal_date || baptismSaving}
                onClick={saveBaptismalDate}
              >
                {baptismSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-900">Success</h3>
            </div>
            <p className="text-sm text-gray-700">{confirmMsg}</p>
            <div className="flex justify-end">
              <button className="px-4 py-2 bg-emerald-600 text-white rounded-md" onClick={() => setShowConfirm(false)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================
// Small components
// =========================
function InfoBox({ label, value, mono }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <div className={`p-3 border rounded-lg bg-gray-50 ${mono ? "font-mono text-xs" : ""}`}>{value || "-"}</div>
    </div>
  );
}

function UserDrawer({ user, onClose }) {
  if (!user) return null;
  // Close drawer when clicking the overlay (but not the drawer itself)
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };
  return (
    <div
      className="fixed inset-0 bg-black/30 flex justify-end z-[100]"
      onClick={handleOverlayClick}
      style={{ top: 0, left: 0 }}
    >
      <div
        className="w-full max-w-md bg-white h-full shadow-xl p-6 pt-8 space-y-3 overflow-y-auto relative"
        style={{ marginTop: 0 }}
      >
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 bg-gray-100 rounded-full p-2 z-10"
          onClick={onClose}
          aria-label="Close details"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-600">
            {user.full_name?.[0] || "?"}
          </div>
          <h3 className="text-xl font-semibold text-gray-900">User Details</h3>
        </div>
        <Detail label="Name" value={user.full_name} />
        <Detail label="Email" value={user.email} mono />
        <Detail label="Role" value={user.role} />
        <Detail label="Branch" value={user.branch_name || "-"} />
        <Detail label="Active" value={user.is_active ? "Active" : "Inactive"} />
        <div className="border-t pt-3 mt-3 text-xs text-gray-500">
          Read-only: attendance summary, ministry involvement, permissions overview.
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value, mono }) {
  return (
    <div className="text-sm text-gray-800">
      <p className="text-gray-500">{label}</p>
      <p className={`font-semibold ${mono ? "font-mono text-xs" : ""}`}>{value || "-"}</p>
    </div>
  );
}
