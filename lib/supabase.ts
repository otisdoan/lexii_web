import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bkkpaaacxftqlidaxnml.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJra3BhYWFjeGZ0cWxpZGF4bm1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxODQzMzQsImV4cCI6MjA4Nzc2MDMzNH0.NJ23R9N-1cn3OtpZgacoy28K_bbNZUXkE9AZ31I2HqI';

// createBrowserClient from @supabase/ssr stores the PKCE code verifier in cookies
// instead of localStorage, which works reliably across Next.js page navigations.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

export const STORAGE = {
  audio: 'audio',
  images: 'images',
  avatars: 'avatars',
  documents: 'documents',
} as const;
