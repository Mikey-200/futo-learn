/**
 * FUTO Learn — Learning Screen
 *
 * Displays an AI-generated lesson for a course material.
 *
 * Layout:
 *  - Top Left:   Hamburger menu → drawer listing all instances for this material+level
 *  - Top Center: Material title
 *  - Top Right:  Regenerate button (🔄)
 *  - Body:       Rendered markdown lesson content (scrollable)
 *
 * Instance management:
 *  - All instances are listed in hamburger drawer as "Instance 1", "Instance 2", etc.
 *  - Long press on instance → Rename or Delete (minimum 1 must remain)
 *  - Regenerate adds a new instance and makes it active
 */

import React, {useState, useEffect, useCallback} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {Text, useTheme} from 'react-native-paper';
import {useDispatch, useSelector} from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Markdown from 'react-native-markdown-display';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {
  addInstance,
  renameInstance,
  deleteInstance,
  selectMaterials,
} from '../store/slices/materialsSlice';
import {generateLesson} from '../utils/aiService';
import {
  loadExtractedText,
  loadInstanceContent,
  saveInstanceContent,
  deleteInstanceFile,
  saveMaterialsMeta,
} from '../utils/storageService';

const LearningScreen = ({navigation, route}) => {
  const {material, knowledgeLevel, activeInstanceId} = route.params;
  const theme = useTheme();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const materials = useSelector(selectMaterials);

  // Always get fresh material from Redux (instances may have been added)
  const liveMaterial = materials.find(m => m.id === material.id) || material;
  const instances = liveMaterial.instances?.[knowledgeLevel] || [];

  const [activeId, setActiveId] = useState(activeInstanceId);
  const [content, setContent] = useState('');
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnim = useState(new Animated.Value(-300))[0];

  // Long-press context menu
  const [contextMenu, setContextMenu] = useState(null); // {instance, x, y}
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameInput, setRenameInput] = useState('');

  // Regeneration focus modal
  const [regenFocusVisible, setRegenFocusVisible] = useState(false);
  const [regenFocusText, setRegenFocusText] = useState('');

  // ─── Load Content ─────────────────────────────────────────────────────────

  const loadContent = useCallback(async instanceId => {
    setIsLoadingContent(true);
    const inst = instances.find(i => i.id === instanceId);
    if (!inst) {
      setContent('');
      setIsLoadingContent(false);
      return;
    }
    const text = await loadInstanceContent(inst.contentPath);
    setContent(text || '# Error\nCould not load lesson content.');
    setIsLoadingContent(false);
  }, [instances]);

  useEffect(() => {
    loadContent(activeId);
  }, [activeId, loadContent]);

  // ─── Drawer ───────────────────────────────────────────────────────────────

  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.spring(drawerAnim, {
      toValue: 0,
      useNativeDriver: true,
      speed: 14,
      bounciness: 2,
    }).start();
  };

  const closeDrawer = () => {
    Animated.spring(drawerAnim, {
      toValue: -300,
      useNativeDriver: true,
      speed: 18,
      bounciness: 0,
    }).start(() => setDrawerOpen(false));
  };

  // ─── Regenerate ───────────────────────────────────────────────────────────

  const handleRegenerate = useCallback(() => {
    if (isRegenerating) {return;}
    setRegenFocusText('');
    setRegenFocusVisible(true);
  }, [isRegenerating]);

  const doRegenerate = useCallback(async focusPrompt => {
    setRegenFocusVisible(false);
    setIsRegenerating(true);

    try {
      const extractedText = await loadExtractedText(liveMaterial.extractedTextPath);

      if (!extractedText) {
        Alert.alert('Error', 'Could not load course material content.');
        setIsRegenerating(false);
        return;
      }

      const result = await generateLesson(
        liveMaterial.title,
        extractedText,
        knowledgeLevel,
        focusPrompt ? {focusPrompt} : {},
      );

      if (!result.success) {
        Alert.alert('Generation Failed', result.error);
        setIsRegenerating(false);
        return;
      }

      const instanceId = `inst_${Date.now()}`;
      const contentPath = await saveInstanceContent(instanceId, result.content);

      const instanceNumber = instances.length + 1;
      const newInstance = {
        id: instanceId,
        name: `Instance ${instanceNumber}`,
        knowledgeLevel,
        contentPath,
        createdAt: new Date().toISOString(),
      };

      dispatch(
        addInstance({
          materialId: liveMaterial.id,
          knowledgeLevel,
          instance: newInstance,
        }),
      );

      const updatedMaterials = materials.map(m => {
        if (m.id !== liveMaterial.id) {return m;}
        return {
          ...m,
          instances: {
            ...m.instances,
            [knowledgeLevel]: [...(m.instances?.[knowledgeLevel] || []), newInstance],
          },
        };
      });
      await saveMaterialsMeta(updatedMaterials);

      setActiveId(instanceId);
      setIsRegenerating(false);
    } catch (err) {
      console.warn('[LearningScreen] Regenerate error:', err);
      setIsRegenerating(false);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  }, [liveMaterial, knowledgeLevel, instances, dispatch, materials]);

  // ─── Instance Long-Press ──────────────────────────────────────────────────

  const handleInstanceLongPress = useCallback(instance => {
    Alert.alert(
      instance.name,
      'What would you like to do?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Rename',
          onPress: () => {
            setRenameTarget(instance);
            setRenameInput(instance.name);
            setRenameModalVisible(true);
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeleteInstance(instance),
        },
      ],
    );
  }, []);

  const handleDeleteInstance = useCallback(
    async instance => {
      if (instances.length <= 1) {
        Alert.alert(
          'Cannot Delete',
          'You must keep at least one instance. Generate a new one first, then delete this.',
        );
        return;
      }

      Alert.alert(
        'Delete Instance',
        `Delete "${instance.name}"? This cannot be undone.`,
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              // If we're deleting the active instance, switch to the previous one
              if (activeId === instance.id) {
                const remaining = instances.filter(i => i.id !== instance.id);
                const newActive = remaining[remaining.length - 1];
                setActiveId(newActive.id);
              }

              dispatch(
                deleteInstance({
                  materialId: liveMaterial.id,
                  knowledgeLevel,
                  instanceId: instance.id,
                }),
              );

              await deleteInstanceFile(instance.contentPath);

              // Persist
              const updatedMaterials = materials.map(m => {
                if (m.id !== liveMaterial.id) {return m;}
                return {
                  ...m,
                  instances: {
                    ...m.instances,
                    [knowledgeLevel]: (m.instances?.[knowledgeLevel] || []).filter(
                      i => i.id !== instance.id,
                    ),
                  },
                };
              });
              await saveMaterialsMeta(updatedMaterials);
            },
          },
        ],
      );
    },
    [instances, activeId, dispatch, liveMaterial, knowledgeLevel, materials],
  );

  const handleRenameConfirm = useCallback(async () => {
    if (!renameInput.trim() || !renameTarget) {return;}
    dispatch(
      renameInstance({
        materialId: liveMaterial.id,
        knowledgeLevel,
        instanceId: renameTarget.id,
        newName: renameInput.trim(),
      }),
    );

    // Persist
    const updatedMaterials = materials.map(m => {
      if (m.id !== liveMaterial.id) {return m;}
      return {
        ...m,
        instances: {
          ...m.instances,
          [knowledgeLevel]: (m.instances?.[knowledgeLevel] || []).map(i =>
            i.id === renameTarget.id ? {...i, name: renameInput.trim()} : i,
          ),
        },
      };
    });
    await saveMaterialsMeta(updatedMaterials);

    setRenameModalVisible(false);
    setRenameTarget(null);
  }, [renameInput, renameTarget, dispatch, liveMaterial, knowledgeLevel, materials]);

  // ─── Markdown Styles ──────────────────────────────────────────────────────

  const markdownStyles = {
    body: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      lineHeight: 24,
    },
    heading1: {
      color: theme.colors.primary,
      fontSize: 22,
      fontWeight: '800',
      marginBottom: 8,
      marginTop: 16,
    },
    heading2: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 6,
      marginTop: 14,
    },
    heading3: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
      marginTop: 10,
    },
    paragraph: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      lineHeight: 24,
      marginBottom: 12,
    },
    bullet_list: {marginBottom: 8},
    ordered_list: {marginBottom: 8},
    list_item: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 4,
    },
    code_inline: {
      backgroundColor: theme.colors.surface,
      color: theme.colors.primary,
      paddingHorizontal: 4,
      borderRadius: 4,
      fontSize: 13,
    },
    blockquote: {
      backgroundColor: theme.colors.primary + '12',
      borderLeftColor: theme.colors.primary,
      borderLeftWidth: 4,
      paddingLeft: 12,
      paddingVertical: 4,
      marginVertical: 8,
    },
    hr: {
      backgroundColor: theme.colors.outline,
      height: 1,
      marginVertical: 16,
    },
    strong: {fontWeight: '700'},
    em: {fontStyle: 'italic'},
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const knowledgeLevelLabel =
    knowledgeLevel === 'some_understanding'
      ? 'Some Understanding'
      : 'No Knowledge';

  return (
    <View
      style={[styles.safeArea, {backgroundColor: theme.colors.background}]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.colors.headerBackground}
        translucent={false}
      />

      {/* Top Bar */}
      <View
        style={[styles.topBar, {backgroundColor: theme.colors.headerBackground, paddingTop: insets.top + 6}]}>
        {/* Hamburger */}
        <TouchableOpacity
          style={styles.topBarBtn}
          onPress={openDrawer}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Icon name="menu" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Title (center) */}
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {liveMaterial.title}
        </Text>

        {/* Regenerate */}
        <TouchableOpacity
          style={styles.topBarBtn}
          onPress={handleRegenerate}
          disabled={isRegenerating}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          {isRegenerating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Icon name="refresh" size={24} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Level badge */}
      <View
        style={[
          styles.levelBadge,
          {backgroundColor: theme.colors.breadcrumbBackground},
        ]}>
        <Icon
          name={
            knowledgeLevel === 'some_understanding'
              ? 'lightbulb-on-outline'
              : 'school-outline'
          }
          size={14}
          color="rgba(255,255,255,0.9)"
        />
        <Text style={styles.levelBadgeText}>
          {'  '}{knowledgeLevelLabel} Mode{'  '}·{'  '}
          {instances.findIndex(i => i.id === activeId) + 1} of {instances.length} instance{instances.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Content */}
      {isLoadingContent || isRegenerating ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={[styles.loadingText, {color: theme.colors.textSecondary}]}>
            {isRegenerating
              ? 'AI is generating your new lesson...\nThis may take 15–30 seconds.'
              : 'Loading lesson...'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <Markdown style={markdownStyles}>{content}</Markdown>
        </ScrollView>
      )}

      {/* ─── Drawer Overlay ─── */}
      {drawerOpen && (
        <TouchableWithoutFeedback onPress={closeDrawer}>
          <View style={styles.drawerOverlay} />
        </TouchableWithoutFeedback>
      )}

      {/* ─── Drawer Panel ─── */}
      {drawerOpen && (
        <Animated.View
          style={[
            styles.drawer,
            {
              backgroundColor: theme.colors.cardBackground,
              transform: [{translateX: drawerAnim}],
              paddingTop: insets.top + 16,
            },
          ]}>
          <View style={styles.drawerHeader}>
            <Text
              style={[styles.drawerTitle, {color: theme.colors.textPrimary}]}>
              Instances
            </Text>
            <TouchableOpacity onPress={closeDrawer}>
              <Icon name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text
            style={[styles.drawerSubtitle, {color: theme.colors.textSecondary}]}>
            {knowledgeLevelLabel} Mode
          </Text>

          <ScrollView style={styles.drawerList}>
            {instances.map((inst, index) => {
              const isActive = inst.id === activeId;
              return (
                <TouchableOpacity
                  key={inst.id}
                  style={[
                    styles.drawerItem,
                    isActive && {
                      backgroundColor: theme.colors.primary + '18',
                      borderLeftColor: theme.colors.primary,
                      borderLeftWidth: 3,
                    },
                  ]}
                  onPress={() => {
                    setActiveId(inst.id);
                    closeDrawer();
                  }}
                  onLongPress={() => handleInstanceLongPress(inst)}>
                  <Icon
                    name={isActive ? 'book-open' : 'book-outline'}
                    size={18}
                    color={
                      isActive
                        ? theme.colors.primary
                        : theme.colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.drawerItemText,
                      {
                        color: isActive
                          ? theme.colors.primary
                          : theme.colors.textPrimary,
                        fontWeight: isActive ? '700' : '400',
                      },
                    ]}>
                    {inst.name}
                  </Text>
                  {isActive && (
                    <Icon
                      name="check-circle"
                      size={16}
                      color={theme.colors.primary}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      )}

      {/* ─── Regeneration Focus Modal ─── */}
      <Modal
        visible={regenFocusVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRegenFocusVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setRegenFocusVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.modalCard,
                  {backgroundColor: theme.colors.cardBackground},
                ]}>
                <View style={styles.regenModalHeader}>
                  <Icon name="refresh" size={20} color={theme.colors.primary} />
                  <Text
                    style={[styles.modalTitle, {color: theme.colors.textPrimary, marginBottom: 0, marginLeft: 8}]}>
                    Regenerate Lesson
                  </Text>
                </View>
                <Text style={[styles.regenModalSub, {color: theme.colors.textSecondary}]}>
                  What should this version focus on? Leave blank for a fresh take.
                </Text>
                <TextInput
                  style={[
                    styles.renameInput,
                    {
                      color: theme.colors.textPrimary,
                      borderColor: theme.colors.primary,
                      backgroundColor: theme.colors.background,
                      minHeight: 80,
                      textAlignVertical: 'top',
                    },
                  ]}
                  value={regenFocusText}
                  onChangeText={setRegenFocusText}
                  placeholder={'e.g. "Use more examples" or "Explain the maths step by step"'}
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  maxLength={300}
                  autoFocus
                />
                <View style={styles.modalBtns}>
                  <TouchableOpacity
                    style={[
                      styles.modalBtn,
                      {borderColor: theme.colors.outline, borderWidth: 1.5},
                    ]}
                    onPress={() => setRegenFocusVisible(false)}>
                    <Text style={{color: theme.colors.textSecondary, fontWeight: '600'}}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, {backgroundColor: theme.colors.primary}]}
                    onPress={() => doRegenerate(regenFocusText.trim())}>
                    <Icon name="lightning-bolt" size={16} color="#FFFFFF" />
                    <Text style={{color: '#FFFFFF', fontWeight: '700'}}> Regenerate</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ─── Rename Modal ─── */}
      <Modal
        visible={renameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {backgroundColor: theme.colors.cardBackground},
            ]}>
            <Text
              variant="titleMedium"
              style={[styles.modalTitle, {color: theme.colors.textPrimary}]}>
              Rename Instance
            </Text>
            <TextInput
              style={[
                styles.renameInput,
                {
                  color: theme.colors.textPrimary,
                  borderColor: theme.colors.primary,
                  backgroundColor: theme.colors.background,
                },
              ]}
              value={renameInput}
              onChangeText={setRenameInput}
              autoFocus
              maxLength={40}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  {borderColor: theme.colors.outline, borderWidth: 1.5},
                ]}
                onPress={() => setRenameModalVisible(false)}>
                <Text style={{color: theme.colors.textSecondary, fontWeight: '600'}}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, {backgroundColor: theme.colors.primary}]}
                onPress={handleRenameConfirm}>
                <Text style={{color: '#FFFFFF', fontWeight: '700'}}>
                  Save
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 52,
  },
  topBarBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginHorizontal: 8,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  levelBadgeText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  scrollView: {flex: 1},
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 20,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
  },
  // Drawer
  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 10,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 280,
    zIndex: 20,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: {width: 4, height: 0},
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  drawerSubtitle: {
    fontSize: 12,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  drawerList: {flex: 1},
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    borderRadius: 0,
  },
  drawerItemText: {
    flex: 1,
    fontSize: 14,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
    elevation: 10,
  },
  modalTitle: {
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  renameInput: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    marginBottom: 20,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  // Regen focus modal extras
  regenModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  regenModalSub: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
});

export default LearningScreen;
