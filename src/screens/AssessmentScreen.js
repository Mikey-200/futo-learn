/**
 * FUTO Learn — Assessment Screen
 * AI quiz launcher. User picks a material → app finds the most recently
 * generated lesson for that material → generates 7 MCQs from that lesson
 * content → QuizScreen.
 *
 * Quiz questions are generated from the AI lesson (not raw extracted text)
 * so they test what was actually taught in the lesson.
 */

import React, {useState, useCallback} from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {Text, useTheme} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useSelector} from 'react-redux';
import {useFocusEffect} from '@react-navigation/native';

import {selectMaterials} from '../store/slices/materialsSlice';
import {generateQuiz} from '../utils/aiService';
import {loadInstanceContent, loadQuizResults} from '../utils/storageService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Find the most recently generated lesson instance across ALL knowledge levels
 * for a material. Returns null if no lessons generated yet.
 */
const findLatestInstance = material => {
  const allInstances = Object.values(material.instances || {}).flat();
  if (allInstances.length === 0) {return null;}
  return allInstances.sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  )[0];
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const AssessmentScreen = ({navigation}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const materials = useSelector(selectMaterials);

  const [quizResults, setQuizResults] = useState([]);
  const [generatingFor, setGeneratingFor] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadQuizResults().then(setQuizResults);
    }, []),
  );

  const getBestScore = materialId => {
    const scores = quizResults.filter(r => r.materialId === materialId);
    if (scores.length === 0) {return null;}
    return scores.reduce((best, r) => (r.percentage > best.percentage ? r : best));
  };

  const handleStartQuiz = async material => {
    if (generatingFor) {return;}

    // Find the most recent lesson generated for this material
    const latestInstance = findLatestInstance(material);

    if (!latestInstance) {
      Alert.alert(
        'No Lesson Generated Yet',
        'Please generate a lesson for this material first (tap the material card on the Materials or Home tab), then come back to quiz yourself.',
        [{text: 'OK'}],
      );
      return;
    }

    setGeneratingFor(material.id);

    try {
      // Load the lesson content (AI-generated text, clean + structured)
      const lessonContent = await loadInstanceContent(latestInstance.contentPath);

      if (!lessonContent) {
        Alert.alert(
          'Lesson Not Found',
          'Could not load the generated lesson. Try regenerating it first.',
        );
        setGeneratingFor(null);
        return;
      }

      // Generate quiz from the lesson content
      const result = await generateQuiz(material.title, lessonContent);

      if (!result.success) {
        Alert.alert('Quiz Generation Failed', result.error);
        setGeneratingFor(null);
        return;
      }

      setGeneratingFor(null);
      navigation.navigate('Quiz', {
        material,
        questions: result.questions,
      });
    } catch (err) {
      console.warn('[AssessmentScreen] Error:', err);
      setGeneratingFor(null);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const isGenerating = !!generatingFor;

  return (
    <View style={[styles.root, {backgroundColor: theme.colors.background}]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.colors.headerBackground}
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
        <Icon name="pencil-box-outline" size={24} color="#FFFFFF" />
        <Text style={styles.headerTitle}>Quiz Yourself</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, {paddingBottom: 110}]}>

        {/* Sub-header */}
        <View style={styles.subHeader}>
          <Text style={[styles.subHeaderTitle, {color: theme.colors.textPrimary}]}>
            Test Your Knowledge
          </Text>
          <Text style={[styles.subHeaderSub, {color: theme.colors.textSecondary}]}>
            Select a material to quiz yourself on its generated lesson. 7 questions — instant feedback on every answer.
          </Text>
        </View>

        {/* Materials list */}
        {materials.length === 0 ? (
          <View style={[styles.emptyBox, {backgroundColor: theme.colors.cardBackground}]}>
            <Icon name="book-plus-outline" size={52} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyTitle, {color: theme.colors.textPrimary}]}>
              No materials yet
            </Text>
            <Text style={[styles.emptyText, {color: theme.colors.textSecondary}]}>
              Upload a PDF or DOCX in the Materials tab first, generate a lesson, then come back to quiz yourself.
            </Text>
            <TouchableOpacity
              style={[styles.uploadBtn, {backgroundColor: theme.colors.primary}]}
              onPress={() => navigation.navigate('Materials')}>
              <Icon name="plus-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.uploadBtnText}>Go to Materials</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.list}>
            {materials.map(material => {
              const bestScore = getBestScore(material.id);
              const isThisGenerating = generatingFor === material.id;
              const latestInstance = findLatestInstance(material);
              const hasLesson = !!latestInstance;

              return (
                <TouchableOpacity
                  key={material.id}
                  style={[
                    styles.materialCard,
                    {
                      backgroundColor: theme.colors.cardBackground,
                      borderColor: isThisGenerating
                        ? theme.colors.primary
                        : theme.colors.outline,
                      borderWidth: isThisGenerating ? 2 : 1,
                      opacity: !hasLesson ? 0.65 : 1,
                    },
                  ]}
                  onPress={() => !isGenerating && handleStartQuiz(material)}
                  disabled={isGenerating}
                  activeOpacity={0.8}>

                  {/* File icon */}
                  <View
                    style={[
                      styles.fileIcon,
                      {backgroundColor: theme.colors.primary + '18'},
                    ]}>
                    <Icon
                      name={material.fileType === 'PDF' ? 'file-pdf-box' : 'file-word-box'}
                      size={28}
                      color={theme.colors.primary}
                    />
                  </View>

                  {/* Info */}
                  <View style={styles.cardInfo}>
                    <Text
                      style={[styles.cardTitle, {color: theme.colors.textPrimary}]}
                      numberOfLines={2}>
                      {material.title}
                    </Text>
                    <View style={styles.cardMeta}>
                      {!hasLesson ? (
                        <Text style={[styles.noLessonText, {color: '#E74C3C'}]}>
                          ⚠ Generate a lesson first
                        </Text>
                      ) : (
                        <>
                          <Text style={[styles.cardMetaText, {color: theme.colors.textSecondary}]}>
                            {material.fileType}
                          </Text>
                          {bestScore && (
                            <>
                              <Text style={{color: theme.colors.textSecondary}}> · </Text>
                              <Text
                                style={[
                                  styles.bestScore,
                                  {color: bestScore.percentage >= 70 ? '#4CAF50' : '#E74C3C'},
                                ]}>
                                Best: {bestScore.percentage}%
                              </Text>
                            </>
                          )}
                        </>
                      )}
                    </View>
                  </View>

                  {/* Action */}
                  <View style={styles.cardAction}>
                    {isThisGenerating ? (
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : hasLesson ? (
                      <View style={[styles.startBtn, {backgroundColor: theme.colors.primary}]}>
                        <Text style={styles.startBtnText}>Start</Text>
                      </View>
                    ) : (
                      <Icon name="lock-outline" size={20} color={theme.colors.textSecondary} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Generating bar */}
        {isGenerating && (
          <View
            style={[
              styles.generatingBar,
              {backgroundColor: theme.colors.primary + '15'},
            ]}>
            <Icon name="robot-outline" size={18} color={theme.colors.primary} />
            <Text style={[styles.generatingText, {color: theme.colors.textSecondary}]}>
              {'  '}AI is generating quiz questions from your lesson… ~10 seconds.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {flex: 1},
  scrollContent: {flexGrow: 1},

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  subHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  subHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  subHeaderSub: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 8,
  },

  list: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },

  materialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  fileIcon: {
    width: 50,
    height: 50,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {flex: 1},
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 4,
  },
  cardMeta: {flexDirection: 'row', alignItems: 'center'},
  cardMetaText: {fontSize: 12},
  bestScore: {fontSize: 12, fontWeight: '700'},
  noLessonText: {fontSize: 12, fontWeight: '600'},

  cardAction: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 52,
  },
  startBtn: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  startBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  emptyBox: {
    margin: 20,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  uploadBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  generatingBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 14,
  },
  generatingText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
});

export default AssessmentScreen;
