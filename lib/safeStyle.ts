// lib/safeStyle.ts
import { StyleSheet } from 'react-native';

/** Safe StyleSheet.create : si indisponible (web), renvoie l'objet tel quel. */
export function ss<T extends Record<string, any>>(obj: T): T {
  const anySS = StyleSheet as any;
  return anySS?.create ? anySS.create(obj) : obj;
}
