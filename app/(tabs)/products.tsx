import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import {
  Package,
  Search,
  Filter,
  Award,
  Euro,
  ExternalLink,
  X,
  ArrowLeft,
  Plus,
  Star,
  ShoppingCart,
} from 'lucide-react-native';

type Product = {
  id: string;
  brand: string;
  name: string;
  gtin: string;
  format: string;
  price_reference?: number;
  certifications: string[];
  url?: string;
  created_at: string;
  updated_at: string;
};

export default function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [filters, setFilters] = useState({
    certifiedOnly: false,
    maxPrice: 1000,
    brand: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery, filters]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .order('brand', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setProducts(data || []);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des produits');
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    // Filtre par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.brand.toLowerCase().includes(query) ||
          product.gtin.includes(query)
      );
    }

    // Filtre par certification
    if (filters.certifiedOnly) {
      filtered = filtered.filter(product => product.certifications.length > 0);
    }

    // Filtre par prix
    if (filters.maxPrice < 1000) {
      filtered = filtered.filter(product => 
        !product.price_reference || product.price_reference <= filters.maxPrice
      );
    }

    // Filtre par marque
    if (filters.brand) {
      filtered = filtered.filter(product => 
        product.brand.toLowerCase().includes(filters.brand.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  };

  const resetFilters = () => {
    setFilters({
      certifiedOnly: false,
      maxPrice: 1000,
      brand: '',
    });
    setSearchQuery('');
  };

  const handleAddToCart = (product: Product) => {
    Alert.alert(
      'Ajouter au planning',
      `Voulez-vous ajouter ${product.name} à votre planning ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Ajouter',
          onPress: () => {
            Alert.alert('Ajouté', 'Produit ajouté à votre planning');
          },
        },
      ]
    );
  };

  const handleVerifyCertification = (certification: string) => {
    Alert.alert(
      'Vérification certification',
      `Redirection vers le site officiel de ${certification}`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Ouvrir', onPress: () => {} },
      ]
    );
  };

  const brands = Array.from(new Set(products.map(p => p.brand))).sort();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Package size={48} color="#7C3AED" />
        <Text style={styles.loadingText}>Chargement des produits...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#6B7280" />
        </TouchableOpacity>
        <Package size={32} color="#7C3AED" />
        <Text style={styles.title}>Catalogue produits</Text>
        <Text style={styles.subtitle}>
          {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''} disponible{filteredProducts.length > 1 ? 's' : ''}
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par nom, marque ou code-barres..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}>
          <Filter size={20} color="#7C3AED" />
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Erreur : {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadProducts}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredProducts.map((product) => (
          <TouchableOpacity
            key={product.id}
            style={styles.productCard}
            onPress={() => setSelectedProduct(product)}>
            <View style={styles.productHeader}>
              <View style={styles.productInfo}>
                <Text style={styles.productBrand}>{product.brand}</Text>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productFormat}>{product.format}</Text>
              </View>
              
              <View style={styles.productMeta}>
                {product.price_reference && (
                  <Text style={styles.productPrice}>{product.price_reference}€</Text>
                )}
                <Text style={styles.productGtin}>#{product.gtin}</Text>
              </View>
            </View>

            {product.certifications.length > 0 && (
              <View style={styles.certificationsRow}>
                {product.certifications.map((cert, index) => (
                  <View key={index} style={styles.certificationBadge}>
                    <Award size={12} color="#FFFFFF" />
                    <Text style={styles.certificationText}>{cert}</Text>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={styles.addButton}
              onPress={() => handleAddToCart(product)}>
              <Plus size={16} color="#7C3AED" />
              <Text style={styles.addButtonText}>Ajouter au planning</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        {filteredProducts.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Package size={64} color="#E5E7EB" />
            <Text style={styles.emptyTitle}>Aucun produit trouvé</Text>
            <Text style={styles.emptySubtitle}>
              Essayez de modifier vos critères de recherche
            </Text>
            <TouchableOpacity style={styles.resetFiltersButton} onPress={resetFilters}>
              <Text style={styles.resetFiltersText}>Réinitialiser les filtres</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.footer} />
      </ScrollView>

      {/* Modal Détails produit */}
      <Modal
        visible={!!selectedProduct}
        animationType="slide"
        presentationStyle="pageSheet">
        {selectedProduct && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalSubtitle}>{selectedProduct.brand}</Text>
                <Text style={styles.modalTitle}>{selectedProduct.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedProduct(null)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.productDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Format</Text>
                  <Text style={styles.detailValue}>{selectedProduct.format}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Code-barres</Text>
                  <Text style={styles.detailValue}>{selectedProduct.gtin}</Text>
                </View>

                {selectedProduct.price_reference && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Prix de référence</Text>
                    <Text style={styles.detailValue}>{selectedProduct.price_reference}€</Text>
                  </View>
                )}

                {selectedProduct.url && (
                  <TouchableOpacity style={styles.urlButton}>
                    <ExternalLink size={16} color="#7C3AED" />
                    <Text style={styles.urlButtonText}>Voir sur le site officiel</Text>
                  </TouchableOpacity>
                )}
              </View>

              {selectedProduct.certifications.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>🏆 Certifications</Text>
                  {selectedProduct.certifications.map((cert, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.certificationRow}
                      onPress={() => handleVerifyCertification(cert)}>
                      <Award size={20} color="#10B981" />
                      <View style={styles.certificationInfo}>
                        <Text style={styles.certificationName}>{cert}</Text>
                        <Text style={styles.certificationDescription}>
                          Produit certifié anti-dopage
                        </Text>
                      </View>
                      <ExternalLink size={16} color="#6B7280" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={styles.modalAddButton}
                onPress={() => {
                  handleAddToCart(selectedProduct);
                  setSelectedProduct(null);
                }}>
                <ShoppingCart size={20} color="#FFFFFF" />
                <Text style={styles.modalAddButtonText}>Ajouter au planning</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Modal Filtres */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtres</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Certifications</Text>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filters.certifiedOnly && styles.filterOptionActive,
                ]}
                onPress={() =>
                  setFilters({ ...filters, certifiedOnly: !filters.certifiedOnly })
                }>
                <Award size={20} color={filters.certifiedOnly ? '#FFFFFF' : '#6B7280'} />
                <Text
                  style={[
                    styles.filterOptionText,
                    filters.certifiedOnly && styles.filterOptionTextActive,
                  ]}>
                  Produits certifiés uniquement
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Prix maximum</Text>
              <Text style={styles.sliderLabel}>{filters.maxPrice}€</Text>
              <View style={styles.sliderContainer}>
                {/* Note: Slider component would need to be imported and used here */}
                <TextInput
                  style={styles.priceInput}
                  value={filters.maxPrice.toString()}
                  onChangeText={(text) => {
                    const price = parseInt(text) || 0;
                    setFilters({ ...filters, maxPrice: price });
                  }}
                  keyboardType="numeric"
                  placeholder="Prix max"
                />
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Marque</Text>
              <TextInput
                style={styles.brandInput}
                value={filters.brand}
                onChangeText={(text) => setFilters({ ...filters, brand: text })}
                placeholder="Filtrer par marque..."
              />
            </View>

            <View style={styles.filterActions}>
              <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                <Text style={styles.resetButtonText}>Réinitialiser</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setShowFilters(false)}>
                <Text style={styles.applyButtonText}>Appliquer</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    zIndex: 1,
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
    color: '#1F2937',
  },
  filterButton: {
    padding: 8,
    marginLeft: 8,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    marginBottom: 8,
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
  },
  productBrand: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C3AED',
    marginBottom: 2,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  productFormat: {
    fontSize: 14,
    color: '#6B7280',
  },
  productMeta: {
    alignItems: 'flex-end',
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  productGtin: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  certificationsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  certificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  certificationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#7C3AED',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
    marginLeft: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  resetFiltersButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resetFiltersText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    height: 100,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
    marginBottom: 4,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  productDetails: {
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 16,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  urlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  urlButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
    marginLeft: 6,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  certificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  certificationInfo: {
    flex: 1,
  },
  certificationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  certificationDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  modalAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  modalAddButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  filterOptionActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 8,
  },
  filterOptionTextActive: {
    color: '#FFFFFF',
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
    textAlign: 'center',
    marginBottom: 8,
  },
  sliderContainer: {
    paddingHorizontal: 16,
  },
  priceInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
    textAlign: 'center',
  },
  brandInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  resetButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  applyButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#7C3AED',
    borderRadius: 8,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});