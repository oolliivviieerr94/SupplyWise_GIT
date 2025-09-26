import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/hooks/useSettings';
import { ArrowLeft, RefreshCw, Settings, Database, FileText, MessageSquare, Trash2, Eye } from 'lucide-react-native';

export default function AdminScreen() {
  const [session, setSession] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { fichesVersion, refreshFiches } = useSettings();
  const [stats, setStats] = useState({
    supplements: 0,
    conseils: 0,
    fiches: 0,
    suggestions: 0,
  });
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    checkAdminAccess();
    loadStats();
    loadSuggestions();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (!session) {
        setLoading(false);
        return;
      }

      // Vérifier si l'utilisateur est admin
      const { data: adminData } = await supabase
        .from('app_admins')
        .select('email')
        .eq('email', session.user.email)
        .maybeSingle();

      setIsAdmin(!!adminData);
    } catch (error) {
      console.error('Error checking admin access:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Compter les suppléments actifs
      const { count: supplementsCount, error: suppError } = await supabase
        .from('supplement_src_new')
        .select('*', { count: 'exact', head: true })

      if (suppError) {
        console.error('Error counting supplements:', suppError);
      }

      // Compter les conseils
      const { count: conseilsCount, error: conseilError } = await supabase
        .from('conseils_src_new')
        .select('*', { count: 'exact', head: true });

      if (conseilError) {
        console.error('Error counting conseils:', conseilError);
      }

      // Tester l'accès au fichier principal au lieu de lister le bucket
      console.log('🔍 Testing access to main fiches file...');
      const { data: ficheTestData, error: ficheTestError } = await supabase.storage
        .from('Fiches_produit')
        .download('fiches-produits-FORMAT-V2.md');

      let fichesStatus = 'unknown';
      if (ficheTestError) {
        console.error('❌ Error accessing main fiches file:', ficheTestError);
        fichesStatus = 'error';
      } else if (ficheTestData) {
        console.log('✅ Successfully accessed main fiches file, size:', ficheTestData.size);
        fichesStatus = 'available';
      }

      console.log('📊 Admin stats loaded:', {
        supplements: supplementsCount,
        conseils: conseilsCount,
        fichesStatus,
        ficheTestError: ficheTestError?.message || 'No error'
      });

      setStats({
        supplements: supplementsCount || 0,
        conseils: conseilsCount || 0,
        fiches: fichesStatus === 'available' ? 1 : 0,
        suggestions: 0, // Will be loaded separately
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadSuggestions = async () => {
    try {
      const { data, error, count } = await supabase
        .from('product_suggestions')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading suggestions:', error);
        return;
      }

      setSuggestions(data || []);
      setStats(prev => ({ ...prev, suggestions: count || 0 }));
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const handleDeleteSuggestion = async (id: string) => {
    Alert.alert(
      'Supprimer la suggestion',
      'Êtes-vous sûr de vouloir supprimer cette suggestion ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('product_suggestions')
                .delete()
                .eq('id', id);

              if (error) throw error;

              Alert.alert('Succès', 'Suggestion supprimée');
              loadSuggestions();
            } catch (error: any) {
              Alert.alert('Erreur', error.message || 'Erreur lors de la suppression');
            }
          },
        },
      ]
    );
  };

  const handleMarkAsProcessed = async (id: string) => {
    try {
      const { error } = await supabase
        .from('product_suggestions')
        .update({ status: 'processed' })
        .eq('id', id);

      if (error) throw error;

      Alert.alert('Succès', 'Suggestion marquée comme traitée');
      loadSuggestions();
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Erreur lors de la mise à jour');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Settings size={48} color="#2563EB" />
        <Text style={styles.loadingText}>Vérification des accès...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.title}>Administration</Text>
        </View>
        <View style={styles.notLoggedIn}>
          <Settings size={64} color="#E5E7EB" />
          <Text style={styles.notLoggedInTitle}>Connexion requise</Text>
          <Text style={styles.notLoggedInText}>
            Veuillez vous connecter pour accéder à l'administration
          </Text>
          <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/auth')}>
            <Text style={styles.loginButtonText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.title}>Administration</Text>
        </View>
        <View style={styles.accessDenied}>
          <AlertCircle size={64} color="#EF4444" />
          <Text style={styles.accessDeniedTitle}>Accès refusé</Text>
          <Text style={styles.accessDeniedText}>
            Vous n'avez pas les permissions d'administrateur
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#6B7280" />
        </TouchableOpacity>
        <Settings size={32} color="#2563EB" />
        <Text style={styles.title}>Administration</Text>
        <Text style={styles.subtitle}>Gestion des données</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📚 Gestion des fiches</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={refreshFiches}>
            <RefreshCw size={16} color="#2563EB" />
            <Text style={styles.refreshButtonText}>Actualiser</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.fichesCard}>
          <View style={styles.fichesHeader}>
            <FileText size={24} color="#2563EB" />
            <View style={styles.fichesInfo}>
              <Text style={styles.fichesTitle}>Fiches Produits</Text>
              <Text style={styles.fichesSubtitle}>
                Bucket: Fiches_produit • Fichier: fiches-produits-FORMAT-V2.md
              </Text>
            </View>
          </View>
          
          <Text style={styles.fichesDescription}>
            Les fiches se mettent à jour automatiquement quand vous uploadez 
            un nouveau fichier avec le même nom dans Supabase Storage.
          </Text>
          
          <View style={styles.fichesStats}>
            <Text style={stats.fiches > 0 ? styles.fichesStatsText : styles.fichesStatsEmpty}>
              {stats.fiches > 0 
                ? '✅ Fichier principal accessible (fiches-produits-FORMAT-V2.md)'
                : '⚠️ Fichier principal inaccessible - Vérifiez les permissions du bucket'
              }
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Statistiques des données</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Database size={24} color="#22C55E" />
            <Text style={styles.statValue}>{stats.supplements}</Text>
            <Text style={styles.statLabel}>Suppléments</Text>
            <Text style={styles.statSource}>Table: supplement_src_new</Text>
          </View>
          
          <View style={styles.statCard}>
            <FileText size={24} color="#2563EB" />
            <Text style={styles.statValue}>{stats.conseils}</Text>
            <Text style={styles.statLabel}>Conseils</Text>
            <Text style={styles.statSource}>Table: conseils_src_new</Text>
          </View>
          
          <View style={styles.statCard}>
            <MessageSquare size={24} color="#7C3AED" />
            <Text style={styles.statValue}>{stats.suggestions}</Text>
            <Text style={styles.statLabel}>Suggestions</Text>
            <Text style={styles.statSource}>Table: product_suggestions</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>💬 Suggestions de produits</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={loadSuggestions}>
            <RefreshCw size={16} color="#2563EB" />
            <Text style={styles.refreshButtonText}>Actualiser</Text>
          </TouchableOpacity>
        </View>
        
        {suggestions.length === 0 ? (
          <View style={styles.noSuggestionsContainer}>
            <MessageSquare size={48} color="#E5E7EB" />
            <Text style={styles.noSuggestionsTitle}>Aucune suggestion</Text>
            <Text style={styles.noSuggestionsText}>
              Les suggestions d'utilisateurs apparaîtront ici
            </Text>
          </View>
        ) : (
          <View style={styles.suggestionsContainer}>
            <TouchableOpacity 
              style={styles.toggleButton}
              onPress={() => setShowSuggestions(!showSuggestions)}>
              <Text style={styles.toggleButtonText}>
                {showSuggestions ? 'Masquer' : 'Afficher'} les {suggestions.length} suggestion{suggestions.length > 1 ? 's' : ''}
              </Text>
              <Eye size={16} color="#2563EB" />
            </TouchableOpacity>
            
            {showSuggestions && (
              <View style={styles.suggestionsList}>
                {suggestions.slice(0, 10).map((suggestion) => (
                  <View key={suggestion.id} style={styles.suggestionCard}>
                    <View style={styles.suggestionHeader}>
                      <View style={styles.suggestionInfo}>
                        <Text style={styles.suggestionProduct}>{suggestion.product_name}</Text>
                        {suggestion.brand && (
                          <Text style={styles.suggestionBrand}>Marque: {suggestion.brand}</Text>
                        )}
                        <Text style={styles.suggestionDate}>
                          {new Date(suggestion.created_at).toLocaleDateString('fr-FR')}
                        </Text>
                      </View>
                      <View style={styles.suggestionActions}>
                        <TouchableOpacity
                          style={styles.processButton}
                          onPress={() => handleMarkAsProcessed(suggestion.id)}>
                          <Text style={styles.processButtonText}>Traité</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeleteSuggestion(suggestion.id)}>
                          <Trash2 size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    {suggestion.description && (
                      <Text style={styles.suggestionDescription}>
                        {suggestion.description}
                      </Text>
                    )}
                  </View>
                ))}
                
                {suggestions.length > 10 && (
                  <Text style={styles.moreText}>
                    ... et {suggestions.length - 10} autre{suggestions.length - 10 > 1 ? 's' : ''} suggestion{suggestions.length - 10 > 1 ? 's' : ''}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Instructions de mise à jour</Text>
        
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Processus de mise à jour :</Text>
          
          <View style={styles.instructionStep}>
            <Text style={styles.stepNumber}>1</Text>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Fiches Produits (Markdown)</Text>
              <Text style={styles.stepText}>
                Uploadez votre fichier "fiches-produits-FORMAT-V2.md" directement dans le bucket "Fiches_produit" 
                (pas dans un sous-dossier). 
                Les fiches se mettent à jour automatiquement.
              </Text>
            </View>
          </View>
          
          <View style={styles.instructionStep}>
            <Text style={styles.stepNumber}>2</Text>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Suppléments (CSV → SQL)</Text>
              <Text style={styles.stepText}>
                Importez votre CSV dans une table temporaire, puis exécutez les scripts SQL 
                pour mettre à jour la table "supplement" principale.
              </Text>
            </View>
          </View>
          
          <View style={styles.instructionStep}>
            <Text style={styles.stepNumber}>3</Text>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Conseils (CSV → SQL)</Text>
              <Text style={styles.stepText}>
                Importez votre CSV dans une table temporaire, puis exécutez les scripts SQL 
                pour mettre à jour la table "conseil" principale.
              </Text>
              <Text style={styles.statSource}>Table: conseil</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.noteCard}>
          <Text style={styles.noteText}>
            💡 Les données CSV sont importées directement dans les tables Supabase. 
            Seules les fiches markdown nécessitent un upload dans Storage.
          </Text>
        </View>
      </View>

      <View style={styles.footer} />
    </ScrollView>
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
  header: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    zIndex: 1,
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
  notLoggedIn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  notLoggedInTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  notLoggedInText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  accessDeniedTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  accessDeniedText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
    marginLeft: 6,
  },
  fichesCard: {
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
  },
  fichesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  fichesInfo: {
    marginLeft: 12,
    flex: 1,
  },
  fichesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  fichesSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'monospace',
  },
  fichesDescription: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
    marginBottom: 16,
  },
  fichesStats: {
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 6,
  },
  fichesStatsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
    textAlign: 'center',
  },
  fichesStatsEmpty: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 4,
  },
  statSource: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'monospace',
    marginTop: 4,
    textAlign: 'center',
  },
  instructionsCard: {
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  stepNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
    marginRight: 12,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  stepText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  noteCard: {
    backgroundColor: '#FFFBEB',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  noteText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  footer: {
    height: 100,
  },
  noSuggestionsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noSuggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12,
  },
  noSuggestionsText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  suggestionsContainer: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563EB',
    marginBottom: 16,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
    marginRight: 8,
  },
  suggestionsList: {
    gap: 12,
  },
  suggestionCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#7C3AED',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionProduct: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  suggestionBrand: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  suggestionDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  suggestionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  processButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  processButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  suggestionDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  moreText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
});