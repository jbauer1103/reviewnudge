import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

// These come from the .env file on your computer (never committed to git).
// The publishable key is meant to live in the app; row-level security protects the data.
// Never put the Supabase *secret* key here.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

// `window` is missing only while the web version is pre-rendered on the computer.
const canPersist = typeof window !== 'undefined';

// When the keys are missing the app shows a "add your keys" screen instead, so these
// placeholders are never actually called.
export const supabase = createClient(
  supabaseUrl || 'https://missing-project.supabase.co',
  supabasePublishableKey || 'missing-key',
  {
    auth: {
      storage: AsyncStorage,
      persistSession: canPersist,
      autoRefreshToken: canPersist,
      // We read the login link ourselves in SessionProvider.
      detectSessionInUrl: false,
    },
  },
);

// Keep the login fresh only while the app is open, as Supabase recommends for mobile.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
