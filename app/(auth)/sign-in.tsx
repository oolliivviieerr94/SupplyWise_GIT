import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { Mail, ArrowRight } from 'lucide-react-native';

// 👉 Vrai logo
import logo from '@/assets/images/Logo_Bolt.png';

export default function SignInScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Logo SupplyWise (remplace l’icône ronde) */}
        <View style={styles.logoContainer}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
          <Text style={styles.logoText}>SupplyWise</Text>
        </View>

        <Text style={styles.title}>Connexion</Text>
        <Text style={styles.subtitle}>
          Connectez-vous pour accéder à vos recommandations
        </Text>

        <TouchableOpacity
          style={styles.authButton}
          onPress={() => router.push('/auth')}
        >
          <Mail size={20} color="#FFFFFF" />
          <Text style={styles.authButtonText}>Aller à l'authentification</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => router.push('/')}
        >
          <Text style={styles.homeButtonText}>Retour à l'accueil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },

  // ✅ Nouveau bloc logo
  logoContainer: { alignItems: 'center', marginBottom: 32 },
  // Hauteur ~96 pour matcher l’ancienne icône visuellement (largeur auto via contain)
  logo: { width: 320, height: 96 },
  logoText: { fontSize: 24, fontWeight: '700', color: '#2563EB', marginTop: 8 },

  title: { fontSize: 28, fontWeight: '700', color: '#1F2937', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', lineHeight: 24, marginBottom: 48 },

  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  authButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginLeft: 8 },

  homeButton: { paddingVertical: 12, paddingHorizontal: 24 },
  homeButtonText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
});
