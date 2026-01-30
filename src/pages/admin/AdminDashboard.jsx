import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { useBranding } from "../../context/BrandingContext";
import { supabase } from "../../lib/supabaseClient";
import { 
  Users, 
  UserX, 
  Activity, 
  Database, 
  Search,
  Bell,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const { branding } = useBranding();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeAccounts: 9,
    inactiveAccounts: 1,
    uptime: "99.9%",
    lastBackup: "2023-11-20"
  });
  const [recentActivities, setRecentActivities] = useState([
    {
      log_id: 1,
      action: "LOGIN",
      description: "User Management",
      created_at: "2023-11-20T10:30:00",
      users: { email: "admin@example.com" }
    },
    {
      log_id: 2,
      action: "UPDATE",
      description: "Branding Settings",
      created_at: "2023-11-20T09:15:00",
      users: { email: "john.doe@example.com" }
    },
    {
      log_id: 3,
      action: "LOGIN",
      description: "Dashboard Access",
      created_at: "2023-11-20T08:45:00",
      users: { email: "jane.smith@example.com" }
    }
  ]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const primaryColor = branding?.primary_color || "#0B6516";
  const secondaryColor = branding?.secondary_color || "#9C0808";

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    // Using placeholder data - uncomment to fetch from database
    /*
    try {
      // Fetch user statistics
      const { data: users, error } = await supabase
        .from("users")
        .select("user_id, status");

      if (error) throw error;

      const active = users?.filter(u => u.status === "active").length || 0;
      const inactive = users?.filter(u => u.status === "inactive").length || 0;

      setStats(prev => ({
        ...prev,
        activeAccounts: active,
        inactiveAccounts: inactive
      }));

      // Fetch recent activities
      const { data: logs, error: logsError } = await supabase
        .from("audit_logs")
        .select(`
          log_id,
          action,
          description,
          created_at,
          users (
            email
          )
        `)
        .order("created_at", { ascending: false })
        .limit(5);

      if (logsError) throw logsError;
      setRecentActivities(logs || []);
    } catch (err) {
      console.error("Error fetching dashboard data:", err.message);
    }
    */
  };

  const filteredActivities = recentActivities.filter(activity =>
    activity.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.action?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calendar functions
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const changeMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="flex min-h-screen bg-gray-50 font-[Inter]">
      <Sidebar />

      <div className="flex flex-col flex-1">
        <Header />

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="flex gap-6">
            {/* Main Content Area */}
            <div className="flex-1">
              {/* Welcome Section */}
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Welcome back, Admin Adrian!</h1>
                <p className="text-gray-500 text-sm mt-1">Overview of system status and recent activities</p>
              </div>

              {/* Dashboard Section */}
              <div className="mb-8">
              
                {/* System Overview */}
                <h3 className="text-sm font-bold text-gray-700 uppercase mb-4">SYSTEM OVERVIEW</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <Users size={24} style={{ color: primaryColor }} />
                      <h4 className="text-sm font-medium text-gray-500">Total Active Accounts</h4>
                    </div>
                    <p className="text-4xl font-bold text-gray-800">{stats.activeAccounts}</p>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <UserX size={24} style={{ color: secondaryColor }} />
                      <h4 className="text-sm font-medium text-gray-500">Total Inactive Accounts</h4>
                    </div>
                    <p className="text-4xl font-bold text-gray-800">{stats.inactiveAccounts}</p>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <Activity size={24} style={{ color: primaryColor }} />
                      <h4 className="text-sm font-medium text-gray-500">System Uptime</h4>
                    </div>
                    <p className="text-4xl font-bold text-gray-800">{stats.uptime}</p>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <Database size={24} style={{ color: secondaryColor }} />
                      <h4 className="text-sm font-medium text-gray-500">Last Backup</h4>
                    </div>
                    <p className="text-4xl font-bold text-gray-800">{stats.lastBackup}</p>
                  </div>
                </div>
              </div>

              {/* Recent Activities */}
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Activities</h3>
                
                {/* Search Bar */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                  />
                </div>

                {/* Activities Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">User</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Action</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date & Time</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Module</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredActivities.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-gray-400 italic">
                            No recent activities found
                          </td>
                        </tr>
                      ) : (
                        filteredActivities.map((activity) => (
                          <tr key={activity.log_id} className="border-b hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-700">
                              {activity.users?.email || "Unknown"}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              {activity.action}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {new Date(activity.created_at).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {activity.description || "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="w-80 space-y-6">
              {/* Calendar */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => changeMonth(-1)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <h3 className="text-sm font-semibold text-gray-800">{monthName}</h3>
                  <button
                    onClick={() => changeMonth(1)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                    <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
                      {day}
                    </div>
                  ))}
                  
                  {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} className="text-center py-2"></div>
                  ))}
                  
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const isToday = 
                      day === new Date().getDate() &&
                      currentDate.getMonth() === new Date().getMonth() &&
                      currentDate.getFullYear() === new Date().getFullYear();
                    const dayOfWeek = (startingDayOfWeek + i) % 7;
                    const isSunday = dayOfWeek === 0;
                    
                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                        className={`text-center py-2 text-sm rounded hover:bg-gray-100 ${
                          isToday ? 'bg-blue-500 text-white font-bold hover:bg-blue-600' : ''
                        } ${isSunday ? 'text-red-500 font-semibold' : 'text-gray-700'}`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Upcoming Events */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Upcoming Events</h3>
                <div className="space-y-4">
                  <div className="border-l-4 pl-3 py-2" style={{ borderColor: primaryColor }}>
                    <h4 className="font-semibold text-gray-800">Sunday Service</h4>
                    <p className="text-sm text-gray-500 mt-1">December 22, 2025 • 9:00 AM</p>
                  </div>
                  <div className="border-l-4 pl-3 py-2" style={{ borderColor: secondaryColor }}>
                    <h4 className="font-semibold text-gray-800">Pastor Appreciation Day</h4>
                    <p className="text-sm text-gray-500 mt-1">December 29, 2025 • 10:00 AM</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
