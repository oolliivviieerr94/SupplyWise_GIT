import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { RuleModal } from '@/components/RuleModal';
import { generateForNext2Weeks } from '@/lib/planning';
import {
  ArrowLeft,
  Star,
  Euro,
  Award,
  TrendingUp,
  Plus,
  BookOpen,
  ExternalLink,
  FileText,
} from 'lucide-react-native';

type Supplement = {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  score_global: number | null;
  price_eur_month: number | null;
  research_count: number | null;
  quality_level: string | null;
  scores: Record<string, number> | null;
};

type SupplementFiche = {
  markdown: string;
};

export default function SupplementDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [supplement, setSupplement] = useState<Supplement | null>(null);
  const [fiche, setFiche] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRuleModal, setShowRuleModal] = useState(false);

  useEffect(() => {
    if (slug) {
      loadSupplementData();
    }
  }, [slug]);

  const loadSupplementData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Charger les données du complément
      const { data: supplementData, error: supplementError } = await supabase
        .from('supplement')
        .select('id, slug, name, category, score_global, price_eur_month, research_count, quality_level, scores')
        .eq('slug', slug)
        .maybeSingle();

      if (supplementError) {
        throw supplementError;
      }

      setSupplement(supplementData);

      // Charger la fiche markdown
      const { data: ficheData, error: ficheError } = await supabase
        .from('supplement_fiche')
        .select('markdown')
        .eq('slug', slug)
        .maybeSingle();

      if (ficheError) {
        // Si pas de fiche, on met un message par défaut
        setFiche('Fiche détaillée en cours de rédaction...');
      } else if (ficheData) {
        setFiche(ficheData.markdown || 'Fiche détaillée en cours de rédaction...');
      } else {
        setFiche('Fiche détaillée en cours de rédaction...');
      }

    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement du complément');
      console.error('Error loading supplement:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToPlanning = () => {
    console.log('🔘 [handleAddToPlanning] Button clicked for supplement:', supplement?.name);
    setShowRuleModal(true);
    console.log('🔘 [handleAddToPlanning] Modal should now be visible');
  };

  const handleConfirmRule = async (payload: { anchors: string[]; dose?: string; frequency: 'daily' }) => {
    console.log('🔘 [handleConfirmRule] Rule confirmation started with payload:', payload);
    
    if (!supplement) {
      console.error('❌ [handleConfirmRule] No supplement selected');
      Alert.alert('Erreur', 'Aucun supplément sélectionné');
      return;
    }

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('🔘 [handleConfirmRule] User check:', { user: user?.id, error: userError?.message });
      
      if (userError || !user) {
        console.error('❌ [handleConfirmRule] User not authenticated');
        Alert.alert('Erreur', 'Vous devez être connecté pour ajouter au planning');
        return;
      }

      console.log('📝 Creating rule for supplement:', supplement.name);
      console.log('🔘 [handleConfirmRule] About to upsert rule to user_supplement_rule table');

      // 1) Upsert de la règle dans user_supplement_rule avec gestion des conflits
      const rule = {
        user_id: user.id,
        supplement_id: supplement.id,
        frequency: payload.frequency,
        anchors: payload.anchors,
        dose: payload.dose ?? null,
        notes: null,
        days_of_week: null,
      };

      let { data: ruleUpsert, error: ruleErr } = await supabase
        .from('user_supplement_rule')
        .upsert(rule, { onConflict: 'user_id,supplement_id' })
        .select('id, supplement_id, frequency, anchors, days_of_week')
        .single();

      // Fallback robuste si le serveur renvoie quand même 23505
      if (ruleErr && (ruleErr as any).code === '23505') {
        console.log('🔄 [handleConfirmRule] Conflict detected, trying update fallback');
        const upd = await supabase
          .from('user_supplement_rule')
          .update({
            frequency: rule.frequency,
            anchors: rule.anchors,
            dose: rule.dose,
            days_of_week: rule.days_of_week,
          })
          .eq('user_id', rule.user_id)
          .eq('supplement_id', rule.supplement_id)
          .select('id, supplement_id, frequency, anchors, days_of_week')
          .single();
        ruleUpsert = upd.data;
        ruleErr = upd.error;
      }

      console.log('🔘 [handleConfirmRule] Rule upsert result:', { data: ruleUpsert, error: ruleErr?.message });
      
      if (ruleErr || !ruleUpsert) {
        console.error('❌ Error creating rule:', ruleErr);
        Alert.alert('Erreur règle', ruleErr?.message || 'Impossible de créer la règle');
        return;
      }

      console.log('✅ Rule created:', ruleUpsert);

      // 2) Générer les événements pour les 2 prochaines semaines
      try {
        console.log('🔘 [handleConfirmRule] Starting planning generation for user:', user.id);
        const result = await generateForNext2Weeks(user.id);
        console.log('🔘 [handleConfirmRule] Planning generation result:', result);
        
        Alert.alert(
          'Ajouté au planning',
          `${supplement.name} a été ajouté à votre planning.\n${result.eventsGenerated} événements générés pour les 2 prochaines semaines ✅`
        );
      } catch (planningError: any) {
        console.error('❌ Error generating planning:', planningError);
        console.log('🔘 [handleConfirmRule] Planning generation failed, but rule was created');
        Alert.alert(
          'Règle créée',
          `${supplement.name} a été ajouté comme règle, mais la génération automatique du planning a échoué.\n\nErreur: ${planningError.message}`
        );
      }


    } catch (error: any) {
      console.error('❌ Error adding to planning:', error);
      console.log('🔘 [handleConfirmRule] Unexpected error in handleConfirmRule:', error);
      Alert.alert('Erreur', error.message || 'Une erreur inattendue s\'est produite');
    }
  };

  const handleViewFiche = () => {
    if (!supplement) return;
    console.log('🔗 Navigating to fiche with slug:', supplement.slug);
    router.push({
      pathname: '/fiche-produit',
      params: { slug: supplement.slug }
    });
  };
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <BookOpen size={48} color="#2563EB" />
        <Text style={styles.loadingText}>Chargement de la fiche...</Text>
      </View>
    );
  }

  if (error || !supplement) {
    return (
      <View style={styles.errorContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#6B7280" />
        </TouchableOpacity>
        <Text style={styles.errorTitle}>Complément introuvable</Text>
        <Text style={styles.errorText}>
          {error || 'Ce complément n\'existe pas ou a été supprimé'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadSupplementData}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#6B7280" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.category}>{supplement.category || 'Non catégorisé'}</Text>
          <Text style={styles.title}>{supplement.name}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Carte de résumé */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.scoreSection}>
              {supplement.score_global && (
                <View style={styles.globalScore}>
                  <Star size={24} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.globalScoreText}>{supplement.score_global}/20</Text>
                </View>
              )}
              {supplement.research_count && (
                <Text style={styles.researchCount}>
                  Basé sur {supplement.research_count} étude{supplement.research_count > 1 ? 's' : ''}
                </Text>
              )}
            </View>

            <View style={styles.metaSection}>
              {supplement.price_eur_month && (
                <View style={styles.priceContainer}>
                  <Euro size={16} color="#10B981" />
                  <Text style={styles.priceText}>{supplement.price_eur_month}€/mois</Text>
                </View>
              )}
              {supplement.quality_level && (
                <View style={styles.qualityContainer}>
                  <Award size={16} color="#F59E0B" />
                  <Text style={styles.qualityText}>{supplement.quality_level}</Text>
                </View>
              )}
            </View>
          </View>

          {supplement.scores && Object.keys(supplement.scores).length > 0 && (
            <View style={styles.scoresGrid}>
              <Text style={styles.scoresTitle}>Scores détaillés</Text>
              <View style={styles.scoresContainer}>
                {Object.entries(supplement.scores).map(([key, value]) => (
                  <View key={key} style={styles.scoreItem}>
                    <Text style={styles.scoreKey}>{key}</Text>
                    <View style={styles.scoreBar}>
                      <View 
                        style={[
                          styles.scoreBarFill, 
                          { width: `${Math.min((value as number) * 5, 100)}%` }
                        ]} 
                      />
                      <Text style={styles.scoreValue}>{value}/20</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.addButton} onPress={handleAddToPlanning}>
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Ajouter à mon planning</Text>
          </TouchableOpacity>

          <RuleModal
            visible={showRuleModal}
            onClose={() => setShowRuleModal(false)}
            onConfirm={handleConfirmRule}
            defaultAnchors={['morning', 'pre_workout', 'post_workout']}
            defaultDose="3g"
          />

          <TouchableOpacity style={styles.ficheButton} onPress={handleViewFiche}>
            <FileText size={20} color="#2563EB" />
            <Text style={styles.ficheButtonText}>Voir la fiche détaillée</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#F8FAFC',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  category: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  content: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  scoreSection: {
    alignItems: 'flex-start',
  },
  globalScore: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  globalScoreText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 8,
  },
  researchCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  metaSection: {
    alignItems: 'flex-end',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 4,
  },
  qualityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qualityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 4,
  },
  scoresGrid: {
    marginBottom: 20,
  },
  scoresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  scoresContainer: {
    gap: 8,
  },
  scoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreKey: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
    textTransform: 'capitalize',
  },
  scoreBar: {
    flex: 2,
    height: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    marginLeft: 12,
    position: 'relative',
    justifyContent: 'center',
  },
  scoreBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#2563EB',
    borderRadius: 10,
  },
  scoreValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    zIndex: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  ficheButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    marginTop: 12,
  },
  ficheButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
    marginLeft: 8,
  },
  footer: {
    height: 100,
  },
});