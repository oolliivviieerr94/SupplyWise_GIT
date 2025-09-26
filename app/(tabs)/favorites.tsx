import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Heart, ExternalLink, Trash2 } from 'lucide-react-native';

type FavoriteRow = { id: string; supplement_id: string | null; created_at: string };
type Supplement = { id: string; slug: string | null; name: string; category: string | null };

export default function FavoritesScreen() {
  const [loading, setLoading] = useState(true);
  const [supplements, setSupplements] = useState<Array<{ favId: string; supplement: Supplement }>>([]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { Alert.alert('Connexion requise', 'Connectez-vous pour voir vos favoris.'); setLoading(false); return; }

      const { data: favs, error } = await supabase
        .from('user_favorites')
        .select('id, supplement_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const ids = (favs || []).map(f => f.supplement_id).filter(Boolean) as string[];
      if (ids.length === 0) { setSupplements([]); return; }

      const { data: supps, error: suppErr } = await supabase
        .from('supplement')
        .select('id, slug, name, category')
        .in('id', ids);

      if (suppErr) throw suppErr;

      const byId = new Map<string, Supplement>((supps || []).map(s => [s.id, s]));
      const rows = (favs || []).map(f => ({ favId: f.id, supplement: byId.get(f.supplement_id!)! }))
        .filter(r => !!r.supplement);

      setSupplements(rows);
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible de charger vos favoris.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (s: Supplement) => {
    if (s.slug) {
      router.push({ pathname: '/fiche-produit', params: { slug: s.slug } });
    } else {
      Alert.alert('Fiche indisponible', 'Slug manquant. Ouverture de la bibliothèque.');
      router.push('/(tabs)/library');
    }
  };

  const handleRemove = async (favId: string) => {
    try {
      const { error } = await supabase.from('user_favorites').delete().eq('id', favId);
      if (error) throw error;
      setSupplements(curr => curr.filter(r => r.favId !== favId));
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible de retirer ce favori.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#6B7280" />
        </TouchableOpacity>
        <Text style={styles.title}>Mes produits favoris</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {loading && (
          <View style={styles.loadingBox}>
            <Image source={require('../../assets/images/Logo_Bolt.png')} style={styles.logo} />
            <Text style={styles.loadingText}>Chargement…</Text>
          </View>
        )}

        {!loading && supplements.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Aucun favori pour l’instant</Text>
            <Text style={styles.emptySub}>Ajoutez des produits depuis la recherche ou les recommandations.</Text>
          </View>
        )}

        {supplements.map(({ favId, supplement }) => (
          <View key={favId} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.leftIcon}>
                <Heart size={18} color="#16A34A" fill="#86EFAC" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{supplement.name}</Text>
                <Text style={styles.category}>Catégorie: {supplement.category || '—'}</Text>
              </View>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.openBtn} onPress={() => handleOpen(supplement)}>
                <ExternalLink size={16} color="#FFFFFF" />
                <Text style={styles.openBtnText}>Voir la fiche</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(favId)}>
                <Trash2 size={16} color="#EF4444" />
                <Text style={styles.removeBtnText}>Retirer</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { backgroundColor: '#FFFFFF', paddingTop: 58, paddingBottom: 16, alignItems: 'center', position: 'relative', borderBottomWidth: 1, borderBottomColor: '#EEF2F7' },
  backButton: { position: 'absolute', left: 16, top: 58, padding: 8 },
  title: { fontSize: 20, fontWeight: '700', color: '#0F172A' },

  loadingBox: { padding: 32, alignItems: 'center' },
  logo: { width: 100, height: 30, marginBottom: 8 },
  loadingText: { color: '#6B7280' },

  empty: { padding: 24, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  emptySub: { fontSize: 14, color: '#6B7280', marginTop: 4, textAlign: 'center' },

  card: {
    marginHorizontal: 16, marginTop: 12, padding: 16, borderRadius: 12,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF2F7',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  leftIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  name: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  category: { fontSize: 13, color: '#6B7280', marginTop: 2 },

  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  openBtn: {
    flex: 1, height: 50, borderRadius: 12, backgroundColor: '#22C55E',
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row',
  },
  openBtnText: { marginLeft: 8, color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  removeBtn: {
    width: 120, height: 50, borderRadius: 12, backgroundColor: '#FFE4E6',
    borderWidth: 1, borderColor: '#FCA5A5', alignItems: 'center', justifyContent: 'center', flexDirection: 'row',
  },
  removeBtnText: { marginLeft: 6, color: '#EF4444', fontSize: 15, fontWeight: '700' },
});
