import React, { createContext, useEffect, useState, useContext } from "react";
import { supabase } from "../lib/supabaseClient";

const BrandingContext = createContext();
export const useBranding = () => useContext(BrandingContext);

export const BrandingProvider = ({ children }) => {
  const [branding, setBranding] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("ui_settings")
          .select("*")
          .limit(1)
          .single()
          .maybeSingle();

        if (error) throw error;
        setBranding(data || {});
      } catch (err) {
        console.error("Failed to load branding:", err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Apply branding as global CSS variables
  useEffect(() => {
    if (branding) {
      const root = document.documentElement;
      root.style.setProperty("--primary-color", branding.primary_color || "#003004ff");
      root.style.setProperty("--secondary-color", branding.secondary_color || "#aed6b5ff");
      root.style.setProperty("--tertiary-color", branding.tertiary_color || "#16A34A");
      root.style.setProperty("--primary-text", branding.primary_text_color || "#000");
      root.style.setProperty("--secondary-text", branding.secondary_text_color || "#555");
      root.style.setProperty("--tertiary-text", branding.tertiary_text_color || "#fff");
      root.style.setProperty("--font-family", branding.font_family || "Inter");
      root.style.setProperty("--font-size", branding.font_size || "16px");
      root.style.setProperty("--primary-bg", branding.primary_background || "#FFFFFF");
      root.style.setProperty("--secondary-bg", branding.secondary_background || "#F9FAFB");
    }
  }, [branding]);

  return (
    <BrandingContext.Provider value={{ branding, setBranding, loading }}>
      {children}
    </BrandingContext.Provider>
  );
};
