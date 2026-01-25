import React from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";

export default function Membership() {
  return (
    <div className="flex min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 font-[Inter]">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 p-6 overflow-y-auto">
          <h1 className="text-2xl font-bold mb-4">Attendance and Membership</h1>
          <div className="bg-white rounded-xl shadow p-8">Branch-level attendance and membership management goes here.</div>
        </main>
      </div>
    </div>
  );
}
