import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { supabase } from "../../lib/supabaseClient";
import { CheckCircle2, Plus } from "lucide-react";

const BUCKET = "church-event"; // storage bucket name


// RRULE helpers
const RR_DAYS = [
  { label: "Sun", val: "SU" },
  { label: "Mon", val: "MO" },
  { label: "Tue", val: "TU" },
  { label: "Wed", val: "WE" },
  { label: "Thu", val: "TH" },
  { label: "Fri", val: "FR" },
  { label: "Sat", val: "SA" },
];

function buildRRuleText(r) {
  if (!r || !r.freq) return "";
  
  const parts = [];
  parts.push(`FREQ=${r.freq}`);
  parts.push(`INTERVAL=${Math.max(1, Number(r.interval) || 1)}`);

  if (r.freq === "WEEKLY") {
    const days = Array.isArray(r.byday) && r.byday.length ? r.byday : ["SU"];
    parts.push(`BYDAY=${days.join(",")}`);
  }

  if (r.freq === "MONTHLY") {
    if (r.monthly_mode === "BYMONTHDAY") {
      parts.push(`BYMONTHDAY=${Math.min(31, Math.max(1, Number(r.bymonthday) || 1))}`);
    } else {
      // nth weekday: e.g. 1st Sunday => BYDAY=SU;BYSETPOS=1
      parts.push(`BYDAY=${r.monthly_byday || "SU"}`);
      parts.push(`BYSETPOS=${Number(r.bysetpos) || 1}`); // 1..5 or -1
    }
  }

  if (r.freq === "YEARLY") {
    parts.push(`BYMONTH=${Math.min(12, Math.max(1, Number(r.bymonth) || 1))}`);
    parts.push(`BYMONTHDAY=${Math.min(31, Math.max(1, Number(r.bymonthday_yearly) || 1))}`);
  }

  return parts.join(";");
}

function isoLocalFromDateTime(dateStr, timeStr) {
  return new Date(`${dateStr}T${timeStr}:00`);
}

function toTimeHHMM(val) {
  return String(val || "").slice(0, 5);
}

function publicUrlFromPath(path) {
  if (!path) return "";
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl || "";
}

async function getCurrentUserMerged() {
  const { data: auth } = await supabase.auth.getUser();
  const authUserId = auth?.user?.id;
  if (!authUserId) throw new Error("No authenticated user.");

  const { data: rows, error } = await supabase
    .from("users")
    .select("user_id, role, is_active, access_start, access_end, email, updated_at, created_at")
    .eq("auth_user_id", authUserId);

  if (error) throw error;
  if (!rows || rows.length === 0) throw new Error("No matching users row for this auth user.");

  // choose a “primary” row to use for created_by, etc.
  const sorted = [...rows].sort((a, b) => {
    // active first
    if (a.is_active !== b.is_active) return (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0);
    // newest updated/created next
    const au = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const bu = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    if (au !== bu) return bu - au;
    const ac = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bc = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bc - ac;
  });

  const primary = sorted[0];

  const roles = rows
    .map(r => String(r.role || "").toLowerCase().trim())
    .filter(Boolean);

  const rolesUnique = Array.from(new Set(roles));

  return {
    auth_user_id: authUserId,
    primary_user_id: primary.user_id,      // use this for events.created_by
    is_active_any: rows.some(r => r.is_active),
    role_count: rolesUnique.length,
    roles: rolesUnique,
    rows,                                  // if you ever need the raw rows
  };
}


function dowLabel(n) {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][Number(n)] || "-";
}

function ord(n) {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  if (n === 4) return "4th";
  if (n === 5) return "5th";
  return String(n);
}

function seriesRuleText(s) {
  const time = `${toTimeHHMM(s.start_time)} - ${toTimeHHMM(s.end_time)}`;
  const rule = s.rrule_text ? s.rrule_text : "(no rule)";
  return `${rule} • ${time}`;
}

function formatRRuleReadable(rruleText) {
  if (!rruleText) return "(no rule)";

  const parts = {};
  rruleText.split(";").forEach((part) => {
    const [key, value] = part.split("=");
    if (key && value) parts[key] = value;
  });

  const freq = parts.FREQ || "WEEKLY";
  const interval = Number(parts.INTERVAL) || 1;
  const intervalText = interval > 1 ? ` ${interval}` : "";

  if (freq === "WEEKLY") {
    const days = (parts.BYDAY || "SU").split(",");
    const dayNames = days.map((d) => {
      const day = RR_DAYS.find((rd) => rd.val === d);
      return day ? day.label : d;
    });
    return `Every${intervalText} Week (${dayNames.join(", ")})`;
  }

  if (freq === "MONTHLY") {
    if (parts.BYMONTHDAY) {
      return `Every${intervalText} Month on Day ${parts.BYMONTHDAY}`;
    }
    if (parts.BYDAY && parts.BYSETPOS) {
      const day = RR_DAYS.find((rd) => rd.val === parts.BYDAY);
      const dayName = day ? day.label : parts.BYDAY;
      const pos = Number(parts.BYSETPOS);
      const posText = pos === -1 ? "Last" : ord(pos);
      return `Every${intervalText} Month on ${posText} ${dayName}`;
    }
    return `Every${intervalText} Month`;
  }

  if (freq === "YEARLY") {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const month = Number(parts.BYMONTH) || 1;
    const day = parts.BYMONTHDAY || 1;
    const monthName = monthNames[month - 1] || "Month";
    return `Every${intervalText} Year on ${monthName} ${day}`;
  }

  return rruleText;
}

