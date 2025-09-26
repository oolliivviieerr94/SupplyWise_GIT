// app/(tabs)/_layout.tsx
import { Stack } from 'expo-router';
import { AuthListener } from '@/components/AuthListener';

export default function RootLayout() {
  return (
    <>
      <AuthListener />
      {/* On laisse Expo Router choisir la route du groupe (tabs) → meilleur hot-reload */}
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
