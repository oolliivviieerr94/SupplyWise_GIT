import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useFiche } from '@/hooks/useFiches';
import { useSettings } from '@/hooks/useSettings';
import { utilSlugify } from '@/lib/utils';
import { logFicheView } from '@/lib/track';
import { ArrowLeft, BookOpen, RefreshCw, CircleAlert as AlertCircle, Star, Award, TrendingUp } from 'lucide-react-native';

// Composant moderne pour rendre le Markdown en React Native
function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  
  // Extraire la note globale du produit depuis le titre ou le contenu
  let globalScore: string | null = null;
  
  // Chercher d'abord dans le titre
  const titleLine = lines.find(line => line.trim().startsWith('### '));
  if (titleLine) {
    console.log('🔍 [MarkdownRenderer] Title line found:', titleLine);
    // Patterns possibles: "Score **19.5**", "Score **19,5**", "— Score **19**"
    const scoreMatch = titleLine.match(/Score\s*\*\*(\d+(?:[.,]\d+)?)\/20\*\*/i);
    if (scoreMatch) {
      globalScore = scoreMatch[1].replace(',', '.');
      console.log('✅ [MarkdownRenderer] Score extracted from title:', globalScore);
    } else {
      console.log('❌ [MarkdownRenderer] No score found in title');
    }
  }
  
  // Si pas trouvé dans le titre, chercher dans les lignes de contenu
  if (!globalScore) {
    for (const line of lines) {
      const trimmedLine = line.trim();
      // Chercher des patterns comme "Score global: 19.5/20" ou "Note: 19/20"
      const scoreMatch = trimmedLine.match(/(?:Score|Note)(?:\s+global)?\s*:\s*(\d+(?:[.,]\d+)?)(?:\/20)?/i);
      if (scoreMatch) {
        globalScore = scoreMatch[1].replace(',', '.');
        console.log('✅ [MarkdownRenderer] Score extracted from content:', globalScore);
        break;
      }
    }
  }

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith('### ')) {
      const title = trimmedLine.replace('### ', '');
      
      // Extraire le score du titre si présent
      const scoreMatch = title.match(/Score\s*\*\*(\d+(?:[.,]\d+)?)\*\*/i);
      const cleanTitle = title.replace(/—.*$/, '').replace(/^\d+\.\s*/, '').trim();
      
      elements.push(
        <View key={index} style={styles.productHeader}>
          <Text style={styles.productTitle}>{cleanTitle}</Text>
          {globalScore && (
            <View style={styles.globalScoreHeader}>
              <View style={styles.globalScoreContainer}>
                <Star size={20} color="#F59E0B" fill="#F59E0B" />
                <Text style={styles.globalScoreText}>{globalScore}/20</Text>
              </View>
            </View>
          )}
        </View>
      );
    } else if (trimmedLine.includes('**') && (trimmedLine.startsWith('**') || trimmedLine.includes('🎯') || trimmedLine.includes('💪') || trimmedLine.includes('🔬') || trimmedLine.includes('📊'))) {
      // Nettoyer le texte des astérisques
      const cleanText = trimmedLine.replace(/\*\*/g, '');
      
      // Identifier les sections spéciales
      if (cleanText.includes('Objectifs') || cleanText.includes('🎯')) {
        elements.push(
          <View key={index} style={styles.sectionHeader}>
            <TrendingUp size={18} color="#22C55E" />
            <Text style={styles.sectionTitle}>{cleanText}</Text>
          </View>
        );
      } else if (cleanText.includes('Points forts') || cleanText.includes('💪')) {
        elements.push(
          <View key={index} style={styles.sectionHeader}>
            <Award size={18} color="#2563EB" />
            <Text style={styles.sectionTitle}>{cleanText}</Text>
          </View>
        );
      } else if (cleanText.includes('Points forts') || cleanText.includes('📊')) {
        elements.push(
          <View key={index} style={styles.sectionHeader}>
            <Award size={18} color="#2563EB" />
            <Text style={styles.sectionTitle}>{cleanText}</Text>
          </View>
        );
      } else {
        elements.push(
          <Text key={index} style={styles.boldText}>
            {cleanText}
          </Text>
        );
      }
    } else if (trimmedLine.startsWith('- ')) {
      const listText = trimmedLine.replace('- ', '');
      
      // Vérifier si c'est un score (contient /20)
      if (listText.includes('/20')) {
        const [label, score] = listText.split(':').map(s => s.trim());
        if (label && score) {
          elements.push(
            <View key={index} style={styles.scoreListItem}>
              <Text style={styles.scoreListLabel}>{label}</Text>
              <Text style={styles.scoreListValue}>{score}</Text>
            </View>
          );
        }
      } else {
        elements.push(
          <View key={index} style={styles.listItemContainer}>
            <View style={styles.listBullet} />
            <Text style={styles.listItem}>{listText}</Text>
          </View>
        );
      }
    } else if (trimmedLine === '') {
      elements.push(<View key={index} style={styles.spacing} />);
    } else if (trimmedLine) {
      // Nettoyer d'abord tous les astérisques
      const cleanLine = trimmedLine.replace(/\*\*/g, '');
      
      if (cleanLine.includes(':') && !cleanLine.includes('http')) {
        // Autres paires clé-valeur (dosage, prix, etc.)
        const [key, ...valueParts] = cleanLine.split(':');
        const value = valueParts.join(':').trim();
        
        if (key && value) {
          // Détecter si c'est un score (contient /20)
          if (value.includes('/20')) {
            elements.push(
              <View key={index} style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>{key.trim()}</Text>
                <Text style={styles.scoreValue}>{value}</Text>
              </View>
            );
          } else {
            elements.push(
              <View key={index} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{key.trim()}</Text>
                <Text style={styles.infoValue}>{value}</Text>
              </View>
            );
          }
        }
      } else {
        // Texte normal
        elements.push(
          <Text key={index} style={styles.paragraph}>
            {cleanLine}
          </Text>
        );
      }
    }
  });

  return <View style={styles.contentContainer}>{elements}</View>;
}

