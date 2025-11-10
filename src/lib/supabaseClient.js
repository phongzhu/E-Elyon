// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// 👇 add this export
export const OAUTH_REDIRECT_URL =
  process.env.REACT_APP_OAUTH_REDIRECT_URL ||
  `${window.location.origin}/auth/callback`;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
