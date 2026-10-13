/**
 * FUTO Learn — Knowledge Level Screen
 *
 * Shown when a user taps a material card.
 * User picks their knowledge level (quick-select OR custom text fields)
 * before the AI lesson is generated.
 *
 * Custom mode: user describes what they already know + what they want to learn.
 * These descriptions are passed into the AI prompt for highly personalised lessons.
 *
 * If a lesson already exists for the chosen level → navigate directly to LearningScreen.
 * Custom-described lessons always generate a new instance.
 */

import React, {useState, useRef} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {Text, useTheme} from 'react-native-paper';
import {useDispatch, useSelector} from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  addInstance,
  selectMaterials,
} from '../store/slices/materialsSlice';
import {generateLesson} from '../utils/aiService';
import {
  loadExtractedText,
  saveInstanceContent,
  saveMaterialsMeta,
} from '../utils/storageService';
import {KNOWLEDGE_LEVELS} from '../utils/constants';
import HeaderWithBack from '../components/HeaderWithBack';

const LEVEL_OPTIONS = [
  {
    key: KNOWLEDGE_LEVELS.SOME,
    label: 'I have some understanding',
    sublabel: 'Build on my basics — go deeper',
    icon: 'lightbulb-on-outline',
    color: '#F39C12',
  },
  {
    key: KNOWLEDGE_LEVELS.NONE,
    label: 'I have no prior knowledge',
    sublabel: "Start from scratch — explain it simply",
    icon: 'school-outline',
    color: '#0066CC',
  },
];

