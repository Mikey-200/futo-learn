/**
 * FUTO Learn — Home Screen (Progress Dashboard)
 * The landing screen of the app. Shows study stats, recent materials,
 * and quick access to key actions.
 */

import React, {useState, useEffect, useCallback} from 'react';
import {
  Animated,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {Text, useTheme} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useSelector} from 'react-redux';
import {useFocusEffect} from '@react-navigation/native';

import {selectMaterials} from '../store/slices/materialsSlice';
import {loadQuizResults} from '../utils/storageService';

// ─── Study tips (rotated daily) ───────────────────────────────────────────────
const STUDY_TIPS = [
  'Spacing out study sessions improves long-term retention by up to 200%.',
  'Testing yourself after reading is 3× more effective than re-reading.',
  'Teaching a concept to someone else is the fastest way to master it.',
  'Taking short breaks every 25 minutes (Pomodoro) keeps focus sharp.',
  'Connecting new concepts to things you already know speeds up learning.',
  'Writing notes by hand improves memory better than typing.',
  'Sleep consolidates memories — study before bed, not all night.',
];

const getTip = () => {
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return STUDY_TIPS[dayIndex % STUDY_TIPS.length];
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) {return 'Good morning';}
  if (hour < 17) {return 'Good afternoon';}
  return 'Good evening';
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard = ({icon, value, label, color, theme}) => (
  <View style={[styles.statCard, {backgroundColor: theme.colors.cardBackground}]}>
    <View style={[styles.statIconWrap, {backgroundColor: color + '18'}]}>
      <Icon name={icon} size={22} color={color} />
    </View>
    <Text style={[styles.statValue, {color: theme.colors.textPrimary}]}>{value}</Text>
    <Text style={[styles.statLabel, {color: theme.colors.textSecondary}]}>{label}</Text>
  </View>
);

