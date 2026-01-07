import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import {
  Pencil,
  Save,
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Camera,
} from "lucide-react";
import { useBranding } from "../../context/BrandingContext";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const navigate = useNavigate();
  const { branding } = useBranding();

  // 🎨 Theme variables
  const primary = branding?.primary_color || "#0f172a";
  const secondary = branding?.secondary_color || "#1e40af";
  const tertiary = branding?.tertiary_color || "#3b82f6";
  const text = branding?.tertiary_text_color || "#ffffff";
  const font = branding?.font_family || "Inter";
  const bg = branding?.primary_background || "#f9fafb";

  // ✅ Load user profile
  useEffect(() => {
    (async () => {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        const user = authData?.user;
        if (!user) return;

        const { data: userRecord, error: userError } = await supabase
          .from("users")
          .select("user_details_id, email, role")
          .eq("auth_user_id", user.id)
          .maybeSingle();
        if (userError) throw userError;

        if (!userRecord?.user_details_id) return;

        const { data: details, error: detailsError } = await supabase
          .from("users_details")
          .select("*")
          .eq("user_details_id", userRecord.user_details_id)
          .maybeSingle();
        if (detailsError) throw detailsError;

        setProfile({ ...details, email: userRecord.email, role: userRecord.role });
      } catch (err) {
        console.error("❌ Failed to load profile:", err.message);
        setErr("Failed to load profile: " + err.message);
      }
    })();
  }, []);

  const handleChange = (e) => setProfile({ ...profile, [e.target.name]: e.target.value });

  // ✅ Upload profile photo
  const handleUpload = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated.");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `profile_pics/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("profile_pics")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from("profile_pics")
        .getPublicUrl(filePath);

      const photoUrl = publicData?.publicUrl || null;
      if (!photoUrl) throw new Error("Unable to generate public URL");

      setProfile((p) => ({ ...p, photo_path: photoUrl }));
      setMsg("✅ New profile photo uploaded. Click save to apply.");
      setTimeout(() => setMsg(""), 3000);
    } catch (e) {
      setErr("Upload failed: " + e.message);
      setTimeout(() => setErr(""), 3000);
    } finally {
      setUploading(false);
    }
  };

  // ✅ Save edits
  const handleSave = async () => {
    try {
      setMsg("");
      setErr("");

      const updates = { ...profile, updated_at: new Date().toISOString() };

      const { error } = await supabase
        .from("users_details")
        .update(updates)
        .eq("user_details_id", profile.user_details_id);

      if (error) throw error;

      setMsg("✅ Profile updated successfully!");
      setEditMode(false);
      setTimeout(() => setMsg(""), 3000);
    } catch (e) {
      setErr("Failed to save changes: " + e.message);
      setTimeout(() => setErr(""), 3000);
    }
  };

  if (!profile)
    return (
      <div className="flex">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div
                className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
                style={{ borderColor: tertiary }}
              ></div>
              <p className="text-gray-500">Loading profile...</p>
            </div>
          </main>
        </div>
      </div>
    );

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />

        <main
          className="flex-1 p-8 overflow-y-auto transition-all"
          style={{
            backgroundColor: bg,
            fontFamily: font,
          }}
        >
          {/* Feedback */}
          {msg && (
            <div
              className="max-w-5xl mx-auto mb-6 p-4 rounded-lg flex items-center gap-3 animate-pulse"
              style={{
                backgroundColor: `${tertiary}15`,
                borderLeft: `4px solid ${tertiary}`,
              }}
            >
              <span style={{ color: tertiary }}>{msg}</span>
            </div>
          )}
          {err && (
            <div
              className="max-w-5xl mx-auto mb-6 p-4 rounded-lg flex items-center gap-3"
              style={{
                backgroundColor: "#fee2e2",
                borderLeft: "4px solid #ef4444",
              }}
            >
              <span className="text-red-800 font-medium">{err}</span>
            </div>
          )}

          <div className="max-w-8xl mx-auto">
            {/* Profile Header */}
            <div
              className="rounded-2xl shadow-xl p-8 mb-6 relative overflow-hidden"
              style={{
                background: `linear-gradient(90deg, ${secondary}, ${tertiary})`,
                color: text,
              }}
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24"></div>

              <div className="relative flex flex-col md:flex-row items-center gap-6">
                {/* Photo */}
                <div className="relative group">
                  {profile.photo_path ? (
                    <img
                      src={profile.photo_path}
                      alt="Profile"
                      className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-2xl"
                    />
                  ) : (
                    <div
                      className="w-32 h-32 rounded-full flex items-center justify-center border-4 border-white shadow-2xl"
                      style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                    >
                      <User size={48} className="text-white" />
                    </div>
                  )}

                  {editMode && (
                    <label
                      htmlFor="photoUpload"
                      className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Camera size={32} className="text-white" />
                      <input
                        id="photoUpload"
                        type="file"
                        accept="image/*"
                        onChange={handleUpload}
                        className="hidden"
                      />
                    </label>
                  )}

                  {uploading && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 text-center md:text-left">
                  <h1 className="text-3xl font-bold mb-2">
                    {profile.first_name} {profile.middle_name} {profile.last_name}{" "}
                    {profile.suffix}
                  </h1>
                  <div className="flex flex-wrap gap-4 justify-center md:justify-start text-white/90">
                    <div className="flex items-center gap-2">
                      <Mail size={16} />
                      <span className="text-sm">{profile.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield size={16} />
                      <span className="text-sm capitalize">
                        {profile.role || "User"}
                      </span>
                    </div>
                    {profile.contact_number && (
                      <div className="flex items-center gap-2">
                        <Phone size={16} />
                        <span className="text-sm">{profile.contact_number}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Edit/Save Buttons */}
                <div>
                  {!editMode ? (
                    <button
                      onClick={() => setEditMode(true)}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold shadow-lg hover:scale-105 transition-all"
                      style={{
                        backgroundColor: text,
                        color: secondary,
                      }}
                    >
                      <Pencil size={18} /> Edit Profile
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold shadow-lg hover:scale-105 transition-all"
                        style={{
                          backgroundColor: tertiary,
                          color: text,
                        }}
                      >
                        <Save size={18} /> Save
                      </button>
                      <button
                        onClick={() => setEditMode(false)}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold backdrop-blur-sm hover:bg-white/20 transition-all"
                        style={{
                          backgroundColor: "rgba(255,255,255,0.25)",
                          color: text,
                        }}
                      >
                        <X size={18} /> Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Details */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2
                className="text-xl font-bold mb-6 flex items-center gap-2"
                style={{ color: primary }}
              >
                <User size={24} style={{ color: tertiary }} />
                Personal Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { label: "First Name", key: "first_name", icon: User },
                  { label: "Middle Name", key: "middle_name", icon: User },
                  { label: "Last Name", key: "last_name", icon: User },
                  { label: "Suffix", key: "suffix", icon: User },
                  { label: "Gender", key: "gender", icon: User },
                  { label: "Birthdate", key: "birthdate", icon: Calendar, type: "date" },
                  { label: "Contact Number", key: "contact_number", icon: Phone },
                  { label: "Status", key: "status", icon: Shield },
                ].map(({ label, key, icon: Icon, type }) => (
                  <div key={key}>
                    <label className="block text-sm font-semibold mb-2 flex items-center gap-2 text-gray-700">
                      <Icon size={16} className="text-gray-400" />
                      {label}
                    </label>
                    {editMode ? (
                      <input
                        type={type || "text"}
                        className="w-full border-2 rounded-lg p-3 focus:outline-none transition-colors"
                        name={key}
                        value={profile[key] || ""}
                        onChange={handleChange}
                        style={{
                          borderColor: "#ccc",
                          "--tw-ring-color": tertiary,
                          outlineColor: tertiary,
                        }}
                      />
                    ) : (
                      <p className="p-3 bg-gray-50 rounded-lg text-gray-800 border border-gray-200">
                        {profile[key] || "—"}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <h2
                className="text-xl font-bold mt-8 mb-6 flex items-center gap-2"
                style={{ color: primary }}
              >
                <MapPin size={24} style={{ color: tertiary }} />
                Address Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { label: "City", key: "city" },
                  { label: "Province", key: "province" },
                  { label: "Region", key: "region" },
                  { label: "Country", key: "country" },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="block text-sm font-semibold mb-2 flex items-center gap-2 text-gray-700">
                      <MapPin size={16} className="text-gray-400" />
                      {label}
                    </label>
                    {editMode ? (
                      <input
                        className="w-full border-2 rounded-lg p-3 focus:outline-none transition-colors"
                        name={key}
                        value={profile[key] || ""}
                        onChange={handleChange}
                        style={{
                          borderColor: "#ccc",
                          outlineColor: tertiary,
                        }}
                      />
                    ) : (
                      <p className="p-3 bg-gray-50 rounded-lg text-gray-800 border border-gray-200">
                        {profile[key] || "—"}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
