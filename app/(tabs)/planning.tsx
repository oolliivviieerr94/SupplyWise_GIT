import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Calendar, Clock, CircleCheck as CheckCircle2, RotateCcw, Bell, Plus, ArrowLeft } from 'lucide-react-native';

const mockIntakes = [
  {
    id: 1,
    name: 'Créatine Monohydrate',
    dosage: '5g',
    time: '08:00',
    status: 'done',
    type: 'daily',
  },
  {
    id: 2,
    name: 'Caféine Anhydre',
    dosage: '200mg',
    time: '14:30',
    status: 'todo',
    type: 'pre',
    nextIn: '2h 15min',
  },
  {
    id: 3,
    name: 'Bêta-Alanine',
    dosage: '3.2g',
    time: '15:00',
    status: 'todo',
    type: 'pre',
    nextIn: '2h 45min',
  },
  {
    id: 4,
    name: 'Protéines Whey',
    dosage: '30g',
    time: '16:30',
    status: 'todo',
    type: 'post',
    nextIn: '4h 15min',
  },
];

const statusIcons = {
  todo: Clock,
  done: CheckCircle2,
  skipped: RotateCcw,
};

const statusColors = {
  todo: '#6B7280',
  done: '#10B981',
  skipped: '#EF4444',
};

const typeLabels = {
  daily: 'Quotidien',
  pre: 'Pré-entraînement',
  intra: 'Intra-entraînement',
  post: 'Post-entraînement',
};

const typeColors = {
  daily: '#6B7280',
  pre: '#2563EB',
  intra: '#7C3AED',
  post: '#10B981',
};

export default function PlanningScreen() {
  const [intakes, setIntakes] = useState(mockIntakes);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const handleMarkDone = (intakeId: number) => {
    setIntakes(intakes.map(intake => 
      intake.id === intakeId 
        ? { ...intake, status: 'done' }
        : intake
    ));
    Alert.alert('✅', 'Prise confirmée !');
  };

  const handlePostpone = (intakeId: number) => {
    Alert.alert(
      'Reporter la prise',
      'Voulez-vous reporter cette prise de 15 minutes ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Reporter',
          onPress: () => {
            Alert.alert('🕐', 'Prise reportée de 15 minutes');
          },
        },
      ]
    );
  };

  const enableNotifications = async () => {
    try {
      // TODO: Configurer les notifications
      setNotificationsEnabled(true);
      Alert.alert(
        'Notifications activées',
        'Vous recevrez des rappels pour vos prises de suppléments'
      );
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'activer les notifications');
    }
  };

  const nextIntakes = intakes.filter(intake => intake.status === 'todo').slice(0, 3);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#6B7280" />
        </TouchableOpacity>
        <Calendar size={32} color="#2563EB" />
        <Text style={styles.title}>Planning du jour</Text>
        <Text style={styles.subtitle}>
          {new Date().toLocaleDateString('fr-FR', {
            weekday: 'long', 
            day: 'numeric',
            month: 'long',
          })}
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏰ Prochaines prises</Text>
          
          {nextIntakes.length === 0 ? (
            <View style={styles.emptyState}>
              <CheckCircle2 size={48} color="#10B981" />
              <Text style={styles.emptyTitle}>Toutes les prises effectuées !</Text>
              <Text style={styles.emptySubtitle}>
                Excellent travail, vous avez respecté votre planning
              </Text>
            </View>
          ) : (
            nextIntakes.map((intake) => (
              <View key={intake.id} style={styles.intakeCard}>
                <View style={styles.intakeHeader}>
                  <View style={styles.intakeTime}>
                    <Clock size={16} color="#2563EB" />
                    <Text style={styles.intakeTimeText}>{intake.time}</Text>
                    {intake.nextIn && (
                      <Text style={styles.intakeNextIn}>dans {intake.nextIn}</Text>
                    )}
                  </View>
                  <View
                    style={[
                      styles.intakeTypeBadge,
                      { backgroundColor: typeColors[intake.type] },
                    ]}>
                    <Text style={styles.intakeTypeText}>
                      {typeLabels[intake.type]}
                    </Text>
                  </View>
                </View>

                <Text style={styles.intakeName}>{intake.name}</Text>
                <Text style={styles.intakeDosage}>{intake.dosage}</Text>

                <View style={styles.intakeActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleMarkDone(intake.id)}>
                    <CheckCircle2 size={20} color="#10B981" />
                    <Text style={[styles.actionButtonText, { color: '#22C55E' }]}>
                      Valider
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.postponeButton]}
                    onPress={() => handlePostpone(intake.id)}>
                    <RotateCcw size={20} color="#6B7280" />
                    <Text style={styles.actionButtonText}>Reporter +15min</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Historique du jour</Text>
          
          {intakes.map((intake) => {
            const StatusIcon = statusIcons[intake.status];
            return (
              <View key={intake.id} style={styles.historyItem}>
                <View style={styles.historyTime}>
                  <Text style={styles.historyTimeText}>{intake.time}</Text>
                </View>
                
                <View style={styles.historyContent}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyName}>{intake.name}</Text>
                    <StatusIcon size={20} color={statusColors[intake.status]} />
                  </View>
                  <Text style={styles.historyDosage}>{intake.dosage}</Text>
                  <View
                    style={[
                      styles.historyTypeBadge,
                      { backgroundColor: typeColors[intake.type] },
                    ]}>
                    <Text style={styles.historyTypeText}>
                      {typeLabels[intake.type]}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {!notificationsEnabled && (
          <TouchableOpacity style={styles.notificationButton} onPress={enableNotifications}>
            <Bell size={24} color="#FFFFFF" />
            <Text style={styles.notificationButtonText}>Activer les rappels</Text>
          </TouchableOpacity>
        )}

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
    textTransform: 'capitalize',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  intakeCard: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  intakeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  intakeTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  intakeTimeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
    marginLeft: 6,
  },
  intakeNextIn: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  intakeTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  intakeTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  intakeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  intakeDosage: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  intakeActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  postponeButton: {
    backgroundColor: '#F9FAFB',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 6,
  },
  historyItem: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  historyTime: {
    width: 60,
    alignItems: 'center',
  },
  historyTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  historyContent: {
    flex: 1,
    marginLeft: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  historyDosage: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  historyTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  historyTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  notificationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    marginHorizontal: 16,
    marginVertical: 24,
    padding: 18,
    borderRadius: 12,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  notificationButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  footer: {
    height: 100,
  },
});