import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Slider from '@react-native-community/slider';
import { supabase } from '@/lib/supabase';
import { Dumbbell, X } from 'lucide-react-native';
import { theme } from '@/lib/ui/theme';

const SPORTS = [
  'Musculation',
  'Course à pied',
  'CrossFit',
  'Cyclisme',
  'Natation',
  'Sports de combat',
  'Football',
  'Tennis',
  'Basketball',
  'Autre',
];

const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

const GREEN = theme.colors.success;

interface StepBProps {
  profile: any;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export default function StepB_Training({ profile, onNext, onBack, isFirstStep }: StepBProps) {
  const [sport, setSport] = useState(profile.main_sport ?? 'Musculation');
  const [frequency, setFrequency] = useState(profile.sessions_per_week ?? 3);
  const [trainingSlots, setTrainingSlots] = useState<any[]>(
    Array.isArray(profile.training_slots) ? profile.training_slots : []
  );
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [tempStartHour, setTempStartHour] = useState(18);
  const [tempStartMinute, setTempStartMinute] = useState(30);
  const [tempEndHour, setTempEndHour] = useState(19);
  const [tempEndMinute, setTempEndMinute] = useState(30);

  const toggleDay = (dayIndex: number) => {
    const day = dayIndex + 1; // 1=lundi, 7=dimanche
    const existingSlot = trainingSlots.find((slot: any) => slot.day === day);

    if (existingSlot) {
      setTrainingSlots(trainingSlots.filter((slot: any) => slot.day !== day));
    } else {
      setSelectedDay(day);
      setTempStartHour(18);
      setTempStartMinute(30);
      setTempEndHour(19);
      setTempEndMinute(30);
      setShowTimePicker(true);
    }
  };

  const handleTimeConfirm = () => {
    if (selectedDay === null) return;

    const startTime = `${tempStartHour.toString().padStart(2, '0')}:${tempStartMinute
      .toString()
      .padStart(2, '0')}`;
    const endTime = `${tempEndHour.toString().padStart(2, '0')}:${tempEndMinute
      .toString()
      .padStart(2, '0')}`;

    const newSlot = { day: selectedDay, start: startTime, end: endTime };
    setTrainingSlots([...trainingSlots, newSlot]);
    setShowTimePicker(false);
    setSelectedDay(null);
  };

  const handleSave = async () => {
    if (frequency < 1 || frequency > 14) {
      Alert.alert('Erreur', 'Le nombre de séances doit être entre 1 et 14 par semaine');
      return;
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({
        main_sport: sport,
        sessions_per_week: frequency,
        training_slots: trainingSlots,
      })
      .eq('user_id', profile.user_id);

    if (error) {
      console.error('Error saving profile step B:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder les informations');
      return;
    }

    onNext();
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Dumbbell size={48} color={GREEN} />
        </View>

        <Text style={styles.stepTitle}>Votre activité sportive</Text>
        <Text style={styles.stepSubtitle}>
          Définissons votre routine d'entraînement pour optimiser le timing
        </Text>

        <View style={styles.section}>
          <Text style={styles.fieldLabel}>Sport principal</Text>
          <View style={styles.sportsGrid}>
            {SPORTS.map((sportOption) => (
              <TouchableOpacity
                key={sportOption}
                style={[styles.sportChip, sport === sportOption && styles.sportChipActive]}
                onPress={() => setSport(sportOption)}
              >
                <Text
                  style={[
                    styles.sportChipText,
                    sport === sportOption && styles.sportChipTextActive,
                  ]}
                >
                  {sportOption}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.fieldLabel}>Séances par semaine : {frequency}</Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={14}
            step={1}
            value={frequency}
            onValueChange={setFrequency}
            minimumTrackTintColor={GREEN}
            maximumTrackTintColor="#E5E7EB"
            thumbTintColor={GREEN}
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>1 séance</Text>
            <Text style={styles.sliderLabel}>14 séances</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.fieldLabel}>Jours et horaires d'entraînement</Text>
          <Text style={styles.fieldSubtitle}>
            Sélectionnez vos jours d'entraînement pour définir les horaires
          </Text>

          <View style={styles.daysGrid}>
            {DAYS.map((dayLetter, index) => {
              const day = index + 1;
              const hasSlot = trainingSlots.some((slot: any) => slot.day === day);
              const slot = trainingSlots.find((slot: any) => slot.day === day);

              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.dayButton, hasSlot && styles.dayButtonActive]}
                  onPress={() => toggleDay(index)}
                >
                  <Text style={[styles.dayButtonText, hasSlot && styles.dayButtonTextActive]}>
                    {dayLetter}
                  </Text>
                  {hasSlot && slot && <Text style={styles.dayTimeText}>{slot.start}-{slot.end}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.buttonContainer}>
          {!isFirstStep && (
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>Précédent</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.nextButton} onPress={handleSave}>
            <Text style={styles.nextButtonText}>Continuer</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal pour sélection d'heure */}
      <Modal visible={showTimePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.timePickerModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Horaire - {selectedDay ? DAY_NAMES[selectedDay - 1] : ''}
              </Text>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.timeSection}>
              <Text style={styles.timeLabel}>Début</Text>
              <View style={styles.timePickerContainer}>
                <View style={styles.timePicker}>
                  <Text style={styles.timePickerLabel}>Heure</Text>
                  <Picker
                    selectedValue={tempStartHour}
                    onValueChange={setTempStartHour}
                    style={styles.timePickerWheel}
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <Picker.Item key={i} label={i.toString().padStart(2, '0')} value={i} />
                    ))}
                  </Picker>
                </View>

                <View style={styles.timePicker}>
                  <Text style={styles.timePickerLabel}>Minutes</Text>
                  <Picker
                    selectedValue={tempStartMinute}
                    onValueChange={setTempStartMinute}
                    style={styles.timePickerWheel}
                  >
                    {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                      <Picker.Item key={m} label={m.toString().padStart(2, '0')} value={m} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>

            <View style={styles.timeSection}>
              <Text style={styles.timeLabel}>Fin</Text>
              <View style={styles.timePickerContainer}>
                <View style={styles.timePicker}>
                  <Text style={styles.timePickerLabel}>Heure</Text>
                  <Picker
                    selectedValue={tempEndHour}
                    onValueChange={setTempEndHour}
                    style={styles.timePickerWheel}
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <Picker.Item key={i} label={i.toString().padStart(2, '0')} value={i} />
                    ))}
                  </Picker>
                </View>

                <View style={styles.timePicker}>
                  <Text style={styles.timePickerLabel}>Minutes</Text>
                  <Picker
                    selectedValue={tempEndMinute}
                    onValueChange={setTempEndMinute}
                    style={styles.timePickerWheel}
                  >
                    {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                      <Picker.Item key={m} label={m.toString().padStart(2, '0')} value={m} />
                    ))}
                  </Picker>
                </View>
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 24 },
  iconContainer: { alignItems: 'center', marginBottom: 24 },
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

  sportsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sportChip: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  sportChipActive: { backgroundColor: GREEN, borderColor: GREEN },
  sportChipText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  sportChipTextActive: { color: '#FFFFFF' },

  slider: { height: 40, marginVertical: 8 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  sliderLabel: { fontSize: 12, color: '#6B7280' },

  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayButton: {
    width: 80, height: 80, borderRadius: 12, backgroundColor: '#F3F4F6',
    borderWidth: 2, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', padding: 8,
  },
  dayButtonActive: { backgroundColor: GREEN, borderColor: GREEN },
  dayButtonText: { fontSize: 16, fontWeight: '700', color: '#6B7280', marginBottom: 4 },
  dayButtonTextActive: { color: '#FFFFFF' },
  dayTimeText: { fontSize: 10, color: '#FFFFFF', textAlign: 'center', lineHeight: 12 },

  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 32 },
  backButton: { paddingVertical: 12, paddingHorizontal: 24 },
  backButtonText: { fontSize: 16, color: '#6B7280' },

  // ✅ Bouton vert identique à la page 1
  nextButton: {
    backgroundColor: GREEN,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  nextButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  timePickerModal: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, margin: 20, width: '90%', maxWidth: 400 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
  timeSection: { marginBottom: 20 },
  timeLabel: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12, textAlign: 'center' },
  timePickerContainer: { flexDirection: 'row', justifyContent: 'space-around' },
  timePicker: { alignItems: 'center', flex: 1 },
  timePickerLabel: { fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 8 },
  timePickerWheel: { width: 100, height: 120 },
  timeConfirmButton: { backgroundColor: GREEN, paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center' },
  timeConfirmText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
