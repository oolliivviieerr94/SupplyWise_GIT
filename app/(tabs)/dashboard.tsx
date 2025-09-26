// /home/project/app/(tabs)/dashboard.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { CalendarDays, Grid3X3, BookOpen, Heart, Sparkles, User, Settings } from 'lucide-react-native';

/**
 * NOTE IMPORTANTE
 * - Tous les hooks sont au NIVEAU RACINE du composant (aucun hook dans des if/return/loops)
 * - L’ordre des sections est : Conseil du jour -> Profil -> Actions rapides
 */

export default function DashboardScreen() {
  // ----- Etat & données -----
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [tip, setTip] = useState<string | null>(null);
  const [loadingTip, setLoadingTip] = useState<boolean>(true);

  // Profil : on lit l’utilisateur une seule fois
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUserEmail(user?.email ?? null);
      } catch {
        setUserEmail(null);
      }
    })();
  }, []);

  // Conseil du jour : on essaye une table probable, sinon fallback local
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingTip(true);
      try {
        // Essayez d’abord une table probable (adaptez si vous avez une table différente)
        // Si la table n’existe pas, on catch et on met un fallback.
        const { data, error } = await supabase
          .from('tip_of_the_day')
          .select('text')
          .order('date', { ascending: false })
          .limit(1);

        if (error) throw error;

        const txt = (data?.[0]?.text as string | undefined) ?? null;
        if (alive) setTip(txt ?? null);
      } catch {
        if (alive) {
          // Fallback “sûr”
          setTip("Hydratez-vous et dormez suffisamment : ce sont les meilleurs boosters de performance 💧😴");
        }
      } finally {
        if (alive) setLoadingTip(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Petit résumé de profil (mémoïsé pour éviter les recalculs)
  const profileSummary = useMemo(() => {
    return userEmail
      ? `Connecté : ${userEmail}`
      : `Vous n’êtes pas connecté`;
  }, [userEmail]);

  // ----- Rendu -----
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 36 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Image source={require('../../assets/images/Logo_Bolt.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>Tableau de bord</Text>
          <Text style={styles.subtitle}>Bienvenue dans votre espace SupplyWise</Text>
        </View>

        {/* 1) CONSEIL DU JOUR */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Sparkles size={18} color="#2563EB" />
            <Text style={styles.cardTitle}>Conseil du jour</Text>
          </View>
          {loadingTip ? (
            <View style={{ paddingVertical: 6 }}>
              <ActivityIndicator size="small" color="#2563EB" />
            </View>
          ) : (
            <Text style={styles.tipText}>{tip}</Text>
          )}
          <View style={styles.cardActionsRow}>
            <TouchableOpacity
              style={[styles.smallBtn, { borderColor: '#2563EB', backgroundColor: '#EFF6FF' }]}
              onPress={() => router.push('/(tabs)/library')}
            >
              <BookOpen size={16} color="#2563EB" />
              <Text style={[styles.smallBtnText, { color: '#2563EB' }]}>Voir la bibliothèque</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.smallBtn, { borderColor: '#10B981', backgroundColor: '#ECFDF5' }]}
              onPress={() => router.push('/recommendations')}
            >
              <Grid3X3 size={16} color="#10B981" />
              <Text style={[styles.smallBtnText, { color: '#065F46' }]}>Voir mes recommandations</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2) PROFIL */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <User size={18} color="#111827" />
            <Text style={styles.cardTitle}>Profil</Text>
          </View>
          <Text style={styles.profileLine}>{profileSummary}</Text>
          <View style={styles.cardActionsRow}>
            <TouchableOpacity
              style={[styles.smallBtn, { borderColor: '#6B7280', backgroundColor: '#F3F4F6' }]}
              onPress={() => router.push('/onboarding?edit=1')}
            >
              <Settings size={16} color="#374151" />
              <Text style={[styles.smallBtnText, { color: '#374151' }]}>Modifier mon profil</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3) ACTIONS RAPIDES */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Grid3X3 size={18} color="#111827" />
            <Text style={styles.cardTitle}>Actions rapides</Text>
          </View>

          <View style={styles.quickGrid}>
            <QuickBtn
              icon={<Grid3X3 size={20} color="#2563EB" />}
              label="Mon espace"
              onPress={() => router.replace('/(tabs)/dashboard')}
            />
            <QuickBtn
              icon={<BookOpen size={20} color="#2563EB" />}
              label="Bibliothèque"
              onPress={() => router.push('/(tabs)/library')}
            />
            <QuickBtn
              icon={<Grid3X3 size={20} color="#10B981" />}
              label="Recommandations"
              onPress={() => router.push('/recommendations')}
            />
            <QuickBtn
              icon={<CalendarDays size={20} color="#F59E0B" />}
              label="Planning"
              onPress={() => router.push('/planning')}
            />
            <QuickBtn
              icon={<Heart size={20} color="#EF4444" />}
              label="Favoris"
              onPress={() => router.push('/favorites')}
            />
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

/** ----- Petit bouton réutilisable pour les actions rapides ----- */
function QuickBtn({
  icon, label, onPress,
}: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.quickBtn} onPress={onPress}>
      <View style={styles.quickIcon}>{icon}</View>
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

/** ----- Styles ----- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { alignItems: 'center', paddingTop: 56, paddingBottom: 16, backgroundColor: '#FFFFFF' },
  logo: { width: 220, height: 66, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },

  card: {
    marginHorizontal: 16, marginTop: 14, backgroundColor: '#FFFFFF',
    borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },

  tipText: { color: '#111827', lineHeight: 21 },
  profileLine: { color: '#374151' },

  cardActionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  smallBtn: {
    flex: 1, height: 44, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', paddingHorizontal: 10,
  },
  smallBtnText: { marginLeft: 6, fontWeight: '700', fontSize: 13 },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickBtn: {
    width: '31%', minWidth: 96, aspectRatio: 1, borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB',
    alignItems: 'center', justifyContent: 'center',
  },
  quickIcon: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 8,
  },
  quickLabel: { fontSize: 12, fontWeight: '700', color: '#111827', textAlign: 'center' },
});
