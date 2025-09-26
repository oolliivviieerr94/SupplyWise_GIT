import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { supabase } from '@/lib/supabase';
import { User, Plus, Minus } from 'lucide-react-native';
import { theme } from '@/lib/ui/theme';

const GREEN = theme.colors.success;

interface StepAProps {
  profile: any;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export default function StepA_Profile({ profile, onNext, onBack, isFirstStep }: StepAProps) {
  const [age, setAge] = useState(profile.age ? String(profile.age) : '25');
  const [sex, setSex] = useState(profile.sex ?? 'na');
  const [weight, setWeight] = useState(profile.weight_kg ? String(profile.weight_kg) : '70');

  const ageNumber = parseInt(age) || 25;
  const weightNumber = parseFloat(weight) || 70;

  const adjustWeight = (delta: number) => {
    const newWeight = Math.max(30, Math.min(250, weightNumber + delta));
    setWeight(String(newWeight));
  };

  const handleSave = async () => {
    const ageNum = Number(age);
    const weightNum = Number(weight);

    if (!Number.isFinite(ageNum) || ageNum < 14 || ageNum > 90) {
      Alert.alert('Erreur', "L'âge doit être entre 14 et 90 ans");
      return;
    }
    if (!Number.isFinite(weightNum) || weightNum < 30 || weightNum > 250) {
      Alert.alert('Erreur', 'Le poids doit être entre 30 et 250 kg');
      return;
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({ age: ageNum, sex, weight_kg: weightNum })
      .eq('user_id', profile.user_id);

    if (error) {
      console.error('Error saving profile step A:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder les informations');
      return;
    }

    onNext();
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <User size={48} color={GREEN} />
        </View>

        <Text style={styles.stepTitle}>Parlez-nous de vous</Text>
        <Text style={styles.stepSubtitle}>
          Ces informations nous aident à personnaliser vos recommandations
        </Text>

        <View style={styles.section}>
          <Text style={styles.fieldLabel}>Âge</Text>
          <View style={styles.ageContainer}>
            <TextInput
              style={styles.ageInput}
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
              placeholder="25"
            />
            <Text style={styles.ageUnit}>ans</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={14}
            maximumValue={90}
            step={1}
            value={ageNumber}
            onValueChange={(value) => setAge(String(Math.round(value)))}
            minimumTrackTintColor={GREEN}
            maximumTrackTintColor="#E5E7EB"
            thumbTintColor={GREEN}
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>14 ans</Text>
            <Text style={styles.sliderLabel}>90 ans</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.fieldLabel}>Sexe</Text>
          <View style={styles.segmentedContainer}>
            {[
              { label: 'Homme', value: 'male' },
              { label: 'Femme', value: 'female' },
              { label: 'Autre', value: 'other' },
              { label: 'N/P', value: 'na' },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.segmentedButton,
                  sex === option.value && styles.segmentedButtonActive,
                ]}
                onPress={() => setSex(option.value)}
              >
                <Text
                  style={[
                    styles.segmentedButtonText,
                    sex === option.value && styles.segmentedButtonTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.fieldLabel}>Poids</Text>
          <View style={styles.weightContainer}>
            <TouchableOpacity style={styles.weightButton} onPress={() => adjustWeight(-1)}>
              <Minus size={20} color="#6B7280" />
            </TouchableOpacity>

            <View style={styles.weightInputContainer}>
              <TextInput
                style={styles.weightInput}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                placeholder="70"
              />
              <Text style={styles.weightUnit}>kg</Text>
            </View>

            <TouchableOpacity style={styles.weightButton} onPress={() => adjustWeight(1)}>
              <Plus size={20} color="#6B7280" />
            </TouchableOpacity>
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

  ageContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  ageInput: {
    fontSize: 32, fontWeight: '700', color: GREEN, textAlign: 'center',
    minWidth: 80, borderBottomWidth: 2, borderBottomColor: GREEN, paddingVertical: 8,
  },
  ageUnit: { fontSize: 18, color: '#6B7280', marginLeft: 8 },

  slider: { height: 40, marginVertical: 8 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  sliderLabel: { fontSize: 12, color: '#6B7280' },

  segmentedContainer: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4 },
  segmentedButton: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8, alignItems: 'center' },
  segmentedButtonActive: { backgroundColor: GREEN },
  segmentedButtonText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  segmentedButtonTextActive: { color: '#FFFFFF' },

  weightContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  weightButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  weightInputContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24 },
  weightInput: {
    fontSize: 32, fontWeight: '700', color: GREEN, textAlign: 'center',
    minWidth: 80, borderBottomWidth: 2, borderBottomColor: GREEN, paddingVertical: 8,
  },
  weightUnit: { fontSize: 18, color: '#6B7280', marginLeft: 8 },

  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 32 },
  backButton: { paddingVertical: 12, paddingHorizontal: 24 },
  backButtonText: { fontSize: 16, color: '#6B7280' },

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
});
