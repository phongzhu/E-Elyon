// src/pages/Bishop/manage-ministry-activity.jsx
import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { supabase } from "../../lib/supabaseClient";
import {
  Search,
  Plus,
  X,
  Eye,
  Pencil,
  Trash2,
  Users,
  CheckCircle2,
  Calendar,
  ListChecks,
  Pin,
  GripVertical,
} from "lucide-react";

/**
 * Updated Flow:
 * 1) Select Branch
 * 2) Choose Plan Type: Event / Series / Normal
 * 3) Pick Event/Series when applicable
 * 4) Enter Title, Location, Times
 * 5) Select Affected Ministries (checkbox multi-select)
 * 6) Head is auto: Pastor of selected branch (not manually picked)
 *
 * Requires optional table for multi-ministry audiences:
 * - public.ministry_activity_audiences(activity_id, branch_ministry_id)
 */

const fmtDateTime = (val) => {
  if (!val) return "-";
  const d = new Date(val);
  return isNaN(d.getTime()) ? "-" : d.toLocaleString();
};

const safeName = (ud) =>
  [ud?.first_name, ud?.middle_name, ud?.last_name, ud?.suffix]
    .filter(Boolean)
    .join(" ")
    .trim() || "Unknown";

function toDatetimeLocalValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

const toIsoFromLocalInput = (v) => {
  if (!v) return null;
  const [datePart, timePart] = v.split("T");
  if (!datePart || !timePart) return null;
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0).toISOString();
};

const parseAnswer = (v) => {
  if (v == null) return null;
  let x = v;
  for (let i = 0; i < 2; i += 1) {
    if (typeof x === "string") {
      try {
        x = JSON.parse(x);
      } catch {
        return null;
      }
    }
  }
  return x;
};

const normalizeToken = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const flattenSkillArray = (arr) =>
  (arr || [])
    .map((x) => {
      if (typeof x === "string") return x;
      return x?.value ?? x?.label ?? "";
    })
    .filter(Boolean);

const extractSkillsFromAnswer = (parsed) => {
  if (!parsed) return [];

  if (Array.isArray(parsed)) {
    return flattenSkillArray(parsed).map(normalizeToken).filter(Boolean);
  }

  if (typeof parsed === "string") {
    return [normalizeToken(parsed)].filter(Boolean);
  }

  if (typeof parsed === "object") {
    const selectedRaw = Array.isArray(parsed.selected)
      ? parsed.selected
      : Array.isArray(parsed.skills)
        ? parsed.skills
        : Array.isArray(parsed.value)
          ? parsed.value
          : [];

    const selected = flattenSkillArray(selectedRaw);

    const otherCandidates = [
      parsed.other_text,
      parsed.otherText,
      parsed.other,
      parsed.others,
      parsed.custom,
      parsed.custom_text,
      parsed.customText,
    ].filter(Boolean);

    const otherEnabled =
      parsed.other_checked ?? parsed.otherChecked ?? otherCandidates.length > 0;

    const out = [...selected];
    if (otherEnabled) out.push(...otherCandidates);

    return out.map(normalizeToken).filter(Boolean);
  }

  return [];
};

const cleanRoleName = (roleName) =>
  String(roleName || "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/need\s*\d+/g, "")
    .replace(/[^a-z\s]/g, " ")
    .trim();

const weekdayName = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { weekday: "long" });
};

const timeBucket = (iso) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const h = d.getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
};

const memberAvailableForTask = (profile, taskStartIso, taskEndIso) => {
  const avail = profile?.availability;
  if (!avail) return { ok: true, reason: "No availability provided" };

  const days = Array.isArray(avail.days) ? avail.days : [];
  if (taskStartIso) {
    const day = weekdayName(taskStartIso);
    if (day && days.length && !days.includes(day)) {
      return { ok: false, reason: `Not available on ${day}` };
    }
  }

  const notes = String(avail.notes || "").toLowerCase();
  if (taskStartIso && notes) {
    const bucket = timeBucket(taskStartIso);
    if (bucket && notes.includes("morning") && bucket !== "morning")
      return { ok: false, reason: "Morning only" };
    if (bucket && notes.includes("afternoon") && bucket !== "afternoon")
      return { ok: false, reason: "Afternoon only" };
    if (bucket && notes.includes("evening") && bucket !== "evening")
      return { ok: false, reason: "Evening only" };
  }

  return { ok: true, reason: "Matches availability" };
};

const roleMatchesSkills = (roleName, skills = []) => {
  const role = normalizeToken(cleanRoleName(roleName));
  if (!role) return true;

  const roleTokens = role.split(" ").filter(Boolean);

  const synonyms = {
    drummer: ["drums", "drummer"],
    guitarist: ["guitar", "guitarist"],
    bassist: ["bass", "bassist"],
    singer: ["singing", "vocals", "vocalist", "singer"],
    "sound tech": [
      "sound technician",
      "audio",
      "audio tech",
      "sound",
      "sound system",
    ],
    "camera operator": ["camera", "videography", "videographer"],
    media: ["multimedia", "graphics", "editor", "editing"],
  };

  const expandedRoles = [role, ...(synonyms[role] || [])]
    .map(normalizeToken)
    .filter(Boolean);

  const skillSet = new Set((skills || []).map(normalizeToken).filter(Boolean));

  if (expandedRoles.some((r) => skillSet.has(r))) return true;

  for (const s of skillSet) {
    if (expandedRoles.some((r) => s.includes(r) || r.includes(s))) return true;

    const sTokens = s.split(" ").filter(Boolean);
    const overlap = sTokens.filter((t) => roleTokens.includes(t));
    const need = Math.max(1, Math.min(2, roleTokens.length));
    if (overlap.length >= need) return true;
  }

  return false;
};

