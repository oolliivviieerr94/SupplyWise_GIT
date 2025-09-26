// lib/authStore.ts
import type { Session } from '@supabase/supabase-js';

let lastSession: Session | null = null;

export function setLastSession(s: Session | null) {
  lastSession = s ?? null;
}

export function getLastSession(): Session | null {
  return lastSession;
}
