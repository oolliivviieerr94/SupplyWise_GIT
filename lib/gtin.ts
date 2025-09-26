/**
 * Utilitaires pour la gestion des codes GTIN (EAN-13, UPC-A, etc.)
 */

/**
 * Normalise un code-barres en EAN-13
 * - UPC-A (12 chiffres) -> EAN-13 en préfixant 0
 * - Supprime tous les caractères non-numériques
 */
export function normalizeGtin(code: string): string {
  const digits = code.replace(/\D/g, '');
  
  // UPC-A (12 chiffres) -> EAN-13 en préfixant 0
  if (digits.length === 12) {
    return '0' + digits;
  }
  
  return digits;
}

/**
 * Valide un code EAN-13 avec vérification du checksum
 */
export function isValidEan13(ean: string): boolean {
  // Doit être exactement 13 chiffres
  if (!/^\d{13}$/.test(ean)) {
    return false;
  }
  
  const nums = ean.split('').map(Number);
  
  // Calcul du checksum EAN-13
  const sum = nums.slice(0, 12).reduce((acc, digit, index) => {
    return acc + digit * (index % 2 === 0 ? 1 : 3);
  }, 0);
  
  const checkDigit = (10 - (sum % 10)) % 10;
  
  return checkDigit === nums[12];
}

/**
 * Valide un code EAN-8 avec vérification du checksum
 */
export function isValidEan8(ean8: string): boolean {
  // Doit être exactement 8 chiffres
  if (!/^\d{8}$/.test(ean8)) {
    return false;
  }
  
  const nums = ean8.split('').map(Number);
  
  // Calcul du checksum EAN-8
  const sum = nums.slice(0, 7).reduce((acc, digit, index) => {
    return acc + digit * (index % 2 === 0 ? 3 : 1);
  }, 0);
  
  const checkDigit = (10 - (sum % 10)) % 10;
  
  return checkDigit === nums[7];
}

/**
 * Valide EAN-13 OU EAN-8 (et UPC-A via normalizeGtin -> EAN-13)
 */
export function isValidGtin(code: string): boolean {
  return isValidEan13(code) || isValidEan8(code);
}

/**
 * Formate un GTIN pour l'affichage
 */
export function formatGtin(gtin: string): string {
  if (gtin.length === 13) {
    // Format EAN-13: 123 4567 890123
    return `${gtin.slice(0, 3)} ${gtin.slice(3, 7)} ${gtin.slice(7, 13)}`;
  }
  return gtin;
}

/**
 * Formate EAN-8 joliment
 */
export function formatEan8(ean8: string): string {
  if (/^\d{8}$/.test(ean8)) {
    return `${ean8.slice(0, 4)} ${ean8.slice(4)}`;
  }
  return ean8;
}
/**
 * Détecte le type de code-barres
 */
export function getGtinType(gtin: string): string {
  const length = gtin.length;
  
  switch (length) {
    case 8:
      return 'EAN-8';
    case 12:
      return 'UPC-A';
    case 13:
      return 'EAN-13';
    case 14:
      return 'GTIN-14';
    default:
      return 'Inconnu';
  }
}