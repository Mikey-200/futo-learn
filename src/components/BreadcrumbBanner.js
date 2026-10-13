/**
 * FUTO Learn — BreadcrumbBanner Component
 * Green banner showing full selection path context e.g. "SICT > IFT > 300L > Harmattan"
 *
 * Props:
 *  - parts: string[] — ordered breadcrumb segments
 */

import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Text, useTheme} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const BreadcrumbBanner = ({parts = []}) => {
  const theme = useTheme();

  if (!parts || parts.length === 0) {
    return null;
  }

  return (
    <View
      style={[
        styles.banner,
        {backgroundColor: theme.colors.breadcrumbBackground},
      ]}>
      {parts.map((part, index) => (
        <View key={`${part}-${index}`} style={styles.segmentRow}>
          <Text style={styles.segmentText} numberOfLines={1}>
            {part}
          </Text>
          {index < parts.length - 1 && (
            <Icon
              name="chevron-right"
              size={16}
              color="rgba(255,255,255,0.75)"
              style={styles.separator}
            />
          )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  segmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  separator: {
    marginHorizontal: 2,
  },
});

export default BreadcrumbBanner;
