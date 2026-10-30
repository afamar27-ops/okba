import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// The publishable key is meant to ship inside the app; access is protected by row level security.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://zfaewzsbmyscgghpdjbp.supabase.co';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_5xsWRd0NKygVJpZ1rYOnTA_yrJp0jqV';

export const isConfigured = Boolean(url && anonKey);

export const supabase = createClient(url || 'http://localhost', anonKey || 'missing', {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});
