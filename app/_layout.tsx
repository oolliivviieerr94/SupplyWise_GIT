// app/_layout.tsx
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { supabase } from '@/lib/supabase';
import { setLastSession } from '@/lib/authStore';

const queryClient = new QueryClient();

/** Pont d’auth pour mémoriser immédiatement la session côté app */
function AuthSessionBridge() {
  useEffect(() => {
    // 1) Seed initial depuis getSession (une fois au montage)
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setLastSession(data?.session ?? null);
        console.log('[AuthBridge] seed getSession ->', !!data?.session);
      } catch (e) {
        console.log('[AuthBridge] seed getSession error (safe):', e);
      }
    })();

    // 2) Suivi des changements d’auth
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthBridge] event:', event, 'hasSession:', !!session);
      setLastSession(session ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return null;
}

export default function RootLayout() {
  useFrameworkReady();

  // Nettoyage SW/caches côté web (utile sur Bolt/StaticBlitz)
  useEffect(() => {
    if (Platform.OS === 'web') {
      try {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations?.().then((regs) => {
            regs?.forEach((r) => r.unregister());
          });
        }
        // @ts-ignore
        caches?.keys?.().then((keys: string[]) => keys.forEach((k) => caches.delete(k)));
      } catch (e) {
        console.log('[SW] cleanup error (safe to ignore):', e);
      }
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthSessionBridge />

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome-current" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>

      <StatusBar style="auto" />
    </QueryClientProvider>
  );
}