const RecentMaterialCard = ({material, onPress, theme}) => {
  const totalInstances = Object.values(material.instances || {})
    .reduce((sum, arr) => sum + arr.length, 0);

  const daysAgo = Math.floor(
    (Date.now() - new Date(material.createdAt).getTime()) / (1000 * 60 * 60 * 24),
  );
  const timeLabel = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`;

  return (
    <TouchableOpacity
      style={[styles.recentCard, {backgroundColor: theme.colors.cardBackground}]}
      onPress={onPress}
      activeOpacity={0.8}>
      <View style={[styles.recentIcon, {backgroundColor: theme.colors.primary + '18'}]}>
        <Icon
          name={material.fileType === 'PDF' ? 'file-pdf-box' : 'file-word-box'}
          size={26}
          color={theme.colors.primary}
        />
      </View>
      <View style={styles.recentInfo}>
        <Text
          style={[styles.recentTitle, {color: theme.colors.textPrimary}]}
          numberOfLines={2}>
          {material.title}
        </Text>
        <Text style={[styles.recentMeta, {color: theme.colors.textSecondary}]}>
          {totalInstances} lesson{totalInstances !== 1 ? 's' : ''} · {timeLabel}
        </Text>
      </View>
      <Icon name="chevron-right" size={20} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const HomeScreen = ({navigation}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const materials = useSelector(selectMaterials);

  const [quizResults, setQuizResults] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const loadData = useCallback(async () => {
    const results = await loadQuizResults();
    setQuizResults(results);
  }, []);

  // Reload quiz results every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, [loadData, fadeAnim]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Compute stats
  const totalLessons = materials.reduce((sum, m) =>
    sum + Object.values(m.instances || {}).reduce((s, arr) => s + arr.length, 0), 0,
  );
  const avgScore = quizResults.length > 0
    ? Math.round(quizResults.reduce((s, r) => s + r.percentage, 0) / quizResults.length)
    : null;

  const recentMaterials = [...materials]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 4);

  return (
    <View style={[styles.root, {backgroundColor: theme.colors.background}]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, {paddingBottom: 110}]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }>

        {/* ── Hero Header ── */}
        <LinearGradient
          colors={theme.dark
            ? ['#1A3A1A', '#0D250D']
            : ['#008000', '#005500']}
          style={[styles.hero, {paddingTop: insets.top + 20}]}>
          <View style={styles.heroContent}>
            <View>
              <Text style={styles.greeting}>{getGreeting()}, Scholar 👋</Text>
              <Text style={styles.heroDate}>
                {new Date().toLocaleDateString('en-NG', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
            <View style={styles.heroBadge}>
              <Icon name="school" size={28} color="rgba(255,255,255,0.9)" />
            </View>
          </View>

          {/* Stats row inside hero */}
          <View style={styles.statsRow}>
            <StatCard
              icon="book-open-variant"
              value={materials.length}
              label="Materials"
              color="#4CAF50"
              theme={theme}
            />
            <StatCard
              icon="lightning-bolt"
              value={totalLessons}
              label="Lessons"
              color="#F39C12"
              theme={theme}
            />
            <StatCard
              icon="trophy"
              value={avgScore !== null ? `${avgScore}%` : '—'}
              label="Avg Score"
              color="#9B59B6"
              theme={theme}
            />
          </View>
        </LinearGradient>

        <Animated.View style={{opacity: fadeAnim}}>

          {/* ── Quick Actions ── */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, {color: theme.colors.textPrimary}]}>
              Quick Actions
            </Text>
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={[styles.actionBtn, {backgroundColor: theme.colors.primary}]}
                onPress={() => navigation.navigate('Materials')}
                activeOpacity={0.85}>
                <Icon name="plus-circle-outline" size={22} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Upload Material</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, {backgroundColor: '#0066CC'}]}
                onPress={() => navigation.navigate('Assessment')}
                activeOpacity={0.85}>
                <Icon name="pencil-box-outline" size={22} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Take a Quiz</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Recent Materials ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, {color: theme.colors.textPrimary}]}>
                Recent Materials
              </Text>
              {materials.length > 4 && (
                <TouchableOpacity onPress={() => navigation.navigate('Materials')}>
                  <Text style={[styles.seeAll, {color: theme.colors.primary}]}>See all</Text>
                </TouchableOpacity>
              )}
            </View>

            {recentMaterials.length === 0 ? (
              <View style={[styles.emptyBox, {backgroundColor: theme.colors.cardBackground}]}>
                <Icon name="book-plus-outline" size={40} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyText, {color: theme.colors.textSecondary}]}>
                  No materials yet.{'\n'}Tap "Upload Material" to get started.
                </Text>
              </View>
            ) : (
              recentMaterials.map(m => (
                <RecentMaterialCard
                  key={m.id}
                  material={m}
                  theme={theme}
                  onPress={() => navigation.navigate('KnowledgeLevel', {material: m})}
                />
              ))
            )}
          </View>

          {/* ── Quiz History ── */}
          {quizResults.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, {color: theme.colors.textPrimary}]}>
                Recent Quiz Scores
              </Text>
              {quizResults.slice(0, 3).map(result => (
                <View
                  key={result.id}
                  style={[styles.quizHistoryRow, {backgroundColor: theme.colors.cardBackground}]}>
                  <View style={styles.quizHistoryLeft}>
                    <Icon name="pencil-box-outline" size={18} color={theme.colors.primary} />
                    <Text
                      style={[styles.quizHistoryTitle, {color: theme.colors.textPrimary}]}
                      numberOfLines={1}>
                      {result.materialTitle}
                    </Text>
                  </View>
                  <View style={[
                    styles.scorePill,
                    {backgroundColor: result.percentage >= 70 ? '#4CAF5022' : '#E74C3C22'},
                  ]}>
                    <Text style={[
                      styles.scorePillText,
                      {color: result.percentage >= 70 ? '#4CAF50' : '#E74C3C'},
                    ]}>
                      {result.score}/{result.total} · {result.percentage}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ── Study Tip ── */}
          <View style={styles.section}>
            <View style={[styles.tipCard, {backgroundColor: theme.colors.primary + '12', borderColor: theme.colors.primary + '30'}]}>
              <View style={styles.tipHeader}>
                <Icon name="lightbulb-on-outline" size={18} color={theme.colors.primary} />
                <Text style={[styles.tipLabel, {color: theme.colors.primary}]}>
                  {'  '}Study Tip of the Day
                </Text>
              </View>
              <Text style={[styles.tipText, {color: theme.colors.textPrimary}]}>
                {getTip()}
              </Text>
            </View>
          </View>

        </Animated.View>
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {flex: 1},
  scrollContent: {flexGrow: 1},

  // Hero
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  heroDate: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 3,
  },
  heroBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },

  // Sections
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: 0.1,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },

  // Quick actions
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  // Recent material cards
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.07,
    shadowRadius: 4,
    gap: 12,
  },
  recentIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentInfo: {flex: 1},
  recentTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
    marginBottom: 3,
  },
  recentMeta: {
    fontSize: 12,
    fontWeight: '400',
  },

  // Empty state
  emptyBox: {
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
  },

  // Quiz history
  quizHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  quizHistoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 12,
  },
  quizHistoryTitle: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  scorePill: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  scorePillText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Study tip
  tipCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tipText: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
  },
});

export default HomeScreen;
