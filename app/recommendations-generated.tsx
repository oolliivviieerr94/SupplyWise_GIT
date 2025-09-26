// /home/project/app/recommendations-generated.tsx
import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { searchSupplementsByGroups, type Supplement } from '@/lib/queries';
import { RuleModal } from '@/components/RuleModal';
import { generateForNext2Weeks } from '@/lib/planning';
import {
  Target,
  Star,
  Euro,
  Award,
  Plus,
  BookOpen,
  Heart,
} from 'lucide-react-native';

/** --------- Favoris : gestion des schémas possibles ---------- */
type FavCol = 'supplement_id' | 'supplement' | 'supplement_slug';

async function detectFavoritesColumn(): Promise<FavCol> {
  const candidates: FavCol[] = ['supplement_id', 'supplement', 'supplement_slug'];
  for (const col of candidates) {
    const { error } = await supabase.from('user_favorites').select(col).limit(0);
    if (!error) return col;
  }
  return 'supplement_id';
}
/** ------------------------------------------------------------ */

export default function RecommendationsGeneratedScreen() {
  // Données transmises depuis l'onboarding (Step C).
  const params = useLocalSearchParams();
  const profileData = useMemo(() => {
    try {
      return {
        sport: (params.sport as string) ?? '',
        frequency: Number(params.frequency) || 0,
        trainingTime: (params.trainingTime as string) ?? '',
        objectiveGroups: JSON.parse(String(params.objectiveGroups || '[]')) as string[],
        budget: Number(params.budget) || 1000,
        constraints: JSON.parse(String(params.constraints || '[]')) as string[],
        competitionMode: String(params.competitionMode) === 'true',
      };
    } catch {
      return {
        sport: '',
        frequency: 0,
        trainingTime: '',
        objectiveGroups: [] as string[],
        budget: 1000,
        constraints: [] as string[],
        competitionMode: false,
      };
    }
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Planning
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [selectedSupplement, setSelectedSupplement] = useState<Supplement | null>(null);

  // Favoris
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [favReady, setFavReady] = useState(false);
  const favColRef = useRef<FavCol>('supplement_id');
  const [slugById, setSlugById] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1) Recommandations à partir des groupes d’objectifs (logique AND)
      let recs: Supplement[] = [];
      if (profileData.objectiveGroups.length > 0) {
        recs = await searchSupplementsByGroups(profileData.objectiveGroups, true);
      }

      // Si pas d’objectifs ou pas de résultats → top produits par score
      if (recs.length === 0) {
        const { data: top } = await supabase
          .from('supplement')
          .select('id,slug,name,category,score_global,price_eur_month,research_count,quality_level')
          .eq('is_active', true)
          .order('score_global', { ascending: false, nullsLast: true })
          .limit(30);
        recs = top || [];
      }

      // Filtres simples issus du profil
      if (profileData.budget < 1000) {
        recs = recs.filter((s) => !s.price_eur_month || s.price_eur_month <= profileData.budget);
      }

      // Tri : score global desc, puis nombre d’études desc
      recs.sort((a, b) => {
        const sA = a.score_global ?? 0;
        const sB = b.score_global ?? 0;
        if (sB !== sA) return sB - sA;
        const rA = a.research_count ?? 0;
        const rB = b.research_count ?? 0;
        return rB - rA;
      });

      // Limite à 15 éléments
      recs = recs.slice(0, 15);

      setSupplements(recs);

      // Index slug pour favoris si besoin
      const map = new Map<string, string>();
      recs.forEach((s) => map.set(String(s.id), s.slug || ''));
      setSlugById(map);

      // Favoris actuels de l’utilisateur
      const col = await detectFavoritesColumn();
      favColRef.current = col;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setFavReady(true); return; }

      const { data } = await supabase.from('user_favorites').select(col).eq('user_id', user.id);
      const ids = new Set<string>();
      if (col === 'supplement_id' || col === 'supplement') {
        (data || []).forEach((r: any) => r[col] && ids.add(String(r[col])));
      } else {
        // supplement_slug → remapper vers id présents à l’écran
        const slugs = (data || []).map((r: any) => r[col]).filter(Boolean);
        const bySlug = new Map<string, string>();
        recs.forEach((s) => s.slug && bySlug.set(s.slug, String(s.id)));
        slugs.forEach((sl) => { const id = bySlug.get(sl); if (id) ids.add(id); });
      }
      setFavIds(ids);
      setFavReady(true);
    } catch (e: any) {
      setError(e?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  /** ---------- Planning ---------- */
  const handleAddToPlanning = (supp: Supplement) => {
    setSelectedSupplement(supp);
    setShowRuleModal(true);
  };

  const handleConfirmRule = async (payload: { anchors: string[]; dose?: string; frequency: 'daily' }) => {
    if (!selectedSupplement) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { Alert.alert('Erreur', 'Vous devez être connecté'); return; }

      const rule = {
        user_id: user.id,
        supplement_id: selectedSupplement.id,
        frequency: payload.frequency,
        anchors: payload.anchors,
        dose: payload.dose ?? null,
        notes: null,
        days_of_week: null,
      };

      let { data: up, error } = await supabase
        .from('user_supplement_rule')
        .upsert(rule, { onConflict: 'user_id,supplement_id' })
        .select('id')
        .single();

      if (error) {
        const upd = await supabase
          .from('user_supplement_rule')
          .update({ frequency: rule.frequency, anchors: rule.anchors, dose: rule.dose })
          .eq('user_id', rule.user_id)
          .eq('supplement_id', rule.supplement_id)
          .select('id')
          .single();
        up = upd.data; error = upd.error;
      }
      if (!up || error) throw error;

      try {
        const res = await generateForNext2Weeks(user.id);
        Alert.alert('Ajouté au planning', `${selectedSupplement.name} a été ajouté.\n${res.eventsGenerated} événements générés ✅`);
      } catch (e: any) {
        Alert.alert('Règle créée', `Génération auto du planning échouée.\n${e.message}`);
      }
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Impossible d’ajouter au planning.');
    } finally {
      setShowRuleModal(false);
      setSelectedSupplement(null);
    }
  };

  /** ---------- Favoris ---------- */
  const isFav = (id: string) => favIds.has(String(id));

  const toggleFavorite = async (supp: Supplement) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { Alert.alert('Connexion requise', 'Connectez-vous pour gérer vos favoris.'); return; }

      const col = favColRef.current;
      let key: string = String(supp.id);
      if (col === 'supplement_slug') {
        const slug = slugById.get(String(supp.id)) || '';
        if (!slug) { Alert.alert('Erreur', 'Slug du produit introuvable.'); return; }
        key = slug;
      }

      const idKey = String(supp.id);
      const willRemove = favIds.has(idKey);

      // Optimiste
      setFavIds((prev) => {
        const n = new Set(prev);
        willRemove ? n.delete(idKey) : n.add(idKey);
        return n;
      });

      if (willRemove) {
        const { error } = await supabase.from('user_favorites').delete().eq('user_id', user.id).eq(col, key);
        if (error) throw error;
      } else {
        const exists = await supabase.from('user_favorites').select('id').eq('user_id', user.id).eq(col, key).maybeSingle();
        if (!exists.data) {
          const ins = await supabase.from('user_favorites').insert({ user_id: user.id, [col]: key });
          if (ins.error) throw ins.error;
        }
      }
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Mise à jour du favori impossible.');
    }
  };

  /** ---------- Rendu ---------- */
  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#22C55E" />
        <Text style={styles.loadingText}>Analyse de votre profil et préparation des produits…</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Produits recommandés</Text>
        <Text style={styles.subtitle}>
          Voici les produits les plus pertinents pour la réussite de vos objectifs.
          Vous pourrez modifier votre profil plus tard.
        </Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.back()}>
            <Text style={styles.secondaryTxt}>Revenir au profil</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.replace('/(tabs)/dashboard')}
          >
            <Target size={18} color="#FFFFFF" />
            <Text style={styles.primaryTxt}>Aller à mon espace</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {error && (
          <View style={styles.tipBox}>
            <Text style={styles.tipText}>Astuce : {error}</Text>
          </View>
        )}

        {supplements.map((s) => {
          const fav = isFav(s.id);
          return (
            <View key={s.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sName}>{s.name}</Text>
                  <Text style={styles.sCat}>{s.category || 'Non catégorisé'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {typeof s.score_global === 'number' && (
                    <View style={styles.scoreRow}>
                      <Star size={16} color="#F59E0B" fill="#F59E0B" />
                      <Text style={styles.scoreTxt}>
                        {s.score_global}/20
                      </Text>
                    </View>
                  )}
                  {typeof s.research_count === 'number' && (
                    <Text style={styles.studiesTxt}>
                      {s.research_count} étude{s.research_count > 1 ? 's' : ''}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.metaRow}>
                {typeof s.price_eur_month === 'number' && (
                  <View style={styles.metaItem}>
                    <Euro size={16} color="#10B981" />
                    <Text style={styles.metaTxt}>
                      Coût/jour : {(s.price_eur_month / 30).toFixed(2)}€
                    </Text>
                  </View>
                )}
                {s.quality_level && (
                  <View style={styles.metaItem}>
                    <Award size={16} color="#F59E0B" />
                    <Text style={styles.metaTxt}>Qualité : {s.quality_level}</Text>
                  </View>
                )}
              </View>

              <View style={styles.ctaRow}>
                <TouchableOpacity
                  style={styles.ghostBtn}
                  onPress={() => router.push({ pathname: '/supplement-detail', params: { slug: s.slug } })}
                >
                  <BookOpen size={18} color="#2563EB" />
                  <Text style={styles.ghostTxt}>Voir la fiche</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.planBtn} onPress={() => handleAddToPlanning(s)}>
                  <Plus size={20} color="#FFFFFF" />
                  <Text style={styles.planTxt} numberOfLines={2}>Ajouter au planning</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={!favReady}
                  style={[styles.favBtn, fav && styles.favBtnActive, !favReady && { opacity: 0.5 }]}
                  onPress={() => toggleFavorite(s)}
                >
                  <Heart size={18} color={fav ? '#FFFFFF' : '#EF4444'} fill={fav ? '#FFFFFF' : 'none'} />
                  <Text style={[styles.favTxt, fav && styles.favTxtActive]} numberOfLines={2}>
                    {fav ? 'Favori' : 'Ajouter aux favoris'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>

      <RuleModal
        visible={showRuleModal}
        onClose={() => { setShowRuleModal(false); setSelectedSupplement(null); }}
        onConfirm={handleConfirmRule}
        defaultAnchors={['morning']}
        defaultDose="Selon recommandations"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F8FAFC' },

  header: {
    paddingTop: 54,
    paddingBottom: 18,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A', textAlign: 'center' },
  subtitle: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
    maxWidth: 560,
  },

  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  secondaryTxt: { color: '#0F172A', fontWeight: '700' },

  // ✅ Vert de validation
  primaryBtn: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryTxt: { color: '#FFFFFF', fontWeight: '700', marginLeft: 8 },

  scroll: { flex: 1 },

  tipBox: {
    margin: 16,
    padding: 14,
    backgroundColor: '#EEF6FF',
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
    borderRadius: 10,
  },
  tipText: { color: '#1D4ED8' },

  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  sName: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  sCat: { marginTop: 4, color: '#64748B' },

  scoreRow: { flexDirection: 'row', alignItems: 'center' },
  scoreTxt: { marginLeft: 6, fontSize: 16, fontWeight: '700', color: '#0F172A' },
  studiesTxt: { fontSize: 12, color: '#64748B', marginTop: 2 },

  metaRow: { flexDirection: 'row', gap: 18, marginTop: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  metaTxt: { marginLeft: 6, color: '#334155' },

  ctaRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  ghostBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  ghostTxt: { marginLeft: 8, color: '#2563EB', fontWeight: '700' },

  planBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  planTxt: { marginLeft: 8, color: '#FFFFFF', fontSize: 15, fontWeight: '800' },

  favBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  favBtnActive: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  favTxt: { marginLeft: 8, color: '#EF4444', fontSize: 15, fontWeight: '800' },
  favTxtActive: { color: '#FFFFFF' },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 24 },
  loadingText: { marginTop: 12, color: '#475569' },
});
