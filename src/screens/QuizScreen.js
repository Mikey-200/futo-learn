/**
 * FUTO Learn — Quiz Screen
 * Presents AI-generated MCQ questions one at a time.
 * Shows instant feedback per answer (correct/incorrect + explanation).
 * Final score card with option to retake or go back.
 */

import React, {useState, useRef} from 'react';
import {
  Alert,
  Animated,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {Text, useTheme} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {saveQuizResult} from '../utils/storageService';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

// ─── Score card ───────────────────────────────────────────────────────────────

const ScoreCard = ({score, total, materialTitle, onRetake, onDone, theme}) => {
  const percentage = Math.round((score / total) * 100);
  const isGreat = percentage >= 70;

  const emoji =
    percentage >= 90 ? '🏆' : percentage >= 70 ? '🎉' : percentage >= 50 ? '💪' : '📚';
  const message =
    percentage >= 90
      ? 'Outstanding! You nailed it!'
      : percentage >= 70
      ? 'Great work! You know this topic well.'
      : percentage >= 50
      ? 'Good effort! Review the material and try again.'
      : 'Keep studying — every attempt builds knowledge.';

  return (
    <ScrollView
      contentContainerStyle={styles.scoreRoot}
      showsVerticalScrollIndicator={false}>
      <Text style={styles.scoreEmoji}>{emoji}</Text>
      <Text style={[styles.scoreTitle, {color: theme.colors.textPrimary}]}>
        Quiz Complete!
      </Text>
      <Text
        style={[styles.scoreMaterial, {color: theme.colors.textSecondary}]}
        numberOfLines={2}>
        {materialTitle}
      </Text>

      {/* Big score circle */}
      <View
        style={[
          styles.scoreCircle,
          {
            borderColor: isGreat ? '#4CAF50' : '#E74C3C',
            backgroundColor: isGreat ? '#4CAF5012' : '#E74C3C12',
          },
        ]}>
        <Text
          style={[
            styles.scorePercent,
            {color: isGreat ? '#4CAF50' : '#E74C3C'},
          ]}>
          {percentage}%
        </Text>
        <Text
          style={[styles.scoreFraction, {color: theme.colors.textSecondary}]}>
          {score} / {total} correct
        </Text>
      </View>

      <Text
        style={[styles.scoreMessage, {color: theme.colors.textSecondary}]}>
        {message}
      </Text>

      {/* Buttons */}
      <View style={styles.scoreBtns}>
        <TouchableOpacity
          style={[styles.scoreBtn, {borderColor: theme.colors.outline, borderWidth: 1.5}]}
          onPress={onRetake}>
          <Icon name="refresh" size={18} color={theme.colors.textPrimary} />
          <Text style={[styles.scoreBtnText, {color: theme.colors.textPrimary}]}>
            Retake Quiz
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.scoreBtn, {backgroundColor: theme.colors.primary}]}
          onPress={onDone}>
          <Icon name="check-circle-outline" size={18} color="#FFFFFF" />
          <Text style={[styles.scoreBtnText, {color: '#FFFFFF'}]}>Done</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// ─── Main Quiz Screen ─────────────────────────────────────────────────────────

const QuizScreen = ({navigation, route}) => {
  const {material, questions: initialQuestions} = route.params;
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [questions] = useState(initialQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null); // index of selected option
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [resultSaved, setResultSaved] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const currentQ = questions[currentIndex];
  const isCorrect = selectedOption === currentQ?.correct;

  const handleConfirmExit = () => {
    Alert.alert(
      'Exit Quiz?',
      'Your progress will be lost. Are you sure?',
      [
        {text: 'Keep Going', style: 'cancel'},
        {text: 'Exit', style: 'destructive', onPress: () => navigation.goBack()},
      ],
    );
  };

  const handleOptionSelect = optionIndex => {
    if (answered) {return;}
    setSelectedOption(optionIndex);
    setAnswered(true);
    if (optionIndex === currentQ.correct) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      // Animate transition
      Animated.sequence([
        Animated.timing(fadeAnim, {toValue: 0, duration: 150, useNativeDriver: true}),
        Animated.timing(fadeAnim, {toValue: 1, duration: 200, useNativeDriver: true}),
      ]).start();

      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setSelectedOption(null);
        setAnswered(false);
      }, 150);
    } else {
      // Quiz complete — save result
      if (!resultSaved) {
        const finalScore = isCorrect ? score : score; // score already updated above
        const total = questions.length;
        const percentage = Math.round((finalScore / total) * 100);
        await saveQuizResult({
          id: `quiz_${Date.now()}`,
          materialId: material.id,
          materialTitle: material.title,
          score: finalScore,
          total,
          percentage,
          completedAt: new Date().toISOString(),
        });
        setResultSaved(true);
      }
      setFinished(true);
    }
  };

  const handleRetake = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setAnswered(false);
    setScore(0);
    setFinished(false);
    setResultSaved(false);
  };

  // ── Score card ──
  if (finished) {
    return (
      <View style={[styles.root, {backgroundColor: theme.colors.background}]}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={theme.colors.headerBackground}
        />
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.colors.headerBackground,
              paddingTop: insets.top + 10,
            },
          ]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quiz Results</Text>
          <View style={{width: 24}} />
        </View>
        <ScoreCard
          score={score}
          total={questions.length}
          materialTitle={material.title}
          onRetake={handleRetake}
          onDone={() => navigation.goBack()}
          theme={theme}
        />
      </View>
    );
  }

  // ── Get option style ──
  const getOptionStyle = optionIndex => {
    if (!answered) {
      return {
        backgroundColor: theme.colors.cardBackground,
        borderColor: theme.colors.outline,
        borderWidth: 1.5,
      };
    }
    if (optionIndex === currentQ.correct) {
      return {backgroundColor: '#4CAF5020', borderColor: '#4CAF50', borderWidth: 2};
    }
    if (optionIndex === selectedOption && optionIndex !== currentQ.correct) {
      return {backgroundColor: '#E74C3C20', borderColor: '#E74C3C', borderWidth: 2};
    }
    return {
      backgroundColor: theme.colors.cardBackground,
      borderColor: theme.colors.outline,
      borderWidth: 1.5,
      opacity: 0.5,
    };
  };

  const getOptionTextColor = optionIndex => {
    if (!answered) {return theme.colors.textPrimary;}
    if (optionIndex === currentQ.correct) {return '#4CAF50';}
    if (optionIndex === selectedOption) {return '#E74C3C';}
    return theme.colors.textSecondary;
  };

  const getOptionIcon = optionIndex => {
    if (!answered) {return null;}
    if (optionIndex === currentQ.correct) {return 'check-circle';}
    if (optionIndex === selectedOption) {return 'close-circle';}
    return null;
  };

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
        <TouchableOpacity
          onPress={handleConfirmExit}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Icon name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {material.title}
        </Text>
        <Text style={styles.headerCount}>
          {currentIndex + 1}/{questions.length}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, {backgroundColor: theme.colors.outline}]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: theme.colors.primary,
              width: `${((currentIndex + (answered ? 1 : 0)) / questions.length) * 100}%`,
            },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, {paddingBottom: 40}]}
        showsVerticalScrollIndicator={false}>

        {/* Question */}
        <Animated.View style={{opacity: fadeAnim}}>
          <View
            style={[
              styles.questionCard,
              {backgroundColor: theme.colors.cardBackground},
            ]}>
            <View style={styles.questionBadge}>
              <Text
                style={[styles.questionBadgeText, {color: theme.colors.primary}]}>
                Question {currentIndex + 1}
              </Text>
            </View>
            <Text
              style={[styles.questionText, {color: theme.colors.textPrimary}]}>
              {currentQ.question}
            </Text>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {currentQ.options.map((option, idx) => {
              const icon = getOptionIcon(idx);
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.optionCard, getOptionStyle(idx)]}
                  onPress={() => handleOptionSelect(idx)}
                  disabled={answered}
                  activeOpacity={0.8}>
                  <View
                    style={[
                      styles.optionLabel,
                      {
                        backgroundColor: answered
                          ? (idx === currentQ.correct
                            ? '#4CAF50'
                            : idx === selectedOption
                            ? '#E74C3C'
                            : theme.colors.outline)
                          : theme.colors.primary,
                      },
                    ]}>
                    <Text style={styles.optionLabelText}>
                      {OPTION_LABELS[idx]}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.optionText,
                      {color: getOptionTextColor(idx)},
                    ]}>
                    {option}
                  </Text>
                  {icon && (
                    <Icon
                      name={icon}
                      size={20}
                      color={idx === currentQ.correct ? '#4CAF50' : '#E74C3C'}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Explanation (shown after answering) */}
          {answered && (
            <Animated.View
              style={[
                styles.explanationCard,
                {
                  backgroundColor: isCorrect
                    ? '#4CAF5012'
                    : '#E74C3C12',
                  borderColor: isCorrect ? '#4CAF5040' : '#E74C3C40',
                },
              ]}>
              <View style={styles.explanationHeader}>
                <Icon
                  name={isCorrect ? 'check-circle' : 'information-outline'}
                  size={18}
                  color={isCorrect ? '#4CAF50' : '#E74C3C'}
                />
                <Text
                  style={[
                    styles.explanationTitle,
                    {color: isCorrect ? '#4CAF50' : '#E74C3C'},
                  ]}>
                  {'  '}{isCorrect ? 'Correct!' : 'Not quite'}
                </Text>
              </View>
              <Text
                style={[
                  styles.explanationText,
                  {color: theme.colors.textPrimary},
                ]}>
                {currentQ.explanation}
              </Text>
            </Animated.View>
          )}

          {/* Next button */}
          {answered && (
            <TouchableOpacity
              style={[styles.nextBtn, {backgroundColor: theme.colors.primary}]}
              onPress={handleNext}>
              <Text style={styles.nextBtnText}>
                {currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
              </Text>
              <Icon
                name={
                  currentIndex < questions.length - 1
                    ? 'arrow-right'
                    : 'trophy-outline'
                }
                size={20}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {flex: 1},

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerCount: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },

  progressTrack: {
    height: 4,
    width: '100%',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    transition: 'width 0.3s',
  },

  content: {
    padding: 20,
    gap: 16,
  },

  questionCard: {
    borderRadius: 18,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    marginBottom: 4,
  },
  questionBadge: {
    marginBottom: 10,
  },
  questionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  questionText: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 25,
  },

  optionsContainer: {
    gap: 10,
    marginBottom: 4,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  optionLabel: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  optionLabelText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },

  explanationCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginBottom: 4,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  explanationTitle: {
    fontWeight: '700',
    fontSize: 14,
  },
  explanationText: {
    fontSize: 14,
    lineHeight: 21,
  },

  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },

  // Score card
  scoreRoot: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  scoreEmoji: {fontSize: 64, textAlign: 'center'},
  scoreTitle: {fontSize: 26, fontWeight: '800', textAlign: 'center'},
  scoreMaterial: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  scoreCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  scorePercent: {fontSize: 36, fontWeight: '900'},
  scoreFraction: {fontSize: 13, fontWeight: '500', marginTop: 2},
  scoreMessage: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
    maxWidth: 280,
  },
  scoreBtns: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  scoreBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  scoreBtnText: {fontWeight: '700', fontSize: 15},
});

export default QuizScreen;
