// app/auth/_shared/AuthHeader.tsx
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import logo from '@/assets/images/Logo_Bolt.png';

type Props = { subtitle?: string | null; logoHeight?: number };
export default function AuthHeader({ subtitle = null, logoHeight = 96 }: Props) {
  return (
    <View style={styles.container}>
      <Image source={logo} style={[styles.logo, { height: logoHeight }]} resizeMode="contain" />
      <Text style={styles.brand}>SupplyWise</Text>
      {/* Pas de "Bon retour !" */}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginTop: 24, marginBottom: 16 },
  logo: { width: 320, height: 96, marginBottom: 8 },
  brand: { fontSize: 28, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 8, fontSize: 16, color: '#6B7280' },
});
