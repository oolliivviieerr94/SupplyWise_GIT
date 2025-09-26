// components/AuthListener.tsx
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Listener d'auth PASSIF :
 * - n'affiche aucune UI
 * - NE FAIT AUCUNE NAVIGATION
 * - se contente d'écouter les changements (utile si tu veux invalider un cache, etc.)
 */
export function AuthListener() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (_event, _session) => {
        // Pas de router.push/replace ici.
        // Tu peux éventuellement invalider un cache ou mettre à jour un store.
      }
    );

    return () => {
      try { subscription.unsubscribe(); } catch {}
    };
  }, []);

  return null;
}

export default AuthListener;
