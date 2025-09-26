import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSupplementsByGroups } from '@/hooks/useSupplementsByGroups';
import GroupFilter from '@/components/GroupFilter';
import { ArrowLeft, Star, BookOpen } from 'lucide-react-native';
import type { Supplement } from '@/lib/queries';

export default function SearchByGoalsScreen() {
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [matchAll, setMatchAll] = useState(false);
  
  const { data: supplements, loading, error, refresh } = useSupplementsByGroups(selectedGroups, matchAll);

  const handleSupplementPress = (supplement: Supplement) => {
    router.push({
      pathname: '/supplement-detail',
      params: { slug: supplement.slug }
    });
  };

  const renderSupplement = ({ item }: { item: Supplement }) => (
    <TouchableOpacity
      style={styles.supplementCard}
      onPress={() => handleSupplementPress(item)}>
      <View style={styles.supplementHeader}>
        <View style={styles.supplementInfo}>
          <Text style={styles.supplementName}>{item.name}</Text>
          <Text style={styles.supplementCategory}>
            {item.category || '—'}
          </Text>
        </View>
        
        <View style={styles.supplementMeta}>
          {item.score_global && (
            <View style={styles.scoreContainer}>
              <Star size={16} color="#F59E0B" fill="#F59E0B" />
              <Text style={styles.scoreText}>{item.score_global}/20</Text>
            </View>
          )}
          {item.research_count && (
            <Text style={styles.researchCount}>
              {item.research_count} étude{item.research_count > 1 ? 's' : ''}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.supplementDetails}>
        {item.price_eur_month && (
          <Text style={styles.priceText}>{item.price_eur_month}€/mois</Text>
        )}
        {item.quality_level && (
          <Text style={styles.qualityText}>Qualité: {item.quality_level}</Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.viewButton}
        onPress={() => router.push({
          pathname: '/fiche-produit',
          params: { slug: item.slug }
        })}>
        <BookOpen size={16} color="#2563EB" />
        <Text style={styles.viewButtonText}>Voir la fiche</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <BookOpen size={64} color="#E5E7EB" />
      <Text style={styles.emptyTitle}>
        {selectedGroups.length === 0 
          ? 'Sélectionnez des objectifs' 
          : 'Aucun supplément trouvé'
        }
      </Text>
      <Text style={styles.emptySubtitle}>
        {selectedGroups.length === 0
          ? 'Choisissez un ou plusieurs objectifs pour voir les suppléments recommandés'
          : matchAll 
            ? 'Aucun supplément ne correspond à TOUS les objectifs sélectionnés'
            : 'Aucun supplément ne correspond aux objectifs sélectionnés'
        }
      </Text>
      {selectedGroups.length > 0 && matchAll && (
        <TouchableOpacity 
          style={styles.switchModeButton}
          onPress={() => setMatchAll(false)}>
          <Text style={styles.switchModeText}>Essayer le mode "OU" ?</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>Erreur: {error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={refresh}>
        <Text style={styles.retryButtonText}>Réessayer</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#6B7280" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Recherche par objectifs</Text>
          <Text style={styles.subtitle}>
            {supplements.length} supplément{supplements.length > 1 ? 's' : ''} trouvé{supplements.length > 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      <GroupFilter 
        value={selectedGroups} 
        onChange={setSelectedGroups} 
      />

      {selectedGroups.length > 1 && (
        <View style={styles.logicContainer}>
          <Text style={styles.logicLabel}>Mode de recherche:</Text>
          <View style={styles.logicSwitch}>
            <Text style={[styles.logicText, !matchAll && styles.logicTextActive]}>
              OU (au moins un)
            </Text>
            <Switch
              value={matchAll}
              onValueChange={setMatchAll}
              trackColor={{ false: '#E5E7EB', true: '#2563EB' }}
              thumbColor="#FFFFFF"
            />
            <Text style={[styles.logicText, matchAll && styles.logicTextActive]}>
              ET (tous)
            </Text>
          </View>
        </View>
      )}

      {error ? (
        renderError()
      ) : (
        <FlatList
          data={supplements}
          renderItem={renderSupplement}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.loadingText}>Recherche en cours...</Text>
            </View>
          ) : renderEmptyState()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  logicContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  logicLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  logicSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logicText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  logicTextActive: {
    color: '#2563EB',
  },
  listContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  supplementCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  supplementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  supplementInfo: {
    flex: 1,
  },
  supplementName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  supplementCategory: {
    fontSize: 14,
    color: '#6B7280',
  },
  supplementMeta: {
    alignItems: 'flex-end',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 4,
  },
  researchCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  supplementDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  qualityText: {
    fontSize: 12,
    color: '#6B7280',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2563EB',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
    marginLeft: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  switchModeButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  switchModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    marginTop: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    marginBottom: 8,
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});