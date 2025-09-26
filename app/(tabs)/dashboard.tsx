// /home/project/app/(tabs)/dashboard.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { useConseil } from '@/hooks/useConseil';
import { fetchUserDashboardStats, type UserDashboardStats } from '@/lib/stats';
import { logConseilRead } from '@/lib/track';
import {
  Target, Calendar, Scan, BookOpen, Settings, ArrowRight, Zap, User,
  Package, Dumbbell, Activity, Heart, Flame, Plus
} from 'lucide-react-native';

// Icônes par objectif
const goalIcons: Record<string, any> = {
  hypertrophy: Dumbbell,
  fatloss:      Flame,
  endurance:    Activity,
  health:       Heart,
};

export default function DashboardScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<UserDashboardStats | null>(null);

  // Conseil du jour (on garde le hook d’origine, pas de table "tip_of_the_day")
  const { conseil, loading: conseilLoading, error: conseilError, refreshTip } = useConseil();

  useEffect(() => {
    // session + data initiale
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkAdminAccess(session);
        await loadUserData(session.user.id);
      }
      setLoading(false);
    });

    // écoute des changements (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      if (s) {
        checkAdminAccess(s);
        await loadUserData(s.user.id);
      } else {
        setIsAdmin(false);
        setUserProfile(null);
        setDashboardStats(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!conseilLoading && !conseilError && conseil?.id) {
      logConseilRead(conseil.id);
    }
  }, [conseil, conseilLoading, conseilError]);

  const checkAdminAccess = async (s: Session) => {
    try {
      const { data } = await supabase
        .from('app_admins')
        .select('email')
        .eq('email', s.user.email)
        .maybeSingle();
      setIsAdmin(!!data);
    } catch {
      setIsAdmin(false);
    }
  };

  const loadUserData = async (userId: string) => {
    try {
      // profil + stats en parallèle
      const [{ data: profile }, stats] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('user_id', userId).maybeSingle(),
        fetchUserDashboardStats(),
      ]);
      setUserProfile(profile);
      setDashboardStats(stats);
    } catch (e) {
      console.error('Error loading user statistics:', e);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Target size={48} color="#22C55E" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Target size={32} color="#22C55E" />
          <Text style={styles.title}>Tableau de bord</Text>
        </View>
        <View style={styles.notLoggedIn}>
          <User size={64} color="#E5E7EB" />
          <Text style={styles.notLoggedInTitle}>Connectez-vous</Text>
          <Text style={styles.notLoggedInText}>Accédez à votre tableau de bord personnalisé</Text>
          <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/auth')}>
            <Text style={styles.loginButtonText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Actions rapides (ordre & styles d’origine)
  const quickActions = [
    { icon: Target,   title: 'Mes recommandations',       subtitle: 'Voir les conseils personnalisés', onPress: () => router.push('/(tabs)/recommendations'), color: '#22C55E' },
    { icon: Calendar, title: 'Planning du jour',          subtitle: 'Gérer mes prises',                onPress: () => router.push('/planner'),               color: '#16A34A' },
    { icon: Scan,     title: 'Scanner un produit',        subtitle: 'Identifier un supplément',        onPress: () => router.push('/(tabs)/scanner'),        color: '#84CC16' },
    { icon: BookOpen, title: 'Rechercher un complément',  subtitle: 'Explorer les compléments',        onPress: () => router.push('/(tabs)/library'),        color: '#65A30D' },
    { icon: Heart,    title: 'Mes produits favoris',      subtitle: 'Retrouvez vos favoris',           onPress: () => router.push('/(tabs)/favorites'),      color: '#10B981' },
    { icon: Package,  title: 'Catalogue produits',        subtitle: 'Parcourir tous les produits',     onPress: () => router.push('/(tabs)/products'),       color: '#7C3AED' },
    ...(isAdmin ? [{ icon: Settings, title: 'Administration', subtitle: 'Gérer les données (Admin)', onPress: () => router.push('/admin'), color: '#EF4444' }] : []),
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* En-tête */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.welcomeText}>
            Bonjour {session.user.user_metadata?.full_name?.split(' ')[0] || 'Athlète'}
          </Text>
        </View>
        <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/profile')}>
          <User size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* 1) Conseil du jour (en premier) */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>💡 Conseil Expert du Jour</Text>
          <TouchableOpacity onPress={refreshTip}><ArrowRight size={20} color="#F59E0B" /></TouchableOpacity>
        </View>

        {conseilLoading ? (
          <View style={styles.tipLoadingContainer}><Text style={styles.tipLoadingText}>Chargement du conseil...</Text></View>
        ) : conseilError ? (
          <View style={styles.tipErrorContainer}>
            <Text style={styles.tipErrorText}>Erreur lors du chargement du conseil</Text>
            <TouchableOpacity style={styles.tipRetryButton} onPress={refreshTip}><Text style={styles.tipRetryText}>Réessayer</Text></TouchableOpacity>
          </View>
        ) : conseil ? (
          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>💡</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>{conseil.title}</Text>
              <Text style={styles.tipText}>{conseil.content}</Text>
              <Text style={styles.tipCategory}>Catégorie: {conseil.category}</Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* 2) Profil (juste après) */}
      {userProfile && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Votre profil</Text>
          <View style={styles.profileSummary}>
            <View style={styles.profileStat}>
              <Text style={styles.profileStatLabel}>Sport</Text>
              <Text style={styles.profileStatValue}>{userProfile.sport ?? '—'}</Text>
            </View>
            <View style={styles.profileStat}>
              <Text style={styles.profileStatLabel}>Fréquence</Text>
              <Text style={styles.profileStatValue}>
                {userProfile.frequency_per_week != null ? `${userProfile.frequency_per_week}x/sem` : '—'}
              </Text>
            </View>
            <View style={styles.profileStat}>
              <Text style={styles.profileStatLabel}>Budget</Text>
              <Text style={styles.profileStatValue}>
                {userProfile.budget_monthly != null ? `${userProfile.budget_monthly}€/mois` : '—'}
              </Text>
            </View>
          </View>

          {/* Bouton : onboarding en mode édition à l’étape 2 */}
          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={() => router.push('/onboarding?edit=1&startStep=2')}
          >
            <Settings size={16} color="#2563EB" />
            <Text style={styles.editProfileText}>Modifier mon profil</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 3) Actions rapides */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Actions rapides</Text>
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity key={index} style={styles.quickActionCard} onPress={action.onPress}>
              <View style={[styles.quickActionIcon, { backgroundColor: action.color }]}>
                <action.icon size={24} color="#FFFFFF" />
              </View>
              <View style={styles.quickActionContent}>
                <Text style={styles.quickActionTitle}>{action.title}</Text>
                <Text style={styles.quickActionSubtitle}>{action.subtitle}</Text>
              </View>
              <ArrowRight size={16} color="#6B7280" />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Statistiques (inchangé) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Vos statistiques</Text>
        {dashboardStats ? (
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <View style={styles.statIcon}><Activity size={20} color="#2563EB" /></View>
              <Text style={styles.statValue}>{dashboardStats.streak_days}</Text>
              <Text style={styles.statLabel}>Jours de streak</Text>
            </View>
            <View style={styles.statItem}>
              <View style={styles.statIcon}><BookOpen size={20} color="#7C3AED" /></View>
              <Text style={styles.statValue}>{dashboardStats.fiche_views_total}</Text>
              <Text style={styles.statLabel}>Fiches consultées</Text>
            </View>
            <View style={styles.statItem}>
              <View style={styles.statIcon}><Zap size={20} color="#F59E0B" /></View>
              <Text style={styles.statValue}>{dashboardStats.conseil_reads_total}</Text>
              <Text style={styles.statLabel}>Conseils lus</Text>
            </View>
            <View style={styles.statItem}>
              <View style={styles.statIcon}><Scan size={20} color="#84CC16" /></View>
              <Text style={styles.statValue}>{dashboardStats.product_scans_total}</Text>
              <Text style={styles.statLabel}>Produits scannés</Text>
            </View>
            <View style={styles.statItem}>
              <View style={styles.statIcon}><Plus size={20} color="#10B981" /></View>
              <Text style={styles.statValue}>{dashboardStats.product_suggestions_total}</Text>
              <Text style={styles.statLabel}>Produits suggérés</Text>
            </View>
            <View style={styles.statItem}>
              <View style={styles.statIcon}>
                {(() => {
                  const GoalIcon = userProfile?.goal ? goalIcons[userProfile.goal] || Target : Target;
                  return <GoalIcon size={20} color="#16A34A" />;
                })()}
              </View>
              <Text style={styles.statValue}>
                {userProfile?.goal === 'hypertrophy' ? 'Muscle'
                  : userProfile?.goal === 'fatloss' ? 'Perte'
                  : userProfile?.goal === 'endurance' ? 'Endurance'
                  : 'Santé'}
              </Text>
              <Text style={styles.statLabel}>Objectif principal</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.loadingText}>Chargement des statistiques...</Text>
        )}
      </View>

      <View style={styles.footer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  loadingText: { fontSize: 16, color: '#6B7280', marginTop: 12 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20,
    backgroundColor: '#FFFFFF', position: 'relative',
  },
  headerText: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#1F2937', textAlign: 'center' },
  welcomeText: { fontSize: 26, fontWeight: '700', color: '#1F2937', textAlign: 'center' },
  profileButton: {
    position: 'absolute', right: 24, top: 60, width: 40, height: 40,
    borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },

  notLoggedIn: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  notLoggedInTitle: { fontSize: 20, fontWeight: '600', color: '#1F2937', marginTop: 16, marginBottom: 8 },
  notLoggedInText: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  loginButton: { backgroundColor: '#22C55E', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  loginButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },

  section: {
    backgroundColor: '#FFFFFF', margin: 16, padding: 24, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },

  quickActionsGrid: { gap: 12 },
  quickActionCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB',
    padding: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  quickActionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  quickActionContent: { flex: 1 },
  quickActionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  quickActionSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  profileSummary: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  profileStat: { alignItems: 'center' },
  profileStatLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  profileStatValue: { fontSize: 14, fontWeight: '600', color: '#1F2937', textAlign: 'center' },

  editProfileButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#2563EB', paddingVertical: 12, paddingHorizontal: 16,
    borderRadius: 8, backgroundColor: '#EFF6FF', gap: 8,
  },
  editProfileText: { fontSize: 14, fontWeight: '600', color: '#2563EB' },

  // Conseil
  tipLoadingContainer: { alignItems: 'center', paddingVertical: 20 },
  tipLoadingText: { fontSize: 14, color: '#6B7280' },
  tipErrorContainer: { backgroundColor: '#FEF2F2', padding: 16, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#EF4444' },
  tipErrorText: { fontSize: 14, color: '#DC2626', marginBottom: 8 },
  tipRetryButton: { alignSelf: 'flex-start', backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  tipRetryText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  tipCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F0FDF4', padding: 16, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#22C55E' },
  tipIcon: { fontSize: 24, marginRight: 12 },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: 16, fontWeight: '600', color: '#065F46', marginBottom: 4 },
  tipText: { fontSize: 14, color: '#047857', lineHeight: 20, marginBottom: 4 },
  tipCategory: { fontSize: 12, color: '#059669', fontStyle: 'italic' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statItem: {
    flex: 1, minWidth: '45%', backgroundColor: '#F9FAFB', padding: 16, borderRadius: 16,
    alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  statIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1,
  },
  statValue: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  statLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', textAlign: 'center' },

  footer: { height: 100 },
});
