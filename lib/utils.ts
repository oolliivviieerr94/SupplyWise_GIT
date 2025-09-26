/**
 * Convertit une chaîne en slug compatible avec la base de données
 * - Convertit en minuscules
 * - Supprime les accents
 * - Remplace les espaces par des tirets
 * - Supprime les caractères non [a-z0-9-]
 */
export function utilSlugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/\s+/g, '-') // Espaces → tirets
    .replace(/[^a-z0-9-]/g, '') // Garde seulement a-z, 0-9, -
    .replace(/-+/g, '-') // Supprime les tirets multiples
    .replace(/^-|-$/g, ''); // Supprime les tirets en début/fin
}