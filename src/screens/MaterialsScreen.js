/**
 * FUTO Learn — Materials Screen
 *
 * Main hub for uploaded course materials.
 * - Upload button opens file picker (PDF/DOCX)
 * - Materials shown as cards (max 3 per row, centered)
 * - Each card has a delete button in the top-right corner
 * - Tapping a card navigates to KnowledgeLevelScreen
 */

import React, {useState, useCallback} from 'react';
import {
  Alert,
  FlatList,
  Modal,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import {Text, useTheme} from 'react-native-paper';
import {useDispatch, useSelector} from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {
  addMaterial,
  deleteMaterial,
  selectMaterials,
} from '../store/slices/materialsSlice';
import {pickDocument, extractTextFromFile, getExtFromMime, getFileTypeLabel} from '../utils/fileService';
import {
  saveExtractedText,
  copyFileToAppStorage,
  deleteMaterialFiles,
  saveMaterialsMeta,
} from '../utils/storageService';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const CARD_MARGIN = 10;
const CARDS_PER_ROW = 3;
const CARD_SIZE = (SCREEN_WIDTH - CARD_MARGIN * (CARDS_PER_ROW + 1) * 2) / CARDS_PER_ROW;

const MaterialsScreen = ({navigation}) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const materials = useSelector(selectMaterials);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState(''); // message shown during upload
  const [titleModalVisible, setTitleModalVisible] = useState(false);
  const [pendingMaterial, setPendingMaterial] = useState(null);
  const [titleInput, setTitleInput] = useState('');

  // ─── Upload Flow ─────────────────────────────────────────────────────────

  const handleUpload = useCallback(async () => {
    try {
      setUploadStep('Opening file picker...');
      setIsUploading(true);

      const file = await pickDocument();
      if (!file) {
        setIsUploading(false);
        return;
      }

      setUploadStep('Reading file...');
      const {uri, name, type: mimeType} = file;

      // For scanned PDFs this will use Gemini OCR — update message after a short delay
      const ocrHintTimer = setTimeout(() => {
        setUploadStep('Using AI to read your document...\nThis may take up to 30 seconds for scanned files.');
      }, 4000);

      const result = await extractTextFromFile(uri, mimeType);
      clearTimeout(ocrHintTimer);

      if (!result.success) {
        setIsUploading(false);
        Alert.alert('Cannot Read File', result.error);
        return;
      }

      // Store pending material data for title prompt
      setPendingMaterial({uri, name, mimeType, extractedText: result.text});
      setTitleInput(name?.replace(/\.(pdf|docx)$/i, '') || '');
      setIsUploading(false);
      setTitleModalVisible(true);
    } catch (err) {
      setIsUploading(false);
      console.warn('[MaterialsScreen] Upload error:', err);
      Alert.alert('Upload Failed', 'Something went wrong. Please try again.');
    }
  }, []);

  const handleConfirmTitle = useCallback(async () => {
    if (!titleInput.trim()) {
      Alert.alert('Title Required', 'Please enter a title for this material.');
      return;
    }
    if (!pendingMaterial) {return;}

    setTitleModalVisible(false);
    setIsUploading(true);
    setUploadStep('Saving material...');

    try {
      const id = `mat_${Date.now()}`;
      const ext = getExtFromMime(pendingMaterial.mimeType);
      const fileTypeLabel = getFileTypeLabel(pendingMaterial.mimeType);

      // Copy source file to app storage
      const filePath = await copyFileToAppStorage(
        pendingMaterial.uri,
        id,
        ext,
      );

      // Save extracted text to filesystem
      const extractedTextPath = await saveExtractedText(
        id,
        pendingMaterial.extractedText,
      );

      const newMaterial = {
        id,
        title: titleInput.trim(),
        fileName: pendingMaterial.name,
        fileType: fileTypeLabel,
        filePath,
        extractedTextPath,
        createdAt: new Date().toISOString(),
      };

      dispatch(addMaterial(newMaterial));

      // Persist updated list to AsyncStorage
      const updatedList = [...materials, {...newMaterial, instances: {some_understanding: [], no_knowledge: []}}];
      await saveMaterialsMeta(updatedList);

      setPendingMaterial(null);
      setTitleInput('');
    } catch (err) {
      console.warn('[MaterialsScreen] Save error:', err);
      Alert.alert('Save Failed', 'Could not save the material. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadStep('');
    }
  }, [titleInput, pendingMaterial, dispatch, materials]);

  // ─── Delete Flow ─────────────────────────────────────────────────────────

  const handleDelete = useCallback(
    material => {
      Alert.alert(
        'Delete Material',
        `Are you sure you want to delete "${material.title}"? All generated lessons for this material will also be deleted.`,
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              dispatch(deleteMaterial(material.id));
              await deleteMaterialFiles(material);

              // Persist updated list
              const updatedList = materials.filter(m => m.id !== material.id);
              await saveMaterialsMeta(updatedList.map(m => ({
                ...m,
                instances: m.instances || {some_understanding: [], no_knowledge: []},
              })));
            },
          },
        ],
      );
    },
    [dispatch, materials],
  );

  // ─── Navigation ───────────────────────────────────────────────────────────

  const handleCardPress = useCallback(
    material => {
      navigation.navigate('KnowledgeLevel', {material});
    },
    [navigation],
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  const renderCard = ({item}) => (
    <View style={styles.cardWrapper}>
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.cardBackground,
            borderColor: theme.colors.outline,
          },
        ]}
        onPress={() => handleCardPress(item)}
        activeOpacity={0.75}>

        {/* File type badge */}
        <View
          style={[
            styles.typeBadge,
            {
              backgroundColor:
                item.fileType === 'PDF'
                  ? '#E74C3C22'
                  : '#0066CC22',
            },
          ]}>
          <Text
            style={[
              styles.typeBadgeText,
              {color: item.fileType === 'PDF' ? '#E74C3C' : '#0066CC'},
            ]}>
            {item.fileType}
          </Text>
        </View>

        {/* Icon */}
        <View style={styles.cardIconWrap}>
          <Icon
            name={item.fileType === 'PDF' ? 'file-pdf-box' : 'file-word-box'}
            size={38}
            color={item.fileType === 'PDF' ? '#E74C3C' : '#0066CC'}
          />
        </View>

        {/* Title */}
        <Text
          style={[styles.cardTitle, {color: theme.colors.textPrimary}]}
          numberOfLines={2}>
          {item.title}
        </Text>

        {/* Delete button */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(item)}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Icon name="close-circle" size={20} color="#E74C3C" />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Icon name="book-open-variant" size={72} color={theme.colors.outline} />
      <Text
        variant="titleMedium"
        style={[styles.emptyTitle, {color: theme.colors.textPrimary}]}>
        No Materials Yet
      </Text>
      <Text
        variant="bodyMedium"
        style={[styles.emptySubtitle, {color: theme.colors.textSecondary}]}>
        Upload a PDF or DOCX file to get started.{'\n'}The AI will create a personalized lesson for you.
      </Text>
    </View>
  );

  return (
    <View
      style={[styles.safeArea, {backgroundColor: theme.colors.background}]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.colors.headerBackground}
        translucent={false}
      />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.headerBackground,
            paddingTop: insets.top + 10,
          },
        ]}>
        <Icon name="book" size={24} color="#FFFFFF" />
        <Text style={styles.headerTitle}>Materials</Text>
        <TouchableOpacity
          style={[
            styles.uploadBtn,
            {backgroundColor: 'rgba(255,255,255,0.2)'},
          ]}
          onPress={handleUpload}
          disabled={isUploading}>
          <Icon name="upload" size={18} color="#FFFFFF" />
          <Text style={styles.uploadBtnText}>Upload</Text>
        </TouchableOpacity>
      </View>

      {/* Material Cards Grid */}
      <FlatList
        data={materials}
        keyExtractor={item => item.id}
        numColumns={CARDS_PER_ROW}
        renderItem={renderCard}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          materials.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
      />

      {/* Upload Loading Overlay */}
      {isUploading && (
        <View style={styles.loadingOverlay}>
          <View
            style={[
              styles.loadingCard,
              {backgroundColor: theme.colors.cardBackground},
            ]}>
            <ActivityIndicator
              size="large"
              color={theme.colors.primary}
              style={styles.loadingSpinner}
            />
            <Text
              style={[styles.loadingText, {color: theme.colors.textPrimary}]}>
              {uploadStep || 'Processing...'}
            </Text>
          </View>
        </View>
      )}

      {/* Title Input Modal */}
      <Modal
        visible={titleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setTitleModalVisible(false);
          setPendingMaterial(null);
        }}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {backgroundColor: theme.colors.cardBackground},
            ]}>
            <Icon
              name="tag-text-outline"
              size={32}
              color={theme.colors.primary}
              style={styles.modalIcon}
            />
            <Text
              variant="titleLarge"
              style={[styles.modalTitle, {color: theme.colors.textPrimary}]}>
              Name Your Material
            </Text>
            <Text
              variant="bodyMedium"
              style={[styles.modalSub, {color: theme.colors.textSecondary}]}>
              Give this course material a title so you can find it easily.
            </Text>
            <TextInput
              style={[
                styles.titleInput,
                {
                  color: theme.colors.textPrimary,
                  borderColor: theme.colors.primary,
                  backgroundColor: theme.colors.background,
                },
              ]}
              value={titleInput}
              onChangeText={setTitleInput}
              placeholder="e.g. Thermodynamics Notes"
              placeholderTextColor={theme.colors.textSecondary}
              autoFocus
              maxLength={60}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  styles.modalBtnCancel,
                  {borderColor: theme.colors.outline},
                ]}
                onPress={() => {
                  setTitleModalVisible(false);
                  setPendingMaterial(null);
                }}>
                <Text style={[styles.modalBtnText, {color: theme.colors.textSecondary}]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  styles.modalBtnConfirm,
                  {backgroundColor: theme.colors.primary},
                ]}
                onPress={handleConfirmTitle}>
                <Text style={[styles.modalBtnText, {color: '#FFFFFF'}]}>
                  Save Material
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 10,
    flex: 1,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  uploadBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 5,
  },
  listContent: {
    paddingHorizontal: CARD_MARGIN,
    paddingTop: 16,
    paddingBottom: 120,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  cardWrapper: {
    margin: CARD_MARGIN,
    flex: 1 / CARDS_PER_ROW,
    maxWidth: CARD_SIZE + CARD_MARGIN * 2,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
    minHeight: CARD_SIZE,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
  },
  typeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardIconWrap: {
    marginTop: 20,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 15,
  },
  deleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  loadingCard: {
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    minWidth: 200,
    elevation: 8,
  },
  loadingSpinner: {marginBottom: 16},
  loadingText: {fontSize: 15, fontWeight: '500'},
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
  },
  modalIcon: {marginBottom: 12},
  modalTitle: {fontWeight: '700', marginBottom: 6, textAlign: 'center'},
  modalSub: {textAlign: 'center', lineHeight: 20, marginBottom: 20},
  titleInput: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 20,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnCancel: {borderWidth: 1.5},
  modalBtnConfirm: {},
  modalBtnText: {fontWeight: '700', fontSize: 14},
});

export default MaterialsScreen;
