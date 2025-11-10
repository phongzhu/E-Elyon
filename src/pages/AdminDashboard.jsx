import React from 'react';
import { supabase } from '../lib/supabaseClient';

export default function AdminDashboard() {
  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };
  return (
    <main style={{ padding: 24, fontFamily: 'Inter, system-ui' }}>
      <h1>Admin Dashboard</h1>
      <p>Welcome, Admin 👋</p>
      <button onClick={signOut} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ccc' }}>
        Sign out
      </button>
    </main>
  );
}
