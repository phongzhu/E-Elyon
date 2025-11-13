import React, { useEffect, useState } from "react";
import { Bell, Settings, UserCircle } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useBranding } from "../context/BrandingContext";
import { useNavigate } from "react-router-dom";

export default function Header() {
  const [photoUrl, setPhotoUrl] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const { branding } = useBranding();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        if (!user) return;

        const { data: userRecord } = await supabase
          .from("users")
          .select("user_details_id")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (!userRecord?.user_details_id) return;

        const { data: details } = await supabase
          .from("users_details")
          .select("photo_path")
          .eq("user_details_id", userRecord.user_details_id)
          .maybeSingle();

        if (details?.photo_path) {
          let url = details.photo_path;
          if (!url.startsWith("http")) {
            const { data: publicData } = supabase.storage
              .from("profile_pics")
              .getPublicUrl(url);
            url = publicData?.publicUrl || null;
          }
          setPhotoUrl(url);
        }
      } catch (err) {
        console.error("❌ Failed to load profile image:", err.message);
      }
    })();
  }, []);

  const primary = branding?.primary_color || "#0f172a";
  const secondary = branding?.secondary_color || "#1e40af";
  const tertiary = branding?.tertiary_color || "#3b82f6";
  const text = branding?.tertiary_text_color || "#ffffff";
  const font = branding?.font_family || "Inter";

  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 shadow-lg"
      style={{
        backgroundColor: secondary,
        fontFamily: font,
        color: text,
      }}
    >
      {/* Left Section: Logo + System Name */}
      <div className="flex items-center gap-4">
        {branding?.logo_icon ? (
          <img
            src={branding.logo_icon}
            alt="Logo"
            className="h-10 w-10 rounded-lg object-contain shadow-md"
            style={{ backgroundColor: tertiary }}
          />
        ) : (
          <div
            className="h-10 w-10 rounded-lg flex items-center justify-center text-lg font-bold"
            style={{ backgroundColor: tertiary, color: text }}
          >
            E
          </div>
        )}
        <div>
          <h2
            className="text-xl font-bold tracking-tight"
            style={{ color: text }}
          >
            {branding?.system_name || "E-Elyon System"}
          </h2>
          <p className="text-xs opacity-70" style={{ color: text }}>
            Admin Dashboard
          </p>
        </div>
      </div>

      {/* Right Section: Actions */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg hover:bg-white/10 transition-all relative"
            style={{ color: text }}
          >
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
              </div>
              <div className="p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">System Update</p>
                <p className="text-xs text-gray-600 mt-1">
                  New branding options available
                </p>
                <p className="text-xs text-gray-400 mt-1">2 hours ago</p>
              </div>
              <div className="p-4 hover:bg-gray-50 cursor-pointer">
                <p className="text-sm font-medium text-gray-900">Welcome!</p>
                <p className="text-xs text-gray-600 mt-1">
                  Complete your profile setup
                </p>
                <p className="text-xs text-gray-400 mt-1">1 day ago</p>
              </div>
            </div>
          )}
        </div>

        {/* Settings */}
        <button
          className="p-2 rounded-lg hover:bg-white/10 transition-all"
          style={{ color: text }}
        >
          <Settings size={20} />
        </button>

        {/* Profile Icon */}
        <button
          onClick={() => navigate("/profile")}
          className="flex items-center gap-2 p-1 pr-3 rounded-full hover:bg-white/10 transition-all"
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: tertiary }}
          >
            {photoUrl ? (
              <img
                src={photoUrl}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <UserCircle size={24} style={{ color: text }} />
            )}
          </div>
          <span
            className="text-sm font-medium"
            style={{ color: text }}
          >
            Admin
          </span>
        </button>
      </div>
    </header>
  );
}
