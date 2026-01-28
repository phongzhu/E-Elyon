// src/pages/Bishop/Ministries.jsx
import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { supabase } from "../../lib/supabaseClient";
import {
  Search,
  ClipboardList,
  Settings2,
  Plus,
  X,
  Eye,
  CheckCircle2,
  XCircle,
  GripVertical,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

const fmtDateOnly = (val) => {
  if (!val) return "-";
  const d = new Date(val);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
};

const safeFullName = (d) =>
  [d?.first_name, d?.middle_name, d?.last_name, d?.suffix]
    .filter(Boolean)
    .join(" ")
    .trim();

const stripMemberSuffixEmail = (email = "") => {
  if (!email) return "";
  return String(email)
    .replace(/_member(?=@)/gi, "")
    .replace(/_member$/gi, "")
    .trim();
};

const STATUS_PILL = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "approved") return "bg-emerald-50 text-emerald-700";
  if (s === "rejected") return "bg-rose-50 text-rose-700";
  if (s === "submitted") return "bg-amber-50 text-amber-700";
  if (s === "underreview") return "bg-indigo-50 text-indigo-700";
  if (s === "draft") return "bg-gray-100 text-gray-700";
  return "bg-gray-100 text-gray-700";
};

const prettyTypeLabel = (t) => {
  switch (t) {
    case "text_ack":
      return "Agreement";
    case "availability":
      return "Availability";
    case "asset_select":
      return "Assets / Items";
    case "skill_select":
      return "Skills";
    case "age_range":
      return "Age Requirement";
    case "family_relation":
      return "Family Requirement";
    case "upload":
      return "Upload";
    case "custom_form":
      return "Form";

    case "family_relation":
      return "Family Requirement";
    case "custom_form":
      return "Form";
    case "demographic":
      return "Demographic Restriction";
// CLEANED: Removed merge conflict marker
    default:
      return t || "Requirement";
  }
};

const Chip = ({ children, tone = "neutral" }) => {
  const base =
    "inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold";
  const styles =
    tone === "good"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "warn"
      ? "bg-amber-50 text-amber-700"
      : tone === "bad"
      ? "bg-rose-50 text-rose-700"
      : "bg-gray-100 text-gray-700";
  return <span className={`${base} ${styles}`}>{children}</span>;
};

const normalizeAnswerJson = (ans) => {
  if (ans == null) return null;
  if (typeof ans === "object") return ans;
  if (typeof ans === "string") {
    try {
      const parsed = JSON.parse(ans);
      return typeof parsed === "object" && parsed != null
        ? parsed
        : { value: parsed };
    } catch {
      return { value: ans };
    }
  }
  return { value: ans };
};

const normalizeGender = (v) => {
  const s = String(v || "").trim().toLowerCase();
  if (s === "male" || s === "m") return "Male";
  if (s === "female" || s === "f") return "Female";
  return null;
};

const computeAge = (birthdate) => {
  if (!birthdate) return null;
  const b = new Date(birthdate);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
};

const passesDemographic = (cfg, applicantProfile) => {
  const allowedGender = Array.isArray(cfg?.allowed_gender)
    ? cfg.allowed_gender
    : [];
  const bands = Array.isArray(cfg?.age_bands) ? cfg.age_bands : [];

  const g = normalizeGender(applicantProfile?.gender);
  const age = computeAge(applicantProfile?.birthdate);

  if (allowedGender.length > 0 && (!g || !allowedGender.includes(g)))
    return false;

  if (bands.length > 0) {
    if (age == null) return false;

    const ok = bands.some((b) => {
      const min = b?.min_age == null ? null : Number(b.min_age);
      const max = b?.max_age == null ? null : Number(b.max_age);
      if (min != null && age < min) return false;
      if (max != null && age > max) return false;
      return true;
    });

    if (!ok) return false;
  }

  return true;
};

const normRel = (v) => String(v || "").trim().toLowerCase();

const passesFamilyRelation = (cfg, applicantAuthId, applicantFamily) => {
  const needed = Array.isArray(cfg?.must_have_relation)
    ? cfg.must_have_relation
    : [];
  const neededNorm = needed.map(normRel).filter(Boolean);

  if (neededNorm.length === 0) return true;

  const direction = cfg?.direction || "owner_has_family";

  const rows = Array.isArray(applicantFamily) ? applicantFamily : [];

  const ownerSide = rows
    .filter((r) => r.owner_auth_user_id === applicantAuthId)
    .map((r) => normRel(r.relationship_owner));

  const familySide = rows
    .filter((r) => r.family_auth_user_id === applicantAuthId)
    .map((r) => normRel(r.relationship_family));

  const hasAny = (list) => neededNorm.some((n) => list.includes(n));

  if (direction === "owner_has_family") return hasAny(ownerSide);
  if (direction === "family_has_owner") return hasAny(familySide);

  // either_direction
  return hasAny(ownerSide) || hasAny(familySide);
};

const isAnswerProvidedByType = (req, answerJson) => {
  const a = answerJson || {};
  switch (req?.requirement_type) {
    case "text_ack":
      return a.accepted === true || a.checked === true;
    case "asset_select":
    case "skill_select":
      return Array.isArray(a.selected) && a.selected.length > 0;
    case "availability": {
      const days = Array.isArray(a.days) ? a.days : [];
      const hours = a.hours_per_week ?? a.hoursPerWeek ?? a.hours ?? null;
      return days.length > 0 && hours != null && String(hours) !== "";
    }
    case "demographic":
    case "family_relation":
      return true;
    default:
      return answerJson != null;
  }
};

