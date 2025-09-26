// components/FavoriteButton.tsx
import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Heart } from 'lucide-react-native';
import { useFavorites } from '@/hooks/useFavorites';

type Props = {
  productId: string;
  productName?: string;
  variant?: 'solid' | 'outline';  // pour coller au style de la carte
};

export default function FavoriteButton({ productId, productName, variant = 'outline' }: Props) {
  const { check, toggle } = useFavorites();
  const [fav, setFav] = useState(false);

  useEffect(() => {
    let mounted = true;
    check(productId).then(v => mounted && setFav(!!v));
    return () => { mounted = false; };
  }, [productId, check]);

  const onPress = async () => {
    const nowFav = await toggle(productId, productName);
    setFav(nowFav);
  };

  if (variant === 'solid') {
    return (
      <TouchableOpacity style={styles.solidBtn} onPress={onPress} activeOpacity={0.85}>
        <Heart size={18} color="#FFFFFF" fill={fav ? '#FFFFFF' : 'transparent'} />
        <Text style={styles.solidTxt}>{fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.outlineBtn} onPress={onPress} activeOpacity={0.85}>
      <Heart size={18} color={fav ? '#22C55E' : '#2563EB'} fill={fav ? '#22C55E' : 'transparent'} />
      <Text style={[styles.outlineTxt, { color: fav ? '#22C55E' : '#2563EB' }]}>
        {fav ? 'Dans vos favoris' : 'Ajouter aux favoris'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  solidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    gap: 8,
  },
  solidTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#2563EB',
    borderWidth: 1,
    backgroundColor: '#EEF2FF',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 8,
  },
  outlineTxt: { fontWeight: '700', fontSize: 14 },
});
