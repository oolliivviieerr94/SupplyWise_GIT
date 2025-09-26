import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { supabase } from '@/lib/supabase';
import { listObjectiveGroups, type ObjectiveGroup } from '@/lib/queries';
import { CircleCheck as CheckCircle } from 'lucide-react-native';

const DIETS = [
  { label: 'Omnivore', value: 'omnivore' },
  { label: 'Végétarien', value: 'vegetarian' },
  { label: 'Végan', value: 'vegan' },
  { label: 'Keto', value: 'keto' },
  { label: 'Paléo', value: 'paleo' },
  { label: 'Halal', value: 'halal' },
  { label: 'Casher', value: 'kosher' },
  { label: 'Autre', value: 'other' },
];

const CONSTRAINTS = ['Sans lactose','Sans gluten','Sans noix','Sans soja','Low-FODMAP','Sans caféine'];

interface StepCProps {
  profile: any;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  onObjectivesChange?: (slugs: string[]) => void;
}

/* ---------- Utils robustes ---------- */
async function tableExists(name: string): Promise<boolean> {
  try {
    const { error } = await supabase.from(name).select('*', { head: true, count: 'exact' }).limit(0);
    return !error;
  } catch { return false; }
}

/** Lit les slugs de groupes préférés de l’utilisateur.
 *  Ordre: user_profiles.objective_groups -> user_objective_group.group_slug -> user_objective.objective_slug (déjà des groupes dans ton schéma).
 *  Filtre ensuite par les groupes existants (objective_group).
 */
async function readUserGroupSlugs(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // a) profil
  try {
    const { data: prof } = await supabase
      .from('user_profiles')
      .select('objective_groups')
      .eq('user_id', user.id)
      .maybeSingle();
    const list = Array.isArray(prof?.objective_groups)
      ? (prof!.objective_groups as string[]).map(String).filter(Boolean)
      : [];
    if (list.length) return list;
  } catch {}

  // b) table dédiée
  if (await tableExists('user_objective_group')) {
    try {
      const { data } = await supabase
        .from('user_objective_group')
        .select('group_slug')
        .eq('user_id', user.id);
      const list = (data || []).map((r: any) => String(r.group_slug)).filter(Boolean);
      if (list.length) return list;
    } catch {}
  }

  // c) historique: user_objective.objective_slug (dans ton schéma cela référence objective_group.slug)
  try {
    const { data } = await supabase
      .from('user_objective')
      .select('objective_slug')
      .eq('user_id', user.id);
    const list = (data || []).map((r: any) => String(r.objective_slug)).filter(Boolean);
    return list;
  } catch {
    return [];
  }
}
/* ------------------------------------ */

