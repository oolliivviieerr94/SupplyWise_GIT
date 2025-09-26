import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { searchSupplementsByGroups, type Supplement } from '@/lib/queries';
import { RuleModal } from '@/components/RuleModal';
import { generateForNext2Weeks } from '@/lib/planning';
import { BookOpen, Heart, Plus, LayoutDashboard } from 'lucide-react-native';

type FavCol = 'supplement_id' | 'supplement' | 'supplement_slug';

async function detectFavoritesColumn(): Promise<FavCol> {
  const candidates: FavCol[] = ['supplement_id', 'supplement', 'supplement_slug'];
  for (const c of candidates) {
    const { error } = await supabase.from('user_favorites').select(c).limit(0);
    if (!error) return c;
  }
  const probe = await supabase.from('user_favorites').select('*').limit(1);
  const sample = (probe.data && probe.data[0]) || {};
  if ('supplement' in sample) return 'supplement';
  if ('supplement_slug' in sample) return 'supplement_slug';
  return 'supplement_id';
}

// Parse éventuels paramètres (CSV ou JSON encodé) mais on privilégie le profil.
function parseObjectiveGroupsFromParams(params: Record<string, any>): string[] {
  const raw = (params as any)?.objectives ?? (params as any)?.objectiveGroups ?? '';
  if (!raw) return [];
  try {
    const decoded = decodeURIComponent(String(raw));
    if (decoded.trim().startsWith('[')) {
      const arr = JSON.parse(decoded);
      if (Array.isArray(arr)) return arr.map(String).filter(Boolean);
    }
  } catch {}
  return String(raw).split(',').map(s => s.trim()).filter(Boolean);
}

function computeRelevanceRanking(items: Supplement[]) {
  const maxStudies = Math.max(1, ...items.map((s) => s.research_count || 0));
  const maxPrice = Math.max(1, ...items.map((s) => s.price_eur_month || 0));
  const qW = (q?: string | null) => {
    if (!q) return 0.6;
    const n = q.toLowerCase();
    if (n.includes('élev')) return 1.0;
    if (n.includes('moyen')) return 0.7;
    if (n.includes('faibl')) return 0.4;
    return 0.6;
  };
  return items
    .map((s) => {
      const scoreNorm = Math.min(1, Math.max(0, (s.score_global || 0) / 20));
      const studiesNorm = Math.log10(1 + (s.research_count || 0)) / Math.log10(1 + maxStudies);
      const priceNorm = s.price_eur_month ? 1 - (s.price_eur_month / maxPrice) : 0.6;
      const qual = qW(s.quality_level);
      const relevance = 0.6 * scoreNorm + 0.2 * studiesNorm + 0.1 * qual + 0.1 * priceNorm;
      return { ...s, _relevance: relevance };
    })
    .sort((a, b) => (b._relevance! - a._relevance!));
}

