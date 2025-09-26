// lib/supabase.ts
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

console.log('[ENV] SUPABASE_URL', SUPABASE_URL);
console.log('[ENV] ANON_KEY length', SUPABASE_ANON_KEY?.length);

// ⚠️ IMPORTANT : sur le web, on N'UTILISE PAS AsyncStorage (trop lent / flaky dans StackBlitz).
// On laisse Supabase gérer une session en mémoire (storage: undefined).
const storage = Platform.OS === 'web' ? undefined : AsyncStorage;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,               // undefined sur web, AsyncStorage sur iOS/Android
    persistSession: true,  // ok (en mémoire sur web, persistant RN en natif)
    autoRefreshToken: true, // remettons l’auto-refresh pour garder la session vivante
    detectSessionInUrl: false, // pas d’OAuth redirect ici
    // pas de flowType forcé ici → plus simple et robuste pour email/password
  },
});

// Types utilitaires (inchangés)
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];

export type Ingredient = Tables<'ingredients'>;
export type Product = Tables<'products'>;
export type UserProfile = Tables<'user_profiles'>;
export type PlanDay = Tables<'plan_days'>;
export type Intake = Tables<'intakes'>;
