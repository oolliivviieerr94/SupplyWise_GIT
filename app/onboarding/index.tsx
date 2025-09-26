// /home/project/app/onboarding/index.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, SafeAreaView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Target } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { getSafeUserId, withTimeout } from '@/lib/authHelpers';
import { ss } from '@/lib/safeStyle';
import { theme } from '@/lib/ui/theme';
import OnboardingHeader from './_shared/OnboardingHeader';
import logo from '@/assets/images/Logo_Bolt.png';

import Step0 from './steps/Step0_Welcome';
import StepA from './steps/StepA_Profile';
import StepB from './steps/StepB_Training';
import StepC from './steps/StepC_GoalsDiet';

const STEPS = [Step0, StepA, StepB, StepC];

type ProfileRow = {
  user_id: string;
  onboarding_completed: boolean | null;
  onboarding_step: number | null;
};

export default function OnboardingScreen() {
  // ?edit=1 -> mode édition (ne pas forcer la redirection si déjà complété)
  // ?startStep=2 -> démarrer directement à l’étape 2/4 (1-based)
  const params = useLocalSearchParams<{ edit?: string; startStep?: string }>();
  const isEditMode =
    String(params?.edit ?? '').toLowerCase() === '1' ||
    String(params?.edit ?? '').toLowerCase() === 'true';
  const requestedStartStep = Number(params?.startStep);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [stepIndex, setStepIndex] = useState(0); // 0-based index
  const [errorText, setErrorText] = useState<string | null>(null);

  const inFlightRef = useRef(false);
  const doneRef = useRef(false);
  const profileRef = useRef<ProfileRow | null>(null);
  useEffect(() => { profileRef.current = profile; }, [profile]);

  const clampToUiIndex = useCallback((dbStep?: number | null) => {
    const s = Number(dbStep ?? 1); // DB stocke 1..n
    return Math.min(STEPS.length - 1, Math.max(0, s - 1));
  }, []);

  const clampStartParam = useCallback((start?: number) => {
    const n = Number(start);
    if (!Number.isFinite(n)) return null;
    return Math.min(STEPS.length - 1, Math.max(0, n - 1)); // param 1-based -> UI 0-based
  }, []);

  const CurrentStep = useMemo(() => STEPS[stepIndex] ?? Step0, [stepIndex]);

  const handleSignOut = useCallback(async () => {
    try { await supabase.auth.signOut(); }
    catch (e: any) { Alert.alert('Déconnexion', e?.message ?? 'Erreur de déconnexion'); }
    finally { router.replace('/auth'); }
  }, []);

  const loadUserProfile = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true; doneRef.current = false;
    setLoading(true); setErrorText(null);

    try {
      const userId = await getSafeUserId(4000);
      if (!userId) { setErrorText('Session introuvable. Déconnectez-vous puis reconnectez-vous.'); return; }

      const { data: existing, error: selErr } = await withTimeout(
        supabase.from('user_profiles').select('*').eq('user_id', userId).maybeSingle(),
        8000
      );
      if (selErr && (selErr as any).code !== 'PGRST116') {
        setErrorText('Lecture du profil impossible (RLS/connexion).');
        return;
      }

      // Création si manquant
      if (!existing) {
        const { data: created, error: insErr } = await withTimeout(
          supabase.from('user_profiles')
            .insert({ user_id: userId, onboarding_completed: false, onboarding_step: 1 })
            .select('*').single(),
          8000
        );
        if (insErr || !created) { setErrorText('Création du profil impossible (RLS INSERT).'); return; }

        setProfile(created as ProfileRow);
        const startIdx = clampStartParam(requestedStartStep);
        setStepIndex(startIdx ?? clampToUiIndex(created?.onboarding_step));
        return;
      }

      // Si déjà complété et PAS en mode édition -> repartir au dashboard
      if (existing.onboarding_completed && !isEditMode) {
        router.replace('/(tabs)/dashboard');
        return;
      }

      setProfile(existing as ProfileRow);

      // Déterminer l’étape de départ
      const idxFromDb = clampToUiIndex(existing.onboarding_step);
      const idxFromParam = clampStartParam(requestedStartStep);
      setStepIndex((isEditMode && idxFromParam !== null) ? idxFromParam : idxFromDb);

    } catch (err: any) {
      setErrorText(err?.message || 'Erreur inattendue.');
    } finally {
      setLoading(false); inFlightRef.current = false; doneRef.current = true;
    }
  }, [clampStartParam, clampToUiIndex, isEditMode, requestedStartStep]);

  useEffect(() => {
    const watchdog = setTimeout(() => {
      if (doneRef.current || profileRef.current) return;
      inFlightRef.current = false; setLoading(false);
      setErrorText('Chargement trop long. Vérifiez la connexion et les policies RLS.');
    }, 12000);

    loadUserProfile();
    return () => clearTimeout(watchdog);
  }, [loadUserProfile]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Target size={48} color={theme.colors.primary} />
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loadingSpinner} />
        <Text style={styles.loadingText}>Préparation de votre profil...</Text>
      </SafeAreaView>
    );
  }

  if (errorText) {
    return (
      <SafeAreaView style={styles.center}>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Onboarding indisponible</Text>
          <Text style={styles.errorText}>{errorText}</Text>
          <View style={styles.row}>
            <TouchableOpacity style={styles.primaryBtn} onPress={loadUserProfile}>
              <Text style={styles.primaryTxt}>Réessayer</Text>
            </TouchableOpacity>
            <View style={{ width: 12 }} />
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleSignOut}>
              <Text style={styles.secondaryTxt}>Se déconnecter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.center}>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Erreur</Text>
          <Text style={styles.errorText}>Profil introuvable.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={loadUserProfile}>
            <Text style={styles.primaryTxt}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingHeader stepIndex={stepIndex} totalSteps={STEPS.length} logo={logo} />

      <CurrentStep
        key={stepIndex}
        profile={profile}
        onNext={async () => {
          const lastIdx = STEPS.length - 1;

          if (stepIndex >= lastIdx) {
            // Fin du flux : si on est en édition, on NE force PAS onboarding_completed.
            await supabase
              .from('user_profiles')
              .update({
                onboarding_step: STEPS.length,
                ...(isEditMode ? {} : { onboarding_completed: true }),
              })
              .eq('user_id', profile.user_id);

            // ✅ Redirection vers la page unique des recommandations
            router.replace('/(tabs)/recommendations?from=onboarding');
            return;
          }

          const next = stepIndex + 1;
          setStepIndex(next);
          await supabase
            .from('user_profiles')
            .update({ onboarding_step: next + 1 }) // DB 1-based
            .eq('user_id', profile.user_id);
        }}
        onBack={async () => {
          const prev = Math.max(0, stepIndex - 1);
          setStepIndex(prev);
          await supabase
            .from('user_profiles')
            .update({ onboarding_step: prev + 1 })
            .eq('user_id', profile.user_id);
        }}
        isFirstStep={stepIndex === 0}
        isLastStep={stepIndex === STEPS.length - 1}
      />
    </SafeAreaView>
  );
}

const styles = ss({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.bg },
  loadingSpinner: { marginTop: 16 },
  loadingText: { fontSize: 16, color: theme.colors.subtext, marginTop: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.bg, padding: 24 },
  errorCard: { width: '100%', maxWidth: 560, backgroundColor: theme.colors.white, borderRadius: theme.radius.lg, padding: 20, ...theme.shadowCard },
  row: { flexDirection: 'row', marginTop: 10 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginBottom: 6 },
  errorText: { fontSize: 14, color: theme.colors.danger },
  primaryBtn: { backgroundColor: theme.colors.primary, paddingHorizontal: 18, paddingVertical: 12, borderRadius: theme.radius.md, ...theme.shadowEmph },
  primaryTxt: { color: theme.colors.white, fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#6B7280', paddingHorizontal: 18, paddingVertical: 12, borderRadius: theme.radius.md },
  secondaryTxt: { color: theme.colors.white, fontWeight: '700' },
});
