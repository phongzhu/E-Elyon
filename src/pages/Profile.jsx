import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { Pencil, Save, X } from "lucide-react";
import { useBranding } from "../context/BrandingContext";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const navigate = useNavigate();
  const { branding } = useBranding();

  // ✅ Load user profile
  useEffect(() => {
    (async () => {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        const user = authData?.user;
        if (!user) return;

        // Get user_details_id and role
        const { data: userRecord, error: userError } = await supabase
          .from("users")
          .select("user_details_id, email, role")
          .eq("auth_user_id", user.id)
          .maybeSingle();
        if (userError) throw userError;

        if (!userRecord?.user_details_id) return;

        // Fetch user details
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
    } catch (e) {
      setErr("Upload failed: " + e.message);
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
    } catch (e) {
      setErr("Failed to save changes: " + e.message);
    }
  };

  if (!profile)
    return (
      <main className="p-10 text-center text-gray-500">Loading profile...</main>
    );

  return (
    <div className="flex">
      {/* 🧭 Sidebar */}
      <Sidebar />

      {/* 📄 Main Content */}
      <div className="flex-1 flex flex-col">
        <Header />

        <main
          className="flex-1 p-8 flex justify-center"
          style={{
            backgroundColor:
              branding?.primary_background || "var(--primary-bg)",
            color: branding?.primary_text_color || "var(--primary-text)",
            fontFamily: branding?.font_family || "var(--font-family)",
          }}
        >
          <div
            className="p-6 rounded-xl shadow-lg w-full max-w-3xl"
            style={{
              backgroundColor:
                branding?.secondary_background || "var(--secondary-bg)",
            }}
          >
            {/* HEADER */}
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold">My Profile</h1>
              {!editMode ? (
                <button
                  onClick={() => setEditMode(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-white transition-all"
                  style={{
                    backgroundColor:
                      branding?.primary_color || "var(--primary-color)",
                  }}
                >
                  <Pencil size={18} /> Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-white"
                    style={{
                      backgroundColor:
                        branding?.primary_color || "var(--primary-color)",
                    }}
                  >
                    <Save size={18} /> Save
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-md"
                    style={{
                      backgroundColor:
                        branding?.tertiary_color || "var(--tertiary-color)",
                      color:
                        branding?.tertiary_text_color || "var(--tertiary-text)",
                    }}
                  >
                    <X size={18} /> Cancel
                  </button>
                </div>
              )}
            </div>

            {/* PROFILE PHOTO */}
            <div className="flex flex-col items-center mb-6">
              {profile.photo_path ? (
                <img
                  src={profile.photo_path}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 shadow-md"
                  style={{
                    borderColor:
                      branding?.tertiary_color || "var(--tertiary-color)",
                  }}
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                  No Photo
                </div>
              )}

              {editMode && (
                <div className="mt-3">
                  <input type="file" accept="image/*" onChange={handleUpload} />
                  {uploading && (
                    <p className="text-gray-500 text-sm mt-1">Uploading...</p>
                  )}
                </div>
              )}
            </div>

            {/* DETAILS */}
            <div className="grid grid-cols-2 gap-4">
              {[
                ["First Name", "first_name"],
                ["Middle Name", "middle_name"],
                ["Last Name", "last_name"],
                ["Suffix", "suffix"],
                ["Gender", "gender"],
                ["Birthdate", "birthdate"],
                ["Contact Number", "contact_number"],
                ["City", "city"],
                ["Province", "province"],
                ["Region", "region"],
                ["Country", "country"],
                ["Status", "status"],
              ].map(([label, key]) => (
                <div key={key}>
                  <label className="block text-sm font-medium mb-1">
                    {label}
                  </label>
                  {editMode ? (
                    <input
                      className="w-full border rounded-md p-2"
                      name={key}
                      value={profile[key] || ""}
                      onChange={handleChange}
                    />
                  ) : (
                    <p className="p-2 bg-gray-100 rounded-md">
                      {profile[key] || "—"}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* MESSAGES */}
            {err && <p className="text-red-600 mt-4">{err}</p>}
            {msg && <p className="text-green-600 mt-4">{msg}</p>}
          </div>
        </main>
      </div>
    </div>
  );
}
