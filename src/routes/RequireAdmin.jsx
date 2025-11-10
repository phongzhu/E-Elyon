import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Navigate } from 'react-router-dom';

export default function RequireAdmin({ children }) {
  const [state, setState] = useState({ loading: true, allow: false });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setState({ loading: false, allow: false });

      const { data, error } = await supabase
        .from('users') // lowercase table name
        .select('role,is_active')
        .eq('auth_user_id', user.id) // match by auth_user_id
        .maybeSingle();

      if (error || !data) return setState({ loading: false, allow: false });
      const allow = data.is_active && ['ADMIN', 'SUPERADMIN'].includes(data.role);
      setState({ loading: false, allow });
    })();
  }, []);

  if (state.loading) return <div style={{ padding: 24 }}>Checking access…</div>;
  if (!state.allow) return <Navigate to="/admin-signup" replace />;
  return children;
}
