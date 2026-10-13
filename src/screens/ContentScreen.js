/**
 * FUTO Learn — Content Screen
 * Used for the Assessment tab (placeholder for now).
 * The Materials tab now uses MaterialsScreen directly.
 */

import React from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {Text, useTheme} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const TAB_CONFIG = {
  Assessment: {
    label: 'Assessments',
    icon: 'pencil-box-outline',
    description:
      'AI-powered assessments based on your uploaded course materials. Test your knowledge with auto-generated quizzes.',
    color: '#0066CC',
    comingIcon: 'clock-outline',
  },
};

const ContentScreen = ({tabName = 'Assessment'}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const config = TAB_CONFIG[tabName] || TAB_CONFIG.Assessment;

  return (
    <SafeAreaView
      style={[styles.safeArea, {backgroundColor: theme.colors.background}]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.colors.headerBackground}
      />

      {/* Tab Header */}
      <View
        style={[
          styles.tabHeader,
          {
            backgroundColor: theme.colors.headerBackground,
            paddingTop: insets.top + 10,
          },
        ]}>
        <Icon name={config.icon} size={24} color="#FFFFFF" />
        <Text style={styles.tabHeaderTitle}>{config.label}</Text>
      </View>

      {/* Coming Soon */}
      <View style={styles.content}>
        <View
          style={[
            styles.iconCircle,
            {backgroundColor: config.color + '18'},
          ]}>
          <Icon name={config.comingIcon} size={72} color="#999999" />
        </View>

        <Text
          variant="headlineMedium"
          style={[styles.comingSoonTitle, {color: theme.colors.textPrimary}]}>
          Coming Soon
        </Text>

        <Text
          variant="bodyMedium"
          style={[styles.comingSoonSub, {color: theme.colors.textSecondary}]}>
          {config.description}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1},
  tabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  tabHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 10,
    letterSpacing: 0.2,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 100,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  comingSoonTitle: {
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  comingSoonSub: {
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
});

export default ContentScreen;
