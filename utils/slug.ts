export function utilSlugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/œ/g, 'oe') // Conversion spéciale pour œ
    .replace(/æ/g, 'ae') // Conversion spéciale pour æ
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, ''); // Supprime les tirets en début/fin
}