export default function FicheProduitScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { fichesVersion, refreshFiches } = useSettings();
  const { fiche, isLoading, error, refetch, availableSlugs } = useFiche(slug || '', fichesVersion);

  useEffect(() => {
    if (fiche && slug) {
      logFicheView(slug);
    }
  }, [fiche, slug]);

  if (!slug) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Erreur</Text>
        </View>
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Slug manquant</Text>
          <Text style={styles.errorText}>
            Impossible d'afficher la fiche sans identifiant
          </Text>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#6B7280" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <BookOpen size={32} color="#2563EB" />
            <Text style={styles.headerTitle}>Chargement</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Chargement de la fiche...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Erreur</Text>
        </View>
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Erreur de chargement</Text>
          <Text style={styles.errorText}>{error.message}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <RefreshCw size={16} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!fiche) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#6B7280" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <BookOpen size={32} color="#2563EB" />
            <Text style={styles.headerTitle}>Fiche produit</Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={refreshFiches}>
            <RefreshCw size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
        <View style={styles.notFoundContainer}>
          <BookOpen size={64} color="#E5E7EB" />
          <Text style={styles.notFoundTitle}>Fiche en cours de rédaction</Text>
          <Text style={styles.notFoundText}>
            La fiche détaillée pour "{slug}" n'est pas encore disponible.
          </Text>
          <Text style={styles.notFoundSubtext}>
            Notre équipe travaille activement sur le contenu de cette fiche.
          </Text>
          {availableSlugs.length > 0 && (
            <View style={styles.debugInfo}>
              <Text style={styles.debugTitle}>Fiches disponibles :</Text>
              <Text style={styles.debugText}>
                {availableSlugs.slice(0, 5).join(', ')}
                {availableSlugs.length > 5 && ` ... (+${availableSlugs.length - 5})`}
              </Text>
            </View>
          )}
          <TouchableOpacity style={styles.refreshButton} onPress={refreshFiches}>
            <RefreshCw size={16} color="#2563EB" />
            <Text style={styles.refreshButtonText}>Rafraîchir les fiches</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#6B7280" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <BookOpen size={32} color="#2563EB" />
          <Text style={styles.headerTitle}>Fiche détaillée</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={refreshFiches}>
          <RefreshCw size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.ficheCard}>
          <MarkdownRenderer content={fiche} />
        </View>
        <View style={styles.footer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  backButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
  },
  refreshButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
    marginLeft: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  notFoundText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  notFoundSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  debugInfo: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  debugText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: 'monospace',
    textAlign: 'center',
    lineHeight: 16,
  },
  content: {
    flex: 1,
  },
  ficheCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    overflow: 'hidden',
  },
  contentContainer: {
    padding: 24,
  },
  // En-tête du produit avec score à droite
  productHeader: {
    alignItems: 'center',
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: '#F3F4F6',
  },
  productTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    lineHeight: 36,
    marginBottom: 12,
    textAlign: 'center',
  },
  // Nouveau style pour la note globale en en-tête
  globalScoreHeader: {
    marginTop: 8,
  },
  globalScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 2,
    borderColor: '#BBF7D0',
  },
  globalScoreText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#15803D',
    marginLeft: 8,
  },
  // En-têtes de sections avec icônes
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    marginVertical: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#22C55E',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 12,
    lineHeight: 24,
  },
  // Lignes d'information clé-valeur
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    marginVertical: 6,
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    flex: 1,
    lineHeight: 20,
  },
  infoValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flex: 1,
    justifyContent: 'flex-end',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'right',
    lineHeight: 20,
  },
  infoScore: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 2,
  },
  // Grille de scores
  scoresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginVertical: 16,
  },
  scoreItem: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  scoreLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 16,
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
    textAlign: 'center',
    lineHeight: 20,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    marginVertical: 6,
  },
  scoreValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreMax: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 2,
  },
  // Texte en gras
  boldText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginVertical: 12,
    lineHeight: 26,
  },
  // Paragraphes normaux
  paragraph: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 26,
    marginVertical: 8,
    textAlign: 'left',
  },
  // Listes à puces modernes
  listItemContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 6,
    paddingLeft: 12,
  },
  listBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
    marginTop: 12,
    marginRight: 16,
  },
  listItem: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 26,
    flex: 1,
    textAlign: 'left',
  },
  // Scores dans les listes
  scoreListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginVertical: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
  },
  scoreListLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  scoreListValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
  },
  // Espacement
  spacing: {
    height: 16,
  },
  footer: {
    height: 100,
  },
});