import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Use environment variables for Supabase configuration
// In development, create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const supabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

if (!supabaseConfigured) {
    console.warn(
        '⚠️ Supabase credentials not configured. Cloud sync will be disabled.\n' +
        'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
    );
}

// Create a real client only when credentials are available.
// When not configured, create a mock client that throws helpful errors.
export const supabase: SupabaseClient = supabaseConfigured
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: typeof window !== 'undefined' ? window.localStorage : undefined,
            storageKey: 'daylume-auth-token',
            flowType: 'pkce'
        }
    })
    : createClient('https://disabled.supabase.co', 'disabled-key', {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        }
    });

// Whether Supabase is properly configured
export const isSupabaseConfigured = supabaseConfigured;

// Initialize session from storage on load
export async function initializeAuth() {
    if (!supabaseConfigured) return null;

    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
            console.error('Error getting session:', error);
            return null;
        }
        return session;
    } catch (e) {
        console.error('Auth initialization error:', e);
        return null;
    }
}
