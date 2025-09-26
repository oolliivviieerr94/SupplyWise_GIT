// /home/project/components/DashboardProfileCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useUserProfile, useGoalLabel } from '@/hooks/useUserProfile';
import { router } from 'expo-router';
import { Settings as SettingsIcon } from 'lucide-react-native';

export default function DashboardProfileCard() {
  const { data: profile, isLoading, error } = useUserProfile();
  const goalLabel = useGoalLabel(profile?.goal ?? null);

  const content = (() => {
    if (isLoading) {
      // Skeleton avec hauteur fixe pour éviter les sauts de layout
      return (
        <View>
          <View style={styles.row}>
            <View style={[styles.skel, { width: 80 }]} />
            <View style={[styles.skel, { width: 50 }]} />
            <View style={[styles.skel, { width: 100 }]} />
          </View>
          <View style={[styles.skel, { height: 44, marginTop: 14 }]} />
        </View>
      );
    }

    if (error) {
      return <Text style={styles.error}>Erreur de profil — {String((error as any)?.message || error)}</Text>;
    }

    return (
      <>
        <View style={styles.row}>
          <View style={styles.cell}>
            <Text style={styles.cellLabel}>Sport</Text>
            <Text style={styles.cellValue}>{profile?.sport || '—'}</Text>
          </View>

          <View style={styles.cell}>
            <Text style={styles.cellLabel}>Fréquence</Text>
            <Text style={styles.cellValue}>
              {profile?.frequency_per_week != null ? `${profile?.frequency_per_week}/sem` : '—'}
            </Text>
          </View>

          <View style={styles.cell}>
            <Text style={styles.cellLabel}>Budget</Text>
            <Text style={styles.cellValue}>
              {profile?.budget_monthly != null ? `${profile?.budget_monthly}€/mois` : '—'}
            </Text>
          </View>
        </View>

        <View style={styles.row2}>
          <Text style={styles.goalLabel}>
            Objectif principal : <Text style={styles.goalValue}>{goalLabel}</Text>
          </Text>

          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push('/onboarding?edit=1')}
          >
            <SettingsIcon size={16} color="#2563EB" />
            <Text style={styles.editText}>Modifier mon profil</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  })();

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Votre profil</Text>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  row2: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cell: { flex: 1 },
  cellLabel: { color: '#6B7280', fontSize: 12, marginBottom: 4 },
  cellValue: { color: '#111827', fontSize: 16, fontWeight: '700' },
  goalLabel: { color: '#374151', fontSize: 14 },
  goalValue: { fontWeight: '700', color: '#111827' },

  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editText: { marginLeft: 6, color: '#2563EB', fontWeight: '700' },

  skel: {
    height: 18,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
  },
  error: { color: '#DC2626' },
});
