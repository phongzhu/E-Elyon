import React from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { useBranding } from "../../context/BrandingContext";
import { CheckSquare, Clock, Users, AlertCircle } from "lucide-react";

export default function StaffDashboard() {
  const { branding } = useBranding();
  const primaryColor = branding?.primary_color || "#0B6516";
  const secondaryColor = branding?.secondary_color || "#9C0808";

  return (
    <div className="flex min-h-screen bg-gray-50 font-[Inter]">
      <Sidebar />

      <div className="flex flex-col flex-1">
        <Header />

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-6xl">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-800">Staff Dashboard</h1>
              <p className="text-gray-500 text-sm mt-2">Manage your tasks and responsibilities</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-3">
                  <CheckSquare size={24} style={{ color: primaryColor }} />
                  <h4 className="text-sm font-medium text-gray-500">Completed Tasks</h4>
                </div>
                <p className="text-4xl font-bold text-gray-800">24</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Clock size={24} style={{ color: secondaryColor }} />
                  <h4 className="text-sm font-medium text-gray-500">Pending Tasks</h4>
                </div>
                <p className="text-4xl font-bold text-gray-800">7</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Users size={24} style={{ color: primaryColor }} />
                  <h4 className="text-sm font-medium text-gray-500">Team Members</h4>
                </div>
                <p className="text-4xl font-bold text-gray-800">6</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-3">
                  <AlertCircle size={24} style={{ color: secondaryColor }} />
                  <h4 className="text-sm font-medium text-gray-500">Urgent Issues</h4>
                </div>
                <p className="text-4xl font-bold text-gray-800">2</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Your Tasks</h2>
              <p className="text-gray-600">
                View and manage your assigned tasks, collaborate with team members, and track progress.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
