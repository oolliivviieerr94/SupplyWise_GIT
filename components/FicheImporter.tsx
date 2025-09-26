import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Upload, FileText, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Trash2 } from 'lucide-react-native';

interface FicheImporterProps {
  onImportComplete?: () => void;
}

export default function FicheImporter({ onImportComplete }: FicheImporterProps) {
  const [importing, setImporting] = useState(false);
  const [newFiche, setNewFiche] = useState({
    slug: '',
    markdown: '',
  });
  const [existingFiches, setExistingFiches] = useState<any[]>([]);
  const [loadingFiches, setLoadingFiches] = useState(false);

  React.useEffect(() => {
    loadExistingFiches();
  }, []);

  const loadExistingFiches = async () => {
    try {
      setLoadingFiches(true);
      const { data, error } = await supabase
        .from('supplement_fiche')
        .select('supplement_id, slug, updated_at')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setExistingFiches(data || []);
    } catch (error) {
      console.error('Error loading existing fiches:', error);
    } finally {
      setLoadingFiches(false);
    }
  };

  const handleImportFiche = async () => {
    if (!newFiche.slug.trim() || !newFiche.markdown.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir le slug et le contenu markdown');
      return;
    }

    try {
      setImporting(true);

      // Vérifier si le supplément existe
      const { data: supplement, error: suppError } = await supabase
        .from('supplement')
        .select('id')
        .eq('slug', newFiche.slug.trim())
        .maybeSingle();

      if (suppError) {
        throw suppError;
      }

      if (!supplement) {
        Alert.alert('Erreur', `Aucun supplément trouvé avec le slug "${newFiche.slug}"`);
        return;
      }

      // Insérer ou mettre à jour la fiche
      const { error: upsertError } = await supabase
        .from('supplement_fiche')
        .upsert({
          supplement_id: supplement.id,
          slug: newFiche.slug.trim(),
          markdown: newFiche.markdown.trim(),
        });

      if (upsertError) {
        throw upsertError;
      }

      Alert.alert('Succès', 'Fiche importée avec succès');
      setNewFiche({ slug: '', markdown: '' });
      loadExistingFiches();
      onImportComplete?.();

    } catch (error: any) {
      console.error('Error importing fiche:', error);
      Alert.alert('Erreur', error.message || 'Erreur lors de l\'importation');
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteFiche = async (slug: string) => {
    Alert.alert(
      'Supprimer la fiche',
      `Êtes-vous sûr de vouloir supprimer la fiche "${slug}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('supplement_fiche')
                .delete()
                .eq('slug', slug);

              if (error) throw error;

              Alert.alert('Succès', 'Fiche supprimée');
              loadExistingFiches();
              onImportComplete?.();
            } catch (error: any) {
              Alert.alert('Erreur', error.message || 'Erreur lors de la suppression');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📝 Ajouter une nouvelle fiche</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Slug du supplément</Text>
          <TextInput
            style={styles.input}
            placeholder="ex: creatine-monohydrate"
            value={newFiche.slug}
            onChangeText={(text) => setNewFiche({ ...newFiche, slug: text })}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Contenu Markdown</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="# Titre du supplément&#10;&#10;## Description&#10;Contenu de la fiche..."
            value={newFiche.markdown}
            onChangeText={(text) => setNewFiche({ ...newFiche, markdown: text })}
            multiline
            numberOfLines={10}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.importButton,
            (!newFiche.slug.trim() || !newFiche.markdown.trim() || importing) && 
            styles.importButtonDisabled
          ]}
          onPress={handleImportFiche}
          disabled={!newFiche.slug.trim() || !newFiche.markdown.trim() || importing}>
          {importing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Upload size={20} color="#FFFFFF" />
          )}
          <Text style={styles.importButtonText}>
            {importing ? 'Importation...' : 'Importer la fiche'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📚 Fiches existantes</Text>
        
        {loadingFiches ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        ) : (
          <View style={styles.fichesList}>
            {existingFiches.map((fiche) => (
              <View key={fiche.slug} style={styles.ficheItem}>
                <View style={styles.ficheInfo}>
                  <FileText size={20} color="#2563EB" />
                  <View style={styles.ficheDetails}>
                    <Text style={styles.ficheSlug}>{fiche.slug}</Text>
                    <Text style={styles.ficheDate}>
                      Mis à jour: {new Date(fiche.updated_at).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteFiche(fiche.slug)}>
                  <Trash2 size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
            
            {existingFiches.length === 0 && (
              <View style={styles.emptyState}>
                <FileText size={48} color="#E5E7EB" />
                <Text style={styles.emptyTitle}>Aucune fiche</Text>
                <Text style={styles.emptyText}>
                  Ajoutez votre première fiche ci-dessus
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    height: 200,
    textAlignVertical: 'top',
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    paddingVertical: 12,
    borderRadius: 8,
  },
  importButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  importButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  fichesList: {
    gap: 12,
  },
  ficheItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  ficheInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  ficheDetails: {
    marginLeft: 12,
    flex: 1,
  },
  ficheSlug: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  ficheDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
});