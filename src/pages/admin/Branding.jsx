import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { Upload, Check, X, Eye, Palette, Type, Image } from "lucide-react";

export default function Branding() {
  const [form, setForm] = useState({
    system_name: "",
    description: "",
    primary_color: "#0B6516",
    secondary_color: "#9C0808",
    tertiary_color: "#16A34A",
    primary_text_color: "#000000",
    secondary_text_color: "#333333",
    tertiary_text_color: "#ffffff",
    primary_background: "#ffffff",
    secondary_background: "#f7f7f7",
    font_family: "Inter",
    font_size: "16px",
    logo_icon: "",
  });

  const [fileName, setFileName] = useState("No file chosen");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("colors");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [colorPreview, setColorPreview] = useState({});

  // ✅ Load logged-in user (for updated_by)
  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const email = authData?.user?.email;
      if (email) {
        const { data: userRecord } = await supabase
          .from("users")
          .select("user_id")
          .eq("email", email)
          .single();
        if (userRecord) setCurrentUserId(userRecord.user_id);
      }
    })();
  }, []);

  // ✅ Fetch current branding (ui_settings)
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

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // ✅ Upload logo to Supabase storage
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
      setMsg("✅ Logo uploaded! Remember to click 'Save Branding'.");
      setTimeout(() => setMsg(""), 3000);
    } catch (e) {
      setErr("Upload failed: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  // ✅ Save to database
  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    setErr("");

    try {
      const payload = {
        ...form,
        updated_by: currentUserId,
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

      setMsg("✅ Branding saved successfully!");
      setTimeout(() => setMsg(""), 3000);
    } catch (e) {
      setErr("Failed to save settings: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const ColorPicker = ({ label, name, value }) => (
    <div className="group">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="relative">
        <input
          type="color"
          name={name}
          value={colorPreview[name] || value}
          onChange={(e) => setColorPreview({ ...colorPreview, [name]: e.target.value })}
          className="absolute opacity-0 w-0 h-0"
          id={name}
        />
        <label
          htmlFor={name}
          className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-lg cursor-pointer transition-all hover:shadow-md"
          style={{
            borderColor: form.primary_color,
          }}
        >
          <div
            className="w-12 h-12 rounded-lg shadow-inner border-2 border-white"
            style={{ backgroundColor: colorPreview[name] || value }}
          />
          <div className="flex-1">
            <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
            <div className="font-mono text-sm font-semibold text-gray-800">
              {colorPreview[name] || value}
            </div>
          </div>
        </label>
        {colorPreview[name] && colorPreview[name] !== value && (
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => {
                setForm({ ...form, [name]: colorPreview[name] });
                setColorPreview({ ...colorPreview, [name]: null });
              }}
              className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
            >
              <Check className="w-4 h-4" />
              Apply
            </button>
            <button
              type="button"
              onClick={() => setColorPreview({ ...colorPreview, [name]: null })}
              className="flex-1 px-3 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors flex items-center justify-center gap-1"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const tabs = [
    { id: "colors", label: "Colors", icon: Palette },
    { id: "typography", label: "Typography", icon: Type },
    { id: "branding", label: "Branding", icon: Image },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        <div className="max-w-8xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Customize Branding
            </h1>
            <p className="text-gray-600">
              Personalize your system's look and feel
            </p>
          </div>

          {/* Feedback */}
          {msg && (
            <div
              className="mb-6 p-4 border rounded-lg flex items-center gap-3 animate-pulse"
              style={{
                backgroundColor: `${form.primary_color}15`,
                borderColor: form.primary_color,
              }}
            >
              <Check className="w-5 h-5" style={{ color: form.primary_color }} />
              <span style={{ color: form.primary_color }}>{msg}</span>
            </div>
          )}
          {err && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <X className="w-5 h-5 text-red-600" />
              <span className="text-red-800">{err}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Settings */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-gray-200 bg-gray-50">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-all`}
                      style={{
                        borderBottom:
                          activeTab === tab.id
                            ? `2px solid ${form.primary_color}`
                            : "2px solid transparent",
                        color:
                          activeTab === tab.id ? form.primary_color : "#555",
                        backgroundColor:
                          activeTab === tab.id ? "#fff" : "transparent",
                      }}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <form onSubmit={handleSave} className="p-6">
                {/* COLORS TAB */}
                {activeTab === "colors" && (
                  <div className="space-y-6">
                    <h3
                      className="text-lg font-semibold mb-4"
                      style={{ color: form.primary_color }}
                    >
                      Color Scheme
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <ColorPicker label="Primary Color" name="primary_color" value={form.primary_color} />
                      <ColorPicker label="Secondary Color" name="secondary_color" value={form.secondary_color} />
                      <ColorPicker label="Tertiary Color" name="tertiary_color" value={form.tertiary_color} />
                      <ColorPicker label="Primary Text" name="primary_text_color" value={form.primary_text_color} />
                      <ColorPicker label="Secondary Text" name="secondary_text_color" value={form.secondary_text_color} />
                      <ColorPicker label="Button Text" name="tertiary_text_color" value={form.tertiary_text_color} />
                      <ColorPicker label="Primary Background" name="primary_background" value={form.primary_background} />
                      <ColorPicker label="Secondary Background" name="secondary_background" value={form.secondary_background} />
                    </div>
                  </div>
                )}

                {/* TYPOGRAPHY TAB */}
                {activeTab === "typography" && (
                  <div className="space-y-6">
                    <h3
                      className="text-lg font-semibold mb-4"
                      style={{ color: form.primary_color }}
                    >
                      Typography Settings
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Font Family
                        </label>
                        <select
                          name="font_family"
                          value={form.font_family}
                          onChange={handleChange}
                          className="w-full border-2 border-gray-200 rounded-lg p-3 focus:outline-none transition-colors"
                          style={{
                            outlineColor: form.primary_color,
                          }}
                        >
                          <option>Inter</option>
                          <option>Roboto</option>
                          <option>Poppins</option>
                          <option>Open Sans</option>
                          <option>Lato</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Font Size
                        </label>
                        <input
                          name="font_size"
                          value={form.font_size}
                          onChange={handleChange}
                          className="w-full border-2 border-gray-200 rounded-lg p-3 focus:outline-none transition-colors"
                          style={{
                            outlineColor: form.primary_color,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* BRANDING TAB */}
                {activeTab === "branding" && (
                  <div className="space-y-6">
                    <h3
                      className="text-lg font-semibold mb-4"
                      style={{ color: form.primary_color }}
                    >
                      System Information
                    </h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        System Name
                      </label>
                      <input
                        name="system_name"
                        value={form.system_name}
                        onChange={handleChange}
                        className="w-full border-2 border-gray-200 rounded-lg p-3 focus:outline-none transition-colors"
                        style={{
                          outlineColor: form.primary_color,
                        }}
                        placeholder="Enter system name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        className="w-full border-2 border-gray-200 rounded-lg p-3 h-24 resize-none focus:outline-none transition-colors"
                        style={{
                          outlineColor: form.primary_color,
                        }}
                        placeholder="Brief description of your system"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        System Logo
                      </label>
                      <div
                        className="border-2 border-dashed rounded-lg p-6 transition-colors"
                        style={{
                          borderColor: form.primary_color,
                        }}
                      >
                        <input
                          id="logoUpload"
                          type="file"
                          accept="image/*"
                          onChange={handleUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="logoUpload"
                          className="flex flex-col items-center justify-center cursor-pointer"
                        >
                          {form.logo_icon ? (
                            <img
                              src={form.logo_icon}
                              alt="Logo"
                              className="w-32 h-32 object-contain mb-3 rounded-lg"
                            />
                          ) : (
                            <Upload className="w-12 h-12 text-gray-400 mb-3" />
                          )}
                          <div className="text-center">
                            <span
                              className="font-medium cursor-pointer transition-colors"
                              style={{ color: form.primary_color }}
                            >
                              {uploading ? "Uploading..." : "Choose file"}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">{fileName}</p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 rounded-lg font-medium transition-all transform hover:scale-[1.02]"
                    style={{
                      backgroundColor: form.primary_color,
                      color: form.tertiary_text_color,
                    }}
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    className="px-6 py-3 rounded-lg font-medium border-2 text-gray-700 hover:bg-gray-50 transition-all"
                    style={{
                      borderColor: form.primary_color,
                      color: form.primary_color,
                    }}
                    onClick={() => window.location.reload()}
                  >
                    Reset
                  </button>
                </div>
              </form>
            </div>

            {/* Live Preview */}
            <div className="lg:col-span-1 bg-white rounded-2xl shadow-lg p-6 sticky top-6">
              <div
                className="flex items-center gap-2 mb-4 pb-4 border-b"
                style={{ borderColor: form.primary_color }}
              >
                <Eye className="w-5 h-5" style={{ color: form.primary_color }} />
                <h3 className="font-semibold" style={{ color: form.primary_color }}>
                  Live Preview
                </h3>
              </div>

              <div
                className="rounded-lg p-6 border-2 transition-all"
                style={{
                  backgroundColor: form.secondary_background,
                  borderColor: form.primary_color,
                  fontFamily: form.font_family,
                  fontSize: form.font_size,
                  color: form.primary_text_color,
                }}
              >
                {form.logo_icon ? (
                  <img
                    src={form.logo_icon}
                    alt="Logo Preview"
                    className="w-20 h-20 mx-auto mb-4 object-contain"
                  />
                ) : (
                  <div className="w-20 h-20 mx-auto mb-4 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Image className="w-8 h-8 text-gray-400" />
                  </div>
                )}

                <h4 className="text-xl font-bold text-center mb-2">
                  {form.system_name || "System Name"}
                </h4>
                <p
                  className="text-center text-sm mb-6"
                  style={{ color: form.secondary_text_color }}
                >
                  {form.description || "Your system description will appear here"}
                </p>

                <div className="space-y-3">
                  <button
                    className="w-full px-4 py-2.5 rounded-lg font-medium transition-transform hover:scale-[1.02]"
                    style={{
                      backgroundColor: form.primary_color,
                      color: form.tertiary_text_color,
                    }}
                  >
                    Primary Action
                  </button>
                  <button
                    className="w-full px-4 py-2.5 rounded-lg font-medium transition-transform hover:scale-[1.02]"
                    style={{
                      backgroundColor: form.secondary_color,
                      color: form.tertiary_text_color,
                    }}
                  >
                    Secondary Action
                  </button>
                  <button
                    className="w-full px-4 py-2.5 rounded-lg font-medium border-2 transition-transform hover:scale-[1.02]"
                    style={{
                      borderColor: form.tertiary_color,
                      color: form.tertiary_color,
                      backgroundColor: "transparent",
                    }}
                  >
                    Tertiary Action
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
