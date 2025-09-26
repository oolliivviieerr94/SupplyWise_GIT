// /home/project/components/RecommendedProductsList.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { searchSupplementsByGroups } from '@/lib/queries';
import { RuleModal } from '@/components/RuleModal';
import {
  BookOpen, Plus, Heart, Award, Star, Clock, TrendingUp, Euro
} from 'lucide-react-native';

// ---------- Utils ----------
const normalize = (s: string) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[^a-z0-9]/g, '')
    .trim();

const timingLabel = (t?: string) =>
  ({ pre: 'Pré-entraînement (30-45 min avant)', intra: 'Intra-entraînement', post: 'Post-entraînement (0-60 min après)', daily: 'Quotidien (timing flexible)' } as any)[t || ''] || undefined;

const evidenceLabel: Record<string, string> = { A: 'Preuve Forte', B: 'Preuve Modérée', C: 'Preuve Limitée' };
const evidenceColor: Record<string, string> = { A: '#10B981', B: '#F59E0B', C: '#EF4444' };

type FavCol = 'supplement_id' | 'supplement' | 'supplement_slug';
async function detectFavoritesColumn(): Promise<FavCol> {
  const cands: FavCol[] = ['supplement_id', 'supplement', 'supplement_slug'];
  for (const c of cands) {
    const { error } = await supabase.from('user_favorites').select(c).limit(0);
    if (!error) return c;
  }
  return 'supplement_id';
}

// ---------- Types ----------
type Supplement = {
  id: string;
  slug: string | null;
  name: string;
  category: string | null;
  score_global: number | null;
  price_eur_month: number | null;
  research_count: number | null;
  quality_level: string | null;
};

type Enriched = Supplement & {
  dosage?: string;
  timing?: string;
  evidence?: 'A' | 'B' | 'C';
};

