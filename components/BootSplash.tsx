import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Image, Animated } from 'react-native';
import { useRootNavigationState } from 'expo-router';

/**
 * Recouvre l'app avec un splash minimal (ton logo) jusqu'à ce que
 * la navigation racine soit prête, pour éviter l'écran furtif.
 */
export default function BootSplash({ minMs = 300 }: { minMs?: number }) {
  const navReady = !!useRootNavigationState()?.key;
  const [visible, setVisible] = useState(true);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let timer: any;
    if (navReady) {
      // petite durée mini pour éviter le "blink" et fondu de sortie
      timer = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true })
          .start(() => setVisible(false));
      }, minMs);
    }
    return () => clearTimeout(timer);
  }, [navReady, minMs, opacity]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity }]} pointerEvents="auto">
      <Image
        source={require('@/assets/images/Logo_Bolt.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F8FAFC', // fond cohérent avec l'app
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  logo: {
    width: 96,
    height: 96,
  },
});
