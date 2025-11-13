import React, { useState } from "react";
import {
  Home,
  LogOut,
  X,
  ChevronRight,
  Brush,
  Database,
  FileText,
  UserCircle,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useBranding } from "../context/BrandingContext";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { branding } = useBranding();

  const handleLogout = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData?.user;

      if (authUser?.email) {
        const { data: userRecord } = await supabase
          .from("users")
          .select("user_id")
          .eq("email", authUser.email)
          .single();

        if (userRecord) {
          await supabase.rpc("record_user_action", {
            p_user_id: userRecord.user_id,
            p_action: "LOGOUT",
            p_description: "User logged out successfully",
          });
        }
      }

      await supabase.auth.signOut();
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err.message);
      navigate("/login");
    }
  };

  const primary = branding?.primary_color || "#0f172a";
  const secondary = branding?.secondary_color || "#1e40af";
  const tertiary = branding?.tertiary_color || "#3b82f6";
  const text = branding?.tertiary_text_color || "#ffffff";
  const font = branding?.font_family || "Inter";

  const menuItems = [
    { label: "Dashboard", icon: Home, to: "/admin" },
    { label: "Customize Branding", icon: Brush, to: "/branding" },
    { label: "Audit Logs", icon: FileText, to: "/audit_log" },
    { label: "Database Settings", icon: Database, to: "/database" },
  ];

  return (
    <aside
      className={`${
        collapsed ? "w-20" : "w-72"
      } min-h-screen flex flex-col transition-all duration-300 shadow-2xl relative`}
      style={{
        backgroundColor: primary,
        color: text,
        fontFamily: font,
      }}
    >
      {/* Collapse Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 z-10"
        style={{
          backgroundColor: tertiary,
          color: text,
        }}
      >
        {collapsed ? <ChevronRight size={14} /> : <X size={14} />}
      </button>

      {/* Header */}
      <div className="p-6 border-b border-white/10">
        {!collapsed ? (
          <div className="text-center">
            {branding?.logo_icon ? (
              <img
                src={branding.logo_icon}
                alt="Logo"
                className="w-16 h-16 mx-auto mb-3 rounded-xl object-contain"
              />
            ) : (
              <div
                className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg"
                style={{ backgroundColor: tertiary, color: text }}
              >
                E
              </div>
            )}
            <h3 className="font-bold text-lg">Admin Panel</h3>
            <p className="text-xs opacity-70 mt-1">Manage your system</p>
          </div>
        ) : (
          <div
            className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center text-xl font-bold"
            style={{
              backgroundColor: tertiary,
              color: text,
            }}
          >
            E
          </div>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;

          return (
            <button
              key={item.label}
              onClick={() => navigate(item.to)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-all duration-200 group ${
                isActive ? "shadow-lg scale-[1.02]" : "hover:scale-[1.02] hover:bg-white/5"
              }`}
              style={{
                backgroundColor: isActive ? secondary : "transparent",
              }}
            >
              <div
                className={`transition-transform ${
                  isActive ? "scale-110" : "group-hover:scale-110"
                }`}
              >
                <Icon size={20} />
              </div>

              {!collapsed && (
                <span className={isActive ? "font-semibold" : ""}>
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        {!collapsed && (
          <div className="mb-3 p-3 rounded-lg bg-white/5 flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: tertiary }}
            >
              <UserCircle size={24} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Admin User</p>
              <p className="text-xs opacity-70">admin@example.com</p>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-3 p-3 rounded-xl w-full transition-all duration-200 hover:scale-[1.02] shadow-lg"
          style={{
            backgroundColor: tertiary,
            color: text,
          }}
        >
          <LogOut size={20} />
          {!collapsed && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