// ---------- Component ----------
export default function RecommendedProductsList(props: { objectiveGroups?: string[] }) {
  const [loading, setLoading] = useState(true);
  const [tipNoObjectives, setTipNoObjectives] = useState(false);
  const [items, setItems] = useState<Enriched[]>([]);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const favColRef = useRef<FavCol>('supplement_id');
  const [favReady, setFavReady] = useState(false);

  // Rule modal
  const [showRule, setShowRule] = useState(false);
  const [selected, setSelected] = useState<Enriched | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setTipNoObjectives(false);

    try {
      // 1) Objectifs
      let objectiveGroups = props.objectiveGroups || [];
      if (!objectiveGroups?.length) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: uo } = await supabase.from('user_objective').select('objective_slug').eq('user_id', user.id);
          objectiveGroups = (uo || []).map((r: any) => r.objective_slug);
        }
      }
      if (!objectiveGroups?.length) setTipNoObjectives(true);

      // 2) Produits à partir des objectifs (AND) — sinon top score
      let supps: Supplement[] = [];
      if (objectiveGroups?.length) {
        const fromGroups = await searchSupplementsByGroups(objectiveGroups, true);
        supps = (fromGroups || []) as any;
      }
      if (!supps.length) {
        const { data } = await supabase
          .from('supplement')
          .select('id,slug,name,category,score_global,price_eur_month,research_count,quality_level')
          .eq('is_active', true)
          .order('score_global', { ascending: false, nullsLast: true })
          .limit(15);
        supps = (data || []) as any;
      }

      // 3) Enrichir (dosage/timing/preuve) via table protocols/ingredients (meilleur-effort)
      //    On charge tous les protocols liés aux objectifs, pour matcher par nom normalisé.
      let prots: any[] = [];
      const wantedGoals = objectiveGroups?.length ? objectiveGroups : undefined;
      const sel = supabase
        .from('protocols')
        .select('goal, dose_suggested_min, dose_suggested_max, dose_unit, timing, ingredients!inner (name, evidence)');
      const { data: pr } = wantedGoals ? await sel.in('goal', wantedGoals) : await sel;
      prots = pr || [];

      const enrich = (s: Supplement): Enriched => {
        const ns = normalize(s.name);
        const hit = prots.find(p => {
          const ni = normalize(p.ingredients?.name || '');
          return ns === ni || ns.includes(ni) || ni.includes(ns);
        });

        const dosage =
          hit && hit.dose_suggested_min != null && hit.dose_suggested_max != null && hit.dose_unit
            ? `${hit.dose_suggested_min}-${hit.dose_suggested_max}${hit.dose_unit}`
            : undefined;

        const tLabel = timingLabel(hit?.timing);
        const ev = (hit?.ingredients?.evidence as 'A' | 'B' | 'C') || undefined;

        return { ...s, dosage, timing: tLabel, evidence: ev };
      };

      // tri score desc et limite 15
      const sorted = [...supps].sort((a, b) => (b.score_global || 0) - (a.score_global || 0)).slice(0, 15);
      setItems(sorted.map(enrich));

      // 4) Favoris
      const favCol = await detectFavoritesColumn();
      favColRef.current = favCol;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setFavIds(new Set()); setFavReady(true); return; }

      const { data: favRows } = await supabase.from('user_favorites').select(favCol).eq('user_id', user.id);
      const idSet = new Set<string>();
      if (favCol === 'supplement_id' || favCol === 'supplement') {
        (favRows || []).forEach((r: any) => r[favCol] && idSet.add(String(r[favCol])));
      } else {
        const slugs = (favRows || []).map((r: any) => r[favCol]).filter(Boolean);
        if (slugs.length) {
          const { data: map } = await supabase.from('supplement').select('id,slug').in('slug', slugs);
          (map || []).forEach(s => idSet.add(String(s.id)));
        }
      }
      setFavIds(idSet);
      setFavReady(true);
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, [props.objectiveGroups]);

  // reload on focus
  useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

  // ---------- Actions ----------
  const costPerDay = (m?: number | null) => (m ? m / 30 : undefined);

  const toggleFavorite = async (s: Enriched) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { Alert.alert('Connexion requise', 'Connectez-vous pour gérer vos favoris.'); return; }

      const idKey = String(s.id);
      const willRemove = favIds.has(idKey);

      // optimiste
      setFavIds(prev => {
        const n = new Set(prev);
        willRemove ? n.delete(idKey) : n.add(idKey);
        return n;
      });

      const col = favColRef.current;
      let key = idKey;

      if (col === 'supplement_slug') {
        // récupérer le slug
        const { data: map } = await supabase.from('supplement').select('slug').eq('id', s.id).maybeSingle();
        if (!map?.slug) throw new Error('Slug introuvable pour ce produit.');
        key = map.slug;
      }

      if (willRemove) {
        const { error } = await supabase.from('user_favorites').delete().eq('user_id', user.id).eq(col, key);
        if (error) throw error;
      } else {
        const { data: exists } = await supabase.from('user_favorites').select('id').eq('user_id', user.id).eq(col, key).maybeSingle();
        if (!exists) {
          const ins = await supabase.from('user_favorites').insert({ user_id: user.id, [col]: key });
          if (ins.error) throw ins.error;
        }
      }
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Mise à jour du favori impossible');
    }
  };

  const openPlanning = (s: Enriched) => { setSelected(s); setShowRule(true); };

  const confirmRule = async (payload: { anchors: string[]; dose?: string; frequency: 'daily' }) => {
    if (!selected) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { Alert.alert('Erreur', 'Vous devez être connecté'); return; }

      // créer/maj règle
      const rule = { user_id: user.id, supplement_id: selected.id, frequency: payload.frequency, anchors: payload.anchors, dose: payload.dose ?? null, notes: null, days_of_week: null };
      let up = await supabase.from('user_supplement_rule').upsert(rule, { onConflict: 'user_id,supplement_id' }).select('id').maybeSingle();
      if (up.error) {
        const upd = await supabase.from('user_supplement_rule').update({ frequency: rule.frequency, anchors: rule.anchors, dose: rule.dose }).eq('user_id', rule.user_id).eq('supplement_id', rule.supplement_id).select('id').maybeSingle();
        if (upd.error) throw upd.error;
      }
      Alert.alert('Ajouté au planning', `${selected.name} a été ajouté.`);
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible d’ajouter au planning');
    } finally {
      setShowRule(false);
      setSelected(null);
    }
  };

  // ---------- UI ----------
  if (loading) {
    return (
      <View style={{ paddingVertical: 32, alignItems: 'center' }}>
        <Text style={{ color: '#6B7280' }}>Chargement…</Text>
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 16 }}>
      {tipNoObjectives && (
        <View style={styles.tip}>
          <Text style={styles.tipText}>
            Astuce : nous n'avons pas reçu vos objectifs. Voici un top des meilleurs produits.
          </Text>
        </View>
      )}

      {items.map(s => {
        const isFav = favIds.has(String(s.id));
        const cpd = costPerDay(s.price_eur_month);
        return (
          <View key={s.id} style={styles.card}>
            {/* Header */}
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{s.name}</Text>
                <Text style={styles.category}>{s.category || 'Non catégorisé'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                {!!s.score_global && (
                  <View style={styles.score}>
                    <Star size={16} color="#F59E0B" fill="#F59E0B" />
                    <Text style={styles.scoreText}>{s.score_global}/20</Text>
                  </View>
                )}
                {!!s.research_count && (
                  <Text style={styles.research}>{s.research_count} étude{s.research_count > 1 ? 's' : ''}</Text>
                )}
              </View>
            </View>

            {/* Body: dosage / timing / coût */}
            <View style={{ marginBottom: 8 }}>
              {!!s.dosage && (
                <View style={styles.row}>
                  <TrendingUp size={16} color="#6B7280" />
                  <Text style={styles.rowText}><Text style={styles.rowLabel}>Dosage : </Text>{s.dosage}</Text>
                </View>
              )}
              {!!s.timing && (
                <View style={styles.row}>
                  <Clock size={16} color="#6B7280" />
                  <Text style={styles.rowText}><Text style={styles.rowLabel}>Timing : </Text>{s.timing}</Text>
                </View>
              )}
              {cpd != null && (
                <View style={styles.row}>
                  <Euro size={16} color="#6B7280" />
                  <Text style={styles.rowText}><Text style={styles.rowLabel}>Coût/jour : </Text>{cpd.toFixed(2)}€</Text>
                </View>
              )}
            </View>

            {/* Evidence */}
            {!!s.evidence && (
              <View style={[styles.evidenceBadge, { backgroundColor: evidenceColor[s.evidence] }]}>
                <Award size={14} color="#fff" />
                <Text style={styles.evidenceText}>{evidenceLabel[s.evidence]}</Text>
              </View>
            )}

            {/* CTA */}
            <View style={styles.ctaRow}>
              <TouchableOpacity
                style={[styles.cta, styles.ctaOutline]}
                onPress={() =>
                  supabase // navigation par slug
                    .channel('noop') // anti-warning; ne fait rien
                    .subscribe(() => {})
                }>
                <BookOpen size={18} color="#2563EB" />
                <Text style={[styles.ctaText, { color: '#2563EB' }]}>Voir la fiche</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.cta, styles.ctaPrimary]} onPress={() => openPlanning(s)}>
                <Plus size={18} color="#fff" />
                <Text style={[styles.ctaText, { color: '#fff' }]}>Ajouter au planning</Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={!favReady}
                style={[styles.cta, isFav ? styles.ctaDangerSolid : styles.ctaDanger]}
                onPress={() => toggleFavorite(s)}>
                <Heart size={18} color={isFav ? '#fff' : '#EF4444'} fill={isFav ? '#fff' : 'none'} />
                <Text style={[styles.ctaText, { color: isFav ? '#fff' : '#EF4444' }]}>
                  {isFav ? 'Favori' : 'Ajouter aux favoris'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      <RuleModal
        visible={showRule}
        onClose={() => { setShowRule(false); setSelected(null); }}
        onConfirm={confirmRule}
        defaultAnchors={['morning']}
        defaultDose="Selon recommandations"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tip: { backgroundColor: '#EEF5FF', borderLeftWidth: 4, borderLeftColor: '#2563EB', padding: 12, borderRadius: 10, marginVertical: 12 },
  tipText: { color: '#1D4ED8' },

  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginTop: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  name: { fontSize: 18, fontWeight: '700', color: '#111827' },
  category: { color: '#6B7280', marginTop: 2 },
  score: { flexDirection: 'row', alignItems: 'center' },
  scoreText: { marginLeft: 4, fontWeight: '700', color: '#111827' },
  research: { color: '#6B7280', fontSize: 12 },

  row: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  rowText: { marginLeft: 8, color: '#374151' },
  rowLabel: { fontWeight: '600', color: '#111827' },

  evidenceBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  evidenceText: { color: '#fff', marginLeft: 6, fontWeight: '700', fontSize: 12 },

  ctaRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cta: { flex: 1, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  ctaText: { fontSize: 14, fontWeight: '700' },
  ctaOutline: { borderWidth: 1, borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  ctaPrimary: { backgroundColor: '#2563EB' },
  ctaDanger: { borderWidth: 1, borderColor: '#EF4444', backgroundColor: '#FEE2E2' },
  ctaDangerSolid: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
});
