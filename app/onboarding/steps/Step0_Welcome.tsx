import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { ArrowRight, Zap, Shield, Award } from 'lucide-react-native';
import { ss } from '@/lib/safeStyle';
import { theme } from '@/lib/ui/theme';

interface Step0Props {
  profile: any;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const features = [
  { icon: Zap,   title: 'Recommandations personnalisées', description: 'Basées sur votre sport et vos objectifs', color: theme.colors.success },
  { icon: Shield, title: 'Fondées sur la science',        description: 'Protocoles validés par la recherche',     color: theme.colors.primary },
  { icon: Award,  title: 'Produits certifiés',             description: 'Options anti-dopage disponibles',         color: theme.colors.warning },
];

export default function Step0_Welcome({ onNext }: Step0Props) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        {/* Titre centré SANS login */}
        <Text style={styles.title}>Bienvenue sur <Text style={styles.titleStrong}>SupplyWise</Text> !</Text>

        <Text style={styles.subtitle}>
          Créons ensemble votre profil pour des recommandations de supplémentation
          adaptées à vos objectifs.
        </Text>

        {/* ⬇️ Logo central supprimé */}
      </View>

      <View style={styles.featuresContainer}>
        {features.map((feature, i) => (
          <View key={feature.title} style={[styles.featureItem, i !== features.length - 1 && styles.mb16]}>
            <View style={[styles.featureIcon, { backgroundColor: feature.color }]}>
              <feature.icon size={20} color={theme.colors.white} />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Bouton en VERT */}
      <TouchableOpacity style={styles.startButton} onPress={onNext} activeOpacity={0.9}>
        <Text style={styles.startButtonText}>Commencer mon profil</Text>
        <ArrowRight size={20} color={theme.colors.white} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = ss({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.xl, alignItems: 'center' },

  heroCard: {
    width: '100%', maxWidth: 720, backgroundColor: theme.colors.white, borderRadius: theme.radius.lg,
    padding: theme.spacing.lg, ...theme.shadowCard, marginBottom: theme.spacing.xl,
  },
  title: { fontSize: 28, fontWeight: '800', color: theme.colors.text, textAlign: 'center' },
  titleStrong: { color: theme.colors.success },
  subtitle: { marginTop: 8, fontSize: 15, color: theme.colors.subtext, lineHeight: 22, textAlign: 'center' },

  featuresContainer: { width: '100%', maxWidth: 720, marginBottom: theme.spacing.xl },
  featureItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.white, padding: theme.spacing.lg, borderRadius: theme.radius.md, ...theme.shadowCard },
  mb16: { marginBottom: 16 },
  featureIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  featureContent: { flex: 1 },
  featureTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: 2 },
  featureDescription: { fontSize: 14, color: theme.colors.subtext, lineHeight: 20 },

  // bouton vert
  startButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.success,
    paddingVertical: 16, paddingHorizontal: 28, borderRadius: theme.radius.lg, ...theme.shadowEmph,
  },
  startButtonText: { fontSize: 16, fontWeight: '700', color: theme.colors.white, marginRight: 8 },
});
