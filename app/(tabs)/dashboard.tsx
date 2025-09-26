// /home/project/app/(tabs)/dashboard.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { useConseil } from '@/hooks/useConseil';
import { fetchUserDashboardStats, type UserDashboardStats } from '@/lib/stats';
import { logConseilRead } from '@/lib/track';
import {
  Target, Calendar, Scan, BookOpen, Settings, ArrowRight, Zap, User,
  Package, Dumbbell, Activity, Heart, Flame, Plus, Info, Edit3,
} from 'lucide-react-native';
import { listObjectiveGroups, getUserObjectiveGroupSlugs } from '@/lib/queries';

// Icônes par objectif primaire
const goalIcons: Record<string, any> = {
  hypertrophy: Dumbbell,
  fatloss: Flame,
  endurance: Activity,
  health: Heart,
};

type Profile = {
  sport?: string | null;
  frequency_per_week?: number | null;
  budget_monthly?: number | null;
  goal?: string | null;
  objective_groups?: string[] | null;
};

export default function DashboardScreen() {
  const [session, setSession] = useState<Session | null>(null);

  // données
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [dashboardStats, setDashboardStats] = useState<UserDashboardStats | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // états UI
  const [initializing, setInitializing] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Conseil du jour
  const { conseil, loading: conseilLoading, error: conseilError, refreshTip } = useConseil();

  // group labels (pour afficher joliment les objectifs)
  const [groupsMeta, setGroupsMeta] = useState<Record<string, { label: string; emoji?: string | null }>>({});

  useEffect(() => {
    // session actuelle
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session ?? null);
      setInitializing(false);
    });
    // suivre les changements d’auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // log lecture de conseil (quand dispo)
  useEffect(() => {
    if (!conseilLoading && !conseilError && conseil?.id) {
      logConseilRead(conseil.id);
    }
  }, [conseil, conseilLoading, conseilError]);

  // map des groupes (slug -> label/emoji)
  useEffect(() => {
    (async () => {
      try {
        const list = await listObjectiveGroups();
        const map: Record<string, { label: string; emoji?: string | null }> = {};
        list.forEach(g => { map[g.slug] = { label: g.label, emoji: g.emoji }; });
        setGroupsMeta(map);
      } catch {
        // silencieux
      }
    })();
  }, []);

  const checkAdminAccess = useCallback(async (s: Session) => {
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
  }, []);

  const loadCore = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUserProfile(null);
      setDashboardStats(null);
      setIsAdmin(false);
      return;
    }

    // charge profil (colonnes nécessaires), stats & admin en // pour gagner du temps
    const p1 = supabase
      .from('user_profiles')
      .select('sport,frequency_per_week,budget_monthly,goal,objective_groups')
      .eq('user_id', user.id)
      .maybeSingle();

    const p2 = fetchUserDashboardStats();

    const p3 = checkAdminAccess({ user } as any as Session);

    const [profRes, statsRes] = await Promise.allSettled([p1, p2, p3]);

    // profil
    if (profRes.status === 'fulfilled') {
      const prof = profRes.value.data as Profile | null;
      // si pas de groupes sur le profil, essayer via notre helper (onboarding)
      if (!prof?.objective_groups || prof.objective_groups.length === 0) {
        try {
          const { slugs } = await getUserObjectiveGroupSlugs(user.id);
          setUserProfile({ ...prof, objective_groups: slugs });
        } catch {
          setUserProfile(prof ?? null);
        }
      } else {
        setUserProfile(prof ?? null);
      }
    } else {
      setUserProfile(null);
    }

    // stats
    if (statsRes.status === 'fulfilled') {
      setDashboardStats(statsRes.value);
    } else {
      setDashboardStats(null);
    }
  }, [checkAdminAccess]);

  // charger au focus (valeurs toujours à jour)
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          setRefreshing(true);
          await loadCore();
        } finally {
          if (alive) setRefreshing(false);
        }
      })();
      return () => { alive = false; };
    }, [loadCore])
  );

  // ========= UI helpers =========
  const firstName = useMemo(() => {
    const full = session?.user?.user_metadata?.full_name || '';
    return full ? String(full).split(' ')[0] : 'Athlète';
  }, [session]);

  const goalIconEl = useMemo(() => {
    const g = userProfile?.goal || 'health';
    const GoalIcon = goalIcons[g] || Target;
    return <GoalIcon size={20} color="#16A34A" />;
  }, [userProfile?.goal]);

  // actions rapides
  const quickActions = useMemo(() => ([
    { icon: Target,   title: 'Mes recommandations',       subtitle: 'Voir les conseils personnalisés', onPress: () => router.push('/(tabs)/recommendations'), color: '#22C55E' },
    { icon: Calendar, title: 'Planning du jour',          subtitle: 'Gérer mes prises',                onPress: () => router.push('/planner'),               color: '#16A34A' },
    { icon: Scan,     title: 'Scanner un produit',        subtitle: 'Identifier un supplément',        onPress: () => router.push('/(tabs)/scanner'),        color: '#84CC16' },
    { icon: BookOpen, title: 'Rechercher un complément',  subtitle: 'Explorer les compléments',        onPress: () => router.push('/(tabs)/library'),        color: '#65A30D' },
    { icon: Heart,    title: 'Mes produits favoris',      subtitle: 'Retrouvez vos favoris',           onPress: () => router.push('/(tabs)/favorites'),      color: '#10B981' },
    { icon: Package,  title: 'Catalogue produits',        subtitle: 'Parcourir tous les produits',     onPress: () => router.push('/(tabs)/products'),       color: '#7C3AED' },
    ...(isAdmin ? [{ icon: Settings, title: 'Administration', subtitle: 'Gérer les données (Admin)', onPress: () => router.push('/admin'), color: '#EF4444' }] : []),
  ]), [isAdmin]);

  // ========= Render =========
  if (initializing) {
    // on ne bloque pas avec un splash plein écran : juste un léger skeleton header
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.welcomeText}>Bonjour…</Text>
          </View>
          <View style={styles.profileButtonSkeleton} />
        </View>
        <View style={styles.section}>
          <View style={styles.skelLine} />
          <View style={[styles.skelLine, { width: '60%', marginTop: 8 }]} />
        </View>
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

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadCore} tintColor="#22C55E" />
      }
    >
      {/* En-tête */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.welcomeText}>
            Bonjour {firstName}
          </Text>
        </View>
        <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/profile')}>
          <User size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Profil utilisateur — placé en premier */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>👤 Votre profil</Text>
          <TouchableOpacity
            style={styles.smallLinkBtn}
            onPress={() => router.push('/onboarding?edit=1&startStep=2')}
          >
            <Edit3 size={14} color="#2563EB" />
            <Text style={styles.smallLinkBtnText}>Modifier</Text>
          </TouchableOpacity>
        </View>

        {!userProfile ? (
          <View style={styles.infoBanner}>
            <Info size={16} color="#2563EB" />
            <Text style={styles.infoBannerText}>
              Complétez votre profil pour des recommandations précises.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.profileSummary}>
              <View style={styles.profileStat}>
                <Text style={styles.profileStatLabel}>Sport</Text>
                <Text style={styles.profileStatValue}>{userProfile.sport || '—'}</Text>
              </View>
              <View style={styles.profileStat}>
                <Text style={styles.profileStatLabel}>Fréquence</Text>
                <Text style={styles.profileStatValue}>
                  {userProfile.frequency_per_week ? `${userProfile.frequency_per_week}x/sem` : '—'}
                </Text>
              </View>
              <View style={styles.profileStat}>
                <Text style={styles.profileStatLabel}>Budget</Text>
                <Text style={styles.profileStatValue}>
                  {userProfile.budget_monthly != null ? `${userProfile.budget_monthly}€/mois` : '—'}
                </Text>
              </View>
            </View>

            <View style={styles.objectivesRow}>
              <View style={styles.goalPill}>
                {goalIconEl}
                <Text style={styles.goalPillText}>
                  {userProfile?.goal === 'hypertrophy' ? 'Objectif : Hypertrophie'
                    : userProfile?.goal === 'fatloss' ? 'Objectif : Perte de graisse'
                    : userProfile?.goal === 'endurance' ? 'Objectif : Endurance'
                    : 'Objectif : Santé / Bien-être'}
                </Text>
              </View>

              {!!userProfile?.objective_groups?.length && (
                <View style={styles.groupsWrap}>
                  {userProfile.objective_groups.map((slug) => {
                    const g = groupsMeta[slug];
                    return (
                      <View key={slug} style={styles.groupTag}>
                        {!!g?.emoji && <Text style={{ marginRight: 4 }}>{g.emoji}</Text>}
                        <Text style={styles.groupTagText}>{g?.label || slug}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        )}
      </View>

      {/* Conseil du jour */}
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

      {/* Actions rapides */}
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

      {/* Statistiques */}
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
              <View style={styles.statIcon}>{goalIconEl}</View>
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

  // header
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
  profileButtonSkeleton: {
    position: 'absolute', right: 24, top: 60, width: 40, height: 40,
    borderRadius: 20, backgroundColor: '#E5E7EB',
  },

  // not logged in
  notLoggedIn: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  notLoggedInTitle: { fontSize: 20, fontWeight: '600', color: '#1F2937', marginTop: 16, marginBottom: 8 },
  notLoggedInText: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  loginButton: { backgroundColor: '#22C55E', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  loginButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },

  // sections
  section: {
    backgroundColor: '#FFFFFF', margin: 16, padding: 24, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },

  // banners / skeleton
  infoBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', borderLeftWidth: 4, borderLeftColor: '#2563EB', padding: 12, borderRadius: 10 },
  infoBannerText: { marginLeft: 8, color: '#2563EB', fontWeight: '600' },
  skelLine: { height: 16, backgroundColor: '#E5E7EB', borderRadius: 6 },

  // btn lien
  smallLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#2563EB' },
  smallLinkBtnText: { color: '#2563EB', fontWeight: '700', fontSize: 12 },

  // profil
  profileSummary: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  profileStat: { alignItems: 'center', flex: 1 },
  profileStatLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  profileStatValue: { fontSize: 14, fontWeight: '700', color: '#1F2937', textAlign: 'center' },

  objectivesRow: { marginTop: 8, gap: 8 },
  goalPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0FDF4', borderColor: '#86EFAC', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  goalPillText: { color: '#166534', fontWeight: '700' },

  groupsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  groupTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  groupTagText: { fontSize: 12, fontWeight: '700', color: '#111827' },

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

  // actions rapides
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

  // stats
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
