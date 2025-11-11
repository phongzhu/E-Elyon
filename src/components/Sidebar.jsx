import React, { useState } from "react";
import {
  Home,
  LogOut,
  Menu,
  ChevronLeft,
  Brush,
  Database,
  FileText,
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useBranding } from "../context/BrandingContext";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { branding } = useBranding();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const menuItems = [
    { label: "Dashboard", icon: <Home size={20} />, to: "/admin" },
    { label: "Customize Branding", icon: <Brush size={20} />, to: "/branding" },
    { label: "Audit Log", icon: <FileText size={20} />, to: "/audit_log" },
    { label: "Database Setting", icon: <Database size={20} />, to: "/database" },
  ];

  const primaryColor = branding?.primary_color || "var(--primary-color)";
  const secondaryColor = branding?.secondary_color || "var(--secondary-color)";
  const tertiaryColor = branding?.tertiary_color || "var(--tertiary-color)";
  const tertiaryText = branding?.tertiary_text_color || "var(--tertiary-text)";
  const fontFamily = branding?.font_family || "var(--font-family)";

  return (
    <aside
      className={`${collapsed ? "w-20" : "w-64"} min-h-screen flex flex-col transition-all duration-300 shadow-lg`}
      style={{
        backgroundColor: primaryColor,
        color: tertiaryText,
        fontFamily,
      }}
    >
      {/* 🔹 COLLAPSE BUTTON ONLY (no logo or title) */}
      <div
        className="flex justify-end p-4 border-b"
        style={{
          borderColor: tertiaryColor,
        }}
      >
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md transition-all hover:bg-white/10"
          style={{ color: tertiaryText }}
        >
          {collapsed ? <Menu size={22} /> : <ChevronLeft size={22} />}
        </button>
      </div>

      {/* 🔹 MENU ITEMS */}
      <nav className="flex-1 px-3 mt-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.label}
              to={item.to}
              className={`flex items-center gap-3 p-3 rounded-lg font-medium transition-all duration-200 ${
                isActive
                  ? "shadow-md scale-[1.02]"
                  : "hover:scale-[1.02]"
              }`}
              style={{
                backgroundColor: isActive ? secondaryColor : "transparent",
                color: tertiaryText,
              }}
            >
              <div
                className="flex items-center justify-center"
                style={{
                  color: isActive ? tertiaryText : tertiaryText,
                  opacity: isActive ? 1 : 0.85,
                }}
              >
                {item.icon}
              </div>
              {!collapsed && (
                <span
                  className={`transition-all ${
                    isActive ? "font-semibold" : "opacity-90"
                  }`}
                >
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* 🔹 LOGOUT BUTTON */}
      <div
        className="p-4 border-t"
        style={{
          borderColor: secondaryColor,
        }}
      >
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 p-3 rounded-lg w-full text-left transition-all duration-200 hover:opacity-90"
          style={{
            backgroundColor: tertiaryColor,
            color: tertiaryText,
          }}
        >
          <LogOut size={20} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
