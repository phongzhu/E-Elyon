import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { supabase } from "../../lib/supabaseClient";
import { CalendarDays, CheckCircle2, AlertTriangle, Plus } from "lucide-react";

export default function BishopEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    type: "",
    ministry: "",
    date: "",
    time: "",
    location: "",
    description: "",
    est_cost: "",
  });
  const [createStep, setCreateStep] = useState(0);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("events")
          .select("id, title, branch, date, status, participants, est_cost");
        const normalized = (!error && data && data.length) ? data : demoEvents();
        if (mounted) setEvents(normalized);
      } catch (_) {
        if (mounted) setEvents(demoEvents());
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => events.filter((e) => (filterStatus ? e.status === filterStatus : true)), [events, filterStatus]);

  async function approveEvent(eventId) {
    try {
      setEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, status: "Approved" } : e));
      await supabase.from("events").update({ status: "Approved" }).eq("id", eventId);
    } catch (err) {
      console.warn("approveEvent error", err?.message);
    }
  }

  async function handleCreateEvent() {
    if (!newEvent.title || !newEvent.type || !newEvent.ministry || !newEvent.date || !newEvent.time || !newEvent.location || !newEvent.est_cost) {
      setCreateError("All fields including location and estimated cost are required.");
      return;
    }
    setCreateError("");
    try {
      const eventObj = {
        ...newEvent,
        date: new Date(`${newEvent.date}T${newEvent.time}`),
        status: "Pending",
        participants: 0,
        branch: newEvent.location,
        est_cost: Number(newEvent.est_cost),
      };
      setEvents((prev) => [...prev, { ...eventObj, id: Date.now() }]);
      await supabase.from("events").insert(eventObj);
      setShowCreate(false);
      setNewEvent({ title: "", type: "", ministry: "", date: "", time: "", location: "", description: "", est_cost: "" });
      setCreateStep(0);
    } catch (err) {
      setCreateError("Failed to create event.");
    }
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
              <p className="text-gray-600">Centralized schedules, participation, and resource impact.</p>
            </div>
            <div className="flex items-center gap-2">
              <select className="border rounded-md px-3 py-2 text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Completed">Completed</option>
              </select>
              <button
                className="inline-flex items-center gap-1 bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700"
                onClick={() => setShowCreate(true)}
              >
                <Plus size={16} /> Create Event
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Title</th>
                    <th className="px-4 py-3 font-semibold">Branch</th>
                    <th className="px-4 py-3 font-semibold">Participants</th>
                    <th className="px-4 py-3 font-semibold">Est. Cost</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">{new Date(e.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-gray-900 font-semibold">{e.title}</td>
                      <td className="px-4 py-3 text-gray-700">{e.branch}</td>
                      <td className="px-4 py-3 text-gray-700">{e.participants || 0}</td>
                      <td className="px-4 py-3 text-gray-700">₱{Number(e.est_cost || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-700">{e.status}</td>
                      <td className="px-4 py-3">
                        <button
                          className="inline-flex items-center gap-1 bg-emerald-600 text-white px-3 py-1 rounded-md hover:bg-emerald-700 disabled:opacity-50"
                          onClick={() => approveEvent(e.id)}
                          disabled={e.status === "Approved"}
                        >
                          <CheckCircle2 size={16} /> Approve
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-center text-xs text-gray-500" colSpan={7}>No events match the filter.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-3">Restricted: No event creation or editing here.</p>
          </div>

          {showCreate && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-lg font-semibold text-gray-900">Create New Event</h2>
                  <button className="ml-auto text-gray-500" onClick={() => setShowCreate(false)}>Close</button>
                </div>
                <div className="flex border-b mb-4">
                  {["Basic Information", "Assign Roles", "Review & Confirm"].map((tab, idx) => (
                    <button
                      key={tab}
                      className={`flex-1 px-3 py-2 text-sm font-medium ${createStep === idx ? "border-b-2 border-emerald-600 text-emerald-700" : "text-gray-500"}`}
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
                      placeholder="Enter event title"
                      value={newEvent.title}
                      onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                    />
                    <input
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      placeholder="Select event type"
                      value={newEvent.type}
                      onChange={e => setNewEvent({ ...newEvent, type: e.target.value })}
                    />
                    <input
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      placeholder="Select ministry/department"
                      value={newEvent.ministry}
                      onChange={e => setNewEvent({ ...newEvent, ministry: e.target.value })}
                    />
                    <div className="flex gap-2">
                      <input
                        type="date"
                        className="flex-1 border rounded-md px-3 py-2 text-sm"
                        value={newEvent.date}
                        onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                      />
                      <input
                        type="time"
                        className="flex-1 border rounded-md px-3 py-2 text-sm"
                        value={newEvent.time}
                        onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
                      />
                    </div>
                    <input
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      placeholder="Enter location"
                      value={newEvent.location}
                      onChange={e => setNewEvent({ ...newEvent, location: e.target.value })}
                    />
                    <textarea
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      placeholder="Enter description..."
                      value={newEvent.description}
                      onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                    />
                    <input
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      placeholder="Estimated cost (₱)"
                      type="number"
                      min="0"
                      value={newEvent.est_cost}
                      onChange={e => setNewEvent({ ...newEvent, est_cost: e.target.value })}
                    />
                  </div>
                )}
                {createStep === 1 && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-700">Assign Roles (optional)</p>
                    <input
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      placeholder="e.g. Worship Leader, Sound Engineer, Greeter"
                      value={newEvent.roles || ""}
                      onChange={e => setNewEvent({ ...newEvent, roles: e.target.value })}
                    />
                  </div>
                )}
                {createStep === 2 && (
                  <div className="space-y-3">
                    <h4 className="text-base font-semibold text-gray-900 mb-2">Review & Confirm</h4>
                    <div className="text-sm text-gray-700">
                      <div><b>Title:</b> {newEvent.title}</div>
                      <div><b>Type:</b> {newEvent.type}</div>
                      <div><b>Ministry:</b> {newEvent.ministry}</div>
                      <div><b>Date:</b> {newEvent.date} {newEvent.time}</div>
                      <div><b>Location:</b> {newEvent.location}</div>
                      <div><b>Description:</b> {newEvent.description}</div>
                      <div><b>Estimated Cost:</b> ₱{Number(newEvent.est_cost || 0).toLocaleString()}</div>
                    </div>
                  </div>
                )}
                {createError && <div className="text-sm text-red-600">{createError}</div>}
                <div className="flex items-center justify-end gap-2">
                  {createStep > 0 && <button className="px-3 py-2 text-sm border rounded-md" onClick={() => setCreateStep(createStep - 1)}>Back</button>}
                  {createStep < 2 && <button className="px-3 py-2 text-sm bg-emerald-600 text-white rounded-md" onClick={() => setCreateStep(createStep + 1)}>Next</button>}
                  {createStep === 2 && <button className="px-3 py-2 text-sm bg-emerald-600 text-white rounded-md" onClick={handleCreateEvent}>Create Event</button>}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function demoEvents() {
  return [
    { id: 1, title: "Christmas Outreach", branch: "Sampaloc (Main Branch)", date: new Date(2025, 11, 24), status: "Pending", participants: 120, est_cost: 25000 },
    { id: 2, title: "Youth Night", branch: "Vizal Pampanga", date: new Date(2025, 11, 20), status: "Approved", participants: 80, est_cost: 12000 },
    { id: 3, title: "Prayer Vigil", branch: "Bustos", date: new Date(2025, 11, 19), status: "Completed", participants: 60, est_cost: 8000 },
  ];
}
