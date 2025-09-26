import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { listObjectiveGroups, type ObjectiveGroup } from '@/lib/queries';

interface GroupFilterProps {
  value: string[];
  onChange: (groups: string[]) => void;
}

export default function GroupFilter({ value, onChange }: GroupFilterProps) {
  const [groups, setGroups] = useState<ObjectiveGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📊 Loading objective groups...');
      const data = await listObjectiveGroups();
      
      console.log('✅ Loaded groups:', data.length);
      setGroups(data);
    } catch (err: any) {
      console.error('❌ Error loading groups:', err);
      setError(err.message || 'Erreur lors du chargement des groupes');
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (groupSlug: string) => {
    const newValue = value.includes(groupSlug)
      ? value.filter(slug => slug !== groupSlug)
      : [...value, groupSlug];
    
    console.log('🔄 Group selection changed:', newValue);
    onChange(newValue);
  };

  const clearAll = () => {
    console.log('🗑️ Clearing all group selections');
    onChange([]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#2563EB" />
        <Text style={styles.loadingText}>Chargement des objectifs...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Erreur: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadGroups}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Objectifs</Text>
        {value.length > 0 && (
          <TouchableOpacity onPress={clearAll}>
            <Text style={styles.clearText}>Tout effacer</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {groups.map((group) => {
          const isSelected = value.includes(group.slug);
          return (
            <TouchableOpacity
              key={group.slug}
              style={[
                styles.groupChip,
                isSelected && styles.groupChipSelected,
              ]}
              onPress={() => toggleGroup(group.slug)}>
              {group.emoji && (
                <Text style={styles.groupEmoji}>{group.emoji}</Text>
              )}
              <Text
                style={[
                  styles.groupLabel,
                  isSelected && styles.groupLabelSelected,
                ]}>
                {group.label}
              </Text>
              <Text
                style={[
                  styles.groupCount,
                  isSelected && styles.groupCountSelected,
                ]}>
                {group.supplements_count}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
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
  errorContainer: {
    backgroundColor: '#FEF2F2',
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  clearText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  groupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    gap: 6,
  },
  groupChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  groupEmoji: {
    fontSize: 14,
  },
  groupLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  groupLabelSelected: {
    color: '#FFFFFF',
  },
  groupCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    textAlign: 'center',
  },
  groupCountSelected: {
    color: '#2563EB',
    backgroundColor: '#FFFFFF',
  },
});