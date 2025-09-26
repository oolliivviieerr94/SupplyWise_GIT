import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import Slider from '@react-native-community/slider';
import { supabase } from '@/lib/supabase';
import { listObjectiveGroups, type ObjectiveGroup } from '@/lib/queries';
import { ChevronRight, User, Target, Clock, Euro, ArrowLeft, CircleCheck as CheckCircle } from 'lucide-react-native';

const sports = [
  'Musculation',
  'CrossFit',
  'Course à pied',
  'Cyclisme',
  'Natation',
  'Sports de combat',
  'Football',
  'Tennis',
  'Basketball',
  'Autre',
];

export default function OnboardingScreen() {
  const [profile, setProfile] = useState({
    sport: sports[0],
    frequencyPerWeek: 3,
    trainingHour: 14,
    trainingMinute: 0,
    objectiveGroups: [] as string[],
    budgetMonthly: 200,
    noCaffeine: false,
    vegetarian: false,
    competitionMode: false,
  });

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [objectiveGroups, setObjectiveGroups] = useState<ObjectiveGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    loadObjectiveGroups();
  }, []);

  const loadObjectiveGroups = async () => {
    try {
      setLoadingGroups(true);
      const groups = await listObjectiveGroups();
      setObjectiveGroups(groups);
    } catch (error) {
      console.error('Error loading objective groups:', error);
      Alert.alert('Erreur', 'Impossible de charger les objectifs');
    } finally {
      setLoadingGroups(false);
    }
  };
  const handleTimeConfirm = () => {
    setShowTimePicker(false);
  };

  const toggleObjectiveGroup = (groupSlug: string) => {
    const currentGroups = profile.objectiveGroups;
    if (currentGroups.includes(groupSlug)) {
      setProfile({
        ...profile,
        objectiveGroups: currentGroups.filter(g => g !== groupSlug)
      });
    } else {
      setProfile({
        ...profile,
        objectiveGroups: [...currentGroups, groupSlug]
      });
    }
  };

  const handleSaveProfile = async () => {
    if (!session) {
      Alert.alert('Erreur', 'Vous devez être connecté pour sauvegarder votre profil');
      return;
    }

    if (profile.objectiveGroups.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un objectif');
      return;
    }

    try {
      // Préparer les contraintes
      const constraints = [];
      if (profile.noCaffeine) constraints.push('no_caffeine');
      if (profile.vegetarian) constraints.push('vegetarian');

      // Sauvegarder le profil complet dans user_profiles
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          sport: profile.sport,
          frequency_per_week: profile.frequencyPerWeek,
          training_time: `${profile.trainingHour.toString().padStart(2, '0')}:${profile.trainingMinute.toString().padStart(2, '0')}`,
          budget_monthly: profile.budgetMonthly,
          constraints: constraints,
          competition_mode: profile.competitionMode,
          onboarding_completed: true,
          onboarding_step: 10, // Marquer comme terminé
        })
        .eq('user_id', session.user.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        Alert.alert('Erreur', 'Impossible de sauvegarder votre profil');
        return;
      }

      // Sauvegarder les objectifs sélectionnés
      if (profile.objectiveGroups.length > 0) {
        // Supprimer les anciens objectifs
        await supabase
          .from('user_objective')
          .delete()
          .eq('user_id', session.user.id);

        // Insérer les nouveaux objectifs
        const { error: objectivesError } = await supabase
          .from('user_objective')
          .insert(
            profile.objectiveGroups.map((slug: string) => ({
              user_id: session.user.id,
              objective_slug: slug,
            }))
          );

        if (objectivesError) {
          console.error('Error saving objectives:', objectivesError);
          Alert.alert('Erreur', 'Impossible de sauvegarder vos objectifs');
          return;
        }
      }

      console.log('✅ Onboarding terminé avec succès, redirection vers le dashboard');
      
      // Rediriger vers le tableau de bord
      router.replace('/(tabs)/dashboard');

    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Erreur', 'Une erreur inattendue s\'est produite');
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#6B7280" />
        </TouchableOpacity>
        <User size={32} color="#2563EB" />
        <Text style={styles.title}>Configurez votre profil</Text>
        <Text style={styles.subtitle}>
          Personnalisez vos recommandations
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏃‍♂️ Votre sport principal</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={profile.sport}
            onValueChange={(value) => setProfile({ ...profile, sport: value })}
            style={styles.picker}>
            {sports.map((sport) => (
              <Picker.Item key={sport} label={sport} value={sport} />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📅 Fréquence d'entraînement</Text>
        <Text style={styles.sliderLabel}>
          {profile.frequencyPerWeek} séance{profile.frequencyPerWeek > 1 ? 's' : ''} par semaine
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={7}
          step={1}
          value={profile.frequencyPerWeek}
          onValueChange={(value) => setProfile({ ...profile, frequencyPerWeek: value })}
          minimumTrackTintColor="#2563EB"
          maximumTrackTintColor="#E5E7EB"
          thumbStyle={styles.sliderThumb}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🕒 Heure d'entraînement habituelle</Text>
        <TouchableOpacity
          style={styles.timeButton}
          onPress={() => setShowTimePicker(true)}>
          <Clock size={20} color="#2563EB" />
          <Text style={styles.timeButtonText}>
            {profile.trainingHour.toString().padStart(2, '0')}:{profile.trainingMinute.toString().padStart(2, '0')}
          </Text>
          <ChevronRight size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Vos objectifs (sélection multiple)</Text>
        <Text style={styles.sectionNote}>Vous pouvez sélectionner plusieurs objectifs</Text>
        {loadingGroups ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Chargement des objectifs...</Text>
          </View>
        ) : (
          <View style={styles.objectiveGrid}>
            {objectiveGroups.map((group) => {
              const isSelected = profile.objectiveGroups.includes(group.slug);
              return (
                <TouchableOpacity
                  key={group.slug}
                  style={[
                    styles.objectiveCard,
                    isSelected && styles.objectiveCardSelected,
                  ]}
                  onPress={() => toggleObjectiveGroup(group.slug)}>
                  {isSelected && (
                    <View style={styles.selectedIndicator}>
                      <CheckCircle size={16} color="#2563EB" />
                    </View>
                  )}
                  <Text style={styles.objectiveIcon}>{group.emoji || '🎯'}</Text>
                  <Text
                    style={[
                      styles.objectiveLabel,
                      isSelected && styles.objectiveLabelSelected,
                    ]}>
                    {group.label}
                  </Text>
                  <Text style={styles.objectiveCount}>
                    {group.supplements_count} produits
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💰 Budget mensuel</Text>
        <Text style={styles.sliderLabel}>{profile.budgetMonthly}€ par mois</Text>
        <Slider
          style={styles.slider}
          minimumValue={20}
          maximumValue={1000}
          step={10}
          value={profile.budgetMonthly}
          onValueChange={(value) => setProfile({ ...profile, budgetMonthly: value })}
          minimumTrackTintColor="#10B981"
          maximumTrackTintColor="#E5E7EB"
          thumbStyle={styles.sliderThumb}
        />
        <View style={styles.budgetLabels}>
          <Text style={styles.budgetLabel}>20€</Text>
          <Text style={styles.budgetLabel}>1000€</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🌱 Contraintes alimentaires</Text>
        
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Produits végans uniquement</Text>
          <Switch
            value={profile.vegetarian}
            onValueChange={(value) => setProfile({ ...profile, vegetarian: value })}
            trackColor={{ false: '#E5E7EB', true: '#22C55E' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Sans caféine</Text>
          <Switch
            value={profile.noCaffeine}
            onValueChange={(value) => setProfile({ ...profile, noCaffeine: value })}
            trackColor={{ false: '#E5E7EB', true: '#2563EB' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Mode compétition (produits certifiés uniquement)</Text>
          <Switch
            value={profile.competitionMode}
            onValueChange={(value) => setProfile({ ...profile, competitionMode: value })}
            trackColor={{ false: '#E5E7EB', true: '#F59E0B' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ Autres préférences</Text>
        
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Notifications activées</Text>
          <Switch
            value={false}
            onValueChange={() => Alert.alert('Bientôt disponible', 'Fonctionnalité en développement')}
            trackColor={{ false: '#E5E7EB', true: '#2563EB' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      <TouchableOpacity 
        style={[
          styles.saveButton,
          profile.objectiveGroups.length === 0 && styles.saveButtonDisabled
        ]} 
        onPress={handleSaveProfile}
        disabled={profile.objectiveGroups.length === 0}>
        <Target size={24} color="#FFFFFF" />
        <Text style={styles.saveButtonText}>Générer mes recommandations</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.disclaimer}>
          Cette application fournit des informations éducatives uniquement. 
          Consultez un professionnel de santé avant de modifier votre supplémentation.
        </Text>
      </View>

      {/* Modal pour sélection d'heure */}
      <Modal
        visible={showTimePicker}
        transparent={true}
        animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.timePickerModal}>
            <Text style={styles.timePickerTitle}>Heure d'entraînement</Text>
            
            <View style={styles.timePickerContainer}>
              <View style={styles.timePicker}>
                <Text style={styles.timePickerLabel}>Heure</Text>
                <Picker
                  selectedValue={profile.trainingHour}
                  onValueChange={(value) => setProfile({ ...profile, trainingHour: value })}
                  style={styles.timePickerWheel}>
                  {Array.from({ length: 24 }, (_, i) => (
                    <Picker.Item key={i} label={i.toString().padStart(2, '0')} value={i} />
                  ))}
                </Picker>
              </View>
              
              <View style={styles.timePicker}>
                <Text style={styles.timePickerLabel}>Minutes</Text>
                <Picker
                  selectedValue={profile.trainingMinute}
                  onValueChange={(value) => setProfile({ ...profile, trainingMinute: value })}
                  style={styles.timePickerWheel}>
                  {Array.from({ length: 12 }, (_, i) => i * 5).map(minute => (
                    <Picker.Item key={minute} label={minute.toString().padStart(2, '0')} value={minute} />
                  ))}
                </Picker>
              </View>
            </View>
            
            <TouchableOpacity style={styles.timeConfirmButton} onPress={handleTimeConfirm}>
              <Text style={styles.timeConfirmText}>Confirmer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
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
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  sectionNote: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  picker: {
    height: 50,
  },
  slider: {
    height: 40,
    marginTop: 8,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
    textAlign: 'center',
    marginBottom: 8,
  },
  sliderThumb: {
    backgroundColor: '#FFFFFF',
    width: 24,
    height: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  budgetLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  budgetLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  timeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginLeft: 12,
  },
  timeConfirmButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  timeConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
  timePickerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 24,
  },
  timePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  timePicker: {
    alignItems: 'center',
    flex: 1,
  },
  timePickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  timePickerWheel: {
    width: 100,
    height: 150,
  },
  objectiveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  objectiveCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    position: 'relative',
  },
  objectiveCardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  objectiveIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  objectiveLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 4,
  },
  objectiveLabelSelected: {
    color: '#2563EB',
  },
  objectiveCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  switchLabel: {
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
    lineHeight: 22,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    marginHorizontal: 16,
    marginVertical: 24,
    padding: 18,
    borderRadius: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  footer: {
    padding: 16,
    paddingBottom: 100,
  },
  disclaimer: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
});