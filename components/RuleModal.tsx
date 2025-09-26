import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const CHIP = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const ANCHORS: { key: string; label: string }[] = [
  { key: 'morning', label: 'Matin' },
  { key: 'noon', label: 'Midi' },
  { key: 'evening', label: 'Soir' },
  { key: 'pre_workout', label: 'Pré-workout' },
  { key: 'post_workout', label: 'Post-workout' }
];

interface RuleModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (rule: { anchors: string[]; dose?: string; frequency: 'daily' }) => void;
  defaultAnchors?: string[];
  defaultDose?: string;
}

export function RuleModal({
  visible,
  onClose,
  onConfirm,
  defaultAnchors = ['morning'],
  defaultDose = '',
}: RuleModalProps) {
  const [sel, setSel] = useState<string[]>(defaultAnchors);
  const [dose] = useState<string>(defaultDose);

  const handleConfirm = () => {
    onConfirm({
      anchors: sel.length ? sel : ['morning'],
      dose,
      frequency: 'daily'
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Ajouter au planning</Text>
          <Text style={styles.subtitle}>Moments de prise</Text>
          
          <View style={styles.chipsContainer}>
            {ANCHORS.map(a => (
              <CHIP
                key={a.key}
                label={a.label}
                active={sel.includes(a.key)}
                onPress={() => setSel(s => 
                  s.includes(a.key) 
                    ? s.filter(x => x !== a.key) 
                    : [...s, a.key]
                )}
              />
            ))}
          </View>
          
          {!!dose && (
            <Text style={styles.doseText}>Dose : {dose}</Text>
          )}
          
          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm} style={styles.confirmButton}>
              <Text style={styles.confirmText}>Valider</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#1F2937',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  title: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  subtitle: {
    color: '#9CA3AF',
    marginBottom: 6,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#374151',
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: {
    backgroundColor: '#22C55E',
  },
  chipText: {
    color: '#F9FAFB',
  },
  chipTextActive: {
    color: '#1F2937',
  },
  doseText: {
    color: '#9CA3AF',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelText: {
    color: '#9CA3AF',
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  confirmButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  confirmText: {
    color: '#1F2937',
    fontWeight: '700',
    fontSize: 16,
  },
});