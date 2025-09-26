// app/welcome-current.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import {
  Target,
  Calendar,
  Scan,
  BookOpen,
  Award,
  Users,
  TrendingUp,
  Shield,
  Zap,
  Star,
  ArrowRight,
  AlertTriangle,
  BellOff,
  Link,    // ✅ (pas Link2)
  XCircle,
} from 'lucide-react-native';

/** Chiffres affichés dans le bandeau vert (fixes) */
const BANNER_STATS = {
  studies: 50000,       // 50 000+
  supplements: 300,     // 300+
  errorsAvoidedPct: 78, // 78%
};

/** Couleurs d’alerte (rouge) pour les insights */
const ALERT_COLOR = '#EF4444';              // rouge 500
const ALERT_BG    = 'rgba(239,68,68,0.12)'; // fond rouge léger

const pretty = (n: number) => `${n.toLocaleString('fr-FR')}+`;

export default function WelcomeCurrent() {
  const handleGetStarted = () => router.push('/auth?mode=signup'); // formulaire d’inscription
  const handleLogin = () => router.push('/auth');                   // formulaire de connexion

  // Phrases "insights" (affichées sous le sous-titre de la section features)
  const insightLines = [
    { icon: AlertTriangle, pct: '78%', text: 'des utilisateurs ne respectent pas la posologie recommandée' },
    { icon: BellOff,       pct: '65%', text: 'oublient leurs prises régulièrement' },
    { icon: Link,          pct: '50%', text: 'ignorent les interactions entre compléments' },
    { icon: XCircle,       pct: '30%', text: 'des échecs dus aux oublis de prise' },
  ];

  // Features (avec “Recommandations personnalisées” en premier)
  const features = [
    { icon: Target,   title: 'Recommandations personnalisées', description: 'Protocoles adaptés à vos objectifs et contraintes', color: '#22C55E' },
    { icon: Calendar, title: 'Planning intelligent',           description: 'Timing optimal pour chaque complément',            color: '#16A34A' },
    { icon: Scan,     title: 'Scanner de produits',            description: 'Identifiez et comparez les compléments',           color: '#84CC16' },
    { icon: BookOpen, title: 'Base de connaissances',          description: 'Informations scientifiques vérifiées',             color: '#65A30D' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* HERO */}
      <View style={styles.hero}>
        <View style={styles.heroContent}>
          <Image source={require('../assets/images/Logo_Bolt.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.heroTitle}>
            Votre guide quotidien{'\n'}pour une supplémentation{'\n'}
            <Text style={styles.heroTitleAccent}>intelligente</Text>.
          </Text>

          <View style={styles.heroButtons}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleGetStarted}>
              <Text style={styles.primaryButtonText}>Créer mon compte</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleLogin}>
              <Text style={styles.secondaryButtonText}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.heroImageContainer}>
          <Image source={require('../assets/images/Image_accueil.png')} style={styles.heroImage} />
          <View style={styles.heroOverlay} />
        </View>
      </View>

      {/* BANDEAU CHIFFRES (fixes) */}
      <View style={styles.statsSection}>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{pretty(BANNER_STATS.studies)}</Text>
            <Text style={styles.statLabel}>{'Études\nanalysées'}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{pretty(BANNER_STATS.supplements)}</Text>
            <Text style={styles.statLabel}>{'Compléments\névalués'}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{`${BANNER_STATS.errorsAvoidedPct}%`}</Text>
            <Text style={styles.statLabel}>{`D'erreurs\névitées`}</Text>
          </View>
        </View>
      </View>

      {/* FEATURES */}
      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>Pourquoi choisir SupplyWise ?</Text>
        <Text style={styles.sectionSubtitle}>Une approche scientifique pour votre supplémentation</Text>

        {/* 👉 Bloc de phrases “insights” (en rouge) */}
        <View style={styles.insightBox}>
          {insightLines.map((it, idx) => {
            const Icon = it.icon || AlertTriangle;
            return (
              <View key={idx} style={styles.insightLine}>
                <View style={styles.insightBulletIcon}>
                  <Icon size={14} color={ALERT_COLOR} />
                </View>
                <Text style={styles.insightSentence}>
                  <Text style={styles.insightPct}>{it.pct}</Text>{' '}
                  {it.text}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Grille de features */}
        <View style={styles.featuresGrid}>
          {features.map((f, i) => {
            const Icon = f.icon || Target;
            return (
              <View key={i} style={styles.featureCard}>
                <View style={[styles.featureIcon, { backgroundColor: f.color }]}>
                  <Icon size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDescription}>{f.description}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* BENEFITS */}
      <View style={styles.benefitsSection}>
        <Text style={styles.sectionTitle}>Basé sur la science</Text>
        <View style={styles.benefitsList}>
          <View style={styles.benefitItem}><Award size={20} color="#22C55E" /><Text style={styles.benefitText}>Recommandations basées sur des études peer-reviewed</Text></View>
          <View style={styles.benefitItem}><TrendingUp size={20} color="#22C55E" /><Text style={styles.benefitText}>Dosages optimisés selon votre profil</Text></View>
          <View style={styles.benefitItem}><Users size={20} color="#22C55E" /><Text style={styles.benefitText}>Protocoles utilisés par des athlètes professionnels</Text></View>
          <View style={styles.benefitItem}><Shield size={20} color="#22C55E" /><Text style={styles.benefitText}>Produits certifiés anti-dopage disponibles</Text></View>
          <View style={styles.benefitItem}><Zap size={20} color="#22C55E" /><Text style={styles.benefitText}>Résultats visibles dès les premières semaines</Text></View>
        </View>
      </View>

      {/* TESTIMONIALS */}
      <View style={styles.testimonialsSection}>
        <Text style={styles.sectionTitle}>Ce que disent nos utilisateurs</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.testimonialsScroll}>
          {[
            { name: 'Marie L.', sport: 'CrossFit', text: "Mes performances ont augmenté de 15% depuis que j'utilise SuppleMent", rating: 5 },
            { name: 'Thomas R.', sport: 'Musculation', text: 'Enfin des recommandations basées sur la science, pas sur le marketing', rating: 5 },
            { name: 'Sarah M.', sport: 'Course à pied', text: "Le planning automatique m'a fait gagner un temps précieux", rating: 5 },
          ].map((t, i) => (
            <View key={i} style={styles.testimonialCard}>
              <View style={styles.testimonialHeader}>
                <View style={styles.testimonialAvatar}><Text style={styles.testimonialInitial}>{t.name.charAt(0)}</Text></View>
                <View style={styles.testimonialInfo}><Text style={styles.testimonialName}>{t.name}</Text><Text style={styles.testimonialSport}>{t.sport}</Text></View>
                <View style={styles.testimonialRating}>{[...Array(t.rating)].map((_, j) => (<Star key={j} size={12} color="#F59E0B" fill="#F59E0B" />))}</View>
              </View>
              <Text style={styles.testimonialText}>"{t.text}"</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* CTA */}
      <View style={styles.ctaSection}>
        <Text style={styles.ctaTitle}>Prêt à optimiser vos performances ?</Text>
        <Text style={styles.ctaSubtitle}>Rejoignez des milliers d'athlètes qui font confiance à SupplyWise</Text>
        <TouchableOpacity style={styles.ctaButton} onPress={handleGetStarted}>
          <Text style={styles.ctaButtonText}>Créer mon compte</Text>
          <ArrowRight size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.footer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  // HERO
  hero: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 0, backgroundColor: '#FFFFFF', position: 'relative' },
  heroContent: { alignItems: 'center', marginBottom: 24, zIndex: 2 },
  logo: { width: 338, height: 101, marginBottom: 24 },
  heroTitle: { width: 230, color: '#1F2937', textAlign: 'center', lineHeight: 30, marginBottom: 12, fontSize: 18, fontWeight: '700' },
  heroTitleAccent: { color: '#22C55E' },

  heroButtons: { width: '100%', gap: 12, marginTop: 4 },
  primaryButton: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#22C55E', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 16 },
  primaryButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  secondaryButton: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#22C55E', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, backgroundColor: '#FFFFFF' },

  heroImageContainer: { position: 'relative', marginTop: 16 },
  heroImage: { width: '100%', height: 300, borderRadius: 24, resizeMode: 'cover' },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: 24 },

  // BANDEAU CHIFFRES — ✅ affiné
  statsSection: { backgroundColor: '#22C55E', paddingVertical: 16 }, // ← avant 36
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 24 },
  statItem: { alignItems: 'center' },
  statNumber: {
    fontSize: 24,            // ← avant 28
    fontWeight: '700',       // ← avant 800
    color: '#FFFFFF',
    letterSpacing: 0.2,      // aère légèrement
  },
  statLabel: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 4, textAlign: 'center', lineHeight: 20, paddingHorizontal: 4 },

  // FEATURES
  featuresSection: { paddingVertical: 40, paddingHorizontal: 24, backgroundColor: '#FFFFFF' },
  sectionTitle: { fontSize: 28, fontWeight: '700', color: '#1F2937', textAlign: 'center', marginBottom: 10 },
  sectionSubtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 16 },

  // Bloc de phrases "insights" (en rouge)
  insightBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 22,
  },
  insightLine: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  insightBulletIcon: {
    width: 24, height: 24, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: ALERT_BG,
    marginRight: 10,
  },
  insightSentence: { flex: 1, color: '#374151', fontSize: 14, lineHeight: 20 },
  insightPct: { fontWeight: '800', color: ALERT_COLOR },

  // Grille de features
  featuresGrid: { gap: 18 },
  featureCard: { backgroundColor: '#F9FAFB', padding: 24, borderRadius: 20, alignItems: 'center' },
  featureIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  featureTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', textAlign: 'center', marginBottom: 8 },
  featureDescription: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },

  // BENEFITS
  benefitsSection: { backgroundColor: '#F9FAFB', paddingVertical: 40, paddingHorizontal: 24 },
  benefitsList: { gap: 14 },
  benefitItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16 },
  benefitText: { fontSize: 16, color: '#1F2937', marginLeft: 12, flex: 1 },

  // TESTIMONIALS
  testimonialsSection: { backgroundColor: '#FFFFFF', paddingVertical: 40, paddingHorizontal: 24 },
  testimonialsScroll: { marginTop: 16 },
  testimonialCard: { backgroundColor: '#F9FAFB', padding: 20, borderRadius: 20, marginRight: 16, width: 280 },
  testimonialHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  testimonialAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  testimonialInitial: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  testimonialInfo: { flex: 1 },
  testimonialName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  testimonialSport: { fontSize: 12, color: '#6B7280' },
  testimonialRating: { flexDirection: 'row' },

  // CTA
  ctaSection: { backgroundColor: '#1F2937', paddingVertical: 44, paddingHorizontal: 24, alignItems: 'center' },
  ctaTitle: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', marginBottom: 12 },
  ctaSubtitle: { fontSize: 16, color: '#9CA3AF', textAlign: 'center', marginBottom: 28 },
  ctaButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#22C55E', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 16, marginBottom: 20 },
  ctaButtonText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginRight: 8 },

  footer: { height: 40, backgroundColor: '#1F2937' },
});
