import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { normalizeGtin, isValidGtin, formatGtin, getGtinType, formatEan8 } from '@/lib/gtin';
import { findOrFetchProduct, type Product } from '@/lib/products';
import { supabase } from '@/lib/supabase';
import { Scan, Camera, Package, Plus, Award, ExternalLink, X, ArrowLeft, CircleAlert as AlertCircle, CircleCheck as CheckCircle, Zap, Search } from 'lucide-react-native';

export default function ScannerScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [unknownBarcode, setUnknownBarcode] = useState('');
  const [scanning, setScanning] = useState(false);
  const lastScanRef = useRef<string | null>(null);

  const [newProduct, setNewProduct] = useState({
    brand: '',
    name: '',
    format: 'poudre',
    price: '',
    ingredients: '',
  });

  useEffect(() => {
    getBarCodeScannerPermissions();
  }, []);

  const getBarCodeScannerPermissions = async () => {
    const { status } = await BarCodeScanner.requestPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanning) return;
    
    console.log('📷 Raw code scanned:', data, 'type:', type);

    const gtin = normalizeGtin(data);
    console.log('🔄 Normalized GTIN:', gtin);

    if (!isValidGtin(gtin)) {
      console.log('❌ Invalid barcode:', gtin);
      return;
    }

    // Anti-doublon court
    if (lastScanRef.current === gtin) {
      console.log('🔄 Duplicate scan ignored:', gtin);
      return;
    }
    lastScanRef.current = gtin;

    setScanning(true);
    setScannerActive(false);
    setScanned(true);

    try {
      console.log('🔍 Searching for product:', gtin);
      const product = await findOrFetchProduct(gtin);
      
      // Log du scan
      await logProductScan(gtin);
      
      if (product) {
        console.log('✅ Product found:', product);
        setFoundProduct(product);
      } else {
        console.log('❓ Product not found, opening suggestion form');
        setUnknownBarcode(gtin);
        setShowAddForm(true);
      }
    } catch (error: any) {
      console.error('❌ Error during scan processing:', error);
      Alert.alert('Erreur de scan', error.message || 'Erreur lors du traitement du scan');
    } finally {
      setTimeout(() => {
        setScanning(false);
      }, 1200);
    }
  };

  const startScanning = () => {
    setScanned(false);
    setFoundProduct(null);
    setScannerActive(true);
    lastScanRef.current = null;
  };

  const handleAssociateProduct = () => {
    if (!foundProduct) return;

    Alert.alert(
      'Associer au protocole',
      `Voulez-vous ajouter ${foundProduct.name} à votre liste de produits favoris ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Associer',
          onPress: () => {
            Alert.alert('Associé', 'Produit ajouté à vos favoris');
            setFoundProduct(null);
          },
        },
      ]
    );
  };

  const handleAddNewProduct = async () => {
    if (!newProduct.brand.trim() || !newProduct.name.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir au minimum la marque et le nom du produit');
      return;
    }

    try {
      const { error } = await supabase
        .from('product_suggestions')
        .insert({
          product_name: `${newProduct.brand} - ${newProduct.name}`,
          brand: newProduct.brand.trim(),
          description: `Format: ${newProduct.format}\nPrix: ${newProduct.price}€\nIngrédients: ${newProduct.ingredients}\nGTIN: ${unknownBarcode}`,
        });

      if (error) {
        throw error;
      }

      Alert.alert(
        'Produit suggéré',
        'Votre suggestion a été envoyée à notre équipe pour validation',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowAddForm(false);
              setNewProduct({ brand: '', name: '', format: 'poudre', price: '', ingredients: '' });
              setUnknownBarcode('');
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error adding product suggestion:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer la suggestion');
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.title}>Scanner de produits</Text>
        </View>
        <View style={styles.permissionContainer}>
          <Camera size={64} color="#6B7280" />
          <Text style={styles.permissionText}>
            Demande d'autorisation d'accès à la caméra...
          </Text>
        </View>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.title}>Scanner de produits</Text>
        </View>
        <View style={styles.permissionContainer}>
          <Camera size={64} color="#6B7280" />
          <Text style={styles.permissionTitle}>Accès caméra requis</Text>
          <Text style={styles.permissionText}>
            L'accès à la caméra est nécessaire pour scanner les codes-barres des produits
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={getBarCodeScannerPermissions}>
            <Text style={styles.permissionButtonText}>Autoriser l'accès</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#6B7280" />
        </TouchableOpacity>
        <Scan size={32} color="#2563EB" />
        <Text style={styles.title}>Scanner de produits</Text>
        <Text style={styles.subtitle}>
          Scannez le code-barres d'un complément pour l'identifier
        </Text>
      </View>

      {scannerActive ? (
        <View style={styles.scannerContainer}>
          <BarCodeScanner
            onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
            style={StyleSheet.absoluteFillObject}
            barCodeTypes={[
              BarCodeScanner.Constants.BarCodeType.ean13,
              BarCodeScanner.Constants.BarCodeType.ean8,
              BarCodeScanner.Constants.BarCodeType.upc_a,
              BarCodeScanner.Constants.BarCodeType.upc_e,
              BarCodeScanner.Constants.BarCodeType.code128,
            ]}
          />
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrame} />
            <Text style={styles.scannerInstruction}>
              Placez le code-barres dans le cadre
            </Text>
            <View style={styles.scannerInfo}>
              <Text style={styles.scannerInfoText}>
                Formats supportés : EAN-13, EAN-8, UPC-A, UPC-E, CODE-128
              </Text>
            </View>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setScannerActive(false)}>
              <X size={20} color="#FFFFFF" />
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.scanSection}>
            <Package size={80} color="#E5E7EB" />
            <TouchableOpacity style={styles.scanButton} onPress={startScanning}>
              <Scan size={24} color="#FFFFFF" />
              <Text style={styles.scanButtonText}>Scanner un code-barres</Text>
            </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.scanButton, { backgroundColor: '#7C3AED', marginTop: 12 }]}
            onPress={async () => {
              try {
                const p = await findOrFetchProduct('3017620422003'); // Nutella (exemple)
                console.log('Test OFF result:', p);
                if (p) setFoundProduct(p);
                else Alert.alert('Test', 'Produit OFF introuvable');
              } catch (e: any) {
                Alert.alert('Erreur', e.message);
              }
            }}>
            <Text style={styles.scanButtonText}>Tester OFF (Nutella)</Text>
          </TouchableOpacity>
          
            <Text style={styles.supportedFormats}>
              Formats supportés : EAN-13, EAN-8, UPC-A, UPC-E, CODE-128
            </Text>
            
            <View style={styles.featuresContainer}>
              <View style={styles.featureItem}>
                <Zap size={20} color="#22C55E" />
                <Text style={styles.featureText}>Recherche instantanée</Text>
              </View>
              <View style={styles.featureItem}>
                <Search size={20} color="#2563EB" />
                <Text style={styles.featureText}>Base Open Food Facts</Text>
              </View>
              <View style={styles.featureItem}>
                <Plus size={20} color="#7C3AED" />
                <Text style={styles.featureText}>Suggestions automatiques</Text>
              </View>
            </View>
          </View>

          {foundProduct && (
            <View style={styles.productCard}>
              <View style={styles.productHeader}>
                <View style={styles.productInfo}>
                  <Text style={styles.productBrand}>{foundProduct.brand || 'Marque inconnue'}</Text>
                  <Text style={styles.productName}>{foundProduct.name || 'Nom non disponible'}</Text>
                  <Text style={styles.productGtin}>
                    {getGtinType(foundProduct.gtin)}:{' '}
                    {foundProduct.gtin.length === 8 ? formatEan8(foundProduct.gtin) : formatGtin(foundProduct.gtin)}
                  </Text>
                </View>
                
                {foundProduct.image_url && (
                  <Image
                    source={{ uri: foundProduct.image_url }}
                    style={styles.productImage}
                    resizeMode="contain"
                  />
                )}
              </View>

              <View style={styles.productStatus}>
                <CheckCircle size={16} color="#22C55E" />
                <Text style={styles.productStatusText}>
                  Produit trouvé dans {foundProduct.off_code ? 'Open Food Facts' : 'notre base'}
                </Text>
              </View>

              <View style={styles.productActions}>
                <TouchableOpacity
                  style={styles.associateButton}
                  onPress={handleAssociateProduct}>
                  <Plus size={20} color="#FFFFFF" />
                  <Text style={styles.associateButtonText}>Ajouter aux favoris</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.suggestButton}
                  onPress={() => {
                    setUnknownBarcode(foundProduct.gtin);
                    setNewProduct({
                      brand: foundProduct.brand || '',
                      name: foundProduct.name || '',
                      format: 'poudre',
                      price: '',
                      ingredients: '',
                    });
                    setShowAddForm(true);
                  }}>
                  <Text style={styles.suggestButtonText}>Suggérer l'analyse</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.suggestButton}
                  onPress={() => setShowDetails(true)}>
                  <Text style={styles.suggestButtonText}>Voir les détails</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Modal Ajout produit inconnu */}
      <Modal
        visible={showAddForm}
        animationType="slide"
        presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Suggérer ce produit</Text>
            <TouchableOpacity onPress={() => setShowAddForm(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.barcodeInfo}>
              <Text style={styles.barcodeLabel}>Code-barres scanné :</Text>
              <Text style={styles.barcodeValue}>
                {getGtinType(unknownBarcode)}:{' '}
                {unknownBarcode.length === 8 ? formatEan8(unknownBarcode) : formatGtin(unknownBarcode)}
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Marque *</Text>
              <TextInput
                style={styles.formInput}
                value={newProduct.brand}
                onChangeText={(text) => setNewProduct({ ...newProduct, brand: text })}
                placeholder="Ex: Optimum Nutrition"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nom du produit *</Text>
              <TextInput
                style={styles.formInput}
                value={newProduct.name}
                onChangeText={(text) => setNewProduct({ ...newProduct, name: text })}
                placeholder="Ex: Gold Standard Whey"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Format</Text>
              <TextInput
                style={styles.formInput}
                value={newProduct.format}
                onChangeText={(text) => setNewProduct({ ...newProduct, format: text })}
                placeholder="Ex: Poudre 2.27kg"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Prix approximatif (€)</Text>
              <TextInput
                style={styles.formInput}
                value={newProduct.price}
                onChangeText={(text) => setNewProduct({ ...newProduct, price: text })}
                placeholder="Ex: 59.99"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Ingrédients principaux</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={newProduct.ingredients}
                onChangeText={(text) => setNewProduct({ ...newProduct, ingredients: text })}
                placeholder="Ex: Whey, BCAA, Glutamine"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formNote}>
              <Text style={styles.formNoteText}>
                💡 Cette suggestion sera examinée par notre équipe et ajoutée à la base de données si elle est validée.
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                (!newProduct.brand.trim() || !newProduct.name.trim()) && styles.submitButtonDisabled,
              ]}
              onPress={handleAddNewProduct}
              disabled={!newProduct.brand.trim() || !newProduct.name.trim()}>
              <Plus size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Envoyer la suggestion</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal Détails produit */}
      <Modal
        visible={showDetails}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetails(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Détails du produit</Text>
            <TouchableOpacity onPress={() => setShowDetails(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {!!foundProduct?.image_url && (
              <Image 
                source={{ uri: foundProduct.image_url }} 
                style={{ width: '100%', height: 160, borderRadius: 12, marginBottom: 16 }} 
                resizeMode="cover" 
              />
            )}
            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 4 }}>
              {foundProduct?.name || 'Nom indisponible'}
            </Text>
            <Text style={{ color: '#6B7280', marginBottom: 12 }}>
              {foundProduct?.brand || 'Marque inconnue'}
            </Text>

            {/* Nutri-Score / NOVA */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              {!!foundProduct?.nutriscore_grade && (
                <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                  <Text style={{ fontWeight: '700' }}>
                    Nutri-Score : {String(foundProduct.nutriscore_grade).toUpperCase()}
                  </Text>
                </View>
              )}
              {!!foundProduct?.nova_group && (
                <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                  <Text style={{ fontWeight: '700' }}>NOVA : {foundProduct.nova_group}</Text>
                </View>
              )}
            </View>

            {/* Quantité / Portion */}
            <Text style={{ color: '#374151', marginBottom: 8 }}>
              {foundProduct?.quantity ? `Quantité : ${foundProduct.quantity}` : ''}
              {foundProduct?.serving_size ? `   •   Portion : ${foundProduct.serving_size}` : ''}
            </Text>

            {/* Macros (par 100 g / ml si dispo) */}
            {foundProduct?.nutriments && (
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>
                  Valeurs nutritionnelles (pour 100g/100ml)
                </Text>
                {[
                  ['Énergie (kcal)', 'energy-kcal_100g'],
                  ['Protéines', 'proteins_100g'],
                  ['Glucides', 'carbohydrates_100g'],
                  ['Sucres', 'sugars_100g'],
                  ['Lipides', 'fat_100g'],
                  ['Saturés', 'saturated-fat_100g'],
                  ['Fibres', 'fiber_100g'],
                  ['Sel', 'salt_100g'],
                ].map(([label, key]) => {
                  const val = foundProduct.nutriments?.[key as any];
                  if (val == null) return null;
                  return (
                    <View 
                      key={key as string} 
                      style={{ 
                        flexDirection: 'row', 
                        justifyContent: 'space-between', 
                        paddingVertical: 6, 
                        borderBottomWidth: 1, 
                        borderBottomColor: '#F3F4F6' 
                      }}>
                      <Text style={{ color: '#374151' }}>{label}</Text>
                      <Text style={{ fontWeight: '700' }}>{val}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Ingrédients */}
            {!!foundProduct?.ingredients_text && (
              <View style={{ marginTop: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 6 }}>Ingrédients</Text>
                <Text style={{ color: '#374151', lineHeight: 20 }}>{foundProduct.ingredients_text}</Text>
              </View>
            )}

            {/* Lien OFF */}
            {!!foundProduct?.off_url && (
              <TouchableOpacity
                onPress={() => { /* Linking.openURL(foundProduct.off_url!) */ }}
                style={{ 
                  marginTop: 16, 
                  alignSelf: 'flex-start', 
                  backgroundColor: '#F0F9FF', 
                  paddingHorizontal: 12, 
                  paddingVertical: 8, 
                  borderRadius: 8 
                }}>
                <Text style={{ color: '#1D4ED8', fontWeight: '700' }}>
                  Ouvrir dans Open Food Facts
                </Text>
              </TouchableOpacity>
            )}
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
    textAlign: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanSection: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 32,
    marginBottom: 16,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  scanButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  supportedFormats: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  featuresContainer: {
    gap: 12,
    alignItems: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  featureText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  scannerContainer: {
    flex: 1,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  scannerFrame: {
    width: 280,
    height: 120,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  scannerInstruction: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 32,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  scannerInfo: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 16,
  },
  scannerInfoText: {
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 48,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  productHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  productInfo: {
    flex: 1,
  },
  productBrand: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
    marginBottom: 4,
  },
  productName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  productGtin: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'monospace',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginLeft: 16,
  },
  productStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  productStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#15803D',
    marginLeft: 8,
  },
  productActions: {
    gap: 12,
  },
  associateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 8,
  },
  associateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  suggestButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#7C3AED',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  suggestButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
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
  modalContent: {
    flex: 1,
    padding: 20,
  },
  barcodeInfo: {
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
  },
  barcodeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  barcodeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E40AF',
    fontFamily: 'monospace',
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  formTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  formNote: {
    backgroundColor: '#FFFBEB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  formNoteText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 24,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});