const KnowledgeLevelScreen = ({navigation, route}) => {
  const {material} = route.params;
  const theme = useTheme();
  const dispatch = useDispatch();
  const materials = useSelector(selectMaterials);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingFor, setGeneratingFor] = useState(null);

  // Custom mode state
  const [customMode, setCustomMode] = useState(false);
  const [priorKnowledge, setPriorKnowledge] = useState('');
  const [learningGoal, setLearningGoal] = useState('');

  const customModeAnim = useRef(new Animated.Value(0)).current;

  const toggleCustomMode = () => {
    const toValue = customMode ? 0 : 1;
    setCustomMode(!customMode);
    Animated.spring(customModeAnim, {
      toValue,
      useNativeDriver: false,
      speed: 14,
      bounciness: 3,
    }).start();
  };

  // ─── Core generation logic ──────────────────────────────────────────────────

  const doGenerate = async (knowledgeLevel, options = {}) => {
    const fullMaterial = materials.find(m => m.id === material.id);
    if (!fullMaterial) {return;}

    setGeneratingFor(knowledgeLevel);
    setIsGenerating(true);
    Keyboard.dismiss();

    try {
      const extractedText = await loadExtractedText(fullMaterial.extractedTextPath);
      if (!extractedText) {
        Alert.alert('File Not Found', 'Could not load the course material. Try deleting and re-uploading it.');
        setIsGenerating(false);
        return;
      }

      const result = await generateLesson(fullMaterial.title, extractedText, knowledgeLevel, options);

      if (!result.success) {
        Alert.alert('Generation Failed', result.error);
        setIsGenerating(false);
        return;
      }

      const bucket = fullMaterial.instances?.[knowledgeLevel] || [];
      const instanceId = `inst_${Date.now()}`;
      const contentPath = await saveInstanceContent(instanceId, result.content);

      const instanceNumber = bucket.length + 1;
      const newInstance = {
        id: instanceId,
        name: `Instance ${instanceNumber}`,
        knowledgeLevel,
        contentPath,
        createdAt: new Date().toISOString(),
      };

      dispatch(addInstance({materialId: fullMaterial.id, knowledgeLevel, instance: newInstance}));

      const updatedMaterials = materials.map(m => {
        if (m.id !== fullMaterial.id) {return m;}
        return {
          ...m,
          instances: {
            ...m.instances,
            [knowledgeLevel]: [...(m.instances?.[knowledgeLevel] || []), newInstance],
          },
        };
      });
      await saveMaterialsMeta(updatedMaterials);

      setIsGenerating(false);
      navigation.navigate('Learning', {
        material: fullMaterial,
        knowledgeLevel,
        activeInstanceId: instanceId,
      });
    } catch (err) {
      console.warn('[KnowledgeLevelScreen] Error:', err);
      setIsGenerating(false);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  // ─── Quick-select handler (goes to existing instance if available) ───────────

  const handleLevelSelect = async levelOption => {
    if (isGenerating) {return;}
    const {key: knowledgeLevel} = levelOption;
    const fullMaterial = materials.find(m => m.id === material.id);
    if (!fullMaterial) {return;}

    const bucket = fullMaterial.instances?.[knowledgeLevel] || [];
    if (bucket.length > 0) {
      const latest = bucket[bucket.length - 1];
      navigation.navigate('Learning', {
        material: fullMaterial,
        knowledgeLevel,
        activeInstanceId: latest.id,
      });
      return;
    }

    await doGenerate(knowledgeLevel);
  };

  // ─── Custom generate handler ─────────────────────────────────────────────────

  const handleCustomGenerate = async () => {
    if (isGenerating) {return;}
    if (!priorKnowledge.trim() && !learningGoal.trim()) {
      Alert.alert(
        'Describe Your Level',
        'Please fill in at least one of the fields to use custom mode, or use a quick-select option.',
      );
      return;
    }
    // Custom lessons always generate a new instance under 'some_understanding' bucket
    // (stored as 'custom' knowledge level)
    await doGenerate('custom', {
      priorKnowledge: priorKnowledge.trim(),
      learningGoal: learningGoal.trim(),
    });
  };

  const customPanelHeight = customModeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 280],
  });

  return (
    <SafeAreaView style={[styles.safeArea, {backgroundColor: theme.colors.background}]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.headerBackground} />

      <HeaderWithBack title={material.title} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={0}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Icon */}
          <View style={[styles.iconCircle, {backgroundColor: theme.colors.primary + '18'}]}>
            <Icon
              name={material.fileType === 'PDF' ? 'file-pdf-box' : 'file-word-box'}
              size={52}
              color={theme.colors.primary}
            />
          </View>

          {/* Heading */}
          <Text variant="headlineSmall" style={[styles.heading, {color: theme.colors.textPrimary}]}>
            Before we begin...
          </Text>
          <Text variant="bodyMedium" style={[styles.subheading, {color: theme.colors.textSecondary}]}>
            How familiar are you with this topic? This helps the AI tailor the lesson for you.
          </Text>

          {/* ── Quick-select level options ── */}
          <View style={styles.optionsContainer}>
            {LEVEL_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: theme.colors.cardBackground,
                    borderColor:
                      generatingFor === option.key ? option.color : theme.colors.outline,
                    borderWidth: generatingFor === option.key ? 2 : 1,
                  },
                ]}
                onPress={() => !isGenerating && handleLevelSelect(option)}
                activeOpacity={0.8}
                disabled={isGenerating}>
                <View style={[styles.optionIconWrap, {backgroundColor: option.color + '18'}]}>
                  {isGenerating && generatingFor === option.key ? (
                    <ActivityIndicator size="small" color={option.color} />
                  ) : (
                    <Icon name={option.icon} size={28} color={option.color} />
                  )}
                </View>
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, {color: theme.colors.textPrimary}]}>
                    {option.label}
                  </Text>
                  <Text style={[styles.optionSublabel, {color: theme.colors.textSecondary}]}>
                    {option.sublabel}
                  </Text>
                </View>
                <Icon name="chevron-right" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Divider + Custom Mode Toggle ── */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, {backgroundColor: theme.colors.outline}]} />
            <Text style={[styles.dividerText, {color: theme.colors.textSecondary}]}>
              or describe it yourself
            </Text>
            <View style={[styles.dividerLine, {backgroundColor: theme.colors.outline}]} />
          </View>

          <TouchableOpacity
            style={[
              styles.customToggle,
              {
                backgroundColor: customMode
                  ? theme.colors.primary + '15'
                  : theme.colors.cardBackground,
                borderColor: customMode ? theme.colors.primary : theme.colors.outline,
                borderWidth: customMode ? 2 : 1,
              },
            ]}
            onPress={toggleCustomMode}
            activeOpacity={0.8}
            disabled={isGenerating}>
            <Icon
              name="pencil-outline"
              size={22}
              color={customMode ? theme.colors.primary : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.customToggleText,
                {color: customMode ? theme.colors.primary : theme.colors.textPrimary},
              ]}>
              Describe my own knowledge level
            </Text>
            <Icon
              name={customMode ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={customMode ? theme.colors.primary : theme.colors.textSecondary}
            />
          </TouchableOpacity>

          {/* ── Animated custom input panel ── */}
          <Animated.View style={[styles.customPanel, {maxHeight: customPanelHeight, overflow: 'hidden'}]}>
            <View style={styles.customPanelInner}>
              {/* Prior knowledge field */}
              <Text style={[styles.inputLabel, {color: theme.colors.textPrimary}]}>
                What do you already know? (optional)
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    color: theme.colors.textPrimary,
                    borderColor: theme.colors.primary,
                    backgroundColor: theme.colors.background,
                  },
                ]}
                value={priorKnowledge}
                onChangeText={setPriorKnowledge}
                placeholder={'e.g. "I know what arrays are but never studied trees"'}
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                maxLength={200}
                editable={!isGenerating}
              />

              {/* Learning goal field */}
              <Text style={[styles.inputLabel, {color: theme.colors.textPrimary, marginTop: 12}]}>
                What do you want to learn/understand? (optional)
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    color: theme.colors.textPrimary,
                    borderColor: theme.colors.primary,
                    backgroundColor: theme.colors.background,
                  },
                ]}
                value={learningGoal}
                onChangeText={setLearningGoal}
                placeholder={'e.g. "Understand how AVL trees self-balance"'}
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                maxLength={200}
                editable={!isGenerating}
              />

              {/* Generate button */}
              <TouchableOpacity
                style={[
                  styles.generateBtn,
                  {backgroundColor: theme.colors.primary},
                  isGenerating && {opacity: 0.7},
                ]}
                onPress={handleCustomGenerate}
                disabled={isGenerating}
                activeOpacity={0.85}>
                {isGenerating && generatingFor === 'custom' ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Icon name="lightning-bolt" size={20} color="#FFFFFF" />
                )}
                <Text style={styles.generateBtnText}>
                  {isGenerating && generatingFor === 'custom'
                    ? 'Generating...'
                    : 'Generate Custom Lesson'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Generating message */}
          {isGenerating && (
            <View style={styles.generatingMsg}>
              <Icon name="robot-outline" size={18} color={theme.colors.primary} />
              <Text style={[styles.generatingText, {color: theme.colors.textSecondary}]}>
                {'  '}AI is personalising your lesson… This may take 15–30 seconds.
              </Text>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1},
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
    alignItems: 'center',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  heading: {fontWeight: '700', textAlign: 'center', marginBottom: 10},
  subheading: {textAlign: 'center', lineHeight: 22, marginBottom: 28},

  optionsContainer: {width: '100%', gap: 12, marginBottom: 20},
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    gap: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  optionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {flex: 1},
  optionLabel: {fontSize: 15, fontWeight: '700', marginBottom: 3},
  optionSublabel: {fontSize: 12, lineHeight: 17},

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 14,
    gap: 10,
  },
  dividerLine: {flex: 1, height: 1},
  dividerText: {fontSize: 12, fontWeight: '500'},

  // Custom toggle
  customToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginBottom: 4,
  },
  customToggleText: {flex: 1, fontSize: 14, fontWeight: '600'},

  // Custom input panel
  customPanel: {width: '100%'},
  customPanelInner: {paddingTop: 12, paddingBottom: 4},

  inputLabel: {fontSize: 13, fontWeight: '600', marginBottom: 6},
  textInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 64,
    textAlignVertical: 'top',
  },

  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  generateBtnText: {color: '#FFFFFF', fontWeight: '700', fontSize: 15},

  generatingMsg: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 20,
    width: '100%',
  },
  generatingText: {flex: 1, fontSize: 13, lineHeight: 19},
});

export default KnowledgeLevelScreen;
