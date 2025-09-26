// types/expo-router.d.ts
import 'expo-router';

declare module 'expo-router' {
  // Liste ici uniquement les routes que tu utilises avec router.push/replace/navigate
  export type Href =
    | '/'                    // index -> redirige selon session/profil
    | '/welcome-current'     // home canonique
    | '/auth'
    | '/onboarding'
    | '/(tabs)'
    | '/(tabs)/dashboard'
    | '/forgot-password'
    | '/account-success';
}

export {};