export default function ManageMinistryActivity() {
  const [authUid, setAuthUid] = useState(null);

  // Branch scope
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");

  // Ministries under branch
  const [branchMinistries, setBranchMinistries] = useState([]);

  // Events / Series (filtered)
  const [events, setEvents] = useState([]);
  const [series, setSeries] = useState([]);

  // Branch Pastor (head)
  const [pastors, setPastors] = useState([]); // [{auth_user_id, name}]
  const [pastorHeadAuthId, setPastorHeadAuthId] = useState("");

  // Activities list
  const [activities, setActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);

  // Tasks + assignees
  const [tasks, setTasks] = useState([]);
  const [assigneesByTaskId, setAssigneesByTaskId] = useState({});
  const [roleSlotsByTaskId, setRoleSlotsByTaskId] = useState({});
  const [assigneeRowsByTaskId, setAssigneeRowsByTaskId] = useState({});
  const [membersByBM, setMembersByBM] = useState({}); // {branch_ministry_id: [{auth_user_id, name}]}
  const [namesByAuthId, setNamesByAuthId] = useState({});
  const [profileByAuthId, setProfileByAuthId] = useState({});

  // UI
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Modals
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTask, setAssignTask] = useState(null);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [assignForSlotSelected, setAssignForSlotSelected] = useState({});
  const [dragTaskId, setDragTaskId] = useState(null);

  const [showSlotsModal, setShowSlotsModal] = useState(false);
  const [slotsTask, setSlotsTask] = useState(null);
  const [slotDrafts, setSlotDrafts] = useState([
    { role_name: "", qty_required: 1 },
  ]);

  // Activity form (new flow)
  const activityFormInit = {
    branch_id: "",
    plan_type: "Normal", // "Event" | "Series" | "Normal"
    event_id: "",
    series_id: "",
    title: "",
    description: "",
    location: "",
    planned_start: "",
    planned_end: "",
    status: "Draft",
    affected_bm_ids: [], // array of branch_ministry_id numbers
  };
  const [activityForm, setActivityForm] = useState(activityFormInit);

  // Task form
  const taskFormInit = {
    activity_id: "",
    title: "",
    details: "",
    location: "",
    task_start: "",
    task_end: "",
    status: "Todo",
    priority: 0,
    sort_order: 0,
  };
  const [taskForm, setTaskForm] = useState(taskFormInit);

  // -------------------------
  // Boot
  // -------------------------
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id || null;
      setAuthUid(uid);
      if (!uid) return;

      await loadBranches();
    })();
  }, []);

  // -------------------------
  // Loaders
  // -------------------------
  const loadBranches = async () => {
    setLoading(true);
    try {
      // If you want to restrict branches by user membership/role, add it here.
      // For now: fetch all branches
      const { data, error } = await supabase
        .from("branches")
        .select("branch_id, name")
        .order("name", { ascending: true });

      if (error) throw error;
      setBranches(data || []);
      setSelectedBranchId(data?.[0]?.branch_id ? String(data[0].branch_id) : "");
    } catch (e) {
      console.error(e);
      setBranches([]);
      setSelectedBranchId("");
    } finally {
      setLoading(false);
    }
  };

  const loadBranchMinistries = async (branchId) => {
    if (!branchId) {
      setBranchMinistries([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("branch_ministries")
        .select(
          `
          branch_ministry_id,
          branch_id,
          ministry_id,
          is_active,
          ministries:ministries(id, name)
        `
        )
        .eq("branch_id", Number(branchId))
        .eq("is_active", true)
        .order("branch_ministry_id", { ascending: true });

      if (error) throw error;
      setBranchMinistries(data || []);
    } catch (e) {
      console.error(e);
      setBranchMinistries([]);
    } finally {
      setLoading(false);
    }
  };

  const loadEventsAndSeries = async (branchId) => {
    if (!branchId) {
      setEvents([]);
      setSeries([]);
      return;
    }

    try {
      // Show:
      // - branch-specific (branch_id = selected)
      // - global open-for-all (is_open_for_all = true, branch_id may be null)
      const [{ data: ev, error: evErr }, { data: se, error: seErr }] = await Promise.all([
        supabase
          .from("events")
          .select("event_id, title, start_datetime, end_datetime, branch_id, is_open_for_all")
          .or(`branch_id.eq.${Number(branchId)},is_open_for_all.eq.true`)
          .order("start_datetime", { ascending: false })
          .limit(200),
        supabase
          .from("event_series")
          .select("series_id, title, starts_on, ends_on, branch_id, is_open_for_all, is_active")
          .or(`branch_id.eq.${Number(branchId)},is_open_for_all.eq.true`)
          .order("starts_on", { ascending: false })
          .limit(200),
      ]);

      if (evErr) console.error(evErr);
      if (seErr) console.error(seErr);

      setEvents(ev || []);
      setSeries(se || []);
    } catch (e) {
      console.error(e);
      setEvents([]);
      setSeries([]);
    }
  };

  const loadBranchPastors = async (branchId) => {
    if (!branchId) {
      setPastors([]);
      setPastorHeadAuthId("");
      return;
    }

    try {
      // Multi-role support: user can have multiple rows in public.users.
      // We pull Pastor role rows for this branch via users_details.branch_id.
      const { data, error } = await supabase
        .from("users")
        .select(
          `
          auth_user_id,
          role,
          is_active,
          users_details:users_details(user_details_id, branch_id, first_name, middle_name, last_name, suffix)
        `
        )
        .eq("role", "PASTOR")
        .eq("is_active", true)
        .not("auth_user_id", "is", null);

      if (error) throw error;

      const inBranch = (data || []).filter((r) => {
        const ud = Array.isArray(r.users_details) ? r.users_details[0] : r.users_details;
        return Number(ud?.branch_id) === Number(branchId);
      });

      // distinct by auth_user_id
      const seen = new Set();
      const list = [];
      for (const r of inBranch) {
        if (seen.has(r.auth_user_id)) continue;
        seen.add(r.auth_user_id);
        const ud = Array.isArray(r.users_details) ? r.users_details[0] : r.users_details;
        const name = safeName(ud);
        list.push({ auth_user_id: r.auth_user_id, name });
      }

      list.sort((a, b) => a.name.localeCompare(b.name));
      setPastors(list);

      // auto choose first pastor as head
      const headId = list?.[0]?.auth_user_id || "";
      setPastorHeadAuthId(headId);

      if (list.length) {
        // cache names
        const next = { ...namesByAuthId };
        for (const p of list) next[p.auth_user_id] = p.name;
        setNamesByAuthId(next);
      }
    } catch (e) {
      console.error(e);
      setPastors([]);
      setPastorHeadAuthId("");
    }
  };

  const hydrateNames = async (authIds) => {
    const missing = (authIds || []).filter((id) => id && !namesByAuthId[id]);
    if (!missing.length) return;

    const { data, error } = await supabase
      .from("users_details")
      .select("auth_user_id, first_name, middle_name, last_name, suffix")
      .in("auth_user_id", missing);

    if (error) {
      console.error(error);
      return;
    }

    const next = { ...namesByAuthId };
    for (const ud of data || []) next[ud.auth_user_id] = safeName(ud);
    for (const id of missing) if (!next[id]) next[id] = "Unknown";
    setNamesByAuthId(next);
  };

  const loadActivities = async (branchId) => {
    if (!branchId) {
      setActivities([]);
      setSelectedActivity(null);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ministry_activities")
        .select(
          `
          activity_id,
          branch_id,
          branch_ministry_id,
          event_id,
          series_id,
          title,
          description,
          location,
          planned_start,
          planned_end,
          status,
          created_by_auth_user_id,
          head_auth_user_id,
          created_at,
          updated_at
        `
        )
        .eq("branch_id", Number(branchId))
        .order("created_at", { ascending: false });

      if (error) throw error;

      setActivities(data || []);

      // warm name cache for heads/creators
      const ids = [
        ...(data || []).map((a) => a.created_by_auth_user_id),
        ...(data || []).map((a) => a.head_auth_user_id),
      ]
        .filter(Boolean)
        .filter((v, i, arr) => arr.indexOf(v) === i);

      if (ids.length) await hydrateNames(ids);

      // keep selection if still exists
      setSelectedActivity((prev) => {
        if (!prev) return null;
        const still = (data || []).find((x) => x.activity_id === prev.activity_id);
        return still || null;
      });
    } catch (e) {
      console.error(e);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const loadActivityAudiences = async (activityId) => {
    // Optional table; if not yet created, this will fail gracefully
    try {
      const { data, error } = await supabase
        .from("ministry_activity_audiences")
        .select("branch_ministry_id")
        .eq("activity_id", Number(activityId));

      if (error) throw error;

      return (data || []).map((x) => Number(x.branch_ministry_id)).filter(Boolean);
    } catch (e) {
      // If table doesn't exist yet, fallback to empty
      return [];
    }
  };

  const upsertActivityAudiences = async (activityId, bmIds) => {
    // Optional table; if not yet created, skip silently
    try {
      // delete old, insert new (simple and reliable)
      await supabase.from("ministry_activity_audiences").delete().eq("activity_id", Number(activityId));

      if (!bmIds?.length) return;

      const rows = bmIds.map((bmId) => ({
        activity_id: Number(activityId),
        branch_ministry_id: Number(bmId),
      }));

      const { error } = await supabase.from("ministry_activity_audiences").insert(rows);
      if (error) throw error;
    } catch (e) {
      // ignore if table doesn't exist; but recommended to add it
      console.warn("ministry_activity_audiences not available:", e?.message || e);
    }
  };

  const loadMembersForBM = async (bmId) => {
    if (!bmId) return [];
    const existing = membersByBM[bmId];
    if (existing) return existing;

    try {
      const { data: ums, error: umErr } = await supabase
        .from("user_ministries")
        .select("auth_user_id")
        .eq("branch_ministry_id", Number(bmId))
        .eq("status", "Active");

      if (umErr) throw umErr;

      const authIds = [...new Set((ums || []).map((r) => r.auth_user_id).filter(Boolean))];
      if (!authIds.length) {
        setMembersByBM((p) => ({ ...p, [bmId]: [] }));
        return [];
      }

      await hydrateNames(authIds);

      const list = authIds
        .map((id) => ({ auth_user_id: id, name: namesByAuthId[id] || "Unknown" }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setMembersByBM((p) => ({ ...p, [bmId]: list }));
      return list;
    } catch (e) {
      console.error(e);
      setMembersByBM((p) => ({ ...p, [bmId]: [] }));
      return [];
    }
  };

  const APPROVED_STATUSES = ["Approved"];

  const loadApprovedApplicantsForBMIds = async (bmIds) => {
    const uniqueBmIds = [...new Set((bmIds || []).map(Number).filter(Boolean))];
    if (!uniqueBmIds.length) return [];

    console.log("loadApprovedApplicantsForBMIds: bmIds", uniqueBmIds);

    const { data, error } = await supabase
      .from("ministry_applications")
      .select("applicant_auth_user_id, branch_ministry_id, status")
      .in("branch_ministry_id", uniqueBmIds)
      .eq("status", "Approved");

    if (error) {
      console.error(
        "loadApprovedApplicantsForBMIds error:",
        JSON.stringify(error, null, 2),
      );
      throw error;
    }

    const authIds = [
      ...new Set(
        (data || []).map((r) => r.applicant_auth_user_id).filter(Boolean),
      ),
    ];

    await hydrateNames(authIds);

    return authIds
      .map((id) => ({ auth_user_id: id, name: namesByAuthId[id] || "Unknown" }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const loadMemberProfilesForBMIds = async (bmIds, memberAuthIds) => {
    const uniqueBmIds = [...new Set((bmIds || []).map(Number).filter(Boolean))];
    const uniqueAuthIds = [...new Set((memberAuthIds || []).filter(Boolean))];
    if (!uniqueBmIds.length || !uniqueAuthIds.length) return;

    try {
      const { data: reqs, error: reqErr } = await supabase
        .from("ministry_requirements")
        .select(
          "requirement_id, branch_ministry_id, title, requirement_type, config, is_active",
        )
        .in("branch_ministry_id", uniqueBmIds)
        .eq("is_active", true);

      if (reqErr) throw reqErr;

      const reqById = {};
      for (const r of reqs || []) reqById[r.requirement_id] = r;

      const { data: apps, error: appErr } = await supabase
        .from("ministry_applications")
        .select(
          "application_id, branch_ministry_id, applicant_auth_user_id, status",
        )
        .in("branch_ministry_id", uniqueBmIds)
        .in("applicant_auth_user_id", uniqueAuthIds)
        .in("status", APPROVED_STATUSES);

      if (appErr) throw appErr;

      const appIds = (apps || []).map((a) => a.application_id);
      if (!appIds.length) {
        setProfileByAuthId((prev) => {
          const next = { ...prev };
          for (const id of uniqueAuthIds) {
            if (!next[id]) {
              next[id] = {
                answersByRequirementId: {},
                skills: [],
                availability: null,
                rawAnswers: {},
              };
            }
          }
          return next;
        });
        return;
      }

      const appToAuth = {};
      for (const a of apps || []) appToAuth[a.application_id] = a.applicant_auth_user_id;

      const { data: ans, error: ansErr } = await supabase
        .from("ministry_application_answers")
        .select("application_id, requirement_id, answer")
        .in("application_id", appIds);

      if (ansErr) throw ansErr;

      setProfileByAuthId((prev) => {
        const next = { ...prev };

        for (const id of uniqueAuthIds) {
          if (!next[id]) {
            next[id] = {
              answersByRequirementId: {},
              skills: [],
              availability: null,
              rawAnswers: {},
            };
          }
        }

        for (const row of ans || []) {
          const authId = appToAuth[row.application_id];
          if (!authId) continue;

        if (!next[authId])
          next[authId] = {
            answersByRequirementId: {},
            skills: [],
            availability: null,
            rawAnswers: {},
          };

          const req = reqById[row.requirement_id];
          const parsed = parseAnswer(row.answer);

        next[authId].answersByRequirementId[row.requirement_id] = parsed;
        next[authId].rawAnswers[row.requirement_id] = row.answer;

          const rt = String(req?.requirement_type || "").toLowerCase();
          const isSkills =
            rt.includes("skill") ||
            String(req?.title || "").toLowerCase().includes("skill");

        if (isSkills) {
          const extracted = extractSkillsFromAnswer(parsed);
          next[authId].skills = [
            ...new Set([...(next[authId].skills || []), ...extracted]),
          ];
        }

          const isAvail =
            String(req?.title || "").toLowerCase().includes("availability") ||
            String(req?.title || "").toLowerCase().includes("schedule") ||
            String(req?.requirement_type || "")
              .toLowerCase()
              .includes("availability");

          if (isAvail && parsed && typeof parsed === "object") {
            next[authId].availability = parsed;
          }
        }

        return next;
      });
    } catch (e) {
      console.error("Failed to load member profiles:", e);
    }
  };

  const loadTasksForActivity = async (activityId) => {
    if (!activityId) {
      setTasks([]);
      setAssigneesByTaskId({});
      setRoleSlotsByTaskId({});
      setAssigneeRowsByTaskId({});
      return;
    }

    setLoading(true);
    try {
      const { data: t, error: tErr } = await supabase
        .from("ministry_activity_tasks")
        .select(
          `
          task_id,
          activity_id,
          title,
          details,
          location,
          task_start,
          task_end,
          status,
          priority,
          sort_order,
          created_by_auth_user_id,
          created_at,
          updated_at
        `
        )
        .eq("activity_id", Number(activityId))
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (tErr) throw tErr;

      setTasks(t || []);

      const taskIds = (t || []).map((x) => x.task_id);
      if (!taskIds.length) {
        setRoleSlotsByTaskId({});
        setAssigneeRowsByTaskId({});
        setAssigneesByTaskId({});
        return;
      }

      const { data: slots, error: slotsErr } = await supabase
        .from("ministry_task_role_slots")
        .select("slot_id, task_id, role_name, qty_required")
        .in("task_id", taskIds)
        .order("role_name", { ascending: true });
      if (slotsErr) throw slotsErr;

      const slotsMap = {};
      for (const s of slots || []) {
        if (!slotsMap[s.task_id]) slotsMap[s.task_id] = [];
        slotsMap[s.task_id].push(s);
      }
      setRoleSlotsByTaskId(slotsMap);

      const { data: a, error: aErr } = await supabase
        .from("ministry_task_assignees")
        .select("task_id, assignee_auth_user_id, slot_id")
        .in("task_id", taskIds);

      if (aErr) throw aErr;

      const rowsMap = {};
      for (const row of a || []) {
        if (!rowsMap[row.task_id]) rowsMap[row.task_id] = [];
        rowsMap[row.task_id].push(row);
      }
      setAssigneeRowsByTaskId(rowsMap);

      const flatMap = {};
      for (const row of a || []) {
        if (!flatMap[row.task_id]) flatMap[row.task_id] = [];
        flatMap[row.task_id].push(row.assignee_auth_user_id);
      }
      setAssigneesByTaskId(flatMap);

      const ids = [
        ...(a || []).map((x) => x.assignee_auth_user_id),
        ...(t || []).map((x) => x.created_by_auth_user_id),
      ]
        .filter(Boolean)
        .filter((v, i, arr) => arr.indexOf(v) === i);

      if (ids.length) await hydrateNames(ids);
    } catch (e) {
      console.error(e);
      setTasks([]);
      setAssigneesByTaskId({});
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // React to branch selection
  // -------------------------
  useEffect(() => {
    (async () => {
      if (!selectedBranchId) return;

      await Promise.all([
        loadBranchMinistries(selectedBranchId),
        loadEventsAndSeries(selectedBranchId),
        loadBranchPastors(selectedBranchId),
        loadActivities(selectedBranchId),
      ]);

      // reset selected activity/tasks on branch change
      setSelectedActivity(null);
      setTasks([]);
      setAssigneesByTaskId({});
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId]);

  useEffect(() => {
    (async () => {
      if (!selectedActivity?.activity_id) return;
      await loadTasksForActivity(selectedActivity.activity_id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedActivity?.activity_id]);

  // -------------------------
  // Derived
  // -------------------------
  const filteredActivities = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    if (!q) return activities;
    return (activities || []).filter((a) => {
      return (
        String(a.title || "").toLowerCase().includes(q) ||
        String(a.description || "").toLowerCase().includes(q) ||
        String(a.location || "").toLowerCase().includes(q) ||
        String(a.status || "").toLowerCase().includes(q)
      );
    });
  }, [activities, search]);

  const bmCheckboxOptions = useMemo(() => {
    return (branchMinistries || []).map((bm) => ({
      id: Number(bm.branch_ministry_id),
      label: bm?.ministries?.name ? bm.ministries.name : `Ministry #${bm.ministry_id}`,
    }));
  }, [branchMinistries]);

  const pastorLabel = useMemo(() => {
    if (!pastorHeadAuthId) return "— No pastor found —";
    return namesByAuthId[pastorHeadAuthId] || pastors.find((p) => p.auth_user_id === pastorHeadAuthId)?.name || "Pastor";
  }, [pastorHeadAuthId, pastors, namesByAuthId]);

  // -------------------------
  // Activity CRUD (new flow)
  // -------------------------
  const openCreateActivity = () => {
    setEditingActivity(null);
    setActivityForm({
      ...activityFormInit,
      branch_id: selectedBranchId ? Number(selectedBranchId) : "",
      plan_type: "Normal",
      status: "Draft",
      affected_bm_ids: [],
    });
    setShowActivityModal(true);
  };

  const openEditActivity = async (a) => {
    setEditingActivity(a);

    // load audiences (multi ministries) if table exists
    const audienceBmIds = await loadActivityAudiences(a.activity_id);

    // if no audience table rows, fall back to single branch_ministry_id
    const fallback = a.branch_ministry_id ? [Number(a.branch_ministry_id)] : [];
    const affected = audienceBmIds.length ? audienceBmIds : fallback;

    let planType = "Normal";
    if (a.event_id) planType = "Event";
    if (a.series_id) planType = "Series";

    setActivityForm({
      ...activityFormInit,
      branch_id: a.branch_id ?? "",
      plan_type: planType,
      event_id: a.event_id ?? "",
      series_id: a.series_id ?? "",
      title: a.title ?? "",
      description: a.description ?? "",
      location: a.location ?? "",
      planned_start: toDatetimeLocalValue(a.planned_start),
      planned_end: toDatetimeLocalValue(a.planned_end),
      status: a.status ?? "Draft",
      affected_bm_ids: affected,
    });

    // ensure pastor head is loaded for that branch (and auto selected)
    await loadBranchPastors(a.branch_id);

    setShowActivityModal(true);
  };

  const toggleAffectedMinistry = (bmId) => {
    setActivityForm((p) => {
      const has = p.affected_bm_ids.includes(bmId);
      const next = has ? p.affected_bm_ids.filter((x) => x !== bmId) : [...p.affected_bm_ids, bmId];
      return { ...p, affected_bm_ids: next };
    });
  };

  const openSlots = (t) => {
    setSlotsTask(t);
    const existing = roleSlotsByTaskId?.[t.task_id] || [];
    setSlotDrafts(
      existing.length
        ? existing.map((s) => ({
            slot_id: s.slot_id,
            role_name: s.role_name,
            qty_required: s.qty_required,
          }))
        : [{ role_name: "", qty_required: 1 }],
    );
    setShowSlotsModal(true);
  };

  const saveSlots = async () => {
    if (!slotsTask?.task_id) return;

    const cleaned = slotDrafts
      .map((s) => ({
        role_name: String(s.role_name || "").trim(),
        qty_required: Math.max(1, Number(s.qty_required || 1)),
      }))
      .filter((s) => s.role_name);

    if (!cleaned.length) {
      alert("Add at least one role.");
      return;
    }

    setLoading(true);
    try {
      await supabase
        .from("ministry_task_role_slots")
        .delete()
        .eq("task_id", slotsTask.task_id);

      const rows = cleaned.map((s) => ({
        task_id: slotsTask.task_id,
        role_name: s.role_name,
        qty_required: s.qty_required,
      }));

      const { error } = await supabase
        .from("ministry_task_role_slots")
        .insert(rows);
      if (error) throw error;

      setShowSlotsModal(false);
      await loadTasksForActivity(selectedActivity.activity_id);
    } catch (e) {
      console.error(e);
      alert(e?.message || "Failed to save roles.");
    } finally {
      setLoading(false);
    }
  };

  const saveActivity = async () => {
    if (!authUid) return;

    const branchId = Number(activityForm.branch_id);
    if (!branchId) {
      alert("Branch is required.");
      return;
    }

    // Enforce plan-type rules
    const planType = activityForm.plan_type;
    const eventId = planType === "Event" ? Number(activityForm.event_id || 0) : null;
    const seriesId = planType === "Series" ? Number(activityForm.series_id || 0) : null;

    if (planType === "Event" && !eventId) {
      alert("Please select an Event.");
      return;
    }
    if (planType === "Series" && !seriesId) {
      alert("Please select a Series.");
      return;
    }

    // Affected ministries must be at least one
    const affected = (activityForm.affected_bm_ids || []).map(Number).filter(Boolean);
    if (affected.length === 0) {
      alert("Please select at least one affected ministry.");
      return;
    }

    const primaryBM = affected[0]; // keeps your existing NOT NULL branch_ministry_id requirement

    const ps = toIsoFromLocalInput(activityForm.planned_start);
    const pe = toIsoFromLocalInput(activityForm.planned_end);
    if (ps && pe && new Date(pe) <= new Date(ps)) {
      alert("Planned End must be later than Planned Start.");
      return;
    }

    const payload = {
      branch_id: branchId,
      branch_ministry_id: primaryBM,
      title: String(activityForm.title || "").trim(),
      description: activityForm.description || null,
      location: activityForm.location || null,
      planned_start: ps,
      planned_end: pe,
      status: activityForm.status || "Draft",
      event_id: eventId || null,
      series_id: seriesId || null,
      // auto head = pastor of selected branch
      head_auth_user_id: pastorHeadAuthId || null,
    };

    if (!payload.title) {
      alert("Title is required.");
      return;
    }

    setLoading(true);
    try {
      if (editingActivity) {
        const { error } = await supabase
          .from("ministry_activities")
          .update(payload)
          .eq("activity_id", editingActivity.activity_id);

        if (error) throw error;

        // update audiences table
        await upsertActivityAudiences(editingActivity.activity_id, affected);
      } else {
        const { data: ins, error } = await supabase
          .from("ministry_activities")
          .insert({
            ...payload,
            created_by_auth_user_id: authUid,
          })
          .select("activity_id")
          .single();

        if (error) throw error;

        if (ins?.activity_id) {
          await upsertActivityAudiences(ins.activity_id, affected);
        }
      }

      setShowActivityModal(false);
      await loadActivities(selectedBranchId);
    } catch (e) {
      console.error(e);
      alert(e?.message || "Failed to save activity.");
    } finally {
      setLoading(false);
    }
  };

  const deleteActivity = async (a) => {
    if (!a?.activity_id) return;
    if (
      !window.confirm(
        "Delete this activity (and all tasks/assignees under it)?",
      )
    )
      return;

    setLoading(true);
    try {
      const { error } = await supabase.from("ministry_activities").delete().eq("activity_id", a.activity_id);
      if (error) throw error;

      if (selectedActivity?.activity_id === a.activity_id) setSelectedActivity(null);
      await loadActivities(selectedBranchId);
    } catch (e) {
      console.error(e);
      alert(e?.message || "Failed to delete activity.");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // Task CRUD
  // -------------------------
  const openCreateTask = () => {
    if (!selectedActivity?.activity_id) return;
    setEditingTask(null);
    setTaskForm({
      ...taskFormInit,
      activity_id: selectedActivity.activity_id,
      status: "Todo",
      priority: 0,
      sort_order: (tasks?.length || 0) * 10,
    });
    setShowTaskModal(true);
  };

  const openEditTask = (t) => {
    setEditingTask(t);
    setTaskForm({
      ...taskFormInit,
      activity_id: t.activity_id,
      title: t.title ?? "",
      details: t.details ?? "",
      location: t.location ?? "",
      task_start: toDatetimeLocalValue(t.task_start),
      task_end: toDatetimeLocalValue(t.task_end),
      status: t.status ?? "Todo",
      priority: Number(t.priority ?? 0),
      sort_order: Number(t.sort_order ?? 0),
    });
    setShowTaskModal(true);
  };

  const saveTask = async () => {
    if (!authUid) return;
    if (!selectedActivity?.activity_id) return;

    const ts = toIsoFromLocalInput(taskForm.task_start);
    const te = toIsoFromLocalInput(taskForm.task_end);
    if (ts && te && new Date(te) <= new Date(ts)) {
      alert("Task End must be later than Task Start.");
      return;
    }

    const payload = {
      activity_id: Number(taskForm.activity_id),
      title: String(taskForm.title || "").trim(),
      details: taskForm.details || null,
      location: taskForm.location || null,
      task_start: ts,
      task_end: te,
      status: taskForm.status || "Todo",
      priority: Number(taskForm.priority || 0),
      sort_order: Number(taskForm.sort_order || 0),
    };

    if (!payload.title) {
      alert("Task title is required.");
      return;
    }

    setLoading(true);
    try {
      if (editingTask) {
        const { error } = await supabase
          .from("ministry_activity_tasks")
          .update(payload)
          .eq("task_id", editingTask.task_id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ministry_activity_tasks").insert({
          ...payload,
          created_by_auth_user_id: authUid,
        });
        if (error) throw error;
      }

      setShowTaskModal(false);
      await loadTasksForActivity(selectedActivity.activity_id);
    } catch (e) {
      console.error(e);
      alert(e?.message || "Failed to save task.");
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async (t) => {
    if (!t?.task_id) return;
    if (!window.confirm("Delete this task (and its assignees)?")) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("ministry_activity_tasks").delete().eq("task_id", t.task_id);
      if (error) throw error;

      await loadTasksForActivity(selectedActivity.activity_id);
    } catch (e) {
      console.error(e);
      alert(e?.message || "Failed to delete task.");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // Assign members to task
  // -------------------------
  const openAssign = async (t) => {
    // Determine which ministry member list to show:
    // Since activity can affect multiple ministries, we show union of members from all affected ministries.
    // We'll derive affected ministries from:
    // - audiences table (if exists) else single branch_ministry_id on activity.
    // Best: use selectedActivity
    try {
      console.log("openAssign: selectedActivity", selectedActivity);
      console.log("openAssign: task", t);
      let bmIds = [];
      if (selectedActivity?.activity_id) {
        bmIds = await loadActivityAudiences(selectedActivity.activity_id);
        if (!bmIds.length && selectedActivity.branch_ministry_id) bmIds = [Number(selectedActivity.branch_ministry_id)];
      }
      bmIds = [...new Set((bmIds || []).map(Number).filter(Boolean))];
      console.log("openAssign: bmIds", bmIds);
      if (!bmIds.length) {
        alert("No affected ministries found for this activity.");
        return;
      }

      const unionMembers = await loadApprovedApplicantsForBMIds(bmIds);

      await loadMemberProfilesForBMIds(
        bmIds,
        unionMembers.map((m) => m.auth_user_id),
      );

      const slots = roleSlotsByTaskId?.[t.task_id] || [];
      if (!slots.length) {
        alert("Add role slots first (roles needed).");
        return;
      }

      const defaultSlotId = String(slots[0].slot_id);
      setSelectedSlotId(defaultSlotId);
      setAssignTask(t);

      const arows = assigneeRowsByTaskId?.[t.task_id] || [];
      const inThisSlot = new Set(
        arows
          .filter((r) => String(r.slot_id) === String(defaultSlotId))
          .map((r) => r.assignee_auth_user_id),
      );

      const next = {};
      for (const m of unionMembers) next[m.auth_user_id] = inThisSlot.has(m.auth_user_id);
      setAssignForSlotSelected(next);

      // stash union members in a lightweight local variable via state-ish trick:
      // We will render from assignForSlotSelected keys + names cache.
      // Ensure name cache is ready:
      await hydrateNames(unionMembers.map((x) => x.auth_user_id));

      setShowAssignModal(true);
    } catch (e) {
      console.error("openAssign failed:", {
        message: e?.message,
        details: e?.details,
        hint: e?.hint,
        code: e?.code,
        raw: e,
      });
      alert("Failed to open Assign Members. Check console for details.");
    }
  };

  const persistTaskOrder = async (orderedTasks) => {
    const updates = (orderedTasks || []).map((t, idx) => ({
      task_id: t.task_id,
      sort_order: idx * 10,
    }));

    try {
      for (const row of updates) {
        const { error } = await supabase
          .from("ministry_activity_tasks")
          .update({ sort_order: row.sort_order })
          .eq("task_id", row.task_id);
        if (error) throw error;
      }
    } catch (e) {
      console.error(e);
      await loadTasksForActivity(selectedActivity?.activity_id);
    }
  };

  const moveTaskTo = (sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    setTasks((prev) => {
      const list = [...(prev || [])];
      const fromIdx = list.findIndex((t) => t.task_id === sourceId);
      const toIdx = list.findIndex((t) => t.task_id === targetId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const next = [...list];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      persistTaskOrder(next);
      return next;
    });
  };

  const saveAssignees = async () => {
    if (!assignTask?.task_id) return;
    if (!authUid) return;
    if (!selectedSlotId) return;

    const taskId = assignTask.task_id;
    const slotId = Number(selectedSlotId);

    const arows = assigneeRowsByTaskId?.[taskId] || [];
    const prev = new Set(
      arows.filter((r) => Number(r.slot_id) === slotId).map((r) => r.assignee_auth_user_id),
    );

    const now = new Set(
      Object.entries(assignForSlotSelected)
        .filter(([, v]) => v)
        .map(([k]) => k),
    );

    const slots = roleSlotsByTaskId?.[taskId] || [];
    const currentSlot = slots.find((s) => Number(s.slot_id) === slotId);
    const needed = Number(currentSlot?.qty_required || 0);

    if (needed && now.size > needed) {
      alert(`You can only assign ${needed} member(s) for this role.`);
      return;
    }

    const toAdd = [...now].filter((id) => !prev.has(id));
    const toRemove = [...prev].filter((id) => !now.has(id));

    setLoading(true);
    try {
      if (toAdd.length) {
        const rows = toAdd.map((assigneeId) => ({
          task_id: taskId,
          assignee_auth_user_id: assigneeId,
          assigned_by_auth_user_id: authUid,
          slot_id: slotId,
        }));
        const { error } = await supabase
          .from("ministry_task_assignees")
          .upsert(rows, { onConflict: "task_id,assignee_auth_user_id" });
        if (error) throw error;
      }

      for (const assigneeId of toRemove) {
        const { error } = await supabase
          .from("ministry_task_assignees")
          .delete()
          .eq("task_id", taskId)
          .eq("assignee_auth_user_id", assigneeId)
          .eq("slot_id", slotId);
        if (error) throw error;
      }

      setShowAssignModal(false);
      await loadTasksForActivity(selectedActivity.activity_id);
    } catch (e) {
      console.error(e);
      alert(e?.message || "Failed to update assignees.");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // Render
  // -------------------------
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1">
        <Header />

        <div className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Manage Ministry Activity</h1>
              <p className="text-slate-600">
                Branch planner — activities can affect multiple ministries. Head is auto-set to the branch Pastor.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2">
                <Search className="h-4 w-4 text-slate-500" />
                <input
                  className="w-64 max-w-[60vw] outline-none text-sm"
                  placeholder="Search activities..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <button
                onClick={openCreateActivity}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-50"
                disabled={!selectedBranchId}
              >
                <Plus className="h-4 w-4" />
                New Activity
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border bg-white p-4">
              <div className="text-xs font-semibold text-slate-600 mb-2">Branch</div>
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
              >
                <option value="">Select branch</option>
                {branches.map((b) => (
                  <option key={b.branch_id} value={String(b.branch_id)}>
                    {b.name}
                  </option>
                ))}
              </select>
              <div className="mt-2 text-xs text-slate-500">
                Head (auto): <span className="font-semibold">{pastorLabel}</span>
              </div>
            </div>

            <div className="rounded-xl border bg-white p-4">
              <div className="text-xs font-semibold text-slate-600 mb-2">Branch Info</div>
              <div className="text-sm text-slate-700 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Ministries: <span className="font-semibold">{branchMinistries.length}</span>
              </div>
              <div className="mt-1 text-sm text-slate-700 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Events: <span className="font-semibold">{events.length}</span>
              </div>
              <div className="mt-1 text-sm text-slate-700 flex items-center gap-2">
                <ListChecks className="h-4 w-4" />
                Series: <span className="font-semibold">{series.length}</span>
              </div>
              {loading && <div className="mt-2 text-xs text-slate-500">Loading…</div>}
            </div>

            <div className="rounded-xl border bg-white p-4">
              <div className="text-xs font-semibold text-slate-600 mb-2">Activities</div>
              <div className="text-sm text-slate-700">
                Total: <span className="font-semibold">{activities.length}</span>
              </div>
              <button
                onClick={() => loadActivities(selectedBranchId)}
                className="mt-3 w-full rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"
                disabled={!selectedBranchId}
              >
                Refresh Activities
              </button>
            </div>
          </div>

          {/* Main split */}
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Activities list */}
            <div className="rounded-2xl border bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold text-slate-900">Activities (Branch)</div>
              </div>

              <div className="mt-3 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="py-2">Title</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Head</th>
                      <th className="py-2">Time</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActivities.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500">
                          No activities found.
                        </td>
                      </tr>
                    ) : (
                      filteredActivities.map((a) => {
                        const isSelected = selectedActivity?.activity_id === a.activity_id;
                        const headName = a.head_auth_user_id
                          ? namesByAuthId[a.head_auth_user_id] || "Unknown"
                          : "-";
                        const tag = a.event_id ? "Event" : a.series_id ? "Series" : "Normal";

                        return (
                          <tr
                            key={a.activity_id}
                            className={`border-t ${isSelected ? "bg-slate-50" : "hover:bg-slate-50"}`}
                          >
                            <td className="py-3">
                              <div className="font-semibold text-slate-900">{a.title}</div>
                              <div className="text-xs text-slate-500">
                                <span className="rounded-full border px-2 py-0.5">{tag}</span>{" "}
                                • {a.location || "-"} • Updated {fmtDateTime(a.updated_at)}
                              </div>
                            </td>
                            <td className="py-3">
                              <span className="rounded-full border px-2 py-1 text-xs">{a.status}</span>
                            </td>
                            <td className="py-3">{headName}</td>
                            <td className="py-3">
                              <div className="text-xs text-slate-600">
                                {a.planned_start ? fmtDateTime(a.planned_start) : "-"}
                              </div>
                              <div className="text-xs text-slate-600">
                                {a.planned_end ? fmtDateTime(a.planned_end) : "-"}
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setSelectedActivity(a)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-slate-600 hover:bg-slate-100"
                                  title="View"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => openEditActivity(a)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-slate-600 hover:bg-slate-100"
                                  title="Edit"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Activity details + tasks */}
            <div className="rounded-2xl border bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold text-slate-900">Tasks</div>
                <button
                  onClick={openCreateTask}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
                  disabled={!selectedActivity}
                >
                  <Plus className="h-4 w-4" />
                  Add Task
                </button>
              </div>

              {!selectedActivity ? (
                <div className="mt-6 text-slate-500 text-sm">
                  Select an activity to view and manage its tasks.
                </div>
              ) : (
                <>
                  <div className="mt-3 rounded-xl border bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold text-slate-900">
                          {selectedActivity.title}
                        </div>
                        <div className="text-sm text-slate-600">{selectedActivity.description || "-"}</div>
                        <div className="mt-2 text-xs text-slate-600">
                          Head:{" "}
                          <span className="font-semibold">
                            {selectedActivity.head_auth_user_id
                              ? namesByAuthId[selectedActivity.head_auth_user_id] || "Unknown"
                              : "-"}
                          </span>{" "}
                          • Status: <span className="font-semibold">{selectedActivity.status}</span>
                        </div>
                      </div>
                      <button
                        className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-slate-50"
                        onClick={() => loadTasksForActivity(selectedActivity.activity_id)}
                      >
                        Refresh
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 overflow-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-500">
                          <th className="py-2">Task</th>
                          <th className="py-2">Status</th>
                          <th className="py-2">Assignees</th>
                          <th className="py-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tasks.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-slate-500">
                              No tasks yet.
                            </td>
                          </tr>
                        ) : (
                          tasks.map((t) => {
                            const assignees = assigneesByTaskId?.[t.task_id] || [];
                            const slots = roleSlotsByTaskId?.[t.task_id] || [];
                            const arows = assigneeRowsByTaskId?.[t.task_id] || [];
                            return (
                              <tr
                                key={t.task_id}
                                className="border-t hover:bg-slate-50"
                                draggable
                                onDragStart={() => setDragTaskId(t.task_id)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => {
                                  moveTaskTo(dragTaskId, t.task_id);
                                  setDragTaskId(null);
                                }}
                              >
                                <td className="py-3">
                                  <div className="font-semibold text-slate-900 flex items-center gap-2">
                                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border bg-white text-slate-500 cursor-grab">
                                      <GripVertical className="h-4 w-4" />
                                    </span>
                                    {t.title}{" "}
                                    {t.status === "Done" ? (
                                      <CheckCircle2 className="inline h-4 w-4 text-green-600" />
                                    ) : null}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {t.location || "-"} • {t.task_start ? fmtDateTime(t.task_start) : "-"}
                                    {t.task_end ? ` → ${fmtDateTime(t.task_end)}` : ""}
                                  </div>
                                  {t.details ? (
                                    <div className="mt-1 text-xs text-slate-600">{t.details}</div>
                                  ) : null}
                                  {slots.length > 0 ? (
                                    <div className="mt-2 text-xs text-slate-600">
                                      {slots.map((s) => {
                                        const assigned = arows.filter(
                                          (r) => r.slot_id === s.slot_id,
                                        ).length;
                                        return (
                                          <div key={s.slot_id}>
                                            {s.role_name}:{" "}
                                            <span className="font-semibold">
                                              {assigned}/{s.qty_required}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="mt-2 text-xs text-amber-600">
                                      No role slots yet (add roles needed first).
                                    </div>
                                  )}
                                </td>
                                <td className="py-3">
                                  <span className="rounded-full border px-2 py-1 text-xs">{t.status}</span>
                                </td>
                                <td className="py-3">
                                  {assignees.length === 0 ? (
                                    <span className="text-xs text-slate-500">Unassigned</span>
                                  ) : (
                                    <div className="flex flex-col gap-1">
                                      {assignees.slice(0, 3).map((id) => (
                                        <span key={id} className="text-xs">
                                          • {namesByAuthId[id] || "Unknown"}
                                        </span>
                                      ))}
                                      {assignees.length > 3 ? (
                                        <span className="text-xs text-slate-500">
                                          +{assignees.length - 3} more
                                        </span>
                                      ) : null}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3">
                                  <div className="grid grid-cols-2 justify-items-end gap-2">
                                    <button
                                      onClick={() => openAssign(t)}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-slate-600 hover:bg-slate-100"
                                      title="Assign members"
                                    >
                                      <Users className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => openSlots(t)}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-slate-600 hover:bg-slate-100"
                                      title="Set roles needed"
                                    >
                                      <ListChecks className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => openEditTask(t)}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-slate-600 hover:bg-slate-100"
                                      title="Edit"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => deleteTask(t)}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-rose-600 hover:bg-rose-50"
                                      title="Delete"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Activity Modal (NEW FLOW) */}
        {showActivityModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
            <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4">
                <div className="font-semibold text-slate-900">
                  {editingActivity ? "Edit Activity" : "New Activity"}
                </div>
                <button
                  onClick={() => setShowActivityModal(false)}
                  className="rounded-lg border p-2 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-4 grid grid-cols-1 gap-4">
                {/* Step 1: Branch */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-600 mb-1">Branch</div>
                    <select
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      value={activityForm.branch_id}
                      onChange={async (e) => {
                        const v = e.target.value;
                        setActivityForm((p) => ({
                          ...p,
                          branch_id: v,
                          affected_bm_ids: [],
                          plan_type: "Normal",
                          event_id: "",
                          series_id: "",
                        }));
                        await Promise.all([
                          loadBranchMinistries(v),
                          loadEventsAndSeries(v),
                          loadBranchPastors(v),
                        ]);
                      }}
                      disabled={!!editingActivity}
                    >
                      <option value="">Select branch</option>
                      {branches.map((b) => (
                        <option key={b.branch_id} value={String(b.branch_id)}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Step 2: Type */}
                  <div>
                    <div className="text-xs font-semibold text-slate-600 mb-1">Plan Type</div>
                    <select
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      value={activityForm.plan_type}
                      onChange={(e) => {
                        const v = e.target.value;
                        setActivityForm((p) => ({
                          ...p,
                          plan_type: v,
                          event_id: v === "Event" ? p.event_id : "",
                          series_id: v === "Series" ? p.series_id : "",
                        }));
                      }}
                    >
                      <option value="Normal">Normal Task Plan</option>
                      <option value="Event">For an Event</option>
                      <option value="Series">For a Series</option>
                    </select>
                  </div>
                </div>

                {/* Step 3: Event/Series selector depending on type */}
                {activityForm.plan_type === "Event" && (
                  <div>
                    <div className="text-xs font-semibold text-slate-600 mb-1">Select Event</div>
                    <select
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      value={activityForm.event_id || ""}
                      onChange={(e) => setActivityForm((p) => ({ ...p, event_id: e.target.value }))}
                    >
                      <option value="">— Select an event —</option>
                      {events.map((ev) => (
                        <option key={ev.event_id} value={String(ev.event_id)}>
                          {ev.title} ({fmtDateTime(ev.start_datetime)})
                        </option>
                      ))}
                    </select>
                    <div className="mt-1 text-xs text-slate-500">
                      Showing branch events + open-for-all events.
                    </div>
                  </div>
                )}

                {activityForm.plan_type === "Series" && (
                  <div>
                    <div className="text-xs font-semibold text-slate-600 mb-1">Select Series</div>
                    <select
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      value={activityForm.series_id || ""}
                      onChange={(e) => setActivityForm((p) => ({ ...p, series_id: e.target.value }))}
                    >
                      <option value="">— Select a series —</option>
                      {series.map((s) => (
                        <option key={s.series_id} value={String(s.series_id)}>
                          {s.title} ({s.starts_on}
                          {s.ends_on ? ` → ${s.ends_on}` : ""})
                        </option>
                      ))}
                    </select>
                    <div className="mt-1 text-xs text-slate-500">
                      Showing branch series + open-for-all series.
                    </div>
                  </div>
                )}

                {/* Step 4: Title */}
                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-1">Title</div>
                  <input
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={activityForm.title}
                    onChange={(e) => setActivityForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="e.g., Sunday Service Deployment Plan"
                  />
                </div>

                {/* Step 5: Ministries affected (checkbox multi-select) */}
                <div className="rounded-xl border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-600 mb-1">
                        Ministries Affected (select one or more)
                      </div>
                      <div className="text-xs text-slate-500">
                        These ministries will see this plan and can be assigned tasks.
                      </div>
                    </div>
                    <div className="text-xs text-slate-700">
                      Selected: <span className="font-semibold">{activityForm.affected_bm_ids.length}</span>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[220px] overflow-auto">
                    {bmCheckboxOptions.length === 0 ? (
                      <div className="text-sm text-slate-500">
                        No ministries found for this branch.
                      </div>
                    ) : (
                      bmCheckboxOptions.map((o) => {
                        const checked = activityForm.affected_bm_ids.includes(o.id);
                        return (
                          <label
                            key={o.id}
                            className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-slate-50"
                          >
                            <span className="text-sm text-slate-900">{o.label}</span>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleAffectedMinistry(o.id)}
                            />
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Location + Status + Times */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-600 mb-1">Location</div>
                    <input
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      value={activityForm.location}
                      onChange={(e) => setActivityForm((p) => ({ ...p, location: e.target.value }))}
                      placeholder="e.g., Main Sanctuary"
                    />
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-600 mb-1">Status</div>
                    <select
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      value={activityForm.status}
                      onChange={(e) => setActivityForm((p) => ({ ...p, status: e.target.value }))}
                    >
                      <option value="Draft">Draft</option>
                      <option value="Published">Published</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-600 mb-1">Planned Start</div>
                    <input
                      type="datetime-local"
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      value={activityForm.planned_start}
                      onChange={(e) => setActivityForm((p) => ({ ...p, planned_start: e.target.value }))}
                    />
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-600 mb-1">Planned End</div>
                    <input
                      type="datetime-local"
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      value={activityForm.planned_end}
                      onChange={(e) => setActivityForm((p) => ({ ...p, planned_end: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Head auto */}
                <div className="rounded-xl border bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-600 mb-1">Head (auto from branch pastor)</div>
                  <div className="text-sm text-slate-900 font-semibold">{pastorLabel}</div>
                  {pastors.length > 1 ? (
                    <div className="mt-2 text-xs text-slate-600">
                      Multiple pastors found. Currently using the first one by name.
                      (If you want a dropdown, tell me and I’ll add it.)
                    </div>
                  ) : null}
                  {!pastors.length ? (
                    <div className="mt-2 text-xs text-red-600">
                      No pastor found for this branch. Add a user with role = "Pastor" and users_details.branch_id = this branch.
                    </div>
                  ) : null}
                </div>

                {/* Description */}
                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-1">Description / Instructions</div>
                  <textarea
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    rows={3}
                    value={activityForm.description}
                    onChange={(e) => setActivityForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Add instructions…"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 border-t p-4">
                {editingActivity ? (
                  <button
                    onClick={() => deleteActivity(editingActivity)}
                    className="rounded-lg border border-rose-200 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50"
                  >
                    Delete Activity
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowActivityModal(false)}
                    className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveActivity}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
                    disabled={loading}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Task Modal */}
        {showTaskModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b p-4">
                <div className="font-semibold text-slate-900">
                  {editingTask ? "Edit Task" : "New Task"}
                </div>
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="rounded-lg border p-2 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <div className="text-xs font-semibold text-slate-600 mb-1">Task Title</div>
                  <input
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="e.g., Prepare offering envelopes"
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="text-xs font-semibold text-slate-600 mb-1">Details</div>
                  <textarea
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    rows={3}
                    value={taskForm.details}
                    onChange={(e) => setTaskForm((p) => ({ ...p, details: e.target.value }))}
                    placeholder="Instructions…"
                  />
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-1">Location</div>
                  <input
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={taskForm.location}
                    onChange={(e) => setTaskForm((p) => ({ ...p, location: e.target.value }))}
                    placeholder="e.g., Lobby Table"
                  />
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-1">Status</div>
                  <select
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={taskForm.status}
                    onChange={(e) => setTaskForm((p) => ({ ...p, status: e.target.value }))}
                  >
                    <option value="InProgress">In Progress</option>
                    <option value="Done">Done</option>
                    <option value="Blocked">Blocked</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-1">Start</div>
                  <input
                    type="datetime-local"
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={taskForm.task_start}
                    onChange={(e) => setTaskForm((p) => ({ ...p, task_start: e.target.value }))}
                  />
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-1">End</div>
                  <input
                    type="datetime-local"
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={taskForm.task_end}
                    onChange={(e) => setTaskForm((p) => ({ ...p, task_end: e.target.value }))}
                  />
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-1">Priority</div>
                  <button
                    type="button"
                    onClick={() =>
                      setTaskForm((p) => ({
                        ...p,
                        priority: Number(p.priority || 0) > 0 ? 0 : 1,
                      }))
                    }
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                      Number(taskForm.priority || 0) > 0
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Pin className="h-4 w-4" />
                    {Number(taskForm.priority || 0) > 0 ? "Pinned" : "Mark as priority"}
                  </button>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-1">Sort Order</div>
                  <input
                    type="number"
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={taskForm.sort_order}
                    onChange={(e) => setTaskForm((p) => ({ ...p, sort_order: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t p-4">
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveTask}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
                  disabled={loading}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assign Modal */}
        {showAssignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b p-4">
                <div className="font-semibold text-slate-900">
                  Assign Members — {assignTask?.title || ""}
                </div>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="rounded-lg border p-2 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-4">
                {(() => {
                  const slots = roleSlotsByTaskId?.[assignTask?.task_id] || [];
                  const arows = assigneeRowsByTaskId?.[assignTask?.task_id] || [];
                  const currentSlot = slots.find(
                    (s) => String(s.slot_id) === String(selectedSlotId),
                  );
                  const assignedCount = arows.filter(
                    (r) => String(r.slot_id) === String(selectedSlotId),
                  ).length;
                  const needed = currentSlot?.qty_required || 0;

                  return (
                    <>
                      <div className="mb-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <div className="text-xs font-semibold text-slate-600 mb-1">
                            Role Slot
                          </div>
                          <select
                            className="w-full rounded-lg border px-3 py-2 text-sm"
                            value={selectedSlotId}
                            onChange={(e) => {
                              const slotId = e.target.value;
                              setSelectedSlotId(slotId);

                              const inSlot = new Set(
                                arows
                                  .filter(
                                    (r) =>
                                      String(r.slot_id) === String(slotId),
                                  )
                                  .map((r) => r.assignee_auth_user_id),
                              );

                              setAssignForSlotSelected((prev) => {
                                const next = {};
                                for (const id of Object.keys(prev))
                                  next[id] = inSlot.has(id);
                                return next;
                              });
                            }}
                          >
                            {slots.map((s) => (
                              <option key={s.slot_id} value={String(s.slot_id)}>
                                {s.role_name} (need {s.qty_required})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="rounded-lg border bg-slate-50 p-3 text-sm">
                          Assigned:{" "}
                          <span className="font-semibold">
                            {assignedCount}/{needed}
                          </span>
                        </div>
                      </div>
                    </>
                  );
                })()}

                {Object.keys(assignForSlotSelected).length === 0 ? (
                  <div className="text-sm text-slate-500">
                    No members available from the affected ministries.
                  </div>
                ) : (
                  <div className="max-h-[55vh] overflow-auto rounded-xl border">
                    {Object.keys(assignForSlotSelected)
                      .sort((a, b) => (namesByAuthId[a] || "").localeCompare(namesByAuthId[b] || ""))
                      .map((id) => {
                        const checked = !!assignForSlotSelected[id];
                        const label = namesByAuthId[id] || "Unknown";
                        const currentSlot = (roleSlotsByTaskId?.[assignTask?.task_id] || []).find(
                          (s) => String(s.slot_id) === String(selectedSlotId),
                        );
                        const roleName = currentSlot?.role_name || "";
                        const neededRole = String(roleName || "").trim();
                        const profile = profileByAuthId?.[id];
                        const skills = profile?.skills || [];
                        const skillMatch = neededRole ? roleMatchesSkills(neededRole, skills) : true;
                        const availability = memberAvailableForTask(
                          profile,
                          assignTask?.task_start,
                          assignTask?.task_end,
                        );
                        const isRecommended = skillMatch && availability.ok;
                        const blocked = !availability.ok;
                        console.log({
                          member: id,
                          name: namesByAuthId[id],
                          neededRole,
                          skills: profileByAuthId?.[id]?.skills,
                          raw: profileByAuthId?.[id]?.rawAnswers,
                        });
                        return (
                          <label
                            key={id}
                            className="flex items-center justify-between gap-3 border-b p-3 last:border-b-0 hover:bg-slate-50"
                          >
                            <div>
                              <div className="text-sm text-slate-900">{label}</div>
                              <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-600">
                                {isRecommended ? (
                                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">
                                    Recommended
                                  </span>
                                ) : null}
                                {!skillMatch ? (
                                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                                    Skill mismatch
                                  </span>
                                ) : null}
                                {!availability.ok ? (
                                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-rose-700">
                                    {availability.reason}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={blocked}
                              onChange={(e) =>
                                setAssignForSlotSelected((p) => ({
                                  ...p,
                                  [id]: e.target.checked,
                                }))
                              }
                            />
                          </label>
                        );
                      })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t p-4">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveAssignees}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
                  disabled={loading}
                >
                  Save Assignments
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Role Slots Modal */}
        {showSlotsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
              <div className="flex items-center gap-3 border-b p-4">
                <div className="flex-1 text-left font-semibold text-slate-900">
                  Roles Needed — {slotsTask?.title || ""}
                </div>
                <button
                  onClick={() => setShowSlotsModal(false)}
                  className="rounded-lg border p-2 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                {slotDrafts.map((s, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2">
                    <div className="md:col-span-8">
                      <div className="text-xs font-semibold text-slate-600 mb-1">
                        Role
                      </div>
                      <input
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        value={s.role_name}
                        onChange={(e) => {
                          const next = [...slotDrafts];
                          next[idx] = { ...next[idx], role_name: e.target.value };
                          setSlotDrafts(next);
                        }}
                        placeholder="e.g., Usher / Sound Tech"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <div className="text-xs font-semibold text-slate-600 mb-1">
                        Qty
                      </div>
                      <input
                        type="number"
                        min={1}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        value={s.qty_required}
                        onChange={(e) => {
                          const next = [...slotDrafts];
                          next[idx] = {
                            ...next[idx],
                            qty_required: e.target.value,
                          };
                          setSlotDrafts(next);
                        }}
                      />
                    </div>
                    <div className="md:col-span-1 flex items-end">
                      <button
                        type="button"
                        className="w-full rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"
                        onClick={() => {
                          const next = slotDrafts.filter((_, i) => i !== idx);
                          setSlotDrafts(next.length ? next : [{ role_name: "", qty_required: 1 }]);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
                  onClick={() =>
                    setSlotDrafts((p) => [...p, { role_name: "", qty_required: 1 }])
                  }
                >
                  + Add role
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 border-t p-4">
                <button
                  onClick={() => setShowSlotsModal(false)}
                  className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveSlots}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
                  disabled={loading}
                >
                  Save Roles
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