const renderAnswerFriendly = (
  req,
  ans,
  applicantProfile,
  applicantFamily
) => {
  const cfg = req?.config || {};
  const a = ans || {}; // stored in ministry_application_answers.answer

  // -----------------------
  // text_ack
  // -----------------------
  if (req.requirement_type === "text_ack") {
    const accepted = !!(a.accepted ?? a.checked);
    return (
      <div className="space-y-2">
        {cfg?.ack_text ? (
          <div className="text-sm text-gray-700 whitespace-pre-wrap">
            {cfg.ack_text}
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          {accepted ? (
            <Chip tone="good">✅ Accepted</Chip>
          ) : (
            <Chip tone="bad">❌ Not Accepted</Chip>
          )}
        </div>
      </div>
    );
  }

  // -----------------------
  // availability
  // -----------------------
  if (req.requirement_type === "availability") {
    const days = Array.isArray(a.days) ? a.days : [];
    const hours = a.hours_per_week ?? a.hoursPerWeek ?? a.hours ?? null;
    const notes = a.notes || a.note || "";

    return (
      <div className="space-y-3">
        <div>
          <div className="text-xs font-semibold text-gray-500 mb-1">
            Available Days
          </div>
          {days.length ? (
            <div className="flex flex-wrap gap-2">
              {days.map((d) => (
                <Chip key={d} tone="neutral">
                  {d}
                </Chip>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">No days provided.</div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-xs font-semibold text-gray-500">
            Hours / Week:
          </div>
          <Chip tone={Number(hours || 0) > 0 ? "good" : "warn"}>
            {hours ?? "-"}
          </Chip>

          {cfg?.min_hours_per_week != null ? (
            <span className="text-xs text-gray-500">
              (min required: {cfg.min_hours_per_week})
            </span>
          ) : null}
        </div>

        {notes ? (
          <div>
            <div className="text-xs font-semibold text-gray-500 mb-1">
              Notes
            </div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">
              {notes}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  // -----------------------
  // asset_select / skill_select
  // -----------------------
  if (
    req.requirement_type === "asset_select" ||
    req.requirement_type === "skill_select"
  ) {
    const selected = Array.isArray(a.selected) ? a.selected : [];
    return selected.length ? (
      <div className="flex flex-wrap gap-2">
        {selected.map((x) => (
          <Chip key={x} tone="neutral">
            {x}
          </Chip>
        ))}
      </div>
    ) : (
      <div className="text-sm text-gray-500">No selection provided.</div>
    );
  }

  // -----------------------
  // demographic (review view)
  // -----------------------
  if (req.requirement_type === "demographic") {
    const age = computeAge(applicantProfile?.birthdate);
    const g = normalizeGender(applicantProfile?.gender);

    const pass = passesDemographic(cfg, applicantProfile);

    return (
      <div className="space-y-2">
        <div className="text-sm text-gray-700">
          Applicant: <b>{g || "Unknown"}</b>, Age: <b>{age ?? "Unknown"}</b>
        </div>

        <div className="text-xs text-gray-500">
          Allowed gender: <b>{(cfg.allowed_gender || []).join(", ") || "Any"}</b>
          <br />
          Age bands:{" "}
          <b>
            {Array.isArray(cfg.age_bands) && cfg.age_bands.length
              ? cfg.age_bands
                  .map(
                    (b) =>
                      `${b.label}: ${b.min_age ?? "Any"}-${b.max_age ?? "Any"}`
                  )
                  .join(" • ")
              : "Any"}
          </b>
        </div>

        <Chip tone={pass ? "good" : "bad"}>{pass ? "✅ Pass" : "❌ Fail"}</Chip>
      </div>
    );
  }

  // -----------------------
  // family_relation (review view)
  // -----------------------
  if (req.requirement_type === "family_relation") {
    const direction = cfg?.direction || "owner_has_family";

    const applicantAuthId = applicantProfile?.auth_user_id || null;

    const pass = applicantAuthId
      ? passesFamilyRelation(cfg, applicantAuthId, applicantFamily)
      : false;

    // show what relations exist
    const rows = Array.isArray(applicantFamily) ? applicantFamily : [];
    const ownerRels = rows
      .filter((r) => r.owner_auth_user_id === applicantAuthId)
      .map((r) => r.relationship_owner)
      .filter(Boolean);

    const familyRels = rows
      .filter((r) => r.family_auth_user_id === applicantAuthId)
      .map((r) => r.relationship_family)
      .filter(Boolean);

    const needed = Array.isArray(cfg?.must_have_relation)
      ? cfg.must_have_relation
      : [];

    return (
      <div className="space-y-2">
        <div className="text-sm text-gray-700">
          Must have: <b>{needed.join(", ") || "—"}</b>
        </div>
        <div className="text-xs text-gray-500">
          Direction: <b>{direction}</b>
        </div>
        <div className="text-xs text-gray-500">
          Found (as owner): <b>{ownerRels.join(", ") || "—"}</b>
          <br />
          Found (as family): <b>{familyRels.join(", ") || "—"}</b>
        </div>
        <Chip tone={pass ? "good" : "bad"}>{pass ? "✅ Pass" : "❌ Fail"}</Chip>
      </div>
    );
  }

  // fallback (pretty JSON, but not raw ugly)
  return (
    <pre className="text-xs bg-gray-50 border border-gray-100 rounded-xl p-3 overflow-auto">
      {JSON.stringify(a || {}, null, 2)}
    </pre>
  );
};

export default function Ministries({
  branchScopeIds = null,
  defaultBranchFilter = "ALL",
  roleLabel = "Bishop",
  allBranchesLabel = "All Branches",
} = {}) {
  // =========================
  // State
  // =========================
  const [err, setErr] = useState("");

  const [loadingMinistries, setLoadingMinistries] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);

  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingReqs, setLoadingReqs] = useState(false);
  const [loadingApps, setLoadingApps] = useState(false);
  const [loadingAppDetail, setLoadingAppDetail] = useState(false);
  const [savingReq, setSavingReq] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const [branches, setBranches] = useState([]);
  const [branchFilter, setBranchFilter] = useState(defaultBranchFilter); // ALL | branch_id
  const [searchQuery, setSearchQuery] = useState("");

  // Ministries list (branch_ministries joined to branches + ministries)
  const [ministryRows, setMinistryRows] = useState([]);

  // Selected branch_ministry row
  const [selectedBranchMinistry, setSelectedBranchMinistry] = useState(null);

  // Tabs per selected ministry
  const [rightTab, setRightTab] = useState("members"); // members | requirements | applications

  // Members (from user_ministries)
  const [ministryMembers, setMinistryMembers] = useState([]);

  // Requirements (ministry_requirements)
  const [requirements, setRequirements] = useState([]);

  // Applications (ministry_applications)
  const [applications, setApplications] = useState([]);

  // Application detail (answers)
  const [appModalOpen, setAppModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [appAnswers, setAppAnswers] = useState([]);
  const [reviewNotes, setReviewNotes] = useState("");
  const [applicantProfile, setApplicantProfile] = useState(null);
  const [applicantFamily, setApplicantFamily] = useState([]);

  // Add/Edit Requirement modal
  const [reqModalOpen, setReqModalOpen] = useState(false);
  const [editingReq, setEditingReq] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletingReq, setDeletingReq] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // DnD ordering
  const [dragReqId, setDragReqId] = useState(null);
  const [savingOrder, setSavingOrder] = useState(false);

  // Helper: normalize to 0,10,20 so you can insert later
  const normalizeSortOrders = (list) =>
    (list || []).map((r, idx) => ({ ...r, sort_order: idx * 10 }));

  const upsertReqIntoState = (row) => {
    setRequirements((prev) => {
      const list = Array.isArray(prev) ? [...prev] : [];
      const idx = list.findIndex((x) => x.requirement_id === row.requirement_id);

      if (idx >= 0) list[idx] = row;
      else list.push(row);

      list.sort((a, b) => {
        const sa = Number(a.sort_order ?? 0);
        const sb = Number(b.sort_order ?? 0);
        if (sa !== sb) return sa - sb;
        return Number(a.requirement_id) - Number(b.requirement_id);
      });

      return list;
    });
  };

  const [reqForm, setReqForm] = useState({
    title: "",
    description: "",
    requirement_type: "text_ack",
    is_required: true,
    sort_order: 0,
    is_active: true,

    // SMART FIELDS (admin-friendly)
    ack_text: "",
    require_checkbox: true,

    asset_options: ["Guitar", "Keyboard"],
    asset_min_selected: 1,
    asset_max_selected: null,
    asset_require_any: false,

    availability_days: ["Sunday"],
    availability_min_hours: 0,

    family_relations: ["Parent"],
    family_direction: "owner_has_family", // owner_has_family | family_has_owner | either_direction

    allowed_genders: [],
    demographic_age_bands: [{ label: "Minor", min_age: null, max_age: 17 }],
  });

  const validateRequirementForm = (f) => {
    if (!f.title?.trim()) return "Requirement title is required.";

    if (f.requirement_type === "text_ack") {
      if (!f.ack_text?.trim()) return "Agreement text is required.";
    }

    if (
      f.requirement_type === "asset_select" ||
      f.requirement_type === "skill_select"
    ) {
      const opts = (f.asset_options || [])
        .map((x) => String(x || "").trim())
        .filter(Boolean);

      if (opts.length === 0) return "Add at least one asset option.";

      const min = Number(f.asset_min_selected || 0);
      if (min < 0) return "Min selected cannot be negative.";
      if (min > opts.length)
        return "Min selected cannot be greater than options count.";

      const max =
        f.asset_max_selected === "" || f.asset_max_selected == null
          ? null
          : Number(f.asset_max_selected);

      if (max != null && max < 0) return "Max selected cannot be negative.";
      if (max != null && max > opts.length)
        return "Max selected cannot be greater than options count.";
      if (max != null && min > max)
        return "Min selected cannot be greater than max selected.";
    }

    if (f.requirement_type === "availability") {
      const days = (f.availability_days || []).filter(Boolean);
      if (days.length === 0) return "Select at least one allowed day.";
      const hrs = Number(f.availability_min_hours || 0);
      if (hrs < 0) return "Min hours per week cannot be negative.";
    }

    if (f.requirement_type === "family_relation") {
      const rel = (f.family_relations || [])
        .map(String)
        .map((x) => x.trim())
        .filter(Boolean);
      if (rel.length === 0) return "Add at least one required family relation.";
    }

    if (f.requirement_type === "demographic") {
      const genders = Array.isArray(f.allowed_genders) ? f.allowed_genders : [];

      const bands = Array.isArray(f.demographic_age_bands)
        ? f.demographic_age_bands
        : [];

      const cleaned = bands
        .map((b) => ({
          label: String(b?.label || "").trim(),
          min_age:
            b?.min_age === "" || b?.min_age == null ? null : Number(b.min_age),
          max_age:
            b?.max_age === "" || b?.max_age == null ? null : Number(b.max_age),
        }))
        .filter((b) => b.label);

      if (genders.length === 0 && cleaned.length === 0)
        return "Set at least one restriction (gender and/or age band).";

      for (const b of cleaned) {
        if (b.min_age != null && (Number.isNaN(b.min_age) || b.min_age < 0))
          return `Invalid min age for "${b.label}".`;
        if (b.max_age != null && (Number.isNaN(b.max_age) || b.max_age < 0))
          return `Invalid max age for "${b.label}".`;
        if (b.min_age != null && b.max_age != null && b.max_age < b.min_age)
          return `Max age must be >= min age for "${b.label}".`;
      }
    }

    return null;
  };

  const buildConfigFromForm = (f) => {
    switch (f.requirement_type) {
      case "text_ack":
        return {
          ack_text: f.ack_text || "",
          require_checkbox: !!f.require_checkbox,
        };

      case "asset_select":
      case "skill_select":
        return {
          options: (f.asset_options || [])
            .map((x) => String(x || "").trim())
            .filter(Boolean),
          min_selected: Number(f.asset_min_selected || 0),
          max_selected:
            f.asset_max_selected === "" || f.asset_max_selected == null
              ? null
              : Number(f.asset_max_selected),
          require_any: !!f.asset_require_any,
        };

      case "availability":
        return {
          allowed_days: (f.availability_days || []).filter(Boolean),
          min_hours_per_week: Number(f.availability_min_hours || 0),
        };

      case "family_relation":
        return {
          must_have_relation: (f.family_relations || []).filter(Boolean),
          direction: f.family_direction || "owner_has_family",
        };

      case "demographic": {
        const age_bands = (f.demographic_age_bands || [])
          .map((b) => ({
            label: String(b?.label || "").trim(),
            min_age:
              b?.min_age === "" || b?.min_age == null
                ? null
                : Number(b.min_age),
            max_age:
              b?.max_age === "" || b?.max_age == null
                ? null
                : Number(b.max_age),
          }))
          .filter((b) => b.label);

        return {
          allowed_gender: Array.isArray(f.allowed_genders)
            ? f.allowed_genders
            : [],
          age_bands,
        };
      }

      default:
        return {};
    }
  };

  // =========================
  // Fetchers
  // =========================
  const fetchBranches = async () => {
    try {
      setLoadingBranches(true);
      setErr("");

      let q = supabase
        .from("branches")
        .select("branch_id, name")
        .order("name", { ascending: true });
      if (Array.isArray(branchScopeIds)) {
        const ids = (branchScopeIds || [])
          .map((x) => Number(x))
          .filter((x) => !Number.isNaN(x));
        if (ids.length === 0) {
          setBranches([]);
          return;
        }
        q = q.in("branch_id", ids);
      }

      const { data, error } = await q;

      if (error) throw error;
      setBranches(data || []);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load branches.");
    } finally {
      setLoadingBranches(false);
    }
  };

  const fetchMinistriesAcrossBranches = async (branchIdOrAll) => {
    try {
      setLoadingMinistries(true);
      setErr("");

      let q = supabase.from("branch_ministries").select(
        `
          branch_ministry_id,
          branch_id,
          ministry_id,
          is_active,
          lead_user_id,
          created_at,
          updated_at,
          ministry:ministries (
            id,
            name,
            description
          ),
          branch:branches (
            branch_id,
            name
          )
        `
      );

      if (Array.isArray(branchScopeIds)) {
        const ids = (branchScopeIds || [])
          .map((x) => Number(x))
          .filter((x) => !Number.isNaN(x));
        if (ids.length === 0) {
          setMinistryRows([]);
          setSelectedBranchMinistry(null);
          setMinistryMembers([]);
          setRequirements([]);
          setApplications([]);
          return;
        }

        if (branchIdOrAll === "ALL") {
          q = q.in("branch_id", ids);
        } else {
          const wanted = Number(branchIdOrAll);
          if (!ids.includes(wanted)) {
            q = q.eq("branch_id", ids[0]);
          } else {
            q = q.eq("branch_id", wanted);
          }
        }
      } else {
        if (branchIdOrAll !== "ALL")
          q = q.eq("branch_id", Number(branchIdOrAll));
      }

      const { data: bmRows, error: bmErr } = await q;
      if (bmErr) throw bmErr;

      const rows = bmRows || [];
      const ids = rows.map((r) => r.branch_ministry_id);

      if (ids.length === 0) {
        setMinistryRows([]);
        setSelectedBranchMinistry(null);
        setMinistryMembers([]);
        setRequirements([]);
        setApplications([]);
        return;
      }

      // membership counts
      const { data: umRows, error: umErr } = await supabase
        .from("user_ministries")
        .select("branch_ministry_id, status")
        .in("branch_ministry_id", ids);

      if (umErr) throw umErr;

      const counts = new Map();
      (umRows || []).forEach((r) => {
        const isActive = String(r.status || "").toLowerCase() === "active";
        if (!isActive) return;
        const k = r.branch_ministry_id;
        counts.set(k, (counts.get(k) || 0) + 1);
      });

      const mapped = rows
        .map((r) => ({
          ...r,
          ministry_name: r?.ministry?.name || "-",
          branch_name: r?.branch?.name || "-",
          member_count: counts.get(r.branch_ministry_id) || 0,
        }))
        .sort((a, b) => {
          const bn = String(a.branch_name).localeCompare(String(b.branch_name));
          if (bn !== 0) return bn;
          return String(a.ministry_name).localeCompare(String(b.ministry_name));
        });

      setMinistryRows(mapped);

      // keep selection if still exists after filtering
      setSelectedBranchMinistry((prev) => {
        if (!prev) return null;
        const still = mapped.find(
          (x) => x.branch_ministry_id === prev.branch_ministry_id
        );
        return still || null;
      });
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load ministries.");
      setMinistryRows([]);
      setSelectedBranchMinistry(null);
      setMinistryMembers([]);
      setRequirements([]);
      setApplications([]);
    } finally {
      setLoadingMinistries(false);
    }
  };

  const fetchMembersForBranchMinistry = async (branchMinistryId) => {
    if (!branchMinistryId) return;
    try {
      setLoadingMembers(true);
      setErr("");

      // 1) Get membership rows
      const { data: umRows, error: umErr } = await supabase
        .from("user_ministries")
        .select(
          `
        user_ministry_id,
        role,
        status,
        assigned_at,
        unassigned_at,
        is_primary,
        auth_user_id
      `
        )
        .eq("branch_ministry_id", Number(branchMinistryId))
        .order("assigned_at", { ascending: false });

      if (umErr) throw umErr;

      const rows = umRows || [];

      // 2) Pull users_details by auth_user_id
      const authIds = Array.from(
        new Set(rows.map((r) => r.auth_user_id).filter(Boolean))
      );

      let detailsByAuth = new Map();
      if (authIds.length > 0) {
        const { data: detailsRows, error: detErr } = await supabase
          .from("users_details")
          .select(
            `
          auth_user_id,
          first_name,
          middle_name,
          last_name,
          suffix,
          contact_number,
          branch_id,
          branch:branches (branch_id, name)
        `
          )
          .in("auth_user_id", authIds);

        if (detErr) throw detErr;

        (detailsRows || []).forEach((d) =>
          detailsByAuth.set(d.auth_user_id, d)
        );
      }

      // 3) OPTIONAL: fetch email from users table by auth_user_id
      let emailByAuth = new Map();
      if (authIds.length > 0) {
        const { data: userRows, error: uErr } = await supabase
          .from("users")
          .select("auth_user_id, email, updated_at")
          .in("auth_user_id", authIds)
          .order("updated_at", { ascending: false });

        if (uErr) throw uErr;

        // first seen (latest due to order) wins
        (userRows || []).forEach((u) => {
          if (!u?.auth_user_id) return;
          if (!emailByAuth.has(u.auth_user_id))
            emailByAuth.set(u.auth_user_id, u.email);
        });
      }

      const mapped = rows.map((r) => {
        const d = detailsByAuth.get(r.auth_user_id) || null;
        const email = emailByAuth.get(r.auth_user_id) || "";

        return {
          user_ministry_id: r.user_ministry_id,
          ministry_role: r.role || "-",
          status: r.status || "-",
          assigned_at: r.assigned_at || null,
          is_primary: !!r.is_primary,

          auth_user_id: r.auth_user_id || null,

          full_name: d ? safeFullName(d) : "(No profile yet)",
          contact_number: d?.contact_number || "-",
          branch_name: d?.branch?.name || "-",

          email: stripMemberSuffixEmail(email || ""),
        };
      });

      setMinistryMembers(mapped);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load ministry members.");
      setMinistryMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchRequirementsForBranchMinistry = async (branchMinistryId) => {
    if (!branchMinistryId) return;
    try {
      setLoadingReqs(true);
      setErr("");

      const { data, error } = await supabase
        .from("ministry_requirements")
        .select(
          "requirement_id, branch_ministry_id, title, description, requirement_type, is_required, sort_order, config, is_active, created_at, updated_at"
        )
        .eq("branch_ministry_id", Number(branchMinistryId))
        .order("sort_order", { ascending: true })
        .order("requirement_id", { ascending: true });

      if (error) throw error;
      setRequirements(data || []);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load requirements.");
      setRequirements([]);
    } finally {
      setLoadingReqs(false);
    }
  };

  const fetchApplicationsForBranchMinistry = async (branchMinistryId) => {
    if (!branchMinistryId) return;
    try {
      setLoadingApps(true);
      setErr("");

      // Pull applicant profile via users_details (we map via auth_user_id)
      const { data, error } = await supabase
        .from("ministry_applications")
        .select(
          `
          application_id,
          branch_ministry_id,
          applicant_auth_user_id,
          status,
          submitted_at,
          reviewed_at,
          reviewed_by_auth_user_id,
          reviewer_notes,
          created_at,
          updated_at
        `
        )
        .eq("branch_ministry_id", Number(branchMinistryId))
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Enrich applicants with names by querying users_details via auth_user_id
      const authIds = Array.from(
        new Set(
          (data || []).map((x) => x.applicant_auth_user_id).filter(Boolean)
        )
      );

      let detailsByAuth = new Map();
      if (authIds.length > 0) {
        const { data: detailsRows, error: detErr } = await supabase
          .from("users_details")
          .select(
            `
            auth_user_id,
            first_name,
            middle_name,
            last_name,
            suffix,
            contact_number,
            branch_id,
            branch:branches(branch_id, name)
          `
          )
          .in("auth_user_id", authIds);

        if (detErr) throw detErr;

        (detailsRows || []).forEach((d) => {
          detailsByAuth.set(d.auth_user_id, d);
        });
      }

      const mapped = (data || []).map((a) => {
        const d = detailsByAuth.get(a.applicant_auth_user_id) || null;
        return {
          ...a,
          applicant_name: d ? safeFullName(d) : "(No profile yet)",
          applicant_contact: d?.contact_number || "-",
          applicant_branch: d?.branch?.name || "-",
        };
      });

      setApplications(mapped);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load applications.");
      setApplications([]);
    } finally {
      setLoadingApps(false);
    }
  };

  const fetchApplicationDetail = async (applicationId) => {
    if (!applicationId) return;
    try {
      setLoadingAppDetail(true);
      setErr("");

      // load application
      const { data: app, error: appErr } = await supabase
        .from("ministry_applications")
        .select(
          `
          application_id,
          branch_ministry_id,
          applicant_auth_user_id,
          status,
          submitted_at,
          reviewed_at,
          reviewed_by_auth_user_id,
          reviewer_notes,
          created_at
        `
        )
        .eq("application_id", Number(applicationId))
        .maybeSingle();

      if (appErr) throw appErr;

      // applicant profile (birthdate + gender)
      const { data: prof, error: pErr } = await supabase
        .from("users_details")
        .select("auth_user_id, birthdate, gender")
        .eq("auth_user_id", app?.applicant_auth_user_id)
        .maybeSingle();
      if (pErr) throw pErr;
      setApplicantProfile(prof || null);

      // family rows (confirmed only)
      const authId = app?.applicant_auth_user_id;
      const { data: fam, error: fErr } = await supabase
        .from("user_family")
        .select(
          "owner_auth_user_id, family_auth_user_id, status, relationship_owner, relationship_family"
        )
        .or(`owner_auth_user_id.eq.${authId},family_auth_user_id.eq.${authId}`);
      if (fErr) throw fErr;

      const confirmed = (fam || []).filter((r) => {
        const s = String(r.status || "").toLowerCase();
        return s === "accepted" || s === "approved" || s === "confirmed";
      });
      setApplicantFamily(confirmed);

      // load answers + requirement meta
      const { data: answers, error: ansErr } = await supabase
        .from("ministry_application_answers")
        .select(
          `
          answer_id,
          application_id,
          requirement_id,
          answer,
          requirement:ministry_requirements (
            requirement_id,
            title,
            description,
            requirement_type,
            is_required,
            sort_order,
            config
          )
        `
        )
        .eq("application_id", Number(applicationId));

      if (ansErr) throw ansErr;

      // If some requirements have no answers yet, include them too (so reviewer sees missing)
      const { data: reqs, error: reqErr } = await supabase
        .from("ministry_requirements")
        .select(
          "requirement_id, title, description, requirement_type, is_required, sort_order, config"
        )
        .eq("branch_ministry_id", Number(app?.branch_ministry_id))
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("requirement_id", { ascending: true });

      if (reqErr) throw reqErr;

      const answeredMap = new Map();
      (answers || []).forEach((x) => answeredMap.set(x.requirement_id, x));

      const merged = (reqs || []).map((r) => {
        const hit = answeredMap.get(r.requirement_id);
        return {
          requirement: r,
          answer: hit?.answer ?? null,
        };
      });

      setSelectedApp(app || null);
      setReviewNotes(app?.reviewer_notes || "");
      setAppAnswers(merged);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load application details.");
      setSelectedApp(null);
      setAppAnswers([]);
      setApplicantProfile(null);
      setApplicantFamily([]);
    } finally {
      setLoadingAppDetail(false);
    }
  };

  // =========================
  // Actions: requirements
  // =========================
  const openNewRequirement = () => {
    const maxSort = Math.max(
      -10,
      ...(requirements || []).map((r) => Number(r.sort_order || 0))
    );
    const nextSort = maxSort + 10;

    setEditingReq(null);
    setReqForm({
      title: "",
      description: "",
      requirement_type: "text_ack",
      is_required: true,
      sort_order: nextSort,
      is_active: true,

      ack_text: "",
      require_checkbox: true,

      asset_options: ["Guitar", "Keyboard"],
      asset_min_selected: 1,
      asset_max_selected: null,
      asset_require_any: false,

      availability_days: ["Sunday"],
      availability_min_hours: 0,

      family_relations: ["Parent"],
      family_direction: "owner_has_family",

      allowed_genders: [],
      demographic_age_bands: [{ label: "Minor", min_age: null, max_age: 17 }],
    });

    setReqModalOpen(true);
  };

  const openEditRequirement = (r) => {
    const cfg = r?.config || {};

    setEditingReq(r);
    setReqForm({
      title: r?.title || "",
      description: r?.description || "",
      requirement_type: r?.requirement_type || "text_ack",
      is_required: !!r?.is_required,
      sort_order: Number(r?.sort_order ?? 0),
      is_active: !!r?.is_active,

      ack_text: cfg?.ack_text || "",
      require_checkbox: cfg?.require_checkbox ?? true,

      asset_options: cfg?.options || [],
      asset_min_selected: cfg?.min_selected ?? 1,
      asset_max_selected: cfg?.max_selected ?? null,
      asset_require_any: cfg?.require_any ?? false,

      availability_days: cfg?.allowed_days || [],
      availability_min_hours: cfg?.min_hours_per_week ?? 0,

      family_relations: cfg?.must_have_relation || [],
      family_direction: cfg?.direction || "owner_has_family",

      allowed_genders: cfg?.allowed_gender || [],
      demographic_age_bands: Array.isArray(cfg?.age_bands) ? cfg.age_bands : [],
    });

    setReqModalOpen(true);
  };

  const persistRequirementOrder = async (ordered) => {
    try {
      setSavingOrder(true);
      setErr("");

      const updates = ordered.map((r) =>
        supabase
          .from("ministry_requirements")
          .update({ sort_order: r.sort_order })
          .eq("requirement_id", r.requirement_id)
      );

      const results = await Promise.all(updates);
      const firstErr = results.find((x) => x.error)?.error;
      if (firstErr) throw firstErr;
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to save requirement order.");
    } finally {
      setSavingOrder(false);
    }
  };

  const handleDropRequirement = async (dropTargetId) => {
    if (!dragReqId || dragReqId === dropTargetId) return;

    const current = [...requirements];
    const fromIndex = current.findIndex((x) => x.requirement_id === dragReqId);
    const toIndex = current.findIndex((x) => x.requirement_id === dropTargetId);
    if (fromIndex < 0 || toIndex < 0) return;

    const moved = current.splice(fromIndex, 1)[0];
    current.splice(toIndex, 0, moved);

    const normalized = normalizeSortOrders(current);
    setRequirements(normalized);
    setDragReqId(null);

    await persistRequirementOrder(normalized);
  };

  const moveRequirementByDelta = async (reqId, delta) => {
    const current = [...requirements];
    const fromIndex = current.findIndex((x) => x.requirement_id === reqId);
    if (fromIndex < 0) return;
    const toIndex = fromIndex + delta;
    if (toIndex < 0 || toIndex >= current.length) return;

    const moved = current.splice(fromIndex, 1)[0];
    current.splice(toIndex, 0, moved);

    const normalized = normalizeSortOrders(current);
    setRequirements(normalized);
    await persistRequirementOrder(normalized);
  };

  const saveRequirement = async () => {
    if (!selectedBranchMinistry?.branch_ministry_id) return;
    try {
      setSavingReq(true);
      setErr("");

      const msg = validateRequirementForm(reqForm);
      if (msg) {
        setErr(msg);
        return;
      }

      const configObj = buildConfigFromForm(reqForm);

      const payload = {
        branch_ministry_id: Number(selectedBranchMinistry.branch_ministry_id),
        title: reqForm.title.trim(),
        description: reqForm.description?.trim() || null,
        requirement_type: reqForm.requirement_type,
        is_required: !!reqForm.is_required,
        sort_order: Number(reqForm.sort_order || 0),
        is_active: !!reqForm.is_active,
        config: configObj,
      };

      if (editingReq?.requirement_id) {
        const { data, error } = await supabase
          .from("ministry_requirements")
          .update(payload)
          .eq("requirement_id", Number(editingReq.requirement_id))
          .select(
            "requirement_id, branch_ministry_id, title, description, requirement_type, is_required, sort_order, config, is_active, created_at, updated_at"
          )
          .single();
        if (error) throw error;
        if (data) upsertReqIntoState(data);
      } else {
        // created_by_auth_user_id will be set by your RLS/trigger or app (optional).
        // If you want to set it in client, you can fetch auth user and include it.
        const { data, error } = await supabase.from("ministry_requirements")
          .insert({
            ...payload,
            created_by_auth_user_id:
              (await supabase.auth.getUser())?.data?.user?.id || null,
          })
          .select(
            "requirement_id, branch_ministry_id, title, description, requirement_type, is_required, sort_order, config, is_active, created_at, updated_at"
          )
          .single();
        if (error) throw error;
        if (data) upsertReqIntoState(data);
      }

      setReqModalOpen(false);
      setEditingReq(null);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to save requirement.");
    } finally {
      setSavingReq(false);
    }
  };

  const toggleRequirementActive = async (r) => {
    if (!r?.requirement_id) return;
    try {
      setErr("");
      const { data, error } = await supabase
        .from("ministry_requirements")
        .update({ is_active: !r.is_active })
        .eq("requirement_id", Number(r.requirement_id))
        .select(
          "requirement_id, branch_ministry_id, title, description, requirement_type, is_required, sort_order, config, is_active, created_at, updated_at"
        )
        .single();
      if (error) throw error;
      if (data) upsertReqIntoState(data);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to update requirement.");
    }
  };

  const openDeleteRequirementConfirm = (req) => {
    setDeletingReq(req);
    setConfirmDeleteOpen(true);
  };

  const deleteRequirement = async () => {
    if (!deletingReq?.requirement_id) return;

    try {
      setDeleting(true);
      setErr("");

      const { error } = await supabase
        .from("ministry_requirements")
        .delete()
        .eq("requirement_id", Number(deletingReq.requirement_id));

      if (error) throw error;

      setRequirements((prev) =>
        (prev || []).filter(
          (x) => x.requirement_id !== deletingReq.requirement_id
        )
      );

      setConfirmDeleteOpen(false);
      setDeletingReq(null);
      setReqModalOpen(false);
      setEditingReq(null);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to delete requirement.");
    } finally {
      setDeleting(false);
    }
  };

  // =========================
  // Actions: application review -> on approve insert into user_ministries
  // =========================
  const approveApplication = async () => {
    if (
      !selectedApp?.application_id ||
      !selectedBranchMinistry?.branch_ministry_id
    )
      return;

    try {
      setReviewing(true);
      setErr("");

      const reviewerAuth = (await supabase.auth.getUser())?.data?.user?.id;
      if (!reviewerAuth) {
        setErr("No authenticated user.");
        return;
      }

      // BLOCK approve if required items fail
      for (const row of appAnswers) {
        const r = row.requirement;
        const cfg = r?.config || {};
        const isReq = !!r?.is_required;

        const answerJson = normalizeAnswerJson(row.answer);
        const provided = isAnswerProvidedByType(r, answerJson);

        // normal requirements: must be provided if required
        const computedType = ["demographic", "family_relation"].includes(
          r.requirement_type
        );

        if (isReq && !computedType && !provided) {
          setErr(`Cannot approve: Missing required answer for "${r.title}".`);
          return;
        }

        // computed checks
        if (isReq && r.requirement_type === "demographic") {
          if (!passesDemographic(cfg, applicantProfile)) {
            setErr(
              `Cannot approve: Demographic restriction failed for "${r.title}".`
            );
            return;
          }
        }

        if (isReq && r.requirement_type === "family_relation") {
          const applicantAuthId =
            applicantProfile?.auth_user_id || selectedApp?.applicant_auth_user_id;
          if (
            !applicantAuthId ||
            !passesFamilyRelation(cfg, applicantAuthId, applicantFamily)
          ) {
            setErr(`Cannot approve: Family requirement failed for "${r.title}".`);
            return;
          }
        }
      }

      // 1) mark application approved
      const { error: upErr } = await supabase
        .from("ministry_applications")
        .update({
          status: "Approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by_auth_user_id: reviewerAuth,
          reviewer_notes: reviewNotes?.trim() || null,
        })
        .eq("application_id", Number(selectedApp.application_id));

      if (upErr) throw upErr;

      // 2) add to user_ministries (membership)
      // We use auth_user_id as owner; user_id is optional (nullable in your schema)
      const { error: insErr } = await supabase.from("user_ministries").insert({
        auth_user_id: selectedApp.applicant_auth_user_id,
        branch_ministry_id: Number(selectedBranchMinistry.branch_ministry_id),
        status: "Active",
        role: "Member",
        is_primary: false,
        user_id: null,
      });

      // if duplicate because already a member, ignore (unique index on auth_user_id+branch_ministry_id)
      if (
        insErr &&
        !String(insErr.message || "")
          .toLowerCase()
          .includes("duplicate")
      ) {
        throw insErr;
      }

      // refresh right panel data
      await fetchApplicationsForBranchMinistry(
        selectedBranchMinistry.branch_ministry_id
      );
      await fetchMembersForBranchMinistry(
        selectedBranchMinistry.branch_ministry_id
      );

      // refresh modal
      await fetchApplicationDetail(selectedApp.application_id);

      setErr("");
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to approve application.");
    } finally {
      setReviewing(false);
    }
  };

  const rejectApplication = async () => {
    if (!selectedApp?.application_id) return;

    try {
      setReviewing(true);
      setErr("");

      const reviewerAuth = (await supabase.auth.getUser())?.data?.user?.id;
      if (!reviewerAuth) {
        setErr("No authenticated user.");
        return;
      }

      const { error } = await supabase
        .from("ministry_applications")
        .update({
          status: "Rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by_auth_user_id: reviewerAuth,
          reviewer_notes: reviewNotes?.trim() || null,
        })
        .eq("application_id", Number(selectedApp.application_id));

      if (error) throw error;

      await fetchApplicationsForBranchMinistry(
        selectedBranchMinistry.branch_ministry_id
      );
      await fetchApplicationDetail(selectedApp.application_id);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to reject application.");
    } finally {
      setReviewing(false);
    }
  };

  // =========================
  // Init
  // =========================
  useEffect(() => {
    let mounted = true;
    (async () => {
      await fetchBranches();
      if (!mounted) return;
      await fetchMinistriesAcrossBranches("ALL");
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchMinistriesAcrossBranches(branchFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchFilter]);

  // When selection changes, load the active tab data
  useEffect(() => {
    const id = selectedBranchMinistry?.branch_ministry_id;
    if (!id) {
      setMinistryMembers([]);
      setRequirements([]);
      setApplications([]);
      return;
    }
    // default tab stays; we fetch all 3 once so switching is instant
    fetchMembersForBranchMinistry(id);
    fetchRequirementsForBranchMinistry(id);
    fetchApplicationsForBranchMinistry(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchMinistry?.branch_ministry_id]);

  // =========================
  // Filtering
  // =========================
  const filteredMinistryRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return ministryRows;
    return ministryRows.filter((r) => {
      const a = String(r.ministry_name || "").toLowerCase();
      const b = String(r.branch_name || "").toLowerCase();
      return a.includes(q) || b.includes(q);
    });
  }, [ministryRows, searchQuery]);

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return ministryMembers;
    return ministryMembers.filter((m) => {
      const name = String(m.full_name || "").toLowerCase();
      const email = String(m.email || "").toLowerCase();
      const branch = String(m.branch_name || "").toLowerCase();
      return name.includes(q) || email.includes(q) || branch.includes(q);
    });
  }, [ministryMembers, searchQuery]);

  const filteredReqs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return requirements;
    return requirements.filter((r) => {
      const t = String(r.title || "").toLowerCase();
      const d = String(r.description || "").toLowerCase();
      const ty = String(r.requirement_type || "").toLowerCase();
      return t.includes(q) || d.includes(q) || ty.includes(q);
    });
  }, [requirements, searchQuery]);

  const canDrag = !searchQuery.trim();

  const filteredApps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter((a) => {
      const n = String(a.applicant_name || "").toLowerCase();
      const s = String(a.status || "").toLowerCase();
      return n.includes(q) || s.includes(q);
    });
  }, [applications, searchQuery]);

  // =========================
  // UI
  // =========================
  const bmTitle = selectedBranchMinistry
    ? `${selectedBranchMinistry.branch_name} • ${selectedBranchMinistry.ministry_name}`
    : "";

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />

        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <div className="w-full space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Church Ministries
              </h1>
              <p className="text-sm text-gray-600">
                {roleLabel} view: manage ministries, requirements, and
                applications.
              </p>
            </div>

            {err && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-3 text-sm">
                {err}
              </div>
            )}

            {/* Search + Branch Filter */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Search size={18} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Search ministry, branch, member, requirements, or applications"
                  className="flex-1 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="text-xs font-semibold text-gray-500">
                  Branch Filter:
                </div>
                <select
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  disabled={loadingBranches}
                >
                  <option value="ALL">{allBranchesLabel}</option>
                  {branches.map((b) => (
                    <option key={b.branch_id} value={String(b.branch_id)}>
                      {b.name}
                    </option>
                  ))}
                </select>

                <div className="ml-auto text-xs text-gray-500">
                  {loadingMinistries
                    ? "Loading ministries..."
                    : `${filteredMinistryRows.length} ministry record(s)`}
                </div>
              </div>
            </div>

            {/* Left Ministries, Right Details */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Ministries list */}
              <div className="lg:col-span-5 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="font-bold text-gray-900">
                    Ministries (by Branch)
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Select one to manage: members, requirements, and
                    applications.
                  </p>
                </div>

                <div className="max-h-[560px] overflow-auto">
                  {loadingMinistries ? (
                    <div className="p-6 text-center text-gray-600">
                      Loading...
                    </div>
                  ) : filteredMinistryRows.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      No ministries found.
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-600 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 text-left">Branch</th>
                          <th className="px-4 py-3 text-left">Ministry</th>
                          <th className="px-4 py-3 text-center">Members</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMinistryRows.map((r) => {
                          const selected =
                            selectedBranchMinistry?.branch_ministry_id ===
                            r.branch_ministry_id;

                          return (
                            <tr
                              key={r.branch_ministry_id}
                              className={`border-t cursor-pointer ${
                                selected ? "bg-emerald-50" : "hover:bg-gray-50"
                              }`}
                              onClick={() => {
                                setSelectedBranchMinistry(r);
                                setRightTab("members");
                              }}
                            >
                              <td className="px-4 py-3">
                                <div className="font-semibold text-gray-900">
                                  {r.branch_name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  ID: {r.branch_id}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-semibold text-gray-900">
                                  {r.ministry_name}
                                </div>
                                {r?.ministry?.description ? (
                                  <div className="text-xs text-gray-500 line-clamp-2">
                                    {r.ministry.description}
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-400">
                                    No description
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex items-center justify-center min-w-[44px] px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                                  {r.member_count}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Right panel */}
              <div className="lg:col-span-7 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-bold text-gray-900">
                        Ministry Details
                      </h2>
                      <p className="text-xs text-gray-500 mt-1">
                        {selectedBranchMinistry
                          ? bmTitle
                          : "Select a ministry on the left."}
                      </p>
                    </div>
                    {selectedBranchMinistry && (
                      <div className="flex items-center gap-2">
                        <button
                          className={`px-3 py-2 rounded-xl text-xs font-semibold border ${
                            rightTab === "members"
                              ? "bg-gray-900 text-white border-gray-900"
                              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                          }`}
                          onClick={() => setRightTab("members")}
                        >
                          Members
                        </button>
                        <button
                          className={`px-3 py-2 rounded-xl text-xs font-semibold border ${
                            rightTab === "requirements"
                              ? "bg-gray-900 text-white border-gray-900"
                              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                          }`}
                          onClick={() => setRightTab("requirements")}
                        >
                          Requirements
                        </button>
                        <button
                          className={`px-3 py-2 rounded-xl text-xs font-semibold border ${
                            rightTab === "applications"
                              ? "bg-gray-900 text-white border-gray-900"
                              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                          }`}
                          onClick={() => setRightTab("applications")}
                        >
                          Applications
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {!selectedBranchMinistry ? (
                  <div className="p-10 text-center text-gray-500">
                    Select a ministry to manage requirements and applications.
                  </div>
                ) : rightTab === "members" ? (
                  <>
                    <div className="px-5 py-3 border-b text-xs text-gray-500 flex items-center justify-between">
                      <div>
                        Members list (from <b>user_ministries</b>)
                      </div>
                      <div>
                        {loadingMembers
                          ? "Loading..."
                          : `${filteredMembers.length} member(s)`}
                      </div>
                    </div>

                    {loadingMembers ? (
                      <div className="p-10 text-center text-gray-600">
                        Loading members…
                      </div>
                    ) : filteredMembers.length === 0 ? (
                      <div className="p-10 text-center text-gray-500">
                        No members assigned to this ministry yet.
                      </div>
                    ) : (
                      <div className="overflow-auto">
                        <table className="min-w-full text-sm text-left">
                          <thead className="bg-gray-50 text-gray-600">
                            <tr>
                              <th className="px-4 py-3 font-semibold">
                                Member
                              </th>
                              <th className="px-4 py-3 font-semibold">Email</th>
                              <th className="px-4 py-3 font-semibold">
                                Ministry Role
                              </th>
                              <th className="px-4 py-3 font-semibold">
                                Status
                              </th>
                              <th className="px-4 py-3 font-semibold">
                                Assigned
                              </th>
                              <th className="px-4 py-3 font-semibold">
                                Primary
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {filteredMembers.map((m) => (
                              <tr
                                key={m.user_ministry_id}
                                className="hover:bg-gray-50"
                              >
                                <td className="px-4 py-3">
                                  <div className="font-semibold text-gray-900">
                                    {m.full_name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {m.branch_name}
                                  </div>
                                </td>
                                <td className="px-4 py-3">{m.email || "-"}</td>
                                <td className="px-4 py-3">
                                  {m.ministry_role || "-"}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                                      String(m.status || "").toLowerCase() ===
                                      "active"
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-gray-100 text-gray-700"
                                    }`}
                                  >
                                    {m.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  {fmtDateOnly(m.assigned_at)}
                                </td>
                                <td className="px-4 py-3">
                                  {m.is_primary ? (
                                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                                      Yes
                                    </span>
                                  ) : (
                                    <span className="text-xs text-gray-500">
                                      No
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="px-5 py-3 border-t text-xs text-gray-500">
                      Flow: Members are here only after an application is{" "}
                      <b>Approved</b>.
                    </div>
                  </>
                ) : rightTab === "requirements" ? (
                  <>
                    <div className="px-5 py-3 border-b text-xs text-gray-500 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Settings2 size={16} className="text-gray-400" />
                        <span>
                          Requirements (from <b>ministry_requirements</b>) —
                          users must comply before approval
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-gray-500">
                          {savingOrder ? "Saving order..." : ""}
                        </div>
                        {searchQuery.trim() ? (
                          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                            Clear search to reorder requirements.
                          </div>
                        ) : null}
                        <div className="text-xs text-gray-500">
                          {loadingReqs
                            ? "Loading..."
                            : `${filteredReqs.length} requirement(s)`}
                        </div>
                        <button
                          onClick={openNewRequirement}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-gray-900 text-white hover:bg-gray-800"
                        >
                          <Plus size={16} />
                          Add
                        </button>
                      </div>
                    </div>

                    {loadingReqs ? (
                      <div className="p-10 text-center text-gray-600">
                        Loading requirements…
                      </div>
                    ) : filteredReqs.length === 0 ? (
                      <div className="p-10 text-center text-gray-500">
                        No requirements yet. Add rules so members are guided
                        before joining.
                      </div>
                    ) : (
                      <div className="overflow-auto">
                        <table className="min-w-full text-sm text-left">
                          <thead className="bg-gray-50 text-gray-600">
                            <tr>
                              <th className="px-4 py-3 font-semibold">Title</th>
                              <th className="px-4 py-3 font-semibold">Type</th>
                              <th className="px-4 py-3 font-semibold">
                                Required
                              </th>
                              <th className="px-4 py-3 font-semibold">
                                Active
                              </th>
                              <th className="px-4 py-3 font-semibold text-right">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {filteredReqs.map((r, idx) => (
                              <tr
                                key={r.requirement_id}
                                draggable={canDrag}
                                onDragStart={() =>
                                  canDrag && setDragReqId(r.requirement_id)
                                }
                                onDragOver={(e) =>
                                  canDrag && e.preventDefault()
                                }
                                onDrop={() =>
                                  canDrag &&
                                  handleDropRequirement(r.requirement_id)
                                }
                                className={`hover:bg-gray-50 ${
                                  canDrag
                                    ? "cursor-move"
                                    : "cursor-default opacity-95"
                                }`}
                                title={
                                  canDrag
                                    ? "Drag to reorder"
                                    : "Clear search to reorder"
                                }
                              >
                                <td className="px-4 py-3">
                                  <div className="flex items-start gap-2">
                                    <GripVertical
                                      className="text-gray-300 mt-0.5"
                                      size={16}
                                    />
                                    <div className="flex-1">
                                      <div className="font-semibold text-gray-900">
                                        {r.title}
                                      </div>
                                      {r.description ? (
                                        <div className="text-xs text-gray-500 line-clamp-2">
                                          {r.description}
                                        </div>
                                      ) : (
                                        <div className="text-xs text-gray-400">
                                          No description
                                        </div>
                                      )}
                                      <div className="text-xs text-gray-400 mt-1">
                                        Sort: {r.sort_order}
                                      </div>
                                    </div>

                                    {canDrag ? (
                                      <div className="flex flex-col gap-1">
                                        <button
                                          type="button"
                                          className="p-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                                          onClick={() =>
                                            moveRequirementByDelta(
                                              r.requirement_id,
                                              -1
                                            )
                                          }
                                          disabled={idx === 0 || savingOrder}
                                          title="Move up"
                                        >
                                          <ArrowUp
                                            size={14}
                                            className="text-gray-500"
                                          />
                                        </button>
                                        <button
                                          type="button"
                                          className="p-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                                          onClick={() =>
                                            moveRequirementByDelta(
                                              r.requirement_id,
                                              1
                                            )
                                          }
                                          disabled={
                                            idx === filteredReqs.length - 1 ||
                                            savingOrder
                                          }
                                          title="Move down"
                                        >
                                          <ArrowDown
                                            size={14}
                                            className="text-gray-500"
                                          />
                                        </button>
                                      </div>
                                    ) : null}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-xs font-semibold bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                                    {r.requirement_type}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  {r.is_required ? "Yes" : "No"}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                      r.is_active
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-gray-100 text-gray-700"
                                    }`}
                                  >
                                    {r.is_active ? "Active" : "Disabled"}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex justify-end gap-2">
                                    <button
                                      onClick={() => openEditRequirement(r)}
                                      className="px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 hover:bg-gray-50"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="px-5 py-3 border-t text-xs text-gray-500">
                      Flow: Member applies → answers these requirements →
                      Bishop/Pastor reviews → if Approved → added to{" "}
                      <b>user_ministries</b>.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="px-5 py-3 border-b text-xs text-gray-500 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ClipboardList size={16} className="text-gray-400" />
                        <span>
                          Applications (from <b>ministry_applications</b>)
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {loadingApps
                          ? "Loading..."
                          : `${filteredApps.length} application(s)`}
                      </div>
                    </div>

                    {loadingApps ? (
                      <div className="p-10 text-center text-gray-600">
                        Loading applications…
                      </div>
                    ) : filteredApps.length === 0 ? (
                      <div className="p-10 text-center text-gray-500">
                        No applications yet for this ministry.
                      </div>
                    ) : (
                      <div className="overflow-auto">
                        <table className="min-w-full text-sm text-left">
                          <thead className="bg-gray-50 text-gray-600">
                            <tr>
                              <th className="px-4 py-3 font-semibold">
                                Applicant
                              </th>
                              <th className="px-4 py-3 font-semibold">
                                Status
                              </th>
                              <th className="px-4 py-3 font-semibold">
                                Submitted
                              </th>
                              <th className="px-4 py-3 font-semibold text-right">
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {filteredApps.map((a) => (
                              <tr
                                key={a.application_id}
                                className="hover:bg-gray-50"
                              >
                                <td className="px-4 py-3">
                                  <div className="font-semibold text-gray-900">
                                    {a.applicant_name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {a.applicant_branch} • {a.applicant_contact}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    Auth:{" "}
                                    {String(a.applicant_auth_user_id).slice(
                                      0,
                                      8
                                    )}
                                    …
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${STATUS_PILL(
                                      a.status
                                    )}`}
                                  >
                                    {a.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  {fmtDateOnly(a.submitted_at || a.created_at)}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex justify-end">
                                    <button
                                      onClick={async () => {
                                        setAppModalOpen(true);
                                        await fetchApplicationDetail(
                                          a.application_id
                                        );
                                      }}
                                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 hover:bg-gray-50"
                                    >
                                      <Eye size={16} />
                                      Review
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="px-5 py-3 border-t text-xs text-gray-500">
                      Flow: Review the submission answers. Approve will
                      automatically insert into <b>user_ministries</b>.
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* =========================
          Requirement Modal
         ========================= */}
      {reqModalOpen && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <div className="font-bold text-gray-900">
                  {editingReq ? "Edit Requirement" : "Add Requirement"}
                </div>
                <div className="text-xs text-gray-500">{bmTitle}</div>
              </div>
              <button
                onClick={() => {
                  setReqModalOpen(false);
                  setEditingReq(null);
                }}
                className="p-2 rounded-xl hover:bg-gray-100"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-semibold text-gray-600 mb-1">
                    Title
                  </div>
                  <input
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                    value={reqForm.title}
                    onChange={(e) =>
                      setReqForm((p) => ({ ...p, title: e.target.value }))
                    }
                    placeholder="e.g., Must attend weekly practice"
                  />
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-600 mb-1">
                    Type
                  </div>
                  <select
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                    value={reqForm.requirement_type}
                    onChange={(e) =>
                      setReqForm((p) => ({
                        ...p,
                        requirement_type: e.target.value,
                      }))
                    }
                  >
                    <option value="text_ack">text_ack</option>
                    <option value="availability">availability</option>
                    <option value="skill_select">skill_select</option>
                    <option value="asset_select">asset_select</option>
                    <option value="family_relation">family_relation</option>
                    <option value="demographic">demographic</option>
                    <option value="custom_form">custom_form</option>
                  </select>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-600 mb-1">
                    Sort Order
                  </div>
                  <input
                    type="number"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                    value={reqForm.sort_order}
                    onChange={(e) =>
                      setReqForm((p) => ({ ...p, sort_order: e.target.value }))
                    }
                  />
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={reqForm.is_required}
                      onChange={(e) =>
                        setReqForm((p) => ({
                          ...p,
                          is_required: e.target.checked,
                        }))
                      }
                    />
                    Required
                  </label>

                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={reqForm.is_active}
                      onChange={(e) =>
                        setReqForm((p) => ({
                          ...p,
                          is_active: e.target.checked,
                        }))
                      }
                    />
                    Active
                  </label>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-600 mb-1">
                  Description
                </div>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[80px]"
                  value={reqForm.description}
                  onChange={(e) =>
                    setReqForm((p) => ({ ...p, description: e.target.value }))
                  }
                  placeholder="Explain what the member needs to do/submit"
                />
              </div>

              {reqForm.requirement_type === "text_ack" && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-600">
                    Agreement Text
                  </div>
                  <textarea
                    className="w-full border border-gray-200 rounded-2xl p-3 text-sm min-h-[120px]"
                    value={reqForm.ack_text}
                    onChange={(e) =>
                      setReqForm((p) => ({ ...p, ack_text: e.target.value }))
                    }
                    placeholder="Type the agreement/commitment the applicant must accept..."
                  />
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={reqForm.require_checkbox}
                      onChange={(e) =>
                        setReqForm((p) => ({
                          ...p,
                          require_checkbox: e.target.checked,
                        }))
                      }
                    />
                    Require checkbox acknowledgment
                  </label>
                </div>
              )}

              {(reqForm.requirement_type === "asset_select" ||
                reqForm.requirement_type === "skill_select") && (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-gray-600">
                    {reqForm.requirement_type === "skill_select"
                      ? "Skill options"
                      : "Asset options"}
                  </div>

                  <div className="space-y-2">
                    {(reqForm.asset_options || []).map((opt, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                          value={opt}
                          onChange={(e) => {
                            const next = [...(reqForm.asset_options || [])];
                            next[idx] = e.target.value;
                            setReqForm((p) => ({ ...p, asset_options: next }));
                          }}
                          placeholder={
                            reqForm.requirement_type === "skill_select"
                              ? "e.g., Singing"
                              : "e.g., Guitar"
                          }
                        />
                        <button
                          type="button"
                          className="px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 hover:bg-gray-50"
                          onClick={() => {
                            const next = (reqForm.asset_options || []).filter(
                              (_, i) => i !== idx
                            );
                            setReqForm((p) => ({ ...p, asset_options: next }));
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-gray-900 text-white hover:bg-gray-800"
                      onClick={() =>
                        setReqForm((p) => ({
                          ...p,
                          asset_options: [...(p.asset_options || []), ""],
                        }))
                      }
                    >
                      + Add option
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <div className="text-xs font-semibold text-gray-600 mb-1">
                        Min selected
                      </div>
                      <input
                        type="number"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                        value={reqForm.asset_min_selected}
                        onChange={(e) =>
                          setReqForm((p) => ({
                            ...p,
                            asset_min_selected: e.target.value,
                          }))
                        }
                        min={0}
                      />
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-gray-600 mb-1">
                        Max selected (optional)
                      </div>
                      <input
                        type="number"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                        value={reqForm.asset_max_selected ?? ""}
                        onChange={(e) =>
                          setReqForm((p) => ({
                            ...p,
                            asset_max_selected: e.target.value,
                          }))
                        }
                        min={0}
                        placeholder="blank = no max"
                      />
                    </div>

                    <label className="flex items-center gap-2 pt-6 text-sm">
                      <input
                        type="checkbox"
                        checked={reqForm.asset_require_any}
                        onChange={(e) =>
                          setReqForm((p) => ({
                            ...p,
                            asset_require_any: e.target.checked,
                          }))
                        }
                      />
                      Require any one
                    </label>
                  </div>
                </div>
              )}

              {reqForm.requirement_type === "availability" && (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-gray-600">
                    Allowed days
                  </div>

                  {[
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                  ].map((day) => {
                    const checked = (reqForm.availability_days || []).includes(
                      day
                    );
                    return (
                      <label
                        key={day}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const set = new Set(
                              reqForm.availability_days || []
                            );
                            if (e.target.checked) set.add(day);
                            else set.delete(day);
                            setReqForm((p) => ({
                              ...p,
                              availability_days: Array.from(set),
                            }));
                          }}
                        />
                        {day}
                      </label>
                    );
                  })}

                  <div>
                    <div className="text-xs font-semibold text-gray-600 mb-1">
                      Min hours/week
                    </div>
                    <input
                      type="number"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                      value={reqForm.availability_min_hours}
                      onChange={(e) =>
                        setReqForm((p) => ({
                          ...p,
                          availability_min_hours: e.target.value,
                        }))
                      }
                      min={0}
                    />
                  </div>
                </div>
              )}

              {reqForm.requirement_type === "family_relation" && (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-gray-600">
                    Required relations
                  </div>

                  {(reqForm.family_relations || []).map((rel, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                        value={rel}
                        onChange={(e) => {
                          const next = [...(reqForm.family_relations || [])];
                          next[idx] = e.target.value;
                          setReqForm((p) => ({ ...p, family_relations: next }));
                        }}
                        placeholder="e.g., Parent / Spouse / Child"
                      />
                      <button
                        type="button"
                        className="px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 hover:bg-gray-50"
                        onClick={() => {
                          const next = (reqForm.family_relations || []).filter(
                            (_, i) => i !== idx
                          );
                          setReqForm((p) => ({ ...p, family_relations: next }));
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-gray-900 text-white hover:bg-gray-800"
                    onClick={() =>
                      setReqForm((p) => ({
                        ...p,
                        family_relations: [...(p.family_relations || []), ""],
                      }))
                    }
                  >
                    + Add relation
                  </button>

                  <div>
                    <div className="text-xs font-semibold text-gray-600 mb-1">
                      Direction
                    </div>
                    <select
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                      value={reqForm.family_direction}
                      onChange={(e) =>
                        setReqForm((p) => ({
                          ...p,
                          family_direction: e.target.value,
                        }))
                      }
                    >
                      <option value="owner_has_family">
                        Applicant must have this relation
                      </option>
                      <option value="family_has_owner">
                        Related person must list applicant
                      </option>
                      <option value="either_direction">Either direction</option>
                    </select>
                  </div>
                </div>
              )}

              {reqForm.requirement_type === "demographic" && (
                <div className="space-y-4">
                  <div className="text-xs font-semibold text-gray-600">
                    Allowed Gender
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {["Male", "Female"].map((g) => {
                      const checked = (reqForm.allowed_genders || []).includes(
                        g
                      );
                      return (
                        <label key={g} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const set = new Set(reqForm.allowed_genders || []);
                              if (e.target.checked) set.add(g);
                              else set.delete(g);
                              setReqForm((p) => ({
                                ...p,
                                allowed_genders: Array.from(set),
                              }));
                            }}
                          />
                          {g}
                        </label>
                      );
                    })}
                  </div>

                  <div className="text-xs font-semibold text-gray-600 pt-2">
                    Age Bands (optional)
                  </div>

                  <div className="space-y-2">
                    {(reqForm.demographic_age_bands || []).map((b, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-1 md:grid-cols-12 gap-2"
                      >
                        <div className="md:col-span-4">
                          <input
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                            placeholder="Label (e.g., Minor)"
                            value={b.label || ""}
                            onChange={(e) => {
                              const next = [
                                ...(reqForm.demographic_age_bands || []),
                              ];
                              next[idx] = { ...next[idx], label: e.target.value };
                              setReqForm((p) => ({
                                ...p,
                                demographic_age_bands: next,
                              }));
                            }}
                          />
                        </div>

                        <div className="md:col-span-3">
                          <input
                            type="number"
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                            placeholder="Min age"
                            value={b.min_age ?? ""}
                            min={0}
                            onChange={(e) => {
                              const next = [
                                ...(reqForm.demographic_age_bands || []),
                              ];
                              next[idx] = {
                                ...next[idx],
                                min_age: e.target.value,
                              };
                              setReqForm((p) => ({
                                ...p,
                                demographic_age_bands: next,
                              }));
                            }}
                          />
                        </div>

                        <div className="md:col-span-3">
                          <input
                            type="number"
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                            placeholder="Max age"
                            value={b.max_age ?? ""}
                            min={0}
                            onChange={(e) => {
                              const next = [
                                ...(reqForm.demographic_age_bands || []),
                              ];
                              next[idx] = {
                                ...next[idx],
                                max_age: e.target.value,
                              };
                              setReqForm((p) => ({
                                ...p,
                                demographic_age_bands: next,
                              }));
                            }}
                          />
                        </div>

                        <div className="md:col-span-2 flex">
                          <button
                            type="button"
                            className="w-full px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 hover:bg-gray-50"
                            onClick={() => {
                              const next = (
                                reqForm.demographic_age_bands || []
                              ).filter((_, i) => i !== idx);
                              setReqForm((p) => ({
                                ...p,
                                demographic_age_bands: next,
                              }));
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-gray-900 text-white hover:bg-gray-800"
                      onClick={() =>
                        setReqForm((p) => ({
                          ...p,
                          demographic_age_bands: [
                            ...(p.demographic_age_bands || []),
                            { label: "", min_age: null, max_age: null },
                          ],
                        }))
                      }
                    >
                      + Add age band
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              {editingReq?.requirement_id && (
                <div className="mr-auto flex items-center gap-2">
                  <button
                    onClick={() => toggleRequirementActive(editingReq)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50"
                    disabled={savingReq}
                  >
                    {editingReq.is_active ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => openDeleteRequirementConfirm(editingReq)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border border-rose-200 text-rose-700 hover:bg-rose-50"
                    disabled={savingReq}
                  >
                    Delete
                  </button>
                </div>
              )}
              <button
                onClick={() => {
                  setReqModalOpen(false);
                  setEditingReq(null);
                }}
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50"
                disabled={savingReq}
              >
                Cancel
              </button>
              <button
                onClick={saveRequirement}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800"
                disabled={savingReq}
              >
                {savingReq ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="font-bold text-gray-900">Delete Requirement</div>
              <button
                onClick={() => {
                  if (deleting) return;
                  setConfirmDeleteOpen(false);
                  setDeletingReq(null);
                }}
                className="p-2 rounded-xl hover:bg-gray-100"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-2">
              <div className="text-sm text-gray-700">
                Are you sure you want to delete:
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {deletingReq?.title || "This requirement"}
              </div>
              <div className="text-xs text-gray-500">
                This action cannot be undone.
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (deleting) return;
                  setConfirmDeleteOpen(false);
                  setDeletingReq(null);
                }}
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50"
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={deleteRequirement}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60"
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================
          Application Review Modal
         ========================= */}
      {appModalOpen && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <div className="font-bold text-gray-900">
                  Application Review
                </div>
                <div className="text-xs text-gray-500">{bmTitle}</div>
              </div>
              <button
                onClick={() => {
                  setAppModalOpen(false);
                  setSelectedApp(null);
                  setAppAnswers([]);
                  setReviewNotes("");
                }}
                className="p-2 rounded-xl hover:bg-gray-100"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto">
              {loadingAppDetail ? (
                <div className="p-10 text-center text-gray-600">
                  Loading application…
                </div>
              ) : !selectedApp ? (
                <div className="p-10 text-center text-gray-500">
                  No application loaded.
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-1">
                      <div className="text-sm text-gray-700">
                        <span className="font-semibold">Status:</span>{" "}
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${STATUS_PILL(
                            selectedApp.status
                          )}`}
                        >
                          {selectedApp.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Submitted:{" "}
                        {fmtDateOnly(
                          selectedApp.submitted_at || selectedApp.created_at
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        Applicant Auth:{" "}
                        {String(selectedApp.applicant_auth_user_id).slice(
                          0,
                          12
                        )}
                        …
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={rejectApplication}
                        disabled={
                          reviewing ||
                          String(selectedApp.status || "").toLowerCase() ===
                            "approved"
                        }
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                      >
                        <XCircle size={18} />
                        Reject
                      </button>
                      <button
                        onClick={approveApplication}
                        disabled={
                          reviewing ||
                          String(selectedApp.status || "").toLowerCase() ===
                            "approved"
                        }
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        <CheckCircle2 size={18} />
                        Approve & Add Member
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
                    <div className="lg:col-span-8">
                      <div className="text-sm font-bold text-gray-900 mb-2">
                        Requirement Answers
                      </div>

                      <div className="space-y-3">
                        {appAnswers.length === 0 ? (
                          <div className="text-sm text-gray-500">
                            No requirements/answers found.
                          </div>
                        ) : (
                          appAnswers.map((row) => {
                            const r = row.requirement;
                            const answerJson = normalizeAnswerJson(row.answer);
                            const answerProvided = isAnswerProvidedByType(
                              r,
                              answerJson
                            );
                            const missing = r?.is_required && !answerProvided;

                            return (
                              <div
                                key={r.requirement_id}
                                className={`border rounded-2xl p-4 ${
                                  missing
                                    ? "border-rose-200 bg-rose-50"
                                    : "border-gray-100 bg-white"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="font-semibold text-gray-900">
                                      {r.title}{" "}
                                      {r.is_required ? (
                                        <span className="text-rose-600">*</span>
                                      ) : null}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      Type:{" "}
                                      {prettyTypeLabel(r.requirement_type)}
                                    </div>
                                    {r.description ? (
                                      <div className="text-sm text-gray-600 mt-2">
                                        {r.description}
                                      </div>
                                    ) : null}
                                  </div>

                                  <Chip tone={answerProvided ? "good" : "warn"}>
                                    {answerProvided ? "Provided" : "Missing"}
                                  </Chip>
                                </div>

                                <div className="mt-4">
                                  {answerJson == null ? (
                                    <div className="text-sm text-gray-600">
                                      —
                                    </div>
                                  ) : (
                                    renderAnswerFriendly(
                                      r,
                                      answerJson,
                                      applicantProfile,
                                      applicantFamily
                                    )
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div className="lg:col-span-4">
                      <div className="text-sm font-bold text-gray-900 mb-2">
                        Reviewer Notes
                      </div>
                      <textarea
                        className="w-full border border-gray-200 rounded-2xl p-3 text-sm min-h-[180px]"
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        placeholder="Write notes, reasons, or next steps..."
                      />
                      <div className="text-[11px] text-gray-500 mt-2">
                        Notes are saved when you approve/reject.
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => {
                  setAppModalOpen(false);
                  setSelectedApp(null);
                  setAppAnswers([]);
                  setReviewNotes("");
                }}
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
