// lib/authHelpers.ts
import { supabase } from '@/lib/supabase';

function withTimeout<T>(p: Promise<T>, ms = 4000): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), ms)) as any,
  ]);
}

/** Retourne userId de manière robuste (getSession -> fallback getUser). */
export async function getSafeUserId(timeoutMs = 4000): Promise<string | null> {
  try {
    const t0 = Date.now();
    const { data } = await withTimeout(supabase.auth.getSession(), timeoutMs);
    console.log('[authHelpers] getSession ms =', Date.now() - t0);
    const id = data?.session?.user?.id ?? null;
    if (id) return id;
  } catch (e) {
    console.log('[authHelpers] getSession timeout/err, trying getUser()', e);
  }

  try {
    const t1 = Date.now();
    const { data } = await withTimeout(supabase.auth.getUser(), timeoutMs);
    console.log('[authHelpers] getUser ms =', Date.now() - t1);
    return data?.user?.id ?? null;
  } catch (e) {
    console.log('[authHelpers] getUser timeout/err', e);
    return null;
  }
}

export { withTimeout };
