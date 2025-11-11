import React from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { useBranding } from "../context/BrandingContext";

export default function AdminDashboard() {
  const { branding } = useBranding();

  return (
    <div
      className="flex h-screen"
      style={{
        backgroundColor: "var(--secondary-bg)",
        fontFamily: "var(--font-family)",
        fontSize: "var(--font-size)",
        color: "var(--primary-text)",
      }}
    >
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-y-auto">
          <h1
            className="text-2xl font-bold mb-4"
            style={{ color: "var(--primary-text)" }}
          >
            Welcome, Admin!
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <div
              className="rounded-lg shadow p-6"
              style={{
                backgroundColor: "var(--primary-bg)",
                color: "var(--primary-text)",
              }}
            >
              <h3
                className="font-medium mb-2"
                style={{ color: "var(--secondary-text)" }}
              >
                Members
              </h3>
              <p
                className="text-3xl font-bold"
                style={{ color: "var(--primary-color)" }}
              >
                123
              </p>
            </div>

            <div
              className="rounded-lg shadow p-6"
              style={{
                backgroundColor: "var(--primary-bg)",
                color: "var(--primary-text)",
              }}
            >
              <h3
                className="font-medium mb-2"
                style={{ color: "var(--secondary-text)" }}
              >
                Events
              </h3>
              <p
                className="text-3xl font-bold"
                style={{ color: "var(--secondary-color)" }}
              >
                12
              </p>
            </div>

            <div
              className="rounded-lg shadow p-6"
              style={{
                backgroundColor: "var(--primary-bg)",
                color: "var(--primary-text)",
              }}
            >
              <h3
                className="font-medium mb-2"
                style={{ color: "var(--secondary-text)" }}
              >
                Offerings
              </h3>
              <p
                className="text-3xl font-bold"
                style={{ color: "var(--secondary-color)" }}
              >
                ₱42,500
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
