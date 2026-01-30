import React from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";

export default function StaffTasks() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="p-8">
          <h1 className="text-2xl font-bold mb-2">My Tasks</h1>
          <p className="text-gray-600">Placeholder for staff tasks.</p>
        </main>
      </div>
    </div>
  );
}
