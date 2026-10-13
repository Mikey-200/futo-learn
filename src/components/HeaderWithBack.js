/**
 * FUTO Learn — HeaderWithBack Component
 * Custom header bar with back button and FUTO green background
 *
 * Props:
 *  - title: header title text
 *  - onBack: callback for back button press
 *  - showBack: whether to show the back button (default: true)
 *  - rightElement: optional element for right side of header
 */

import React from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import {Text, useTheme} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const HeaderWithBack = ({title, onBack, showBack = true, rightElement}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const headerBg = theme.colors.headerBackground;

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: headerBg,
          paddingTop: insets.top + 8,
        },
      ]}>
      {/* Left: Back button */}
      <View style={styles.leftSection}>
        {showBack && (
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButton}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            accessibilityLabel="Go back">
            <Icon name="chevron-left" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Center: Title */}
      <View style={styles.centerSection}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {/* Right: Optional element */}
      <View style={styles.rightSection}>{rightElement || null}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    minHeight: 56,
  },
  leftSection: {
    width: 44,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
  },
  rightSection: {
    width: 44,
    alignItems: 'flex-end',
  },
  backButton: {
    padding: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});

export default HeaderWithBack;
