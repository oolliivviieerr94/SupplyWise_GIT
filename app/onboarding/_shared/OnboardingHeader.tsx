import React from 'react';
import { View, Text, Image, ImageSourcePropType } from 'react-native';
import { Target } from 'lucide-react-native';
import { ss } from '@/lib/safeStyle';
import { theme } from '@/lib/ui/theme';

type Props = {
  stepIndex: number;
  totalSteps: number;
  title?: string;
  logo?: ImageSourcePropType; // ← on reçoit ton logo depuis index.tsx
};

export default function OnboardingHeader({ stepIndex, totalSteps, title = 'Créons votre profil', logo }: Props) {
  const progressPct = Math.round(((stepIndex + 1) / totalSteps) * 100);

  return (
    <View style={styles.header}>
      {logo ? (
        <Image source={logo} style={styles.logoImg} resizeMode="contain" />
      ) : (
        <View style={styles.fallbackRow}>
          <Target size={28} color={theme.colors.primary} />
          <Text style={styles.fallbackTxt}>SupplyWise</Text>
        </View>
      )}
      <Text style={styles.title}>{title}</Text>
      <View style={styles.progressWrap}>
        <View style={styles.progressTopRow}>
          <Text style={styles.progressTxt}>Étape {stepIndex + 1} / {totalSteps}</Text>
          <Text style={styles.progressPct}>{progressPct}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = ss({
  header: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 18, backgroundColor: theme.colors.white, alignItems: 'center' },
  logoImg: { width: 200, height: 44 }, // ← ajuste si nécessaire
  fallbackRow: { flexDirection: 'row', alignItems: 'center' },
  fallbackTxt: { fontSize: 20, fontWeight: '700', color: theme.colors.primary, marginLeft: 8 },
  title: { marginTop: 10, fontSize: 22, fontWeight: '700', color: theme.colors.text, textAlign: 'center' },
  progressWrap: { marginTop: 12, width: '100%', maxWidth: 900 },
  progressTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  progressTxt: { fontSize: 13, color: theme.colors.subtext },
  progressPct: { fontSize: 12, color: theme.colors.subtext },
  progressBar: { height: 4, backgroundColor: theme.colors.divider, borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: theme.colors.primary },
});
