import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import {
  User,
  Settings,
  LogOut,
  Target,
  Calendar,
  Euro,
  Award,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react-native';

export default function ProfileScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadUserProfile(session.user.id);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
      } else {
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSignOut = async () => {
    console.log('PROFILE_SCREEN: handleSignOut called - direct logout');
    try {
      console.log('PROFILE_SCREEN: Attempting to sign out...');
      const { error } = await supabase.auth.signOut();
      
      console.log('PROFILE_SCREEN: signOut() completed', { 
        hasError: !!error, 
        errorMessage: error?.message,
        errorCode: error?.code 
      });
      
      if (error) {
        console.error('PROFILE_SCREEN: Sign out error details:', error);
        Alert.alert('Erreur', `Impossible de se déconnecter: ${error.message}`);
      } else {
        console.log('PROFILE_SCREEN: Sign out successful, clearing local session state');
        setSession(null);
        console.log('PROFILE_SCREEN: Local session cleared, AuthListener should handle navigation');
      }
    } catch (err) {
      console.error('PROFILE_SCREEN: Sign out exception:', err);
      Alert.alert('Erreur', 'Une erreur inattendue s\'est produite');
    }
  };

  const menuItems = [
    {
      icon: Target,
      title: 'Modifier mes objectifs',
      subtitle: 'Changer sport, fréquence, objectifs',
      onPress: () => router.push('/onboarding'),
    },
    {
      icon: Calendar,
      title: 'Historique des prises',
      subtitle: 'Voir vos statistiques de supplémentation',
      onPress: () => Alert.alert('Bientôt disponible', 'Fonctionnalité en développement'),
    },
    {
      icon: Euro,
      title: 'Gestion du budget',
      subtitle: 'Modifier votre budget mensuel',
      onPress: () => Alert.alert('Bientôt disponible', 'Fonctionnalité en développement'),
    },
    {
      icon: Award,
      title: 'Certifications',
      subtitle: 'Préférences de certification des produits',
      onPress: () => Alert.alert('Bientôt disponible', 'Fonctionnalité en développement'),
    },
    {
      icon: Settings,
      title: 'Paramètres',
      subtitle: 'Notifications, langue, données',
      onPress: () => Alert.alert('Bientôt disponible', 'Fonctionnalité en développement'),
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <User size={48} color="#2563EB" />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.title}>Profil</Text>
        </View>
        <View style={styles.notLoggedIn}>
          <User size={64} color="#E5E7EB" />
          <Text style={styles.notLoggedInTitle}>Connexion requise</Text>
          <Text style={styles.notLoggedInText}>
            Veuillez vous connecter pour accéder à votre profil
          </Text>
          <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/auth')}>
            <Text style={styles.loginButtonText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#6B7280" />
        </TouchableOpacity>
        <Text style={styles.title}>Mon Profil</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <User size={32} color="#FFFFFF" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {session.user.user_metadata?.full_name || 'Utilisateur'}
            </Text>
            <Text style={styles.profileEmail}>{session.user.email}</Text>
            {userProfile && (
              <View style={styles.profileStats}>
                <Text style={styles.profileStat}>
                  🏃‍♂️ {userProfile.sport} • {userProfile.frequency_per_week}x/semaine
                </Text>
                <Text style={styles.profileStat}>
                  🎯 {userProfile.goal === 'hypertrophy' ? 'Prise de muscle' : 
                      userProfile.goal === 'fatloss' ? 'Perte de poids' :
                      userProfile.goal === 'endurance' ? 'Endurance' : 'Santé générale'}
                </Text>
                <Text style={styles.profileStat}>
                  💰 {userProfile.budget_monthly}€/mois
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.menuSection}>
        {menuItems.map((item, index) => (
          <TouchableOpacity key={index} style={styles.menuItem} onPress={item.onPress}>
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIcon}>
                <item.icon size={20} color="#2563EB" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
            </View>
            <ChevronRight size={20} color="#6B7280" />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.dangerZone}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <LogOut size={20} color="#EF4444" />
          <Text style={styles.signOutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.version}>Version 1.0.0</Text>
        <Text style={styles.disclaimer}>
          SupplyWise • Supplémentation sportive basée sur la science
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  notLoggedIn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  notLoggedInTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  notLoggedInText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  profileStats: {
    gap: 4,
  },
  profileStat: {
    fontSize: 12,
    color: '#4B5563',
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  dangerZone: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  version: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  disclaimer: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});