export default function RecommendationsOnboardingScreen() {
  const params = useLocalSearchParams();
  const paramsGroups = useMemo(() => parseObjectiveGroupsFromParams(params as any), [params]);

  const [loading, setLoading] = useState(true);
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [usedMode, setUsedMode] = useState<'AND'|'OR'|'TOP'|'PROFILE'>('AND');

  // Planning modal
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [selectedForRule, setSelectedForRule] = useState<Supplement | null>(null);

  // Favoris
  const [favCol, setFavCol] = useState<FavCol>('supplement_id');
  const favColRef = useRef<FavCol>('supplement_id');
  const [favReady, setFavReady] = useState(false);
  const [favoriteKeys, setFavoriteKeys] = useState<Set<string>>(new Set());
  const favBusyRef = useRef(false);

  const isIdCol = favCol === 'supplement_id' || favCol === 'supplement';
  const isFav = (s: Supplement) => favoriteKeys.has(String(isIdCol ? s.id : s.slug));

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // Init favoris
        const col = await detectFavoritesColumn();
        favColRef.current = col; setFavCol(col); setFavReady(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.from('user_favorites').select(col).eq('user_id', user.id);
          setFavoriteKeys(new Set((data || []).map((r: any) => String(r[col]))));
        }

        // 1) On privilégie les objectifs du profil si présents
        let selectedGroups: string[] = [];
        if (user) {
          const { data: prof } = await supabase
            .from('user_profiles')
            .select('objective_groups')
            .eq('user_id', user.id)
            .maybeSingle();
          if (Array.isArray(prof?.objective_groups) && prof!.objective_groups.length > 0) {
            selectedGroups = prof!.objective_groups.map(String);
            setUsedMode('PROFILE');
          }
        }

        // 2) Sinon on prend ceux reçus par URL
        if (selectedGroups.length === 0 && paramsGroups.length > 0) {
          selectedGroups = [...paramsGroups];
        }

        let base: Supplement[] = [];

        if (selectedGroups.length) {
          // AND strict
          base = await searchSupplementsByGroups(selectedGroups, true);
          setUsedMode('AND');
          if (!base.length) {
            // Fallback OR si AND vide
            base = await searchSupplementsByGroups(selectedGroups, false);
            setUsedMode('OR');
          }
        } else {
          // Aucun objectif connu → Top global
          const { data } = await supabase
            .from('supplement')
            .select('id, slug, name, category, score_global, price_eur_month, research_count, quality_level')
            .eq('is_active', true)
            .order('score_global', { ascending: false, nullsLast: true })
            .limit(50);
          base = data || [];
          setUsedMode('TOP');
        }

        const ranked = computeRelevanceRanking(base);
        setSupplements(ranked.slice(0, 15)); // <= max 15, moins si dispo
      } catch (e: any) {
        setError(e?.message || 'Erreur de génération des recommandations');
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsGroups.join(',')]);

  const handleViewFiche = (s: Supplement) =>
    router.push({ pathname: '/fiche-produit', params: { slug: s.slug } });

  const handleAddToPlanning = (s: Supplement) => {
    setSelectedForRule(s); setShowRuleModal(true);
  };

  const handleConfirmRule = async (payload: { anchors: string[]; dose?: string; frequency: 'daily' }) => {
    try {
      if (!selectedForRule) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { Alert.alert('Connexion requise', 'Connectez-vous pour ajouter au planning.'); return; }

      const rule = {
        user_id: user.id,
        supplement_id: selectedForRule.id,
        frequency: payload.frequency,
        anchors: payload.anchors,
        dose: payload.dose ?? null,
        notes: null,
        days_of_week: null,
      };

      let { error } = await supabase
        .from('user_supplement_rule')
        .upsert(rule, { onConflict: 'user_id,supplement_id' });

      if (error && (error as any).code === '23505') {
        await supabase.from('user_supplement_rule')
          .update({ frequency: rule.frequency, anchors: rule.anchors, dose: rule.dose, days_of_week: rule.days_of_week })
          .eq('user_id', rule.user_id).eq('supplement_id', rule.supplement_id);
      } else if (error) {
        throw error;
      }

      try {
        const res = await generateForNext2Weeks(user.id);
        Alert.alert('Ajouté au planning', `${selectedForRule.name} a été ajouté.\n${res.eventsGenerated} événements créés ✅`);
      } catch {}
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Impossible d’ajouter au planning.');
    } finally {
      setShowRuleModal(false);
      setSelectedForRule(null);
    }
  };

  const ensureFavCol = async () => {
    if (favReady) return favColRef.current;
    const col = await detectFavoritesColumn();
    favColRef.current = col; setFavCol(col); setFavReady(true);
    return col;
  };

  const toggleFavorite = async (s: Supplement) => {
    if (favBusyRef.current) return;
    favBusyRef.current = true;
    try {
      const col = await ensureFavCol();
      const idBased = col === 'supplement_id' || col === 'supplement';
      const key = String(idBased ? s.id : s.slug);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { Alert.alert('Connexion requise', 'Connectez-vous pour gérer vos favoris.'); return; }

      const next = new Set(favoriteKeys);
      const wasFav = next.has(key);

      if (wasFav) {
        const { error } = await supabase.from('user_favorites').delete().eq('user_id', user.id).eq(col, key);
        if (error) throw error;
        next.delete(key);
      } else {
        const exists = await supabase.from('user_favorites').select('id').eq('user_id', user.id).eq(col, key).maybeSingle();
        if (!exists.data) {
          const { error } = await supabase.from('user_favorites').insert({ user_id: user.id, [col]: key });
          if (error) throw error;
        }
        next.add(key);
      }
      setFavoriteKeys(next);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Impossible de mettre à jour le favori.');
    } finally {
      favBusyRef.current = false;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={styles.titleCentered}>Produits recommandés</Text>
        <Text style={styles.subtitleCentered}>Analyse de votre profil…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titleCentered}>Produits recommandés</Text>
        <Text style={styles.subtitleCentered}>
          Voici les produits les plus pertinents pour la réussite de vos objectifs. Vous pourrez modifier votre profil plus tard.
        </Text>

        <View style={styles.headerCtas}>
          <TouchableOpacity
            style={[styles.ctaGhost, styles.cta]}
            onPress={() => router.replace('/onboarding?edit=1&startStep=4')}>
            <Text style={styles.ctaGhostTxt}>Revenir au profil</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.ctaPrimary, styles.cta]}
            onPress={() => router.replace('/(tabs)/dashboard')}>
            <LayoutDashboard size={16} color="#fff" />
            <Text style={styles.ctaPrimaryTxt}>Aller à mon espace</Text>
          </TouchableOpacity>
        </View>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorTxt}>Erreur : {error}</Text>
        </View>
      )}

      {usedMode === 'TOP' && (
        <View style={styles.infoBox}>
          <Text style={styles.infoTxt}>
            Astuce : nous n'avons pas reçu vos objectifs. Voici un top des meilleurs produits.
          </Text>
        </View>
      )}

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {supplements.map((s) => {
          const fav = isFav(s);
          return (
            <View key={s.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{s.name}</Text>
                  <Text style={styles.cardCat}>{s.category || 'Non catégorisé'}</Text>
                </View>
                {(s.score_global || s.research_count) && (
                  <View style={{ alignItems: 'flex-end' }}>
                    {s.score_global ? <Text style={styles.cardScore}>{s.score_global}/20</Text> : null}
                    {s.research_count ? <Text style={styles.cardStudies}>{s.research_count} étude{s.research_count! > 1 ? 's' : ''}</Text> : null}
                  </View>
                )}
              </View>

              <View style={styles.infoRowWrap}>
                {s.price_eur_month ? (
                  <Text style={styles.infoRow}><Text style={styles.infoKey}>Prix/mois : </Text>{s.price_eur_month}€</Text>
                ) : null}
                {s.quality_level ? (
                  <Text style={styles.infoRow}><Text style={styles.infoKey}>Qualité : </Text>{s.quality_level}</Text>
                ) : null}
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity style={[styles.actionBtn, styles.btnOutlineBlue]} onPress={() => handleViewFiche(s)}>
                  <BookOpen size={16} color="#2563EB" />
                  <Text style={[styles.btnTxt, styles.btnTxtBlue]}>Voir la fiche</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionBtn, styles.btnSolidPrimary]} onPress={() => handleAddToPlanning(s)}>
                  <Plus size={18} color="#fff" />
                  <Text style={[styles.btnTxt, styles.btnTxtWhite]}>Ajouter au planning</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={!favReady}
                  style={[
                    styles.actionBtn,
                    fav ? styles.btnSolidDanger : styles.btnOutlineDanger,
                    !favReady && { opacity: 0.5 },
                  ]}
                  onPress={() => toggleFavorite(s)}>
                  <Heart size={16} color={fav ? '#fff' : '#EF4444'} fill={fav ? '#fff' : 'none'} />
                  <Text style={[styles.btnTxt, fav ? styles.btnTxtWhite : styles.btnTxtDanger]}>
                    {fav ? 'Favori' : 'Ajouter aux favoris'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <View style={{ height: 80 }} />
      </ScrollView>

      <RuleModal
        visible={showRuleModal}
        onClose={() => { setShowRuleModal(false); setSelectedForRule(null); }}
        onConfirm={handleConfirmRule}
        defaultAnchors={['morning']}
        defaultDose="Selon recommandations"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  header: { paddingTop: 48, paddingBottom: 12, paddingHorizontal: 20, backgroundColor: '#FFFFFF' },
  titleCentered: { textAlign: 'center', fontSize: 24, fontWeight: '800', color: '#0F172A' },
  subtitleCentered: { textAlign: 'center', fontSize: 14, color: '#6B7280', marginTop: 8, lineHeight: 20 },
  headerCtas: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 14 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  ctaGhost: { borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF' },
  ctaGhostTxt: { color: '#334155', fontWeight: '700' },
  ctaPrimary: { backgroundColor: '#2563EB', gap: 6 },
  ctaPrimaryTxt: { color: '#FFFFFF', fontWeight: '700' },

  errorBox: { backgroundColor: '#FEF2F2', borderLeftWidth: 4, borderLeftColor: '#EF4444', margin: 16, padding: 12, borderRadius: 10 },
  errorTxt: { color: '#B91C1C' },
  infoBox: { backgroundColor: '#EFF6FF', borderLeftWidth: 4, borderLeftColor: '#2563EB', marginHorizontal: 16, marginTop: 12, padding: 10, borderRadius: 10 },
  infoTxt: { color: '#1D4ED8' },

  card: { backgroundColor: '#FFFFFF', marginHorizontal: 16, marginTop: 12, padding: 16, borderRadius: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  cardCat: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  cardScore: { fontSize: 16, fontWeight: '700', color: '#111827' },
  cardStudies: { fontSize: 12, color: '#6B7280' },

  infoRowWrap: { flexDirection: 'row', gap: 18, marginTop: 8, marginBottom: 12 },
  infoRow: { fontSize: 13, color: '#374151' },
  infoKey: { fontWeight: '600', color: '#111827' },

  actionsRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, minHeight: 44, borderRadius: 12, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  btnTxt: { fontSize: 14, fontWeight: '700' },
  btnOutlineBlue: { borderWidth: 1.5, borderColor: '#2563EB', backgroundColor: '#EEF2FF' },
  btnTxtBlue: { color: '#2563EB' },
  btnSolidPrimary: { backgroundColor: '#2563EB' },
  btnTxtWhite: { color: '#FFFFFF' },
  btnOutlineDanger: { borderWidth: 1.5, borderColor: '#EF4444', backgroundColor: '#FEE2E2' },
  btnSolidDanger: { backgroundColor: '#EF4444' },
  btnTxtDanger: { color: '#EF4444' },
});
