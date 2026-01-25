import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { supabase } from "../../lib/supabaseClient";
import { CheckCircle2, Plus } from "lucide-react";

const BUCKET = "church-event"; // storage bucket name

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
  const day = dowLabel(s.day_of_week);
  const time = `${toTimeHHMM(s.start_time)} - ${toTimeHHMM(s.end_time)}`;
  const wom = Array.isArray(s.week_of_month) && s.week_of_month.length
    ? `(${s.week_of_month.map(Number).sort((a, b) => a - b).map(ord).join(", ")} ${day})`
    : `(Every ${day})`;
  return `${wom} • ${time}`;
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

  // recurring toggle + settings
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurring, setRecurring] = useState({
    starts_on: "",
    ends_on: "",
    day_of_week: 0, // Sunday
    every_week: true,
    week_of_month: [1, 2, 3], // used if every_week=false
    start_time: "",
    end_time: "",
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
        is_open_for_all,
        branch_id,
        day_of_week,
        week_of_month,
        start_time,
        end_time,
        starts_on,
        ends_on,
        cover_image_path,
        est_cost,
        created_by,
        is_active,
        status,
        cancel_reason,
        created_at,
        updated_at,
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
      rule_text: seriesRuleText(s),
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
    loadBranchMinistries(selectedBranchId)
      .then(() => setSelectedBranchMinistryIds([]))
      .catch((e) => console.warn("loadBranchMinistries error:", e?.message));
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

  async function approveOneTimeEvent(eventId) {
    try {
      setEvents((prev) => prev.map((e) => (e.event_id === eventId ? { ...e, status: "Approved" } : e)));
      const { error } = await supabase.from("events").update({ status: "Approved" }).eq("event_id", eventId);
      if (error) throw error;
    } catch (err) {
      console.warn("approveOneTimeEvent error", err?.message);
    }
  }

  async function approveSeries(seriesId) {
    try {
      setSeries((prev) => prev.map((s) => (s.series_id === seriesId ? { ...s, status: "Approved" } : s)));
      const { error } = await supabase.from("event_series").update({ status: "Approved" }).eq("series_id", seriesId);
      if (error) throw error;
    } catch (err) {
      console.warn("approveSeries error", err?.message);
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
    if (!imageFile) return "Event picture is required.";

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

    if (!recurring.every_week) {
      if (!Array.isArray(recurring.week_of_month) || !recurring.week_of_month.length) {
        return "Choose at least one week of month (e.g., 1st/2nd/3rd).";
      }
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

      // =========================
      // ONE-TIME EVENT -> events
      // =========================
      if (!isRecurring) {
        const start = isoLocalFromDateTime(newEvent.date, newEvent.start_time);
        const end = isoLocalFromDateTime(newEvent.date, newEvent.end_time);

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
      const weekArr = recurring.every_week ? null : recurring.week_of_month.map(Number);

      const seriesPayload = {
        title: newEvent.title,
        description: newEvent.description || null,
        event_type: newEvent.event_type,
        location: newEvent.location,

        is_open_for_all: visibility === "open",
        branch_id: visibility === "selected" ? Number(selectedBranchId) : null,

        day_of_week: Number(recurring.day_of_week),
        week_of_month: weekArr,

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

    setIsRecurring(false);
    setRecurring({
      starts_on: "",
      ends_on: "",
      day_of_week: 0,
      every_week: true,
      week_of_month: [1, 2, 3],
      start_time: "",
      end_time: "",
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
                onClick={() => setShowCreate(true)}
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
                            {new Date(e.start_datetime).toLocaleString()}
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
                              className="inline-flex items-center gap-1 bg-emerald-600 text-white px-3 py-1 rounded-md hover:bg-emerald-700 disabled:opacity-50"
                              onClick={() => approveOneTimeEvent(e.event_id)}
                              disabled={String(e.status).toLowerCase() === "approved"}
                            >
                              <CheckCircle2 size={16} /> Approve
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

                          <td className="px-4 py-3 text-gray-700">{s.starts_on}</td>
                          <td className="px-4 py-3 text-gray-700">{s.ends_on || "-"}</td>

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
                              className="inline-flex items-center gap-1 bg-emerald-600 text-white px-3 py-1 rounded-md hover:bg-emerald-700 disabled:opacity-50"
                              onClick={() => approveSeries(s.series_id)}
                              disabled={String(s.status).toLowerCase() === "approved"}
                            >
                              <CheckCircle2 size={16} /> Approve
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
                  <h2 className="text-lg font-semibold text-gray-900">Create New Event</h2>
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

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-gray-700">Day of Week</div>
                            <select
                              className="w-full border rounded-md px-3 py-2 text-sm"
                              value={recurring.day_of_week}
                              onChange={(e) =>
                                setRecurring({ ...recurring, day_of_week: Number(e.target.value) })
                              }
                            >
                              <option value={0}>Sunday</option>
                              <option value={1}>Monday</option>
                              <option value={2}>Tuesday</option>
                              <option value={3}>Wednesday</option>
                              <option value={4}>Thursday</option>
                              <option value={5}>Friday</option>
                              <option value={6}>Saturday</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-gray-700">Rule</div>
                            <div className="text-xs text-gray-600 border rounded-md px-3 py-2">
                              {recurring.every_week
                                ? "Every week"
                                : `Weeks: ${recurring.week_of_month.join(", ")}`}
                            </div>
                          </div>
                        </div>

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

                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={recurring.every_week}
                            onChange={(e) => setRecurring({ ...recurring, every_week: e.target.checked })}
                          />
                          Every week
                        </label>

                        {!recurring.every_week && (
                          <div className="space-y-2">
                            <div className="text-xs font-semibold text-gray-700">
                              Weeks of Month (for Sunday: 1st/2nd/3rd)
                            </div>
                            <div className="flex flex-wrap gap-3 text-sm">
                              {[1, 2, 3, 4, 5].map((n) => {
                                const checked = recurring.week_of_month.includes(n);
                                return (
                                  <label key={n} className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => {
                                        setRecurring((prev) => {
                                          const arr = new Set(prev.week_of_month);
                                          if (arr.has(n)) arr.delete(n);
                                          else arr.add(n);
                                          return {
                                            ...prev,
                                            week_of_month: Array.from(arr).sort((a, b) => a - b),
                                          };
                                        });
                                      }}
                                    />
                                    {ord(n)}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-800">Event Picture</div>
                      <input
                        type="file"
                        accept="image/*"
                        className="w-full text-sm"
                        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                      />
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
                          <div><b>Day:</b> {dowLabel(recurring.day_of_week)}</div>
                          <div><b>Time:</b> {recurring.start_time} - {recurring.end_time}</div>
                          <div>
                            <b>Rule:</b>{" "}
                            {recurring.every_week
                              ? "Every week"
                              : `Weeks ${recurring.week_of_month.join(", ")} of the month`}
                          </div>
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
                      Create Event
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