export default function StepC_GoalsDiet({
  profile, onNext, onBack, isLastStep, onObjectivesChange,
}: StepCProps) {
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>([]);
  const [budget, setBudget] = useState(profile.monthly_budget_eur ? String(profile.monthly_budget_eur) : '200');
  const [diet, setDiet] = useState(profile.diet ?? 'omnivore');
  const [constraints, setConstraints] = useState<string[]>(
    Array.isArray(profile.dietary_constraints) ? profile.dietary_constraints : []
  );
  const [objectiveGroups, setObjectiveGroups] = useState<ObjectiveGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const budgetNumber = parseInt(budget) || 200;

  useEffect(() => {
    (async () => {
      try {
        const groups = await listObjectiveGroups();
        setObjectiveGroups(groups);
      } catch (e) {
        console.error('Error loading objective groups:', e);
      } finally {
        setLoadingGroups(false);
      }
    })();

    (async () => {
      try {
        const groups = await readUserGroupSlugs();
        if (groups.length) setSelectedObjectives(groups);
      } catch (e) {
        console.error('Error loading user objectives (groups):', e);
      }
    })();
  }, []);

  useEffect(() => {
    onObjectivesChange?.(selectedObjectives);
  }, [selectedObjectives, onObjectivesChange]);

  const toggleObjective = (objectiveSlug: string) => {
    setSelectedObjectives((current) =>
      current.includes(objectiveSlug)
        ? current.filter((slug) => slug !== objectiveSlug)
        : [...current, objectiveSlug]
    );
  };

  const toggleConstraint = (constraint: string) => {
    setConstraints((current) =>
      current.includes(constraint)
        ? current.filter((c) => c !== constraint)
        : [...current, constraint]
    );
  };

  const handleSave = async () => {
    const budgetNum = Number(budget);
    if (!Number.isFinite(budgetNum) || budgetNum < 0) {
      Alert.alert('Erreur', 'Veuillez entrer un budget valide');
      return;
    }
    if (selectedObjectives.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un objectif');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { Alert.alert('Erreur', 'Session expirée'); return; }

      // 1) MAJ profil
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ monthly_budget_eur: budgetNum, diet, dietary_constraints: constraints })
        .eq('user_id', profile.user_id);
      if (profileError) { console.error(profileError); Alert.alert('Erreur', 'Impossible de sauvegarder le profil'); return; }

      // 2) Écrire les GROUPES sélectionnés (pas d’expansion tag)
      //    a) Historique/compat: user_objective.objective_slug (FK -> objective_group.slug dans ton schéma)
      await supabase.from('user_objective').delete().eq('user_id', session.user.id);
      const payloadUserObjective = selectedObjectives.map((g) => ({
        user_id: session.user.id,
        objective_slug: g, // <= group slug directement
      }));
      if (payloadUserObjective.length) {
        const { error: ins1 } = await supabase.from('user_objective').insert(payloadUserObjective);
        if (ins1) { console.error('Error saving objectives:', ins1); Alert.alert('Erreur', 'Impossible de sauvegarder les objectifs'); return; }
      }

      //    b) Si table user_objective_group existe, la tenir à jour aussi
      if (await tableExists('user_objective_group')) {
        await supabase.from('user_objective_group').delete().eq('user_id', session.user.id);
        const payloadUOG = selectedObjectives.map((g) => ({
          user_id: session.user.id,
          group_slug: g,
        }));
        if (payloadUOG.length) {
          const { error: ins2 } = await supabase.from('user_objective_group').insert(payloadUOG);
          if (ins2) { console.warn('Warning saving user_objective_group:', ins2); } // non bloquant
        }
      }

      onNext();
    } catch (error) {
      console.error('Error in handleSave:', error);
      Alert.alert('Erreur', 'Une erreur inattendue s\'est produite');
    }
  };

  // Masquer les groupes sans produit
  const visibleGroups = useMemo(
    () => (objectiveGroups || []).filter(g => (g?.supplements_count ?? 0) > 0),
    [objectiveGroups]
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Text style={styles.stepTitle}>Vos objectifs et préférences</Text>
        <Text style={styles.stepSubtitle}>Dernière étape pour personnaliser vos recommandations</Text>

        <View style={styles.section}>
          <Text style={styles.fieldLabel}>Vos objectifs (sélection multiple)</Text>
          <Text style={styles.fieldSubtitle}>Sélectionnez tous les objectifs qui vous intéressent</Text>

          {loadingGroups ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.loadingText}>Chargement des objectifs...</Text>
            </View>
          ) : (
            <View style={styles.objectivesGrid}>
              {visibleGroups.map((group) => {
                const isSelected = selectedObjectives.includes(group.slug);
                return (
                  <TouchableOpacity
                    key={group.slug}
                    style={[styles.objectiveCard, isSelected && styles.objectiveCardActive]}
                    onPress={() => toggleObjective(group.slug)}
                  >
                    {isSelected && (
                      <View style={styles.selectedIndicator}>
                        <CheckCircle size={16} color="#22C55E" />
                      </View>
                    )}
                    <Text style={styles.objectiveEmoji}>{group.emoji || '🎯'}</Text>
                    <Text style={[styles.objectiveLabel, isSelected && styles.objectiveLabelActive]}>
                      {group.label}
                    </Text>
                    <Text style={styles.objectiveCount}>
                      {(group.supplements_count ?? 0)} produit{(group.supplements_count ?? 0) > 1 ? 's' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {visibleGroups.length === 0 && (
                <Text style={{ color: '#6B7280', textAlign: 'center', width: '100%', marginTop: 8 }}>
                  Aucun groupe disponible pour le moment.
                </Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.fieldLabel}>Budget mensuel : {budgetNumber}€</Text>
          <Slider
            style={styles.slider}
            minimumValue={20}
            maximumValue={1000}
            step={10}
            value={budgetNumber}
            onValueChange={(v) => setBudget(String(Math.round(v)))}
            minimumTrackTintColor="#22C55E"
            maximumTrackTintColor="#E5E7EB"
            thumbTintColor="#22C55E"
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>20€</Text>
            <Text style={styles.sliderLabel}>1000€</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.fieldLabel}>Régime alimentaire</Text>
          <View style={styles.dietGrid}>
            {DIETS.map((dietOption) => (
              <TouchableOpacity
                key={dietOption.value}
                style={[styles.dietChip, diet === dietOption.value && styles.dietChipActive]}
                onPress={() => setDiet(dietOption.value)}
              >
                <Text style={[styles.dietChipText, diet === dietOption.value && styles.dietChipTextActive]}>
                  {dietOption.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.fieldLabel}>Contraintes alimentaires</Text>
          <Text style={styles.fieldSubtitle}>Sélectionnez vos restrictions alimentaires</Text>
          <View style={styles.constraintsGrid}>
            {CONSTRAINTS.map((constraint) => {
              const isSelected = constraints.includes(constraint);
              return (
                <TouchableOpacity
                  key={constraint}
                  style={[styles.constraintChip, isSelected && styles.constraintChipActive]}
                  onPress={() => toggleConstraint(constraint)}
                >
                  <Text style={[styles.constraintChipText, isSelected && styles.constraintChipTextActive]}>
                    {constraint}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Précédent</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.finalButton, selectedObjectives.length === 0 && styles.finalButtonDisabled]}
            onPress={handleSave}
            disabled={selectedObjectives.length === 0}
          >
            <Text style={styles.finalButtonText}>
              {isLastStep ? 'Valider mon profil' : 'Continuer'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 24 },

  stepTitle: { fontSize: 28, fontWeight: '700', color: '#1F2937', textAlign: 'center', marginBottom: 8 },
  stepSubtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', lineHeight: 24, marginBottom: 32 },

  section: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldLabel: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginBottom: 16 },
  fieldSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 16, lineHeight: 20 },

  loadingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  loadingText: { fontSize: 14, color: '#6B7280', marginLeft: 8 },

  objectivesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  objectiveCard: {
    flex: 1, minWidth: '45%', alignItems: 'center', padding: 16, borderWidth: 2, borderColor: '#E5E7EB',
    borderRadius: 12, backgroundColor: '#F9FAFB', position: 'relative',
  },
  objectiveCardActive: { borderColor: '#22C55E', backgroundColor: '#F0FDF4' },
  selectedIndicator: { position: 'absolute', top: 8, right: 8 },
  objectiveEmoji: { fontSize: 32, marginBottom: 8 },
  objectiveLabel: { fontSize: 14, fontWeight: '600', color: '#6B7280', textAlign: 'center', marginBottom: 4 },
  objectiveLabelActive: { color: '#22C55E' },
  objectiveCount: { fontSize: 12, color: '#9CA3AF', textAlign: 'center' },

  slider: { height: 40, marginVertical: 8 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  sliderLabel: { fontSize: 12, color: '#6B7280' },

  dietGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dietChip: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  dietChipActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  dietChipText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  dietChipTextActive: { color: '#FFFFFF' },

  constraintsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  constraintChip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  constraintChipActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  constraintChipText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  constraintChipTextActive: { color: '#FFFFFF' },

  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 32 },
  backButton: { paddingVertical: 12, paddingHorizontal: 24 },
  backButtonText: { fontSize: 16, color: '#6B7280' },

  finalButton: {
    backgroundColor: '#22C55E',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  finalButtonDisabled: { backgroundColor: '#9CA3AF', shadowOpacity: 0, elevation: 0 },
  finalButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
