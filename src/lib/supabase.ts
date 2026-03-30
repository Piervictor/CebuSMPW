import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pgqcjlskwuhqmwuexaaf.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBncWNqbHNrd3VocW13dWV4YWFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDcwMDMsImV4cCI6MjA4ODQ4MzAwM30.xggh-gmihE6zMZTv2ViC-CuWxg9AzfZVZjVXRw63JkQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});
