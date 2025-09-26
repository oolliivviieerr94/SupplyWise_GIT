// components/rescue_home/HomeGreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Play } from 'lucide-react-native';

type Stats = { studies: number; products: number; supplements: number };

export default function HomeGreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // --- charge les stats via la RPC (bypass RLS) ---
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoadingStats(true);
        setErr(null);

        const { data, error } = await supabase.rpc('get_home_stats');
        if (error) throw error;

        const row: any = Array.isArray(data) ? data[0] : data;

        if (mounted) {
          setStats({
            supplements: Number(row?.supplements ?? 0),
            products: Number(row?.products ?? 0),
            studies: Number(row?.studies ?? 0),
          });
        }

        console.log('📊 [HomeGreen] Stats loaded (RPC):', row);
      } catch (e: any) {
        console.error('❌ [HomeGreen] loadStats error:', e?.message || e);
        if (mounted) setErr(e?.message || 'Erreur inconnue');
      } finally {
        if (mounted) setLoadingStats(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const pretty = (n?: number) =>
    typeof n === 'number' ? `${n.toLocaleString('fr-FR')}+` : '…';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* HERO */}
      <View style={styles.hero}>
        <View style={styles.heroContent}>
          <Image
            source={require('@/assets/images/Logo_Bolt.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.heroTitle}>
            Votre guide quotidien{'\n'}pour une supplémentation{'\n'}
            <Text style={styles.heroTitleAccent}>intelligente</Text>.
          </Text>

          <View style={styles.heroButtons}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push({ pathname: '/auth', params: { mode: 'signup' } })}
            >
              <Play size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Créer mon compte</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push('/auth')}
            >
              <Text style={styles.secondaryButtonText}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.heroImageContainer}>
          <Image
            source={require('@/assets/images/Image_accueil.png')}
            style={styles.heroImage}
          />
          <View style={styles.heroOverlay} />
        </View>
      </View>

      {/* STATS */}
      <View style={styles.statsSection}>
        {loadingStats ? (
          <View style={{ paddingVertical: 20, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#fff" />
          </View>
        ) : (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{pretty(stats?.studies)}</Text>
              <Text style={styles.statLabel}>{'Études\nanalysées'}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{pretty(stats?.products)}</Text>
              <Text style={styles.statLabel}>{'Produits\nanalysés'}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{pretty(stats?.supplements)}</Text>
              <Text style={styles.statLabel}>{'Compléments\névalués'}</Text>
            </View>
          </View>
        )}
        {!!err && (
          <View style={{ alignItems: 'center', marginTop: 8 }}>
            <Text style={{ color: 'rgba(255,255,255,0.8)' }}>Impossible de charger les chiffres</Text>
          </View>
        )}
      </View>

      {/* … le reste de ta page si tu veux l’étendre */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  hero: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 0, backgroundColor: '#FFFFFF', position: 'relative' },
  heroContent: { alignItems: 'center', marginBottom: 40, zIndex: 2 },
  logo: { width: 338, height: 101, marginBottom: 32 },
  heroTitle: { width: 200, height: 80, color: '#1F2937', textAlign: 'center', lineHeight: 30, marginBottom: 16 },
  heroTitleAccent: { color: '#22C55E' },
  heroButtons: { width: '100%', gap: 16 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#22C55E', paddingVertical: 20, paddingHorizontal: 24, borderRadius: 16, shadowColor: '#22C55E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6, width: '100%' },
  primaryButtonText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginLeft: 12 },
  secondaryButton: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#22C55E', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12, backgroundColor: '#FFFFFF', width: '100%' },
  secondaryButtonText: { fontSize: 16, fontWeight: '600', color: '#22C55E' },
  heroImageContainer: { position: 'relative', marginTop: 20 },
  heroImage: { width: '100%', height: 300, borderRadius: 24, resizeMode: 'cover' },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: 24 },

  statsSection: { backgroundColor: '#22C55E', paddingVertical: 40 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 24 },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  statLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4, textAlign: 'center', lineHeight: 20, paddingHorizontal: 4 },
});
