import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      {sidebarOpen && <Sidebar />}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
