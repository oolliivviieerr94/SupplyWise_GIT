import React, { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../lib/supabase';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function ProductSuggestionModal({ visible, onClose }: Props) {
  const [productName, setProductName] = useState('');
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!productName.trim()) {
      Alert.alert('Oups', 'Le nom du produit est requis.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('product_suggestions').insert({
      product_name: productName.trim(),
      brand: brand.trim() || null,
      description: description.trim() || null,
      // user_id sera rempli automatiquement par le trigger SQL qu’on a créé
    });
    setLoading(false);
    if (error) {
      // si l’utilisateur n’est PAS connecté, la RLS refusera l’insert => message clair
      if (error.message.toLowerCase().includes('row-level security')) {
        Alert.alert('Connexion requise', "Veuillez vous connecter pour proposer un produit.");
      } else {
        Alert.alert('Erreur', error.message);
      }
      return;
    }
    Alert.alert('Merci !', 'Votre suggestion a bien été envoyée 👍');
    setProductName(''); setBrand(''); setDescription('');
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'center', padding: 16 }}>
        <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>Suggérer un produit</Text>

          <Text style={{ marginBottom: 4 }}>Nom du produit *</Text>
          <TextInput
            placeholder="Ex: Créatine monohydrate"
            value={productName}
            onChangeText={setProductName}
            style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 12 }}
          />

          <Text style={{ marginBottom: 4 }}>Marque</Text>
          <TextInput
            placeholder="Ex: XXX"
            value={brand}
            onChangeText={setBrand}
            style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 12 }}
          />

          <Text style={{ marginBottom: 4 }}>Description</Text>
          <TextInput
            placeholder="Lien, détails, etc."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, minHeight: 80 }}
          />

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 12 }}>
            <Pressable onPress={onClose} style={{ padding: 12 }}>
              <Text>Annuler</Text>
            </Pressable>
            <Pressable
              onPress={submit}
              style={{ backgroundColor: '#2563eb', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 }}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '600' }}>Envoyer</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
