import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { FileText, RefreshCcw } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { useBranding } from "../context/BrandingContext";

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const { branding } = useBranding();

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  // 🔹 Fetch audit logs (joined with users)
  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("audit_logs")
        .select(
          `
          log_id,
          action,
          description,
          created_at,
          users (
            user_id,
            email
          )
        `
        )
        .order("created_at", { ascending: false });

      if (filter !== "ALL") query = query.eq("action", filter);

      const { data, error } = await query;
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error("Error fetching logs:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const primaryColor = branding?.primary_color || "#0B6516";
  const secondaryColor = branding?.secondary_color || "#9C0808";

  return (
    <div className="flex min-h-screen bg-gray-50 font-[Inter]">
      {/* 🔹 Sidebar */}
      <Sidebar />

      {/* 🔹 Main Content Area */}
      <div className="flex flex-col flex-1">
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="p-8">
          {/* Page Title & Refresh */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <FileText size={26} style={{ color: secondaryColor }} />
              <h1 className="text-2xl font-bold text-gray-800">Audit Logs</h1>
            </div>

            <button
              onClick={fetchLogs}
              className="flex items-center gap-2 text-white py-2 px-4 rounded-lg font-medium shadow transition-all duration-150"
              style={{
                backgroundColor: secondaryColor,
              }}
            >
              <RefreshCcw size={18} /> Refresh
            </button>
          </div>

          {/* 🔹 Filter Dropdown */}
          <div className="mb-4">
            <label className="mr-2 font-medium text-gray-700">Filter:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200"
            >
              <option value="ALL">All</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
              <option value="SIGNUP">Signup</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
            </select>
          </div>

          {/* 🔹 Logs Table */}
          <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-gray-100 border-b text-gray-700 uppercase text-xs">
                <tr>
                  
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-8 text-gray-500 italic"
                    >
                      Loading logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-8 text-gray-400 italic"
                    >
                      No logs found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log, idx) => (
                    <tr
                      key={log.log_id}
                      className="border-b hover:bg-gray-50 transition-colors"
                    >
                      
                      <td className="px-4 py-2 text-gray-700">
                        {log.users?.email || "Unknown"}
                      </td>
                      <td
                        className={`px-4 py-2 font-semibold ${
                          log.action === "LOGIN"
                            ? "text-green-600"
                            : log.action === "LOGOUT"
                            ? "text-red-600"
                            : log.action === "SIGNUP"
                            ? "text-blue-600"
                            : "text-gray-700"
                        }`}
                      >
                        {log.action}
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {log.description || "-"}
                      </td>
                      <td className="px-4 py-2 text-gray-500">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}
