import React, { useEffect, useState } from "react";
import { UserCircle } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useBranding } from "../context/BrandingContext";
import { useNavigate } from "react-router-dom";

export default function Header() {
  const [photoUrl, setPhotoUrl] = useState(null);
  const { branding } = useBranding();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        // ✅ 1. Get logged-in user
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        const user = authData?.user;
        if (!user) return;

        // ✅ 2. Get related user_details_id from users table
        const { data: userRecord, error: userError } = await supabase
          .from("users")
          .select("user_details_id")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (userError) throw userError;
        if (!userRecord?.user_details_id) return;

        // ✅ 3. Fetch user's photo_path
        const { data: details, error: detailsError } = await supabase
          .from("users_details")
          .select("photo_path")
          .eq("user_details_id", userRecord.user_details_id)
          .maybeSingle();

        if (detailsError) throw detailsError;
        if (!details?.photo_path) return;

        let url = details.photo_path;
        if (!url.startsWith("http")) {
          if (url.startsWith("profile_pics/profile_pics/")) {
            url = url.replace("profile_pics/", "");
          }

          const { data: publicData, error: urlError } = supabase.storage
            .from("profile_pics")
            .getPublicUrl(url);
          if (urlError) throw urlError;
          url = publicData?.publicUrl || null;
        }

        setPhotoUrl(url);
      } catch (err) {
        console.error("❌ Failed to load profile image:", err.message);
      }
    })();
  }, []);

  return (
    <header
      className="flex items-center justify-between px-6 py-3 shadow-md"
      style={{
        backgroundColor: branding?.secondary_color || "var(--secondary-color)",
        fontFamily: branding?.font_family || "var(--font-family)",
      }}
    >
      {/* Left: System Logo */}
      <div className="flex items-center gap-3">
        {branding?.logo_icon ? (
          <img
            src={branding.logo_icon}
            alt="System Logo"
            className="h-10 w-auto object-contain"
          />
        ) : (
          <h2 className="text-xl font-semibold text-white">System</h2>
        )}
      </div>

      {/* Right: Profile Icon */}
      <div
        className="cursor-pointer flex items-center justify-center"
        onClick={() => navigate("/profile")} // ✅ Fixed lowercase
        title="View Profile"
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt="Profile"
            className="w-10 h-10 rounded-full object-cover border-2 transition-all hover:scale-105"
            style={{
              borderColor: branding?.tertiary_color || "var(--tertiary-color)",
            }}
          />
        ) : (
          <UserCircle
            size={36}
            style={{
              color: branding?.tertiary_color || "var(--tertiary-color)",
            }}
          />
        )}
      </div>
    </header>
  );
}
