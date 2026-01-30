import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import PHAddressData from "../data/philippine_provinces_cities_municipalities_and_barangays_2019v2.json";

export default function ProfileSetup() {
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [ministries, setMinistries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [filteredProvinces, setFilteredProvinces] = useState([]);
  const [filteredCities, setFilteredCities] = useState([]);
  const [filteredBarangays, setFilteredBarangays] = useState([]);

  const [form, setForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    suffix: "",
    gender: "",
    birthdate: "",
    baptismal_date: "",
    contact_number: "",
    branch_id: "",
    primary_ministry_id: "",
    photo_path: "",
    street: "",
    region: "",
    province: "",
    city: "",
    barangay: "",
    country: "Philippines",
    status: "Active",
    password: "",
  });

  // Load branches & ministries
  useEffect(() => {
    (async () => {
      const { data: b } = await supabase.from("branches").select("branch_id,name");
      const { data: m } = await supabase.from("ministries").select("id,name");
      setBranches(b || []);
      setMinistries(m || []);
    })();
  }, []);

  const regions = Object.values(PHAddressData);

  // Handle dropdown changes
  const handleRegion = (region) => {
    const regionData = regions.find((r) => r.region_name === region);
    const provinces = regionData ? Object.keys(regionData.province_list || {}) : [];
    setForm({ ...form, region, province: "", city: "", barangay: "" });
    setFilteredProvinces(provinces);
    setFilteredCities([]);
    setFilteredBarangays([]);
  };

  const handleProvince = (province) => {
    const regionData = regions.find((r) => r.region_name === form.region);
    const provinceData = regionData?.province_list?.[province];
    const cities = provinceData ? Object.keys(provinceData.municipality_list || {}) : [];
    setForm({ ...form, province, city: "", barangay: "" });
    setFilteredCities(cities);
    setFilteredBarangays([]);
  };

  const handleCity = (city) => {
    const regionData = regions.find((r) => r.region_name === form.region);
    const provinceData = regionData?.province_list?.[form.province];
    const cityData = provinceData?.municipality_list?.[city];
    const barangays = cityData ? cityData.barangay_list || [] : [];
    setForm({ ...form, city, barangay: "" });
    setFilteredBarangays(barangays);
  };

  const handleBarangay = (barangay) => setForm({ ...form, barangay });
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Upload and replace profile photo
  const handleUpload = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated.");

      // Remove previous profile photo if exists
      if (form.photo_path) {
        const prevPath = form.photo_path.split("/").slice(-2).join("/");
        await supabase.storage.from("profile_pics").remove([prevPath]);
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `profile_pics/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("profile_pics")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("profile_pics").getPublicUrl(filePath);
      setForm((f) => ({ ...f, photo_path: data.publicUrl }));
    } catch (e) {
      setErr("Failed to upload image: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    setErr("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated.");

      // 1️⃣ Insert into users_details
      const { data: details, error: detailsErr } = await supabase
        .from("users_details")
        .insert([
          {
            branch_id: form.branch_id ? Number(form.branch_id) : null,
            photo_path: form.photo_path || null,
            first_name: form.first_name,
            middle_name: form.middle_name,
            last_name: form.last_name,
            suffix: form.suffix || null,
            birthdate: form.birthdate || null,
            baptismal_date: form.baptismal_date || null,
            gender: form.gender,
            street: form.street,
            region: form.region,
            barangay: form.barangay,
            city: form.city,
            province: form.province,
            country: form.country,
            contact_number: form.contact_number,
            status: form.status,
            joined_date: new Date().toISOString().split("T")[0],
          },
        ])
        .select("user_details_id")
        .single();
      if (detailsErr) throw detailsErr;

      // 2️⃣ Check if first admin
      const { count } = await supabase.from("users").select("*", { count: "exact", head: true });
      const isFirst = count === 0;

      // 3️⃣ Insert into users table
      const { error: userErr } = await supabase.from("users").insert([
        {
          user_details_id: details.user_details_id,
          email: user.email,
          role: "ADMIN",
          primary_ministry_id: form.primary_ministry_id
            ? Number(form.primary_ministry_id)
            : null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          auth_user_id: user.id,
        },
      ]);
      if (userErr) throw userErr;

      // 4️⃣ Optional password + sync phone into Supabase Auth
      const formattedPhone =
        form.contact_number.startsWith("+")
          ? form.contact_number
          : `+63${form.contact_number.replace(/^0/, "")}`;

      await supabase.auth.updateUser({
        password: form.password || undefined,
        phone: formattedPhone, // Updates real “Phone” column
        data: { contact_number: form.contact_number },
      });

      setMsg("✅ Profile setup complete! Redirecting...");
      setTimeout(() => navigate("/admin"), 1500);
    } catch (e) {
      console.error(e);
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const suffixOptions = ["", "Jr.", "Sr.", "II", "III", "IV", "V", "VI", "VII", "VIII"];

  return (
    <main className="max-w-3xl mx-auto my-10 font-[Inter]">
      <h1 className="text-3xl font-bold mb-6 text-center">Complete Your Profile</h1>

      <form onSubmit={handleSubmit} className="grid gap-4">
        {/* PERSONAL INFO */}
        <section className="bg-gray-50 p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold mb-3">Personal Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label>First Name</label>
              <input className="input" name="first_name" required value={form.first_name} onChange={handleChange} />
            </div>
            <div>
              <label>Middle Name</label>
              <input className="input" name="middle_name" value={form.middle_name} onChange={handleChange} />
            </div>
            <div>
              <label>Last Name</label>
              <input className="input" name="last_name" required value={form.last_name} onChange={handleChange} />
            </div>
            <div>
              <label>Suffix</label>
              <select className="input" name="suffix" value={form.suffix} onChange={handleChange}>
                {suffixOptions.map((sfx) => (
                  <option key={sfx} value={sfx}>{sfx || "None"}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Gender</label>
              <select className="input" name="gender" value={form.gender} onChange={handleChange}>
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label>Birthdate</label>
              <input className="input" type="date" name="birthdate" value={form.birthdate} onChange={handleChange} />
            </div>
            <div>
              <label>Baptismal Date (Optional)</label>
              <input className="input" type="date" name="baptismal_date" value={form.baptismal_date} onChange={handleChange} />
            </div>
            <div>
              <label>Contact Number</label>
              <input className="input" name="contact_number" value={form.contact_number} onChange={handleChange} />
            </div>
            <div className="col-span-2">
              <label>Upload Profile Picture</label>
              <input type="file" accept="image/*" onChange={handleUpload} />
              {uploading && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
              {form.photo_path && (
                <img
                  src={form.photo_path}
                  alt="Profile"
                  className="mt-2 rounded-lg border w-32 h-32 object-cover"
                />
              )}
            </div>
          </div>
        </section>

        {/* ADDRESS INFO */}
        <section className="bg-gray-50 p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold mb-3">Address Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label>Region</label>
              <select className="input" value={form.region} onChange={(e) => handleRegion(e.target.value)}>
                <option value="">Select Region</option>
                {regions.map((r) => (
                  <option key={r.region_name} value={r.region_name}>
                    {r.region_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Province</label>
              <select className="input" value={form.province} onChange={(e) => handleProvince(e.target.value)}>
                <option value="">Select Province</option>
                {filteredProvinces.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label>City / Municipality</label>
              <select className="input" value={form.city} onChange={(e) => handleCity(e.target.value)}>
                <option value="">Select City</option>
                {filteredCities.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Barangay</label>
              <select className="input" value={form.barangay} onChange={(e) => handleBarangay(e.target.value)}>
                <option value="">Select Barangay</option>
                {filteredBarangays.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Street</label>
              <input className="input" name="street" value={form.street} onChange={handleChange} />
            </div>
            <div>
              <label>Country</label>
              <input className="input" name="country" value={form.country} onChange={handleChange} />
            </div>
          </div>
        </section>

        {/* CHURCH INFO */}
        <section className="bg-gray-50 p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold mb-3">Church Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label>Branch</label>
              <select className="input" name="branch_id" value={form.branch_id} onChange={handleChange}>
                <option value="">Select Branch</option>
                {branches.map((b) => (
                  <option key={b.branch_id} value={b.branch_id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Ministry</label>
              <select className="input" name="primary_ministry_id" value={form.primary_ministry_id} onChange={handleChange}>
                <option value="">Select Ministry</option>
                {ministries.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* PASSWORD */}
        <section className="bg-gray-50 p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold mb-3">Set Password (optional)</h3>
          <label>New Password</label>
          <input
            type="password"
            className="input"
            name="password"
            placeholder="Enter new password"
            value={form.password}
            onChange={handleChange}
          />
        </section>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium mt-3"
        >
          {loading ? "Saving..." : "Complete Profile"}
        </button>

        {err && <p className="text-red-600">{err}</p>}
        {msg && <p className="text-green-600">{msg}</p>}
      </form>
    </main>
  );
}
