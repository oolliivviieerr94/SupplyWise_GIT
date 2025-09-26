// /home/project/app/recommendations/index.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { RuleModal } from '@/components/RuleModal';
import { generateForNext2Weeks } from '@/lib/planning';
import { Grid3X3, Plus, Heart, BookOpen, Award, Clock, Euro, Star } from 'lucide-react-native';

import { searchSupplementsByGroups, getUserObjectiveGroupSlugs, type Supplement } from '@/lib/queries';
import { useFiches } from '@/hooks/useFiches';
import {
  enrichSupplementForDisplay,
  evidenceColors,
  evidenceLabels,
} from '@/lib/supplementDisplayUtils';

type RecoItem = {
  supplement: Supplement;
  evidence: 'A' | 'B' | 'C';
  dosage: string;
  timing: string;
  costPerDay: number;
};

export default function Recommendations() {
  const params = useLocalSearchParams<{ from?: string; objectives?: string }>();

  const { data: ficheMap } = useFiches(); // map slug → md

  const [loading, setLoading] = useState(false);
  const [tipNoGoals, setTipNoGoals] = useState(false);
  const [recs, setRecs] = useState<RecoItem[]>([]);

  // --------- Favoris ----------
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const favReadyRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { favReadyRef.current = true; return; }
        const { data } = await supabase
          .from('user_favorites')
          .select('supplement_id')
          .eq('user_id', user.id);
        const ids = new Set<string>();
        (data || []).forEach((r: any) => r.supplement_id && ids.add(String(r.supplement_id)));
        setFavIds(ids);
      } finally {
        favReadyRef.current = true;
      }
    })();
  }, []);

  const toggleFavorite = async (supplementId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { Alert.alert('Connexion requise', 'Connectez-vous pour gérer vos favoris.'); return; }

      const willRemove = favIds.has(supplementId);
      setFavIds(prev => {
        const n = new Set(prev);
        willRemove ? n.delete(supplementId) : n.add(supplementId);
        return n;
      });

      if (willRemove) {
        await supabase.from('user_favorites').delete()
          .eq('user_id', user.id).eq('supplement_id', supplementId);
      } else {
        const exists = await supabase.from('user_favorites').select('id')
          .eq('user_id', user.id).eq('supplement_id', supplementId).maybeSingle();
        if (!exists.data) {
          await supabase.from('user_favorites').insert({ user_id: user.id, supplement_id: supplementId });
        }
      }
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Mise à jour du favori impossible.');
    }
  };

  // --------- Génération des recommandations ----------
  const objectivesFromParams = useMemo<string[]>(
    () => (typeof params.objectives === 'string' && params.objectives.length
      ? params.objectives.split(',').map(s => s.trim()).filter(Boolean)
      : []),
    [params.objectives]
  );

  useEffect(() => {
    let alive = true;

    const run = async () => {
      setLoading(true);
      setTipNoGoals(false);

      try {
        // 1) objectifs : URL > user_objective_group > profil > fallback
        let goals = objectivesFromParams;
        if (goals.length === 0) {
          const { data: { user } } = await supabase.auth.getUser();
          const uid = user?.id;
          const { slugs, source } = await getUserObjectiveGroupSlugs(uid || undefined);
          console.log('[reco] goals source=', source, 'count=', slugs.length);
          goals = slugs;
        }

        if (goals.length === 0) {
          if (alive) { setTipNoGoals(true); setRecs([]); }
          return;
        }

        // 2) recherche AND stricte
        const supplements = await searchSupplementsByGroups(goals, true);

        // 3) tri score puis #études
        supplements.sort((a, b) => {
          const sg = (b.score_global ?? (b as any).score_global_adapte ?? 0)
                   - (a.score_global ?? (a as any).score_global_adapte ?? 0);
          if (sg !== 0) return sg;
          return ((b.research_count ?? (b as any).nb_etudes ?? 0) as number)
               - ((a.research_count ?? (a as any).nb_etudes ?? 0) as number);
        });

        // 4) max 15 + enrichissement (dosage/timing/€ jour/preuve) avec fallback fiche MD
        const top = supplements.slice(0, 15);
        const items: RecoItem[] = top.map(s => {
          const extra = enrichSupplementForDisplay(s, ficheMap || undefined);
          return { supplement: s, ...extra };
        });

        if (alive) setRecs(items);
      } catch (e: any) {
        console.error('reco build error:', e);
        if (alive) Alert.alert('Erreur', e?.message || 'Impossible de générer les recommandations');
      } finally {
        if (alive) setLoading(false);
      }
    };

    run();
    return () => { alive = false; };
  }, [objectivesFromParams, ficheMap]);

  // --------- Planning (RuleModal) ----------
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [selected, setSelected] = useState<RecoItem | null>(null);

  const onConfirmRule = async (payload: { anchors: string[]; dose?: string; frequency: 'daily' }) => {
    if (!selected) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { Alert.alert('Erreur', 'Vous devez être connecté'); return; }

    const rule = {
      user_id: user.id,
      supplement_id: selected.supplement.id,
      frequency: payload.frequency,
      anchors: payload.anchors,
      dose: payload.dose ?? null,
      notes: null,
      days_of_week: null,
    };

    let { data: up, error } = await supabase
      .from('user_supplement_rule')
      .upsert(rule, { onConflict: 'user_id,supplement_id' })
      .select('id').single();

    if (error) {
      const upd = await supabase
        .from('user_supplement_rule')
        .update({ frequency: rule.frequency, anchors: rule.anchors, dose: rule.dose })
        .eq('user_id', rule.user_id).eq('supplement_id', rule.supplement_id)
        .select('id').single();
      up = upd.data; error = upd.error;
    }
    if (error || !up) { Alert.alert('Erreur', error?.message || 'Création de règle impossible'); return; }

    try {
      const res = await generateForNext2Weeks(user.id);
      Alert.alert('Ajouté au planning', `${selected.supplement.name} a été ajouté.\n${res.eventsGenerated} événements générés ✅`);
    } catch (e: any) {
      Alert.alert('Règle créée', `Génération auto du planning échouée.\n${e.message}`);
    } finally {
      setShowRuleModal(false); setSelected(null);
    }
  };

  // --------- UI ----------
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Produits recommandés</Text>
        <Text style={styles.subtitle}>
          Voici les produits les plus pertinents pour la réussite de vos objectifs.
          Vous pourrez modifier votre profil plus tard.
        </Text>

        <View style={styles.navButtons}>
          <TouchableOpacity
            style={styles.greyBtn}
            onPress={() => router.replace('/onboarding?edit=1&startStep=2')}
          >
            <Text style={styles.greyBtnText}>Revenir au profil</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.greenBtn} onPress={() => router.replace('/(tabs)/dashboard')}>
            <Grid3X3 size={18} color="#FFFFFF" />
            <Text style={styles.greenBtnText}>Aller à mon espace</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={styles.loadingText}>Génération de vos recommandations…</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {tipNoGoals && (
            <View style={styles.tip}>
              <Text style={styles.tipText}>
                Astuce : nous n'avons pas reçu vos objectifs. Voici un top des meilleurs produits.
              </Text>
            </View>
          )}

          {recs.map((r) => {
            const s = r.supplement;
            const fav = favIds.has(String(s.id));
            const dayCost = r.costPerDay.toFixed(2);

            return (
              <View key={String(s.id)} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{s.name}</Text>
                    {!!s.category && <Text style={{ color: '#6B7280', marginTop: 2 }}>{s.category}</Text>}
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Star size={16} color="#F59E0B" fill="#F59E0B" />
                      <Text style={{ marginLeft: 6, fontWeight: '800', color: '#111827' }}>
                        {(s.score_global ?? (s as any).score_global_adapte ?? 0).toFixed(1)}/20
                      </Text>
                    </View>
                    <View style={[styles.evidenceBadge, { backgroundColor: evidenceColors[r.evidence] }]}>
                      <Award size={12} color="#fff" />
                      <Text style={styles.evidenceText}>{evidenceLabels[r.evidence]}</Text>
                    </View>
                  </View>
                </View>

                <View style={{ marginTop: 6 }}>
                  <Text style={styles.infoLine}><Text style={styles.infoLabel}>Dosage : </Text>{r.dosage}</Text>
                  <Text style={styles.infoLine}><Clock size={14} color="#6B7280" /> <Text style={styles.infoLabel}>Timing : </Text>{r.timing}</Text>
                  <Text style={styles.infoLine}><Euro size={14} color="#6B7280" /> <Text style={styles.infoLabel}>Coût/jour : </Text>{dayCost}€</Text>
                </View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.detailsBtn}
                    onPress={() => router.push({ pathname: '/supplement-detail', params: { slug: s.slug } })}
                  >
                    <BookOpen size={16} color="#2563EB" />
                    <Text style={styles.detailsBtnText}>Voir la fiche</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.addBtn} onPress={() => setSelected(r) || setShowRuleModal(true)}>
                    <Plus size={18} color="#FFFFFF" />
                    <Text style={styles.addBtnText}>Ajouter au planning</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.favBtn, fav && styles.favBtnActive]}
                    onPress={() => toggleFavorite(String(s.id))}
                    disabled={!favReadyRef.current}
                  >
                    <Heart size={18} color={fav ? '#FFFFFF' : '#EF4444'} fill={fav ? '#FFFFFF' : 'none'} />
                    <Text style={[styles.favBtnText, fav && styles.favBtnTextActive]}>
                      {fav ? 'Favori' : 'Ajouter aux favoris'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          <View style={{ height: 96 }} />
        </ScrollView>
      )}

      <RuleModal
        visible={showRuleModal}
        onClose={() => { setShowRuleModal(false); setSelected(null); }}
        onConfirm={onConfirmRule}
        defaultAnchors={['morning']}
        defaultDose="Selon recommandations"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  header: { alignItems: 'center', padding: 24, paddingTop: 56, backgroundColor: '#FFFFFF' },
  title: { fontSize: 26, fontWeight: '800', color: '#0F172A', marginTop: 4, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#6B7280', marginTop: 8, textAlign: 'center', lineHeight: 22, maxWidth: 560 },

  navButtons: { flexDirection: 'row', gap: 12, marginTop: 14 },
  greyBtn: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB', borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  greyBtnText: { color: '#111827', fontWeight: '700' },
  greenBtn: { backgroundColor: '#22C55E', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  greenBtnText: { color: '#FFFFFF', fontWeight: '800', marginLeft: 8 },

  content: { flex: 1 },

  loadingContainer: { alignItems: 'center', paddingVertical: 24 },
  loadingText: { fontSize: 16, color: '#6B7280', marginTop: 8 },

  tip: { backgroundColor: '#EEF2FF', borderLeftWidth: 4, borderLeftColor: '#2563EB', marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 8 },
  tipText: { color: '#1D4ED8', fontWeight: '600' },

  card: { backgroundColor: '#FFFFFF', margin: 16, padding: 20, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardName: { fontSize: 18, fontWeight: '800', color: '#0F172A' },

  evidenceBadge: { marginTop: 8, alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  evidenceText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  infoLine: { marginTop: 6, color: '#374151', fontSize: 14 },
  infoLabel: { fontWeight: '700', color: '#111827' },

  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12, alignItems: 'stretch' },
  detailsBtn: { flex: 1, height: 52, borderRadius: 12, borderWidth: 1, borderColor: '#2563EB', backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  detailsBtnText: { marginLeft: 6, color: '#2563EB', fontSize: 15, fontWeight: '700' },
  addBtn: { flex: 1, height: 52, borderRadius: 12, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  addBtnText: { marginLeft: 6, color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  favBtn: { flex: 1, height: 52, borderRadius: 12, borderWidth: 1, borderColor: '#EF4444', backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  favBtnActive: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  favBtnText: { marginLeft: 6, color: '#EF4444', fontSize: 15, fontWeight: '700' },
  favBtnTextActive: { color: '#FFFFFF' },
});
