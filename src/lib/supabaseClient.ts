import { createClient } from '@supabase/supabase-js'

// Bolt peut exposer ces variables avec des noms différents selon le template.
// On couvre toutes les variantes courantes pour éviter les surprises.
const url =
  (import.meta as any)?.env?.VITE_SUPABASE_URL ||
  (import.meta as any)?.env?.PUBLIC_SUPABASE_URL ||
  (typeof process !== 'undefined' ? process.env.SUPABASE_URL : undefined)

const anonKey =
  (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY ||
  (import.meta as any)?.env?.PUBLIC_SUPABASE_ANON_KEY ||
  (typeof process !== 'undefined' ? process.env.SUPABASE_ANON_KEY : undefined)

if (!url || !anonKey) {
  console.warn('⚠️ Variables SUPABASE_URL / SUPABASE_ANON_KEY introuvables. Vérifie Integrations → Supabase.')
}

export const supabase = createClient(url!, anonKey!, {
  auth: { 
    persistSession: true, 
    autoRefreshToken: true 
  }
})