// app/auth.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Alert,
  ScrollView, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Target, Mail, Lock, User, ArrowLeft, Eye, EyeOff, Shield, Zap } from 'lucide-react-native';

import logo from '@/assets/images/Logo_Bolt.png';

const ONBOARDING_PATH = '/onboarding';

export default function AuthScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const [isLogin, setIsLogin] = useState(mode !== 'signup');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '', fullName: '' });
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const goNextAfterLogin = () => {
    console.log('[auth] NAV →', ONBOARDING_PATH);
    router.replace(ONBOARDING_PATH);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        console.log('[AuthListener@/auth] SIGNED_IN → NAV request');
        setTimeout(goNextAfterLogin, 50);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleAuth = async () => {
    if (!formData.email || !formData.password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      setErrMsg('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (!validateEmail(formData.email)) {
      Alert.alert('Erreur', 'Veuillez entrer une adresse email valide');
      setErrMsg('Veuillez entrer une adresse email valide.');
      return;
    }
    if (!isLogin) {
      if (!formData.fullName.trim()) { setErrMsg('Veuillez entrer votre nom complet.'); Alert.alert('Erreur', 'Veuillez entrer votre nom complet'); return; }
      if (formData.password !== formData.confirmPassword) { setErrMsg('Les mots de passe ne correspondent pas.'); Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.'); return; }
      if (formData.password.length < 8) { setErrMsg('Le mot de passe doit contenir au moins 8 caractères.'); Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 8 caractères.'); return; }
    }

    setLoading(true);
    setErrMsg(null);

    try {
      const email = formData.email.trim().toLowerCase();

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password: formData.password });
        if (error) {
          if (error.code === 'email_not_confirmed' || /email\s*not\s*confirmed/i.test(error.message || '')) {
            router.replace(`/account-success?email=${encodeURIComponent(email)}`);
            return;
          }
          if (error.code === 'invalid_credentials' || /invalid.*credential/i.test(error.message || '') || /invalid[_\s-]*grant/i.test(error.message || '')) {
            const m = 'Erreur de saisie du mail ou du mot de passe.';
            setErrMsg(m); Alert.alert('Erreur de connexion', m);
            return;
          }
          setErrMsg(error.message || 'Une erreur est survenue.');
          Alert.alert('Erreur de connexion', error.message || 'Une erreur est survenue.');
          return;
        }
        goNextAfterLogin();
        return;
      } else {
        const { error: signUpErr } = await supabase.auth.signUp({
          email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName.trim(),
              username: formData.fullName.trim().toLowerCase().replace(/\s+/g, '_'),
            },
            emailRedirectTo: undefined,
          },
        });
        if (signUpErr) {
          setErrMsg(signUpErr.message || "Erreur d'inscription.");
          Alert.alert("Erreur d'inscription", signUpErr.message || "Une erreur est survenue.");
          return;
        }
        router.replace(`/account-success?email=${encodeURIComponent(email)}`);
        return;
      }
    } catch (error: any) {
      console.warn('[auth] submit error:', error);
      const msg = String(error?.message || 'Une erreur est survenue.');
      if (/invalid.*credential/i.test(msg) || /invalid[_\s-]*grant/i.test(msg)) {
        const m = 'Erreur de saisie du mail ou du mot de passe.';
        setErrMsg(m); Alert.alert('Erreur de connexion', m);
      } else {
        setErrMsg(msg);
        Alert.alert(isLogin ? 'Erreur de connexion' : "Erreur d'inscription", msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setFormData({ email: formData.email, password: '', confirmPassword: '', fullName: '' });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setErrMsg(null);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#6B7280" />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image source={logo} style={styles.brandLogo} resizeMode="contain" />
            {/* ⛔️ on supprime le texte “SupplyWise” sous le logo */}
          </View>

          {/* Pas de “Bon retour !” en login. Le titre n’apparaît qu’en inscription. */}
          {isLogin ? null : <Text style={styles.title}>Créez votre compte</Text>}

          <Text style={styles.subtitle}>
            {isLogin ? 'Connectez-vous pour accéder à vos recommandations' : 'Rejoignez la communauté SupplyWise'}
          </Text>
        </View>

        <View style={styles.form}>
          {!isLogin && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nom complet *</Text>
              <View style={styles.inputContainer}>
                <User size={20} color="#6B7280" />
                <TextInput
                  style={styles.input}
                  placeholder="Votre nom complet"
                  value={formData.fullName}
                  onChangeText={(text) => setFormData({ ...formData, fullName: text })}
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email *</Text>
            <View style={styles.inputContainer}>
              <Mail size={20} color="#6B7280" />
              <TextInput
                style={styles.input}
                placeholder="votre@email.com"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mot de passe *</Text>
            {!isLogin && (
              <Text style={styles.passwordRequirements}>
                Min. 10 caractères dont 1 majuscule, 1 chiffre et 1 caractère spécial
              </Text>
            )}
            <View style={styles.inputContainer}>
              <Lock size={20} color="#6B7280" />
              <TextInput
                style={styles.input}
                placeholder="Votre mot de passe"
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={20} color="#6B7280" /> : <Eye size={20} color="#6B7280" />}
              </TouchableOpacity>
            </View>
          </View>

          {!isLogin && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirmer le mot de passe *</Text>
              <View style={styles.inputContainer}>
                <Lock size={20} color="#6B7280" />
                <TextInput
                  style={styles.input}
                  placeholder="Confirmez votre mot de passe"
                  value={formData.confirmPassword}
                  onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? <EyeOff size={20} color="#6B7280" /> : <Eye size={20} color="#6B7280" />}
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.authButton, loading && styles.authButtonDisabled]}
            onPress={handleAuth}
            disabled={loading}
          >
            <Text style={styles.authButtonText}>
              {loading ? (isLogin ? 'Connexion...' : 'Création du compte...') : (isLogin ? 'Se connecter' : 'Créer mon compte')}
            </Text>
          </TouchableOpacity>

          {errMsg && <Text style={styles.errorText}>{errMsg}</Text>}

          <View style={styles.switchContainer}>
            <Text style={styles.switchText}>{isLogin ? 'Pas encore de compte ?' : 'Déjà un compte ?'}</Text>
            <TouchableOpacity onPress={toggleAuthMode}>
              <Text style={styles.switchLink}>{isLogin ? "S'inscrire" : 'Se connecter'}</Text>
            </TouchableOpacity>
          </View>

          {isLogin && (
            <TouchableOpacity onPress={() => router.push('/forgot-password')} style={{ alignItems: 'center', marginTop: 16 }}>
              <Text style={{ color: '#6B7280', textDecorationLine: 'underline' }}>Mot de passe oublié ?</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.homeButton} onPress={() => router.push('/')}>
            <Text style={styles.homeButtonText}>Retour à l'accueil</Text>
          </TouchableOpacity>
        </View>

        {!isLogin && (
          <>
            <View style={styles.benefitsContainer}>
              <Text style={styles.benefitsTitle}>Pourquoi créer un compte ?</Text>
              <View style={styles.benefitsList}>
                <View style={styles.benefitItem}><Shield size={16} color="#22C55E" /><Text style={styles.benefitText}>Recommandations personnalisées</Text></View>
                <View style={styles.benefitItem}><Zap size={16} color="#22C55E" /><Text style={styles.benefitText}>Planning automatique</Text></View>
                <View style={styles.benefitItem}><Target size={16} color="#22C55E" /><Text style={styles.benefitText}>Suivi de progression</Text></View>
              </View>
            </View>
            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                En créant un compte, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { flexGrow: 1 },
  backButton: { position: 'absolute', top: 60, left: 24, zIndex: 1, padding: 8, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20 },

  header: { alignItems: 'center', paddingTop: 100, paddingHorizontal: 24, paddingBottom: 40, backgroundColor: '#F9FAFB' },

  // Logo centré (sans texte dessous)
  logoContainer: { alignItems: 'center', marginBottom: 16 },
  brandLogo: { width: 320, height: 96 }, // adapte si besoin

  // Titre seulement pour inscription
  title: { width: 180, height: 60, color: '#1F2937', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', lineHeight: 22 },

  form: { paddingHorizontal: 24, paddingVertical: 32, backgroundColor: '#FFFFFF' },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#F9FAFB' },
  input: { flex: 1, fontSize: 16, color: '#1F2937', marginLeft: 12 },

  authButton: { backgroundColor: '#22C55E', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 8, shadowColor: '#22C55E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  authButtonDisabled: { backgroundColor: '#9CA3AF', shadowOpacity: 0, elevation: 0 },
  authButtonText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },

  errorText: { color: '#EF4444', textAlign: 'center', marginTop: 12 },
  switchContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24, gap: 4 },
  switchText: { fontSize: 14, color: '#6B7280' },
  switchLink: { fontSize: 14, fontWeight: '600', color: '#22C55E' },

  homeButton: { alignItems: 'center', marginTop: 16, paddingVertical: 12 },
  homeButtonText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },

  passwordRequirements: { fontSize: 12, color: '#6B7280', marginBottom: 8, fontStyle: 'italic' },

  benefitsContainer: { backgroundColor: '#F9FAFB', paddingHorizontal: 24, paddingVertical: 32 },
  benefitsTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', textAlign: 'center', marginBottom: 20 },
  benefitsList: { gap: 12 },
  benefitItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  benefitText: { fontSize: 16, color: '#1F2937', marginLeft: 12, fontWeight: '500' },

  termsContainer: { paddingHorizontal: 24, paddingBottom: 40, backgroundColor: '#F9FAFB' },
  termsText: { fontSize: 12, color: '#6B7280', textAlign: 'center', lineHeight: 18 },
});
