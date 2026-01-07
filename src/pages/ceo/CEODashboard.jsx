import React from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { useBranding } from "../../context/BrandingContext";
import { Briefcase, TrendingUp, Users, BarChart3 } from "lucide-react";

export default function CEODashboard() {
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
              <h1 className="text-3xl font-bold text-gray-800">CEO Dashboard</h1>
              <p className="text-gray-500 text-sm mt-2">Strategic overview and decision making</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Briefcase size={24} style={{ color: primaryColor }} />
                  <h4 className="text-sm font-medium text-gray-500">Key Initiatives</h4>
                </div>
                <p className="text-4xl font-bold text-gray-800">8</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-3">
                  <TrendingUp size={24} style={{ color: secondaryColor }} />
                  <h4 className="text-sm font-medium text-gray-500">Growth Rate</h4>
                </div>
                <p className="text-4xl font-bold text-gray-800">15.3%</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Users size={24} style={{ color: primaryColor }} />
                  <h4 className="text-sm font-medium text-gray-500">Total Members</h4>
                </div>
                <p className="text-4xl font-bold text-gray-800">1,254</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-3">
                  <BarChart3 size={24} style={{ color: secondaryColor }} />
                  <h4 className="text-sm font-medium text-gray-500">Performance</h4>
                </div>
                <p className="text-4xl font-bold text-gray-800">92%</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Executive Summary</h2>
              <p className="text-gray-600">
                Get a strategic overview of all church operations, member growth, financial health, and key performance indicators.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
