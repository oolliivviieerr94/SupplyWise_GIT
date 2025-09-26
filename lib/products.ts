import { supabase } from './supabase';

export type Product = {
  gtin: string;
  name?: string | null;
  brand?: string | null;
  image_url?: string | null;
  off_code?: string | null;
  off_last_fetch?: string | null;
  status?: string;
};

/**
 * Récupère un produit depuis la base locale
 */
export async function getLocalProduct(gtin: string): Promise<Product | null> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('gtin', gtin)
      .maybeSingle();

    if (error) {
      console.error('Error fetching local product:', error);
      return null;
    }

    return data as Product;
  } catch (error) {
    console.error('Error in getLocalProduct:', error);
    return null;
  }
}

/**
 * Récupère un produit depuis l'API Open Food Facts
 */
async function fetchFromOFF(gtin: string): Promise<Product | null> {
  try {
    console.log('🌐 Fetching product from Open Food Facts:', gtin);
    
    // Liste des champs utiles (v2)
    const fields = [
      'code',
      'product_name', 'product_name_fr',
      'brands', 'brands_tags',
      'image_small_url',
      'quantity', 'serving_size',
      'nutriments',
      'nutriscore_grade',
      'nova_group',
      'categories_tags',
      'labels_tags',
      'allergens_tags',
      'ingredients_text_fr', 'ingredients_text',
      'url'
    ].join(',');

    const url = `https://world.openfoodfacts.org/api/v2/product/${gtin}.json?fields=${encodeURIComponent(fields)}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.log('❌ OFF API response not ok:', response.status);
      return null;
    }

    const json = await response.json();
    const p = json?.product;
    if (!p) {
      console.log('❌ No product found in OFF response');
      return null;
    }

    // Nom priorisant le FR
    const name = p.product_name_fr || p.product_name || undefined;
    
    // Marque : tag prioritaire sinon string
    let brand: string | undefined = undefined;
    if (Array.isArray(p.brands_tags) && p.brands_tags.length > 0) brand = p.brands_tags[0];
    else if (p.brands) brand = p.brands;

    const result: Product = {
      gtin,
      name,
      brand,
      image_url: p.image_small_url,
      off_code: p.code,

      // Nouveaux champs
      quantity: p.quantity || null,
      serving_size: p.serving_size || null,
      nutriments: p.nutriments || null,
      nutriscore_grade: p.nutriscore_grade || null,
      nova_group: typeof p.nova_group === 'number' ? p.nova_group : (p.nova_group ? Number(p.nova_group) : null),
      categories: Array.isArray(p.categories_tags) ? p.categories_tags : null,
      labels: Array.isArray(p.labels_tags) ? p.labels_tags : null,
      allergens: Array.isArray(p.allergens_tags) ? p.allergens_tags : null,
      ingredients_text: p.ingredients_text_fr || p.ingredients_text || null,
      off_url: p.url || null,
    };

    console.log('✅ Product from OFF:', result);
    return result;

  } catch (error) {
    console.error('Error fetching from OFF:', error);
    return null;
  }
}

/**
 * Sauvegarde un produit dans la base locale
 */
async function upsertLocalProduct(product: Product): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('ℹ️ User not logged in, skipping local product save');
      return; // si pas connecté, on ne tente pas l'écriture
    }

    const { error } = await supabase
      .from('products')
      .upsert({
        gtin: product.gtin,
        name: product.name,
        brand: product.brand,
        image_url: product.image_url,
        off_code: product.off_code,
        off_last_fetch: new Date().toISOString(),
        status: product.status ?? 'unverified',

        quantity: product.quantity ?? null,
        serving_size: product.serving_size ?? null,
        nutriments: product.nutriments ?? null,
        nutriscore_grade: product.nutriscore_grade ?? null,
        nova_group: product.nova_group ?? null,
        categories: product.categories ?? null,
        labels: product.labels ?? null,
        allergens: product.allergens ?? null,
        ingredients_text: product.ingredients_text ?? null,
        off_url: product.off_url ?? null,
      });

    if (error) {
      console.error('Error upserting local product:', error);
      throw error;
    }

    console.log('✅ Product saved locally:', product.gtin);
  } catch (error) {
    console.error('Error in upsertLocalProduct:', error);
    throw error;
  }
}

/**
 * Crée une suggestion de produit inconnu
 */
async function createProductSuggestion(gtin: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('product_suggestions')
      .insert({
        product_name: null,
        brand: null,
        description: `Produit scanné inconnu - GTIN: ${gtin}`,
      });

    if (error) {
      console.error('Error creating product suggestion:', error);
      // Ne pas throw ici car ce n'est pas critique
    } else {
      console.log('✅ Product suggestion created for unknown GTIN:', gtin);
    }
  } catch (error) {
    console.error('Error in createProductSuggestion:', error);
    // Ne pas throw ici car ce n'est pas critique
  }
}

/**
 * Flow principal : recherche locale → Open Food Facts → suggestion
 * 
 * 1. Cherche d'abord dans la base locale
 * 2. Si pas trouvé, interroge Open Food Facts
 * 3. Si trouvé dans OFF, sauvegarde localement
 * 4. Si pas trouvé du tout, crée une suggestion
 */
export async function findOrFetchProduct(gtin: string): Promise<Product | null> {
  console.log('🔍 Starting product search for GTIN:', gtin);

  try {
    // 1) Recherche locale
    console.log('📱 Checking local database...');
    const localProduct = await getLocalProduct(gtin);
    if (localProduct) {
      console.log('✅ Product found locally:', localProduct.name);
      return localProduct;
    }

    // 2) Recherche dans Open Food Facts
    console.log('🌐 Checking Open Food Facts...');
    const offProduct = await fetchFromOFF(gtin);
    if (offProduct) {
      console.log('✅ Product found in OFF, saving locally...');
      await upsertLocalProduct(offProduct);
      return offProduct;
    }

    // 3) Produit inconnu - créer une suggestion
    console.log('❓ Product not found, creating suggestion...');
    await createProductSuggestion(gtin);
    return null;

  } catch (error) {
    console.error('❌ Error in findOrFetchProduct:', error);
    throw error;
  }
}

/**
 * Rafraîchit un produit depuis Open Food Facts
 * Utile pour les produits déjà en base mais qu'on veut mettre à jour
 */
export async function refreshProductFromOFF(gtin: string): Promise<Product | null> {
  try {
    console.log('🔄 Refreshing product from OFF:', gtin);
    
    const offProduct = await fetchFromOFF(gtin);
    if (offProduct) {
      await upsertLocalProduct(offProduct);
      return offProduct;
    }
    
    return null;
  } catch (error) {
    console.error('Error refreshing product from OFF:', error);
    throw error;
  }
}

/**
 * Marque un produit comme vérifié par un admin
 */
export async function markProductAsVerified(gtin: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('products')
      .update({ status: 'verified' })
      .eq('gtin', gtin);

    if (error) {
      throw error;
    }

    console.log('✅ Product marked as verified:', gtin);
  } catch (error) {
    console.error('Error marking product as verified:', error);
    throw error;
  }
}

/**
 * Marque un produit comme rejeté par un admin
 */
export async function markProductAsRejected(gtin: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('products')
      .update({ status: 'rejected' })
      .eq('gtin', gtin);

    if (error) {
      throw error;
    }

    console.log('✅ Product marked as rejected:', gtin);
  } catch (error) {
    console.error('Error marking product as rejected:', error);
    throw error;
  }
}