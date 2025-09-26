// /home/project/app/(tabs)/library.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, Image,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { listObjectiveGroups, type ObjectiveGroup, type Supplement } from '@/lib/queries';
import ProductSuggestionModal from '@/components/ProductSuggestionModal';
import { Search, Filter, X, ArrowLeft, Star, FileText, Heart, Award, Euro } from 'lucide-react-native';
import { useFiches } from '@/hooks/useFiches';
import {
  enrichSupplementForDisplay,
  evidenceColors,
  evidenceLabels,
} from '@/lib/supplementDisplayUtils';

type SupplementRow = Supplement & {
  objective_groups?: string[];
  has_vegan_tag?: boolean;
};

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
  if ('supplement_id' in sample) return 'supplement_id';
  return 'supplement_id';
}

export default function LibraryScreen() {
  const [supplements, setSupplements] = useState<SupplementRow[]>([]);
  const [filteredSupplements, setFilteredSupplements] = useState<SupplementRow[]>([]);
  const [objectiveGroups, setObjectiveGroups] = useState<ObjectiveGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [openSuggestion, setOpenSuggestion] = useState(false);
  const [filters, setFilters] = useState({
    objectiveGroups: [] as string[],
    vegan: false, minScore: 0, maxPrice: 1000, qualityLevel: '',
    sortBy: 'score_global', sortOrder: 'desc' as 'asc' | 'desc',
  });

  // Fiches MD pour enrichissement
  const { data: ficheMap } = useFiches();

  // Favoris
  const [favCol, setFavCol] = useState<FavCol>('supplement_id');
  const favColRef = useRef<FavCol>('supplement_id');
  const [favReady, setFavReady] = useState(false);
  const [favoriteKeys, setFavoriteKeys] = useState<Set<string>>(new Set()); // id OU slug

  useEffect(() => {
    loadSupplements();
    loadObjectiveGroups();
    (async () => {
      const col = await detectFavoritesColumn();
      favColRef.current = col;
      setFavCol(col);
      setFavReady(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from('user_favorites').select(col).eq('user_id', user.id);
      if (!error) setFavoriteKeys(new Set((data || []).map((r: any) => String(r[col]))));
    })();
  }, []);

  useEffect(() => { filterAndSortSupplements(); }, [supplements, searchQuery, filters]);

  const loadSupplements = async () => {
    try {
      setLoading(true); setError(null);

      // on récupère aussi "scores" pour harmoniser avec Recos
      const { data: supplementsData, error: fetchError } = await supabase
        .from('supplement')
        .select('id, slug, name, category, score_global, price_eur_month, research_count, quality_level, scores, is_active')
        .eq('is_active', true)
        .order('score_global', { ascending: false, nullsLast: true });

      if (fetchError) throw fetchError;

      // Tags (JOIN EXPLICITE pour corriger l’ambiguïté 300)
      const withTags = await Promise.all(
        (supplementsData || []).map(async (s) => {
          try {
            const { data: tags, error: tErr } = await supabase
              .from('supplement_objective_tag')
              // 👇 préciser la relation FK voulue
              .select(`tag_slug, objective_tag:objective_tag!fk_sot_objective_tag(slug,label,group_slug)`)
              .eq('supplement_id', s.id);
            if (tErr) throw tErr;

            const objective_groups = Array.from(new Set(
              (tags || []).map(t => t.objective_tag?.group_slug).filter(Boolean) as string[]
            ));

            const has_vegan_tag = (tags || []).some((t: any) => {
              const slug = (t.tag_slug || '').toLowerCase();
              const label = (t.objective_tag?.label || '').toLowerCase();
              return slug.includes('vegan') || slug.includes('vegetar') || slug.includes('vegetal')
                  || label.includes('vegan') || label.includes('végétar') || label.includes('végétal');
            });

            return { ...(s as any), objective_groups, has_vegan_tag } as SupplementRow;
          } catch {
            return { ...(s as any), objective_groups: [], has_vegan_tag: false } as SupplementRow;
          }
        })
      );

      // dédoublonnage défensif
      const seen = new Set<string>();
      const unique: SupplementRow[] = [];
      for (const it of withTags) {
        const key = String(it.id) + '::' + it.slug;
        if (!seen.has(key)) { seen.add(key); unique.push(it); }
      }

      setSupplements(unique);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des compléments');
    } finally { setLoading(false); }
  };

  const loadObjectiveGroups = async () => {
    try { setObjectiveGroups(await listObjectiveGroups()); } catch {}
  };

  const filterAndSortSupplements = () => {
    let filtered = [...supplements];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/œ/g, 'oe').replace(/æ/g, 'ae');
      filtered = filtered.filter((s) =>
        s.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/œ/g, 'oe').replace(/æ/g, 'ae').includes(q) ||
        (s.category || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/œ/g, 'oe').replace(/æ/g, 'ae').includes(q)
      );
    }

    if (filters.objectiveGroups.length) {
      filtered = filtered.filter(s =>
        s.objective_groups && filters.objectiveGroups.every(g => s.objective_groups!.includes(g))
      );
    }
    if (filters.vegan) filtered = filtered.filter(s => s.has_vegan_tag);
    if (filters.minScore > 0) filtered = filtered.filter(s => (s.score_global ?? 0) >= filters.minScore);
    if (filters.maxPrice < 1000) filtered = filtered.filter(s => (s.price_eur_month ?? 0) <= filters.maxPrice);
    if (filters.qualityLevel && filters.qualityLevel !== 'Tous') filtered = filtered.filter(s => s.quality_level === filters.qualityLevel);

    filtered.sort((a, b) => {
      const by = filters.sortBy;
      const order = filters.sortOrder === 'asc' ? 1 : -1;
      const av = (by === 'name') ? a.name : (a as any)[by] || 0;
      const bv = (by === 'name') ? b.name : (b as any)[by] || 0;
      if (typeof av === 'string' && typeof bv === 'string') return order * av.localeCompare(bv);
      return order * ((av as number) - (bv as number));
    });

    setFilteredSupplements(filtered);
  };

  const handleSupplementPress = (s: SupplementRow) =>
    router.push({ pathname: '/supplement-detail', params: { slug: s.slug } });

  const handleViewFiche = (s: SupplementRow) =>
    router.push({ pathname: '/fiche-produit', params: { slug: s.slug } });

  const resetFilters = () => {
    setFilters({ objectiveGroups: [], vegan: false, minScore: 0, maxPrice: 1000, qualityLevel: '', sortBy: 'score_global', sortOrder: 'desc' });
    setSearchQuery('');
  };

  const qualityLevels = useMemo(
    () => ['Tous', ...Array.from(new Set(supplements.map(s => s.quality_level).filter(Boolean)) as any)],
    [supplements]
  );

  // ---------- Favoris ----------
  const isIdCol = favCol === 'supplement_id' || favCol === 'supplement';
  const isFav = (s: SupplementRow) => favoriteKeys.has(String(isIdCol ? s.id : s.slug));

  const ensureFavCol = async () => {
    if (favReady) return favColRef.current;
    const col = await detectFavoritesColumn();
    favColRef.current = col;
    setFavCol(col);
    setFavReady(true);
    return col;
  };

  const toggleFavorite = async (s: SupplementRow) => {
    const col = await ensureFavCol();
    const idBased = col === 'supplement_id' || col === 'supplement';

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Alert.alert('Connexion requise', 'Connectez-vous pour gérer vos favoris.');

    const key = idBased ? s.id : s.slug;
    const next = new Set(favoriteKeys);
    const wasFav = next.has(String(key));

    // Optimiste
    if (wasFav) next.delete(String(key)); else next.add(String(key));
    setFavoriteKeys(next);

    try {
      if (wasFav) {
        const { error } = await supabase.from('user_favorites').delete().eq('user_id', user.id).eq(col, key);
        if (error) throw error;
      } else {
        const exist = await supabase.from('user_favorites').select('id').eq('user_id', user.id).eq(col, key).maybeSingle();
        if (!exist.data) {
          const ins = await supabase.from('user_favorites').insert({ user_id: user.id, [col]: key });
          if (ins.error) throw ins.error;
        }
      }
    } catch (e: any) {
      // rollback
      const rb = new Set(next);
      if (wasFav) rb.add(String(key)); else rb.delete(String(key));
      setFavoriteKeys(rb);
      Alert.alert('Erreur', e.message || 'Impossible de mettre à jour le favori.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Image source={require('../../assets/images/Logo_Bolt.png')} style={styles.loadingLogo} resizeMode="contain" />
        <Text style={styles.loadingText}>Chargement des compléments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#6B7280" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Image source={require('../../assets/images/Logo_Bolt.png')} style={styles.headerLogo} resizeMode="contain" />
          <Text style={styles.title}>Rechercher un complément</Text>
          <Text style={styles.subtitle}>
            {filteredSupplements.length} complément{filteredSupplements.length > 1 ? 's' : ''} disponible{filteredSupplements.length > 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par nom ou catégorie..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(true)}>
          <Filter size={20} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Erreur : {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadSupplements}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredSupplements.map((s) => {
          // enrichissement harmonisé
          const { dosage, timing, costPerDay, evidence } = enrichSupplementForDisplay(s, ficheMap);
          const fav = isFav(s);

          return (
            <TouchableOpacity key={`${s.id}`} style={styles.supplementCard} onPress={() => handleSupplementPress(s)}>
              <View style={styles.supplementHeader}>
                <View style={styles.supplementInfo}>
                  <Text style={styles.supplementName}>{s.name}</Text>
                  <Text style={styles.supplementCategory}>{s.category || 'Non catégorisé'}</Text>
                </View>

                <View style={styles.supplementMeta}>
                  {s.score_global != null && (
                    <View style={styles.scoreContainer}>
                      <Star size={16} color="#F59E0B" fill="#F59E0B" />
                      <Text style={styles.scoreText}>{Number(s.score_global).toFixed(1)}/20</Text>
                    </View>
                  )}
                  {s.research_count != null && (
                    <Text style={styles.researchCount}>
                      {s.research_count} étude{s.research_count && s.research_count > 1 ? 's' : ''}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.derivedRow}>
                <View style={styles.evidenceBadge}>
                  <Award size={12} color="#fff" />
                  <Text style={styles.evidenceText}>{evidenceLabels[evidence]}</Text>
                </View>
                <View style={styles.derivedItem}>
                  <Text style={styles.derivedLabel}>Dosage</Text>
                  <Text style={styles.derivedValue}>{dosage}</Text>
                </View>
                <View style={styles.derivedItem}>
                  <Text style={styles.derivedLabel}>Timing</Text>
                  <Text style={styles.derivedValue}>{timing}</Text>
                </View>
                <View style={styles.derivedItemRow}>
                  <Euro size={12} color="#6B7280" />
                  <Text style={[styles.derivedValue, { marginLeft: 4 }]}>
                    {(costPerDay || 0).toFixed(2)}€/jour
                  </Text>
                </View>
              </View>

              {s.scores && Object.keys(s.scores).length > 0 && (
                <View style={styles.scoresContainer}>
                  {Object.entries(s.scores).map(([k, v]) => (
                    <View key={k} style={styles.scoreTag}>
                      <Text style={styles.scoreTagText}>{k}: {v as any}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.supplementActions}>
                <TouchableOpacity style={styles.ficheButton} onPress={() => handleViewFiche(s)}>
                  <FileText size={16} color="#2563EB" />
                  <Text style={styles.ficheButtonText}>Voir la fiche</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={!favReady}
                  style={[styles.favButton, (fav && favReady) && styles.favButtonActive, !favReady && { opacity: 0.5 }]}
                  onPress={() => toggleFavorite(s)}>
                  <Heart size={16} color={fav ? '#FFFFFF' : '#EF4444'} fill={fav ? '#FFFFFF' : 'none'} />
                  <Text style={[styles.favButtonText, fav && styles.favButtonTextActive]} numberOfLines={2}>
                    {fav ? 'Favori' : 'Ajouter aux favoris'}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}

        {filteredSupplements.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Image source={require('../../assets/images/Logo_Bolt.png')} style={styles.emptyLogo} resizeMode="contain" />
            <Text style={styles.emptyTitle}>Aucun complément trouvé</Text>
            <Text style={styles.emptySubtitle}>Essayez de modifier vos critères de recherche</Text>
            <TouchableOpacity style={styles.resetFiltersButton} onPress={resetFilters}>
              <Text style={styles.resetFiltersText}>Réinitialiser les filtres</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.suggestButton} onPress={() => setOpenSuggestion(true)}>
              <Text style={styles.suggestButtonText}>Suggérer un produit</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ---- Modal Filtres & tri ---- */}
      <Modal visible={showFilters} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtres et tri</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}><X size={24} color="#6B7280" /></TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Catégories d'objectifs (sélection multiple)</Text>
              <Text style={styles.filterNote}>Les produits doivent correspondre à TOUTES les catégories sélectionnées</Text>
              <View style={styles.objectivesGrid}>
                {objectiveGroups.map((group) => {
                  const isSelected = filters.objectiveGroups.includes(group.slug);
                  return (
                    <TouchableOpacity
                      key={group.slug}
                      style={[styles.objectiveButton, isSelected && styles.objectiveButtonActive]}
                      onPress={() => {
                        const newGroups = isSelected
                          ? filters.objectiveGroups.filter(obj => obj !== group.slug)
                          : [...filters.objectiveGroups, group.slug];
                        setFilters({ ...filters, objectiveGroups: newGroups });
                      }}>
                      {group.emoji && (<Text style={styles.objectiveEmoji}>{group.emoji}</Text>)}
                      <Text style={[styles.objectiveButtonText, isSelected && styles.objectiveButtonTextActive]}>
                        {group.label}
                      </Text>
                      <Text style={[styles.objectiveCount, isSelected && styles.objectiveCountActive]}>
                        {group.supplements_count}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Contraintes alimentaires</Text>
              <TouchableOpacity
                style={[styles.veganButton, filters.vegan && styles.veganButtonActive]}
                onPress={() => setFilters({ ...filters, vegan: !filters.vegan })}>
                <Text style={styles.veganEmoji}>🌱</Text>
                <Text style={[styles.veganButtonText, filters.vegan && styles.veganButtonTextActive]}>
                  Vegan uniquement
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Score minimum</Text>
              <Text style={styles.sliderLabel}>{filters.minScore}/20</Text>
              <View style={styles.scoreButtons}>
                {[0, 5, 10, 15].map((score) => (
                  <TouchableOpacity
                    key={score}
                    style={[styles.scoreButton, filters.minScore === score && styles.scoreButtonActive]}
                    onPress={() => setFilters({ ...filters, minScore: score })}>
                    <Text style={[styles.scoreButtonText, filters.minScore === score && styles.scoreButtonTextActive]}>
                      {score}+
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Prix maximum par mois</Text>
              <Text style={styles.sliderLabel}>{filters.maxPrice}€</Text>
              <View style={styles.priceButtons}>
                {[50, 100, 200, 500, 1000].map((price) => (
                  <TouchableOpacity
                    key={price}
                    style={[styles.priceButton, filters.maxPrice === price && styles.priceButtonActive]}
                    onPress={() => setFilters({ ...filters, maxPrice: price })}>
                    <Text style={[styles.priceButtonText, filters.maxPrice === price && styles.priceButtonTextActive]}>
                      {price === 1000 ? 'Tous' : `${price}€`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Niveau de qualité</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.qualityScroll}>
                {['Tous', ...Array.from(new Set(supplements.map(s => s.quality_level).filter(Boolean)) as any)].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.qualityButton,
                      (filters.qualityLevel === level || (level === 'Tous' && !filters.qualityLevel)) && styles.qualityButtonActive,
                    ]}
                    onPress={() => setFilters({ ...filters, qualityLevel: level === 'Tous' ? '' : level })}>
                    <Text
                      style={[
                        styles.qualityButtonText,
                        (filters.qualityLevel === level || (level === 'Tous' && !filters.qualityLevel)) && styles.qualityButtonTextActive,
                      ]}>
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Trier par</Text>
              <View style={styles.sortOptions}>
                {[
                  { value: 'score_global', label: 'Score global' },
                  { value: 'name', label: 'Nom alphabétique' },
                  { value: 'price_eur_month', label: 'Prix' },
                  { value: 'research_count', label: 'Nombre d\'études' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.sortOption, filters.sortBy === option.value && styles.sortOptionActive]}
                    onPress={() => setFilters({ ...filters, sortBy: option.value })}>
                    <Text style={[styles.sortOptionText, filters.sortBy === option.value && styles.sortOptionTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.sortOrderContainer}>
                <TouchableOpacity
                  style={[styles.sortOrderButton, filters.sortOrder === 'desc' && styles.sortOrderButtonActive]}
                  onPress={() => setFilters({ ...filters, sortOrder: 'desc' })}>
                  <Text style={[styles.sortOrderText, filters.sortOrder === 'desc' && styles.sortOrderTextActive]}>
                    Décroissant
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sortOrderButton, filters.sortOrder === 'asc' && styles.sortOrderButtonActive]}
                  onPress={() => setFilters({ ...filters, sortOrder: 'asc' })}>
                  <Text style={[styles.sortOrderText, filters.sortOrder === 'asc' && styles.sortOrderTextActive]}>
                    Croissant
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.filterActions}>
              <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                <Text style={styles.resetButtonText}>Réinitialiser</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={() => setShowFilters(false)}>
                <Text style={styles.applyButtonText}>Appliquer</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      </Modal>

      <ProductSuggestionModal visible={openSuggestion} onClose={() => setOpenSuggestion(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingLogo: { width: 120, height: 36, marginBottom: 12 },
  loadingText: { fontSize: 16, color: '#6B7280', marginTop: 12 },

  header: { position: 'relative', alignItems: 'center', paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20, backgroundColor: '#FFFFFF' },
  backButton: { position: 'absolute', top: 60, left: 24, zIndex: 1, padding: 8 },
  headerCenter: { alignItems: 'center', width: '100%' },
  headerLogo: { width: 270, height: 81, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
  subtitle: { fontSize: 16, color: '#6B7280', marginTop: 8 },

  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    marginHorizontal: 16, marginVertical: 16, paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 16, marginLeft: 12, color: '#1F2937' },
  filterButton: { padding: 8, marginLeft: 8 },

  errorContainer: { backgroundColor: '#FEF2F2', marginHorizontal: 16, padding: 16, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#EF4444', marginBottom: 16 },
  errorText: { fontSize: 14, color: '#DC2626', marginBottom: 8 },
  retryButton: { alignSelf: 'flex-start', backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  retryButtonText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },

  content: { flex: 1 },

  supplementCard: { backgroundColor: '#FFFFFF', marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  supplementHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  supplementInfo: { flex: 1 },
  supplementName: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  supplementCategory: { fontSize: 14, color: '#6B7280' },
  supplementMeta: { alignItems: 'flex-end' },
  scoreContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  scoreText: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginLeft: 4 },
  researchCount: { fontSize: 12, color: '#6B7280' },

  derivedRow: { marginBottom: 10, gap: 8 },
  evidenceBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: evidenceColors.A },
  evidenceText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  derivedItem: { backgroundColor: '#F9FAFB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  derivedItemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignSelf: 'flex-start' },
  derivedLabel: { fontSize: 12, color: '#6B7280' },
  derivedValue: { fontSize: 13, fontWeight: '700', color: '#111827', marginTop: 2 },

  scoresContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  scoreTag: { backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  scoreTagText: { fontSize: 12, fontWeight: '600', color: '#2563EB' },

  supplementActions: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  ficheButton: {
    flex: 1, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#2563EB', paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#EFF6FF',
  },
  ficheButtonText: { fontSize: 14, fontWeight: '600', color: '#2563EB', marginLeft: 6, textAlign: 'center' },

  favButton: {
    flex: 1, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#EF4444', backgroundColor: '#FEE2E2',
    paddingHorizontal: 12, borderRadius: 12,
  },
  favButtonActive: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  favButtonText: { fontSize: 14, fontWeight: '700', color: '#EF4444', marginLeft: 6, textAlign: 'center' },
  favButtonTextActive: { color: '#FFFFFF' },

  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyLogo: { width: 80, height: 24, marginBottom: 16, opacity: 0.5 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 16 },
  resetFiltersButton: { backgroundColor: '#2563EB', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  resetFiltersText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  suggestButton: { backgroundColor: '#22C55E', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, marginTop: 12 },
  suggestButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },

  footer: { height: 100 },
  modalContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
  modalContent: { flex: 1, padding: 20 },

  filterSection: { marginBottom: 24 },
  filterSectionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12 },
  filterNote: { fontSize: 12, color: '#6B7280', fontStyle: 'italic', marginBottom: 8 },

  objectivesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  objectiveButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  objectiveButtonActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  objectiveEmoji: { fontSize: 14, marginRight: 6 },
  objectiveButtonText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  objectiveButtonTextActive: { color: '#FFFFFF' },
  objectiveCount: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', backgroundColor: '#E5E7EB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginLeft: 6, minWidth: 20, textAlign: 'center' },
  objectiveCountActive: { color: '#2563EB', backgroundColor: '#FFFFFF' },

  sliderLabel: { fontSize: 14, fontWeight: '600', color: '#2563EB', textAlign: 'center', marginBottom: 8 },
  scoreButtons: { flexDirection: 'row', gap: 8 },
  scoreButton: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', alignItems: 'center' },
  scoreButtonActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  scoreButtonText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  scoreButtonTextActive: { color: '#FFFFFF' },

  priceButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  priceButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  priceButtonActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  priceButtonText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  priceButtonTextActive: { color: '#FFFFFF' },

  qualityScroll: { marginBottom: 8 },
  qualityButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', marginRight: 8 },
  qualityButtonActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  qualityButtonText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  qualityButtonTextActive: { color: '#FFFFFF' },

  sortOptions: { gap: 8, marginBottom: 12 },
  sortOption: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  sortOptionActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  sortOptionText: { fontSize: 14, fontWeight: '600', color: '#6B7280', textAlign: 'center' },
  sortOptionTextActive: { color: '#FFFFFF' },

  sortOrderContainer: { flexDirection: 'row', gap: 8 },
  sortOrderButton: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', alignItems: 'center' },
  sortOrderButtonActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  sortOrderText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  sortOrderTextActive: { color: '#FFFFFF' },

  filterActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  resetButton: { flex: 1, alignItems: 'center', paddingVertical: 12, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, backgroundColor: '#F9FAFB' },
  resetButtonText: { fontSize: 16, fontWeight: '600', color: '#6B7280' },
  applyButton: { flex: 1, alignItems: 'center', paddingVertical: 12, backgroundColor: '#2563EB', borderRadius: 8 },
  applyButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