function formatDateTime12Hour(isoString) {
  if (!isoString) return "-";
  
  const date = new Date(isoString);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const minutesStr = minutes.toString().padStart(2, "0");
  
  return `${month} ${day}, ${year}. ${hours}:${minutesStr} ${ampm}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  
  const date = new Date(dateStr + "T00:00:00");
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  
  return `${month} ${day}, ${year}`;
}

function parseRRuleText(rruleText) {
  // Parse RRULE string like "FREQ=WEEKLY;INTERVAL=1;BYDAY=SU,MO" into object
  const result = {
    freq: "WEEKLY",
    interval: 1,
    byday: ["SU"],
    monthly_mode: "BYMONTHDAY",
    bymonthday: 1,
    bysetpos: 1,
    monthly_byday: "SU",
    bymonth: 1,
    bymonthday_yearly: 1,
  };

  if (!rruleText) return result;

  const parts = rruleText.split(";");
  parts.forEach((part) => {
    const [key, value] = part.split("=");
    if (!key || !value) return;

    switch (key) {
      case "FREQ":
        result.freq = value;
        break;
      case "INTERVAL":
        result.interval = Number(value) || 1;
        break;
      case "BYDAY":
        if (result.freq === "WEEKLY") {
          result.byday = value.split(",");
        } else if (result.freq === "MONTHLY") {
          result.monthly_byday = value;
        }
        break;
      case "BYSETPOS":
        result.bysetpos = Number(value) || 1;
        result.monthly_mode = "BYSETPOS";
        break;
      case "BYMONTHDAY":
        if (result.freq === "MONTHLY") {
          result.bymonthday = Number(value) || 1;
          result.monthly_mode = "BYMONTHDAY";
        } else if (result.freq === "YEARLY") {
          result.bymonthday_yearly = Number(value) || 1;
        }
        break;
      case "BYMONTH":
        result.bymonth = Number(value) || 1;
        break;
      default:
        break;
    }
  });

  return result;
}


export default function BishopEvents() {
  // one-time events
  const [events, setEvents] = useState([]);
  const [audiencesByEvent, setAudiencesByEvent] = useState({}); // event_id -> [labels]

  // recurring series
  const [series, setSeries] = useState([]);
  const [audiencesBySeries, setAudiencesBySeries] = useState({}); // series_id -> [labels]

  const [loading, setLoading] = useState(false);

  const [filterStatus, setFilterStatus] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  // reference data
  const [branches, setBranches] = useState([]);
  const [branchMinistries, setBranchMinistries] = useState([]);

  // create flow
  const [createStep, setCreateStep] = useState(0);
  const [createError, setCreateError] = useState("");

  const [visibility, setVisibility] = useState("open"); // open | selected
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedBranchMinistryIds, setSelectedBranchMinistryIds] = useState([]);

  const [imageFile, setImageFile] = useState(null);
  const [existingImagePath, setExistingImagePath] = useState("");

  // view/edit/delete
  const [showView, setShowView] = useState(false);
  const [viewKind, setViewKind] = useState(null); // "event" | "series"
  const [viewItem, setViewItem] = useState(null);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editKind, setEditKind] = useState(null); // "event" | "series"
  const [editId, setEditId] = useState(null);

  // recurring toggle + settings
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurring, setRecurring] = useState({
    starts_on: "",
    ends_on: "",
    start_time: "",
    end_time: "",

    freq: "WEEKLY",
    interval: 1,

    // WEEKLY
    byday: ["SU"],

    // MONTHLY
    monthly_mode: "BYMONTHDAY",
    bymonthday: 1,
    bysetpos: 1,
    monthly_byday: "SU",

    // YEARLY
    bymonth: 1,
    bymonthday_yearly: 1,
  });

  // base form (shared)
  const [newEvent, setNewEvent] = useState({
    title: "",
    event_type: "",
    description: "",
    location: "",
    date: "",
    start_time: "",
    end_time: "",
    est_cost: "",
  });

  async function loadBranches() {
    const { data, error } = await supabase
      .from("branches")
      .select("branch_id, name")
      .order("name", { ascending: true });
    if (error) throw error;
    setBranches(data || []);
  }

  async function loadBranchMinistries(branchId) {
    if (!branchId) {
      setBranchMinistries([]);
      return;
    }

    const { data, error } = await supabase
      .from("branch_ministries")
      .select(
        `
        branch_ministry_id,
        is_active,
        ministry:ministries(id, name)
      `
      )
      .eq("branch_id", branchId)
      .eq("is_active", true)
      .order("branch_ministry_id", { ascending: true });

    if (error) throw error;

    const normalized = (data || []).map((row) => ({
      branch_ministry_id: row.branch_ministry_id,
      ministry_id: row.ministry?.id,
      ministry_name: row.ministry?.name || "Unknown Ministry",
    }));

    setBranchMinistries(normalized);
  }

  async function loadOneTimeEventsAndAudiences() {
    // only ONE-TIME events: series_id is null
    const q = supabase
      .from("events")
      .select(
        `
        event_id,
        title,
        description,
        event_type,
        location,
        start_datetime,
        end_datetime,
        status,
        est_cost,
        participants_count,
        is_open_for_all,
        cover_image_path,
        branch_id,
        series_id,
        branch:branches(name)
      `
      )
      .is("series_id", null)
      .order("start_datetime", { ascending: true });

    if (filterStatus) q.eq("status", filterStatus);

    const { data: ev, error } = await q;
    if (error) throw error;

    const list = (ev || []).map((e) => ({
      ...e,
      cover_image_url: e.cover_image_path ? publicUrlFromPath(e.cover_image_path) : "",
      branch_name: e.branch?.name || (e.branch_id ? "Unknown Branch" : "-"),
    }));

    setEvents(list);

    // audiences for selected events
    const eventIds = list.map((x) => x.event_id);
    if (!eventIds.length) {
      setAudiencesByEvent({});
      return;
    }

    const { data: aud, error: audErr } = await supabase
      .from("event_audiences")
      .select(
        `
        event_id,
        branch_ministry:branch_ministries(
          branch_id,
          branch:branches(name),
          ministry:ministries(name)
        )
      `
      )
      .in("event_id", eventIds);

    if (audErr) throw audErr;

    const map = {};
    (aud || []).forEach((row) => {
      const label = `${row.branch_ministry?.branch?.name || "Branch"} • ${
        row.branch_ministry?.ministry?.name || "Ministry"
      }`;
      if (!map[row.event_id]) map[row.event_id] = [];
      map[row.event_id].push(label);
    });

    setAudiencesByEvent(map);
  }

  async function loadSeriesAndAudiences() {
    const q = supabase
      .from("event_series")
      .select(
        `
        series_id,
        title,
        description,
        event_type,
        location,
        rrule_text,
        start_time,
        end_time,
        starts_on,
        ends_on,
        status,
        est_cost,
        is_open_for_all,
        cover_image_path,
        branch_id,
        is_active,
        branch:branches(name)
      `
      )
      .order("created_at", { ascending: false });

    if (filterStatus) q.eq("status", filterStatus);

    const { data, error } = await q;
    if (error) throw error;

    const list = (data || []).map((s) => ({
      ...s,
      cover_image_url: s.cover_image_path ? publicUrlFromPath(s.cover_image_path) : "",
      branch_name: s.branch?.name || (s.branch_id ? "Unknown Branch" : "-"),
      rule_text: formatRRuleReadable(s.rrule_text),
    }));

    setSeries(list);

    const seriesIds = list.map((x) => x.series_id);
    if (!seriesIds.length) {
      setAudiencesBySeries({});
      return;
    }

    const { data: aud, error: audErr } = await supabase
      .from("event_series_audiences")
      .select(
        `
        series_id,
        branch_ministry:branch_ministries(
          branch_id,
          branch:branches(name),
          ministry:ministries(name)
        )
      `
      )
      .in("series_id", seriesIds);

    if (audErr) throw audErr;

    const map = {};
    (aud || []).forEach((row) => {
      const label = `${row.branch_ministry?.branch?.name || "Branch"} • ${
        row.branch_ministry?.ministry?.name || "Ministry"
      }`;
      if (!map[row.series_id]) map[row.series_id] = [];
      map[row.series_id].push(label);
    });

    setAudiencesBySeries(map);
  }

  async function loadAll() {
    setLoading(true);
    try {
      await loadBranches();
      await loadOneTimeEventsAndAudiences();
      await loadSeriesAndAudiences();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll().catch((e) => console.warn("Init load error:", e?.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isEditMode) {
      // Only clear ministry IDs when not in edit mode
      loadBranchMinistries(selectedBranchId)
        .then(() => setSelectedBranchMinistryIds([]))
        .catch((e) => console.warn("loadBranchMinistries error:", e?.message));
    } else {
      // In edit mode, just load the ministries without clearing selections
      loadBranchMinistries(selectedBranchId)
        .catch((e) => console.warn("loadBranchMinistries error:", e?.message));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId]);

  // reload when filter changes
  useEffect(() => {
    // keep it simple: re-run both queries (filter is applied inside)
    (async () => {
      try {
        setLoading(true);
        await loadOneTimeEventsAndAudiences();
        await loadSeriesAndAudiences();
      } catch (e) {
        console.warn("Filter load error:", e?.message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const filteredOneTime = useMemo(() => events, [events]);
  const filteredSeries = useMemo(() => series, [series]);

  function openView(kind, item) {
    setViewKind(kind);
    setViewItem(item);
    setShowView(true);
  }

  async function startEdit(kind, item) {
    setIsEditMode(true);
    setEditKind(kind);
    setEditId(kind === "event" ? item.event_id : item.series_id);

    // fill common fields
    setNewEvent({
      title: item.title || "",
      event_type: item.event_type || "",
      description: item.description || "",
      location: item.location || "",
      date: kind === "event" ? String(item.start_datetime || "").slice(0, 10) : "",
      start_time: kind === "event" ? String(item.start_datetime || "").slice(11, 16) : "",
      end_time: kind === "event" ? String(item.end_datetime || "").slice(11, 16) : "",
      est_cost: item.est_cost ?? "",
    });

    setVisibility(item.is_open_for_all ? "open" : "selected");
    
    // Preserve existing image
    setExistingImagePath(item.cover_image_path || "");
    setImageFile(null);
    
    // Load branch and audiences together to avoid race condition
    const branchId = item.branch_id ? String(item.branch_id) : "";
    
    try {
      // Load branch ministries first
      if (branchId) {
        await loadBranchMinistries(branchId);
      }
      
      // Then load and set audiences
      if (kind === "event") {
        const { data, error } = await supabase
          .from("event_audiences")
          .select("branch_ministry_id")
          .eq("event_id", item.event_id);
        
        if (!error && data) {
          setSelectedBranchId(branchId);
          setSelectedBranchMinistryIds(data.map(a => String(a.branch_ministry_id)));
        } else {
          setSelectedBranchId(branchId);
          setSelectedBranchMinistryIds([]);
        }
      } else {
        const { data, error } = await supabase
          .from("event_series_audiences")
          .select("branch_ministry_id")
          .eq("series_id", item.series_id);
        
        if (!error && data) {
          setSelectedBranchId(branchId);
          setSelectedBranchMinistryIds(data.map(a => String(a.branch_ministry_id)));
        } else {
          setSelectedBranchId(branchId);
          setSelectedBranchMinistryIds([]);
        }
      }
    } catch (e) {
      console.warn("Failed to load audiences:", e?.message);
      setSelectedBranchId(branchId);
      setSelectedBranchMinistryIds([]);
    }

    if (kind === "series") {
      setIsRecurring(true);
      
      // Parse the RRULE text and populate recurring state
      const parsedRRule = parseRRuleText(item.rrule_text || "");
      
      setRecurring({
        starts_on: item.starts_on || "",
        ends_on: item.ends_on || "",
        start_time: item.start_time || "",
        end_time: item.end_time || "",
        freq: parsedRRule.freq,
        interval: parsedRRule.interval,
        byday: parsedRRule.byday,
        monthly_mode: parsedRRule.monthly_mode,
        bymonthday: parsedRRule.bymonthday,
        bysetpos: parsedRRule.bysetpos,
        monthly_byday: parsedRRule.monthly_byday,
        bymonth: parsedRRule.bymonth,
        bymonthday_yearly: parsedRRule.bymonthday_yearly,
      });
    } else {
      // For one-time events, pre-populate recurring state with event's date/time
      // so if user toggles to recurring, the data is already there
      setIsRecurring(false);
      const eventDate = String(item.start_datetime || "").slice(0, 10);
      const eventStartTime = String(item.start_datetime || "").slice(11, 16);
      const eventEndTime = String(item.end_datetime || "").slice(11, 16);
      
      setRecurring({
        starts_on: eventDate || "",
        ends_on: "",
        start_time: eventStartTime || "",
        end_time: eventEndTime || "",
        freq: "WEEKLY",
        interval: 1,
        byday: ["SU"],
        monthly_mode: "BYMONTHDAY",
        bymonthday: 1,
        bysetpos: 1,
        monthly_byday: "SU",
        bymonth: 1,
        bymonthday_yearly: 1,
      });
    }

    setShowCreate(true);
    setCreateStep(0);
  }

  async function deleteItem(kind, item) {
    const ok = window.confirm(`Delete this ${kind === "event" ? "event" : "recurring schedule"}?`);
    if (!ok) return;

    try {
      // delete audiences first
      if (kind === "event") {
        await supabase.from("event_audiences").delete().eq("event_id", item.event_id);
      } else {
        await supabase.from("event_series_audiences").delete().eq("series_id", item.series_id);
      }

      // remove storage file (optional)
      const path = item.cover_image_path;
      if (path) {
        await supabase.storage.from(BUCKET).remove([path]);
      }

      // delete main row
      if (kind === "event") {
        const { error } = await supabase.from("events").delete().eq("event_id", item.event_id);
        if (error) throw error;
        await loadOneTimeEventsAndAudiences();
      } else {
        const { error } = await supabase.from("event_series").delete().eq("series_id", item.series_id);
        if (error) throw error;
        await loadSeriesAndAudiences();
      }
    } catch (e) {
      console.warn("Delete failed:", e?.message);
      alert(e?.message || "Delete failed.");
    }
  }

  async function uploadImageToEvent(eventId) {
    if (!imageFile) return null;
    const safeName = imageFile.name.replace(/\s+/g, "_");
    const path = `events/${eventId}/${Date.now()}_${safeName}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, imageFile, {
      upsert: true,
      contentType: imageFile.type,
    });

    if (error) throw error;
    return path;
  }

  async function uploadImageToSeries(seriesId) {
    if (!imageFile) return null;
    const safeName = imageFile.name.replace(/\s+/g, "_");
    const path = `series/${seriesId}/${Date.now()}_${safeName}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, imageFile, {
      upsert: true,
      contentType: imageFile.type,
    });

    if (error) throw error;
    return path;
  }

  function validateCreate() {
    if (!newEvent.title) return "Title is required.";
    if (!newEvent.event_type) return "Event type is required.";
    if (!newEvent.location) return "Location is required.";
    if (!newEvent.est_cost) return "Estimated cost is required.";
    if (!isEditMode && !imageFile) return "Event picture is required.";
    if (isEditMode && !imageFile && !existingImagePath) return "Event picture is required.";

    if (visibility === "selected") {
      if (!selectedBranchId) return "Please select a branch.";
      if (!selectedBranchMinistryIds.length) return "Please select at least one ministry.";
    }

    if (!isRecurring) {
      if (!newEvent.date) return "Date is required.";
      if (!newEvent.start_time) return "Start time is required.";
      if (!newEvent.end_time) return "End time is required.";

      const start = isoLocalFromDateTime(newEvent.date, newEvent.start_time);
      const end = isoLocalFromDateTime(newEvent.date, newEvent.end_time);
      if (!(end > start)) return "End time must be later than start time.";
      return "";
    }

    // recurring validation
      if (!recurring.starts_on) return "Recurring start date (Starts On) is required.";
      if (!recurring.start_time) return "Recurring start time is required.";
      if (!recurring.end_time) return "Recurring end time is required.";

      const st = toTimeHHMM(recurring.start_time);
      const et = toTimeHHMM(recurring.end_time);
      if (!(et > st)) return "Recurring end time must be later than start time.";

      if (recurring.freq === "WEEKLY") {
        if (!Array.isArray(recurring.byday) || recurring.byday.length === 0) {
          return "Select at least one day for weekly recurrence.";
        }
      }

      if (recurring.freq === "MONTHLY") {
        if (recurring.monthly_mode === "BYMONTHDAY") {
          const d = Number(recurring.bymonthday);
          if (!(d >= 1 && d <= 31)) return "Monthly day must be 1-31.";
        } else {
          if (!recurring.monthly_byday) return "Select a weekday for monthly recurrence.";
          const n = Number(recurring.bysetpos);
          if (!([-1,1,2,3,4,5].includes(n))) return "Monthly week must be 1-5 or Last.";
        }
      }

      if (recurring.freq === "YEARLY") {
        const m = Number(recurring.bymonth);
        const d = Number(recurring.bymonthday_yearly);
        if (!(m >= 1 && m <= 12)) return "Yearly month must be 1-12.";
        if (!(d >= 1 && d <= 31)) return "Yearly day must be 1-31.";
      }

    return "";
  }

  async function handleCreateEvent() {
    const errMsg = validateCreate();
    if (errMsg) {
      setCreateError(errMsg);
      return;
    }
    setCreateError("");

    try {
      const me = await getCurrentUserMerged();
      const isUpdating = Boolean(isEditMode && editId && editKind);

      // =========================
      // ONE-TIME EVENT -> events
      // =========================
      if (!isRecurring) {
        const start = isoLocalFromDateTime(newEvent.date, newEvent.start_time);
        const end = isoLocalFromDateTime(newEvent.date, newEvent.end_time);

        // UPDATE MODE (one-time event)
        if (isUpdating && editKind === "event") {
          const updatePayload = {
            branch_id: visibility === "selected" ? Number(selectedBranchId) : null,
            title: newEvent.title,
            description: newEvent.description || null,
            event_type: newEvent.event_type,
            location: newEvent.location,
            start_datetime: start.toISOString(),
            end_datetime: end.toISOString(),
            is_open_for_all: visibility === "open",
            est_cost: Number(newEvent.est_cost),
          };

          const { error } = await supabase.from("events").update(updatePayload).eq("event_id", editId);
          if (error) throw error;

          // image optional on edit (do NOT require it)
          if (imageFile) {
            const imagePath = await uploadImageToEvent(editId);
            const { error: imgErr } = await supabase
              .from("events")
              .update({ cover_image_path: imagePath })
              .eq("event_id", editId);
            if (imgErr) throw imgErr;
          }

          // audiences reset + reinsert
          await supabase.from("event_audiences").delete().eq("event_id", editId);
          if (visibility === "selected") {
            const rows = selectedBranchMinistryIds.map((bmId) => ({
              event_id: editId,
              branch_ministry_id: Number(bmId),
            }));
            if (rows.length) {
              const { error: audErr } = await supabase.from("event_audiences").insert(rows);
              if (audErr) throw audErr;
            }
          }

          setIsEditMode(false);
          setEditKind(null);
          setEditId(null);

          closeAndResetForm();
          await loadOneTimeEventsAndAudiences();
          return;
        }

        const payload = {
          branch_id: visibility === "selected" ? Number(selectedBranchId) : null,
          branch_ministry_id: null,
          title: newEvent.title,
          description: newEvent.description || null,
          event_type: newEvent.event_type,
          location: newEvent.location,
          start_datetime: start.toISOString(),
          end_datetime: end.toISOString(),
          created_by: me.primary_user_id,
          status: "Pending",
          is_open_for_all: visibility === "open",
          est_cost: Number(newEvent.est_cost),
          participants_count: 0,
          series_id: null,
        };

        const { data: inserted, error: insErr } = await supabase
          .from("events")
          .insert(payload)
          .select("event_id")
          .single();

        if (insErr) throw insErr;
        const eventId = inserted.event_id;

        const imagePath = await uploadImageToEvent(eventId);
        if (imagePath) {
          const { error: upErr } = await supabase
            .from("events")
            .update({ cover_image_path: imagePath })
            .eq("event_id", eventId);
          if (upErr) throw upErr;
        }

        if (visibility === "selected") {
          const rows = selectedBranchMinistryIds.map((bmId) => ({
            event_id: eventId,
            branch_ministry_id: Number(bmId),
          }));
          const { error: audErr } = await supabase.from("event_audiences").insert(rows);
          if (audErr) throw audErr;
        }

        closeAndResetForm();
        await loadOneTimeEventsAndAudiences();
        return;
      }

      // =========================
      // RECURRING -> event_series only
      // =========================
      
      // UPDATE MODE
      if (isUpdating && editKind === "series") {
        const updatePayload = {
          title: newEvent.title,
          description: newEvent.description || null,
          event_type: newEvent.event_type,
          location: newEvent.location,
          is_open_for_all: visibility === "open",
          branch_id: visibility === "selected" ? Number(selectedBranchId) : null,

          rrule_text: buildRRuleText(recurring),
          start_time: toTimeHHMM(recurring.start_time),
          end_time: toTimeHHMM(recurring.end_time),
          starts_on: recurring.starts_on,
          ends_on: recurring.ends_on || null,

          est_cost: Number(newEvent.est_cost),
        };

        const { error } = await supabase.from("event_series").update(updatePayload).eq("series_id", editId);
        if (error) throw error;

        if (imageFile) {
          const imagePath = await uploadImageToSeries(editId);
          await supabase.from("event_series").update({ cover_image_path: imagePath }).eq("series_id", editId);
        }

        await supabase.from("event_series_audiences").delete().eq("series_id", editId);
        if (visibility === "selected") {
          const rows = selectedBranchMinistryIds.map((bmId) => ({
            series_id: editId,
            branch_ministry_id: Number(bmId),
          }));
          if (rows.length) await supabase.from("event_series_audiences").insert(rows);
        }

        setIsEditMode(false);
        setEditKind(null);
        setEditId(null);

        closeAndResetForm();
        await loadSeriesAndAudiences();
        return;
      }

      const seriesPayload = {
        title: newEvent.title,
        description: newEvent.description || null,
        event_type: newEvent.event_type,
        location: newEvent.location,

        is_open_for_all: visibility === "open",
        branch_id: visibility === "selected" ? Number(selectedBranchId) : null,

        rrule_text: buildRRuleText(recurring),

        start_time: toTimeHHMM(recurring.start_time),
        end_time: toTimeHHMM(recurring.end_time),

        starts_on: recurring.starts_on,
        ends_on: recurring.ends_on || null,

        cover_image_path: null,
        est_cost: Number(newEvent.est_cost),
        created_by: me.primary_user_id,
        is_active: true,
        status: "Pending",
        cancel_reason: null,
      };

      const { data: seriesInserted, error: seriesErr } = await supabase
        .from("event_series")
        .insert(seriesPayload)
        .select("series_id")
        .single();

      if (seriesErr) throw seriesErr;
      const seriesId = seriesInserted.series_id;

      const seriesImagePath = await uploadImageToSeries(seriesId);
      if (seriesImagePath) {
        const { error: serUpErr } = await supabase
          .from("event_series")
          .update({ cover_image_path: seriesImagePath })
          .eq("series_id", seriesId);
        if (serUpErr) throw serUpErr;
      }

      if (visibility === "selected") {
        const sRows = selectedBranchMinistryIds.map((bmId) => ({
          series_id: seriesId,
          branch_ministry_id: Number(bmId),
        }));
        const { error: sAudErr } = await supabase.from("event_series_audiences").insert(sRows);
        if (sAudErr) throw sAudErr;
      }

      closeAndResetForm();
      await loadSeriesAndAudiences();
    } catch (e) {
      console.warn("Create event failed:", e?.message);
      setCreateError(e?.message || "Failed to create event.");
    }
  }

  function closeAndResetForm() {
    setShowCreate(false);
    setCreateStep(0);
    setCreateError("");

    setVisibility("open");
    setSelectedBranchId("");
    setSelectedBranchMinistryIds([]);
    setImageFile(null);
    setExistingImagePath("");

    setIsRecurring(false);
    setRecurring({
      starts_on: "",
      ends_on: "",
      start_time: "",
      end_time: "",
      freq: "WEEKLY",
      interval: 1,
      byday: ["SU"],
      monthly_mode: "BYMONTHDAY",
      bymonthday: 1,
      bysetpos: 1,
      monthly_byday: "SU",
      bymonth: 1,
      bymonthday_yearly: 1,
    });

    setNewEvent({
      title: "",
      event_type: "",
      description: "",
      location: "",
      date: "",
      start_time: "",
      end_time: "",
      est_cost: "",
    });
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />

        <main className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Activity & Events</h1>
              <p className="text-gray-600">One-time events + recurring schedules (no pre-generated weeks).</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                className="border rounded-md px-3 py-2 text-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Completed">Completed</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              <button
                className="inline-flex items-center gap-1 bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700"
                onClick={() => {
                  setIsEditMode(false);
                  setEditKind(null);
                  setEditId(null);
                  setShowCreate(true);
                }}
              >
                <Plus size={16} /> Create Event
              </button>
            </div>
          </div>

          {/* ONE-TIME EVENTS */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-gray-900">One-time Events</div>
              <div className="text-xs text-gray-500">Stored in: <b>events</b></div>
            </div>

            {loading ? (
              <div className="text-sm text-gray-600">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Image</th>
                      <th className="px-4 py-3 font-semibold">Start</th>
                      <th className="px-4 py-3 font-semibold">Title</th>
                      <th className="px-4 py-3 font-semibold">Visibility</th>
                      <th className="px-4 py-3 font-semibold">Target</th>
                      <th className="px-4 py-3 font-semibold">Participants</th>
                      <th className="px-4 py-3 font-semibold">Est. Cost</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {filteredOneTime.map((e) => {
                      const targets = audiencesByEvent[e.event_id] || [];
                      return (
                        <tr key={e.event_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            {e.cover_image_url ? (
                              <img
                                src={e.cover_image_url}
                                alt={e.title}
                                className="h-10 w-14 object-cover rounded-md border"
                              />
                            ) : (
                              <div className="h-10 w-14 rounded-md bg-gray-100 border" />
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {formatDateTime12Hour(e.start_datetime)}
                          </td>
                          <td className="px-4 py-3 text-gray-900 font-semibold">{e.title}</td>
                          <td className="px-4 py-3 text-gray-700">
                            {e.is_open_for_all ? "Open for all" : "Selected"}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {e.is_open_for_all ? (
                              <span className="text-xs">All branches & ministries</span>
                            ) : targets.length ? (
                              <ul className="text-xs list-disc pl-4 space-y-1">
                                {targets.slice(0, 3).map((t) => (
                                  <li key={t}>{t}</li>
                                ))}
                                {targets.length > 3 && <li>+{targets.length - 3} more</li>}
                              </ul>
                            ) : (
                              <span className="text-xs text-amber-700">No audience set</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-700">{e.participants_count || 0}</td>
                          <td className="px-4 py-3 text-gray-700">₱{Number(e.est_cost || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-gray-700">{e.status}</td>
                          <td className="px-4 py-3">
                            <button
                              className="px-3 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                              onClick={() => openView("event", e)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredOneTime.length === 0 && (
                      <tr>
                        <td className="px-4 py-6 text-center text-xs text-gray-500" colSpan={9}>
                          No one-time events found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* RECURRING SERIES */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-gray-900">Recurring Schedules</div>
              <div className="text-xs text-gray-500">Stored in: <b>event_series</b></div>
            </div>

            {loading ? (
              <div className="text-sm text-gray-600">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Image</th>
                      <th className="px-4 py-3 font-semibold">Rule</th>
                      <th className="px-4 py-3 font-semibold">Title</th>
                      <th className="px-4 py-3 font-semibold">Starts</th>
                      <th className="px-4 py-3 font-semibold">Ends</th>
                      <th className="px-4 py-3 font-semibold">Visibility</th>
                      <th className="px-4 py-3 font-semibold">Target</th>
                      <th className="px-4 py-3 font-semibold">Est. Cost</th>
                      <th className="px-4 py-3 font-semibold">Active</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {filteredSeries.map((s) => {
                      const targets = audiencesBySeries[s.series_id] || [];
                      return (
                        <tr key={s.series_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            {s.cover_image_url ? (
                              <img
                                src={s.cover_image_url}
                                alt={s.title}
                                className="h-10 w-14 object-cover rounded-md border"
                              />
                            ) : (
                              <div className="h-10 w-14 rounded-md bg-gray-100 border" />
                            )}
                          </td>

                          <td className="px-4 py-3 text-gray-700">
                            <div className="text-xs">{s.rule_text}</div>
                          </td>

                          <td className="px-4 py-3 text-gray-900 font-semibold">{s.title}</td>

                          <td className="px-4 py-3 text-gray-700">{formatDate(s.starts_on)}</td>
                          <td className="px-4 py-3 text-gray-700">{s.ends_on ? formatDate(s.ends_on) : "-"}</td>

                          <td className="px-4 py-3 text-gray-700">
                            {s.is_open_for_all ? "Open for all" : "Selected"}
                          </td>

                          <td className="px-4 py-3 text-gray-700">
                            {s.is_open_for_all ? (
                              <span className="text-xs">All branches & ministries</span>
                            ) : targets.length ? (
                              <ul className="text-xs list-disc pl-4 space-y-1">
                                {targets.slice(0, 3).map((t) => (
                                  <li key={t}>{t}</li>
                                ))}
                                {targets.length > 3 && <li>+{targets.length - 3} more</li>}
                              </ul>
                            ) : (
                              <span className="text-xs text-amber-700">No audience set</span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-gray-700">₱{Number(s.est_cost || 0).toLocaleString()}</td>

                          <td className="px-4 py-3 text-gray-700">
                            {s.is_active ? (
                              <span className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-100">
                                Active
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-1 rounded bg-gray-50 text-gray-700 border border-gray-100">
                                Disabled
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-gray-700">{s.status}</td>

                          <td className="px-4 py-3">
                            <button
                              className="px-3 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                              onClick={() => openView("series", s)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredSeries.length === 0 && (
                      <tr>
                        <td className="px-4 py-6 text-center text-xs text-gray-500" colSpan={11}>
                          No recurring schedules found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <p className="text-xs text-gray-500 mt-3">
              Recurring schedules do <b>not</b> pre-create weekly event rows. They run until disabled or an end date is set.
            </p>
          </div>

          {/* CREATE MODAL */}
          {showCreate && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-lg font-semibold text-gray-900">{isEditMode ? "Edit Event" : "Create New Event"}</h2>
                  <button className="ml-auto text-gray-500" onClick={closeAndResetForm}>
                    Close
                  </button>
                </div>

                <div className="flex border-b mb-4">
                  {["Basic Information", "Visibility & Target", "Review & Confirm"].map((tab, idx) => (
                    <button
                      key={tab}
                      className={`flex-1 px-3 py-2 text-sm font-medium ${
                        createStep === idx
                          ? "border-b-2 border-emerald-600 text-emerald-700"
                          : "text-gray-500"
                      }`}
                      onClick={() => setCreateStep(idx)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {createStep === 0 && (
                  <div className="space-y-3">
                    <input
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      placeholder="Event title"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    />

                    <input
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      placeholder="Event type (e.g. Outreach, Youth, Worship)"
                      value={newEvent.event_type}
                      onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value })}
                    />

                    <input
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      placeholder="Location"
                      value={newEvent.location}
                      onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    />

                    <textarea
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      placeholder="Description (optional)"
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    />

                    <input
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      placeholder="Estimated cost (₱)"
                      type="number"
                      min="0"
                      value={newEvent.est_cost}
                      onChange={(e) => setNewEvent({ ...newEvent, est_cost: e.target.value })}
                    />

                    {/* one-time vs recurring */}
                    <div className="flex items-center justify-between border rounded-md p-3">
                      <div className="text-sm">
                        <div className="font-semibold text-gray-900">Recurring weekly schedule?</div>
                        <div className="text-xs text-gray-500">
                          Use this for Sunday services (1st/2nd/3rd etc.)
                        </div>
                      </div>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={isRecurring}
                          onChange={(e) => setIsRecurring(e.target.checked)}
                        />
                        Recurring
                      </label>
                    </div>

                    {/* ONE-TIME FIELDS */}
                    {!isRecurring && (
                      <div className="flex gap-2">
                        <input
                          type="date"
                          className="flex-1 border rounded-md px-3 py-2 text-sm"
                          value={newEvent.date}
                          onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                        />
                        <input
                          type="time"
                          className="flex-1 border rounded-md px-3 py-2 text-sm"
                          value={newEvent.start_time}
                          onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                        />
                        <input
                          type="time"
                          className="flex-1 border rounded-md px-3 py-2 text-sm"
                          value={newEvent.end_time}
                          onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                        />
                      </div>
                    )}

                    {/* RECURRING FIELDS */}
                    {isRecurring && (
                      <div className="space-y-3 border rounded-md p-3">
                        {/* dates */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-gray-700">Starts On</div>
                            <input
                              type="date"
                              className="w-full border rounded-md px-3 py-2 text-sm"
                              value={recurring.starts_on}
                              onChange={(e) => setRecurring({ ...recurring, starts_on: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-gray-700">Ends On (optional)</div>
                            <input
                              type="date"
                              className="w-full border rounded-md px-3 py-2 text-sm"
                              value={recurring.ends_on}
                              onChange={(e) => setRecurring({ ...recurring, ends_on: e.target.value })}
                            />
                          </div>
                        </div>

                        {/* freq + interval */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-gray-700">Repeats</div>
                            <select
                              className="w-full border rounded-md px-3 py-2 text-sm"
                              value={recurring.freq}
                              onChange={(e) =>
                                setRecurring((prev) => ({
                                  ...prev,
                                  freq: e.target.value,
                                  byday: prev.byday?.length ? prev.byday : ["SU"],
                                }))
                              }
                            >
                              <option value="WEEKLY">Weekly</option>
                              <option value="MONTHLY">Monthly</option>
                              <option value="YEARLY">Yearly</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-gray-700">Interval</div>
                            <input
                              type="number"
                              min="1"
                              className="w-full border rounded-md px-3 py-2 text-sm"
                              value={recurring.interval}
                              onChange={(e) => setRecurring({ ...recurring, interval: Number(e.target.value || 1) })}
                            />
                          </div>
                        </div>

                        {/* time */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-gray-700">Start Time</div>
                            <input
                              type="time"
                              className="w-full border rounded-md px-3 py-2 text-sm"
                              value={recurring.start_time}
                              onChange={(e) => setRecurring({ ...recurring, start_time: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-gray-700">End Time</div>
                            <input
                              type="time"
                              className="w-full border rounded-md px-3 py-2 text-sm"
                              value={recurring.end_time}
                              onChange={(e) => setRecurring({ ...recurring, end_time: e.target.value })}
                            />
                          </div>
                        </div>

                        {/* WEEKLY: multiple days */}
                        {recurring.freq === "WEEKLY" && (
                          <div className="space-y-2">
                            <div className="text-xs font-semibold text-gray-700">Days of Week</div>
                            <div className="flex flex-wrap gap-3 text-sm">
                              {RR_DAYS.map((d) => {
                                const checked = (recurring.byday || []).includes(d.val);
                                return (
                                  <label key={d.val} className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => {
                                        setRecurring((prev) => {
                                          const set = new Set(prev.byday || []);
                                          if (set.has(d.val)) set.delete(d.val);
                                          else set.add(d.val);
                                          const arr = Array.from(set);
                                          return { ...prev, byday: arr.length ? arr : ["SU"] };
                                        });
                                      }}
                                    />
                                    {d.label}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* MONTHLY */}
                        {recurring.freq === "MONTHLY" && (
                          <div className="space-y-2">
                            <div className="text-xs font-semibold text-gray-700">Monthly Pattern</div>

                            <div className="flex gap-4 text-sm">
                              <label className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="monthly_mode"
                                  checked={recurring.monthly_mode === "BYMONTHDAY"}
                                  onChange={() => setRecurring({ ...recurring, monthly_mode: "BYMONTHDAY" })}
                                />
                                On day #
                              </label>

                              <label className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="monthly_mode"
                                  checked={recurring.monthly_mode === "BYSETPOS"}
                                  onChange={() => setRecurring({ ...recurring, monthly_mode: "BYSETPOS" })}
                                />
                                On nth weekday
                              </label>
                            </div>

                            {recurring.monthly_mode === "BYMONTHDAY" ? (
                              <div className="space-y-1">
                                <div className="text-xs font-semibold text-gray-700">Day of month (1-31)</div>
                                <input
                                  type="number"
                                  min="1"
                                  max="31"
                                  className="w-full border rounded-md px-3 py-2 text-sm"
                                  value={recurring.bymonthday}
                                  onChange={(e) => setRecurring({ ...recurring, bymonthday: Number(e.target.value || 1) })}
                                />
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <div className="text-xs font-semibold text-gray-700">Week</div>
                                  <select
                                    className="w-full border rounded-md px-3 py-2 text-sm"
                                    value={recurring.bysetpos}
                                    onChange={(e) => setRecurring({ ...recurring, bysetpos: Number(e.target.value) })}
                                  >
                                    <option value={1}>1st</option>
                                    <option value={2}>2nd</option>
                                    <option value={3}>3rd</option>
                                    <option value={4}>4th</option>
                                    <option value={5}>5th</option>
                                    <option value={-1}>Last</option>
                                  </select>
                                </div>
                                <div className="space-y-1">
                                  <div className="text-xs font-semibold text-gray-700">Weekday</div>
                                  <select
                                    className="w-full border rounded-md px-3 py-2 text-sm"
                                    value={recurring.monthly_byday}
                                    onChange={(e) => setRecurring({ ...recurring, monthly_byday: e.target.value })}
                                  >
                                    {RR_DAYS.map((d) => (
                                      <option key={d.val} value={d.val}>{d.label}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* YEARLY */}
                        {recurring.freq === "YEARLY" && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <div className="text-xs font-semibold text-gray-700">Month (1-12)</div>
                              <input
                                type="number"
                                min="1"
                                max="12"
                                className="w-full border rounded-md px-3 py-2 text-sm"
                                value={recurring.bymonth}
                                onChange={(e) => setRecurring({ ...recurring, bymonth: Number(e.target.value || 1) })}
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs font-semibold text-gray-700">Day (1-31)</div>
                              <input
                                type="number"
                                min="1"
                                max="31"
                                className="w-full border rounded-md px-3 py-2 text-sm"
                                value={recurring.bymonthday_yearly}
                                onChange={(e) => setRecurring({ ...recurring, bymonthday_yearly: Number(e.target.value || 1) })}
                              />
                            </div>
                          </div>
                        )}

                        <div className="text-xs text-gray-600 border rounded-md px-3 py-2">
                          <b>RRULE Preview:</b> {buildRRuleText(recurring)}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-800">Event Picture</div>
                      
                      {existingImagePath && !imageFile && (
                        <div className="mb-2">
                          <img
                            src={publicUrlFromPath(existingImagePath)}
                            alt="Current event picture"
                            className="h-32 w-full object-cover rounded-md border"
                          />
                          <div className="text-xs text-gray-600 mt-1">Current picture (choose a new file to replace)</div>
                        </div>
                      )}
                      
                      <input
                        type="file"
                        accept="image/*"
                        className="w-full text-sm"
                        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                      />
                      
                      {imageFile && (
                        <div className="text-xs text-green-600">New image selected: {imageFile.name}</div>
                      )}
                      
                      <div className="text-xs text-gray-500">
                        Stored in bucket: <b>{BUCKET}</b>
                      </div>
                    </div>
                  </div>
                )}

                {createStep === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-gray-900">Visibility</div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="visibility"
                          value="open"
                          checked={visibility === "open"}
                          onChange={() => setVisibility("open")}
                        />
                        Open for all (all branches & ministries can view)
                      </label>

                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="visibility"
                          value="selected"
                          checked={visibility === "selected"}
                          onChange={() => setVisibility("selected")}
                        />
                        Selected (choose branch + ministries)
                      </label>
                    </div>

                    {visibility === "selected" && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-800">Select Branch</div>
                          <select
                            className="w-full border rounded-md px-3 py-2 text-sm"
                            value={selectedBranchId}
                            onChange={(e) => setSelectedBranchId(e.target.value)}
                          >
                            <option value="">-- Choose branch --</option>
                            {branches.map((b) => (
                              <option key={b.branch_id} value={b.branch_id}>
                                {b.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <div className="text-sm font-medium text-gray-800">Select Ministries</div>
                          {selectedBranchId ? (
                            branchMinistries.length ? (
                              <div className="max-h-40 overflow-auto border rounded-md p-2 space-y-1">
                                {branchMinistries.map((m) => {
                                  const checked = selectedBranchMinistryIds.includes(String(m.branch_ministry_id));
                                  return (
                                    <label key={m.branch_ministry_id} className="flex items-center gap-2 text-sm">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => {
                                          setSelectedBranchMinistryIds((prev) => {
                                            const id = String(m.branch_ministry_id);
                                            if (prev.includes(id)) return prev.filter((x) => x !== id);
                                            return [...prev, id];
                                          });
                                        }}
                                      />
                                      {m.ministry_name}
                                    </label>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-500">No active ministries found for this branch.</div>
                            )
                          ) : (
                            <div className="text-xs text-gray-500">Choose a branch first.</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {createStep === 2 && (
                  <div className="space-y-3">
                    <h4 className="text-base font-semibold text-gray-900 mb-2">Review & Confirm</h4>

                    <div className="text-sm text-gray-700 space-y-1">
                      <div><b>Title:</b> {newEvent.title}</div>
                      <div><b>Type:</b> {newEvent.event_type}</div>
                      <div><b>Location:</b> {newEvent.location}</div>
                      <div><b>Estimated Cost:</b> ₱{Number(newEvent.est_cost || 0).toLocaleString()}</div>
                      <div><b>Picture:</b> {imageFile ? imageFile.name : "None"}</div>

                      <div className="pt-2">
                        <b>Schedule:</b> {isRecurring ? "Recurring" : "One-time"}
                      </div>

                      {!isRecurring ? (
                        <div className="text-xs text-gray-700">
                          <div><b>Date/Time:</b> {newEvent.date} {newEvent.start_time} - {newEvent.end_time}</div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-700 space-y-1">
                          <div><b>Starts:</b> {recurring.starts_on}</div>
                          <div><b>Ends:</b> {recurring.ends_on || "(none)"}</div>
                          <div><b>Time:</b> {recurring.start_time} - {recurring.end_time}</div>
                          <div><b>RRULE:</b> {buildRRuleText(recurring)}</div>
                        </div>
                      )}

                      <div className="pt-2">
                        <b>Visibility:</b> {visibility === "open" ? "Open for all" : "Selected"}
                      </div>

                      {visibility === "selected" && (
                        <div className="text-xs text-gray-700">
                          <div><b>Branch ID:</b> {selectedBranchId || "-"}</div>
                          <div><b>Ministries selected:</b> {selectedBranchMinistryIds.length}</div>
                        </div>
                      )}

                      <div className="pt-2"><b>Description:</b> {newEvent.description || "-"}</div>
                    </div>
                  </div>
                )}

                {createError && <div className="text-sm text-red-600">{createError}</div>}

                <div className="flex items-center justify-end gap-2">
                  {createStep > 0 && (
                    <button
                      className="px-3 py-2 text-sm border rounded-md"
                      onClick={() => setCreateStep(createStep - 1)}
                    >
                      Back
                    </button>
                  )}

                  {createStep < 2 && (
                    <button
                      className="px-3 py-2 text-sm bg-emerald-600 text-white rounded-md"
                      onClick={() => setCreateStep(createStep + 1)}
                    >
                      Next
                    </button>
                  )}

                  {createStep === 2 && (
                    <button
                      className="px-3 py-2 text-sm bg-emerald-600 text-white rounded-md"
                      onClick={handleCreateEvent}
                    >
                      {isEditMode ? "Save Changes" : "Create Event"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW DETAILS MODAL */}
          {showView && viewItem && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 space-y-4">
                <div className="flex items-center">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {viewKind === "event" ? "Event Details" : "Recurring Schedule Details"}
                  </h2>
                  <button className="ml-auto text-gray-500" onClick={() => setShowView(false)}>
                    Close
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    {viewItem.cover_image_url ? (
                      <img src={viewItem.cover_image_url} alt={viewItem.title} className="w-full h-36 object-cover rounded-md border" />
                    ) : (
                      <div className="w-full h-36 rounded-md bg-gray-100 border" />
                    )}
                  </div>

                  <div className="col-span-2 space-y-2 text-sm">
                    <div><b>Title:</b> {viewItem.title}</div>
                    <div><b>Type:</b> {viewItem.event_type}</div>
                    <div><b>Location:</b> {viewItem.location}</div>
                    <div><b>Estimated Cost:</b> ₱{Number(viewItem.est_cost || 0).toLocaleString()}</div>
                    <div><b>Visibility:</b> {viewItem.is_open_for_all ? "Open for all" : "Selected"}</div>

                    {viewKind === "event" ? (
                      <div>
                        <b>Schedule:</b>{" "}
                        {formatDateTime12Hour(viewItem.start_datetime)} – {formatDateTime12Hour(viewItem.end_datetime)}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div><b>Starts:</b> {formatDate(viewItem.starts_on)}</div>
                        <div><b>Ends:</b> {viewItem.ends_on ? formatDate(viewItem.ends_on) : "-"}</div>
                        <div><b>Time:</b> {viewItem.start_time} – {viewItem.end_time}</div>
                        <div><b>RRULE:</b> {formatRRuleReadable(viewItem.rrule_text)}</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-sm">
                  <b>Description:</b>
                  <div className="mt-1 text-gray-700 whitespace-pre-wrap">
                    {viewItem.description || "-"}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md"
                    onClick={() => {
                      setShowView(false);
                      startEdit(viewKind, viewItem);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="px-3 py-2 text-sm bg-red-600 text-white rounded-md"
                    onClick={() => deleteItem(viewKind, viewItem)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
