import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

export default function Branding() {
  const [form, setForm] = useState({
    primary_color: "",
    secondary_color: "",
    tertiary_color: "",
    primary_text_color: "",
    secondary_text_color: "",
    tertiary_text_color: "",
    primary_background: "",
    secondary_background: "",
    font_family: "",
    font_size: "",
    logo_icon: "",
  });

  const [fileName, setFileName] = useState("No file chosen");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const [unsavedLogo, setUnsavedLogo] = useState(false);

  const navigate = useNavigate();

  // ✅ Fetch global branding (only 1 row expected)
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("ui_settings")
          .select("*")
          .limit(1)
          .single();
        if (error) throw error;
        if (data) setForm((prev) => ({ ...prev, ...data }));
      } catch (e) {
        console.error(e);
        setErr("Error loading branding: " + e.message);
      }
    })();
  }, []);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // ✅ Upload new logo (preview only)
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    try {
      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `branding_${Date.now()}.${fileExt}`;
      const filePath = `branding/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("branding_assets")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("branding_assets")
        .getPublicUrl(filePath);

      setForm((prev) => ({ ...prev, logo_icon: data.publicUrl }));
      setUnsavedLogo(true);
      setMsg("✅ Logo uploaded! Remember to click 'Save Branding' to apply changes.");
    } catch (e) {
      setErr("Upload failed: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  // ✅ Save branding (update or insert one global record)
  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    setErr("");

    try {
      const payload = {
        ...form,
        updated_at: new Date().toISOString(),
      };

      const { data: existing } = await supabase
        .from("ui_settings")
        .select("setting_id")
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("ui_settings")
          .update(payload)
          .eq("setting_id", existing.setting_id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ui_settings").insert([payload]);
        if (error) throw error;
      }

      setUnsavedLogo(false);
      setMsg("✅ Branding saved successfully!");
      setTimeout(() => window.location.reload(), 1000);
    } catch (e) {
      setErr("Failed to save settings: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1">
        <Header />
        {/* 🌿 Page Background (Primary) */}
        <main
          className="p-8 min-h-screen transition-all"
          style={{
            backgroundColor: form.primary_background,
            fontFamily: form.font_family,
            fontSize: form.font_size,
            color: form.primary_text_color,
          }}
        >
          <h1 className="text-2xl font-bold mb-6">Customize Branding</h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 🧾 FORM SECTION */}
            <form
              onSubmit={handleSave}
              className="p-6 rounded-xl shadow-md grid grid-cols-2 gap-6"
              style={{
                backgroundColor: form.secondary_background,
              }}
            >
              {/* COLORS */}
              <div>
                <label className="block mb-1 font-medium">Primary Color</label>
                <input
                  type="color"
                  name="primary_color"
                  value={form.primary_color}
                  onChange={handleChange}
                  className="w-20 h-10 p-1"
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Secondary Color</label>
                <input
                  type="color"
                  name="secondary_color"
                  value={form.secondary_color}
                  onChange={handleChange}
                  className="w-20 h-10 p-1"
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Tertiary Color</label>
                <input
                  type="color"
                  name="tertiary_color"
                  value={form.tertiary_color}
                  onChange={handleChange}
                  className="w-20 h-10 p-1"
                />
              </div>

              {/* TEXT COLORS */}
              <div>
                <label className="block mb-1 font-medium">Primary Text Color</label>
                <input
                  type="color"
                  name="primary_text_color"
                  value={form.primary_text_color}
                  onChange={handleChange}
                  className="w-20 h-10 p-1"
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Secondary Text Color</label>
                <input
                  type="color"
                  name="secondary_text_color"
                  value={form.secondary_text_color}
                  onChange={handleChange}
                  className="w-20 h-10 p-1"
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Tertiary Text Color (Buttons)</label>
                <input
                  type="color"
                  name="tertiary_text_color"
                  value={form.tertiary_text_color}
                  onChange={handleChange}
                  className="w-20 h-10 p-1"
                />
              </div>

              {/* BACKGROUND COLORS */}
              <div>
                <label className="block mb-1 font-medium">Primary Background (Page)</label>
                <input
                  type="color"
                  name="primary_background"
                  value={form.primary_background}
                  onChange={handleChange}
                  className="w-20 h-10 p-1"
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Secondary Background (Cards)</label>
                <input
                  type="color"
                  name="secondary_background"
                  value={form.secondary_background}
                  onChange={handleChange}
                  className="w-20 h-10 p-1"
                />
              </div>

              {/* FONT SETTINGS */}
              <div>
                <label className="block mb-1 font-medium">Font Family</label>
                <select
                  name="font_family"
                  value={form.font_family || "Inter"}
                  onChange={handleChange}
                  className="w-full border rounded-lg p-2"
                >
                  <option>Inter</option>
                  <option>Roboto</option>
                  <option>Poppins</option>
                  <option>Open Sans</option>
                  <option>Lato</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 font-medium">Font Size</label>
                <input
                  name="font_size"
                  value={form.font_size || "16px"}
                  onChange={handleChange}
                  className="w-full border rounded-lg p-2"
                />
              </div>

              {/* LOGO UPLOAD */}
              <div className="col-span-2">
                <label className="block mb-2 font-medium">System Logo</label>

                <div className="flex items-center gap-3">
                  <label
                    htmlFor="logoUpload"
                    className="bg-[color:var(--primary-color,#1E40AF)] hover:opacity-90 text-white px-4 py-2 rounded-lg cursor-pointer transition-all"
                  >
                    Choose File
                  </label>
                  <input
                    id="logoUpload"
                    type="file"
                    accept="image/*"
                    onChange={handleUpload}
                    className="hidden"
                  />
                  <span className="text-sm text-gray-600">{fileName}</span>
                </div>

                {uploading && (
                  <p className="text-gray-500 text-sm mt-1">Uploading...</p>
                )}
                {form.logo_icon && (
                  <img
                    src={form.logo_icon}
                    alt="Logo"
                    className="mt-3 w-32 h-32 object-contain border rounded-lg"
                  />
                )}
                {unsavedLogo && (
                  <p className="text-yellow-600 text-sm mt-2">
                    ⚠️ Remember to click "Save Branding" to apply this new logo.
                  </p>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="col-span-2 flex gap-4 mt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="text-white px-4 py-2 rounded-lg transition-all"
                  style={{
                    backgroundColor: form.primary_color,
                    color: form.tertiary_text_color,
                  }}
                >
                  {loading ? "Saving..." : "Save Branding"}
                </button>
                <button
                  onClick={() => navigate("/admin")}
                  type="button"
                  className="px-4 py-2 rounded-lg transition-all"
                  style={{
                    backgroundColor: form.secondary_color,
                    color: form.primary_text_color,
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>

            {/* 🌈 LIVE PREVIEW */}
            <div
              className="p-6 rounded-xl shadow-md border flex flex-col justify-center items-center text-center"
              style={{
                backgroundColor: form.secondary_background,
                color: form.primary_text_color,
                fontFamily: form.font_family,
                fontSize: form.font_size,
              }}
            >
              <div
                className="w-full p-4 rounded-lg mb-4"
                style={{ backgroundColor: form.primary_background }}
              >
                {form.logo_icon ? (
                  <img
                    src={form.logo_icon}
                    alt="Logo Preview"
                    className="w-24 h-24 mx-auto mb-4 object-contain"
                  />
                ) : (
                  <div className="w-24 h-24 mx-auto mb-4 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500">
                    No Logo
                  </div>
                )}
                <h2 style={{ color: form.primary_text_color }} className="text-xl font-semibold">
                  {form.font_family || "Inter"} Preview
                </h2>
                <p style={{ color: form.secondary_text_color }}>
                  Live preview updates as you change settings.
                </p>
                <button
                  className="mt-4 px-4 py-2 rounded-lg"
                  style={{
                    backgroundColor: form.primary_color,
                    color: form.tertiary_text_color,
                  }}
                >
                  Primary Button
                </button>
                <button
                  className="mt-4 ml-2 px-4 py-2 rounded-lg"
                  style={{
                    backgroundColor: form.secondary_color,
                    color: form.primary_text_color,
                  }}
                >
                  Secondary Button
                </button>
              </div>
            </div>
          </div>

          {/* FEEDBACK */}
          {err && <p className="text-red-600 mt-4">{err}</p>}
          {msg && <p className="text-green-600 mt-4">{msg}</p>}
        </main>
      </div>
    </div>
  );
}
