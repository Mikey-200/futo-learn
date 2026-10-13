/**
 * FUTO Learn — SquareCard Component
 * Reusable pressable card used across Faculty, Department, Level screens
 *
 * Props:
 *  - width, height: dimensions
 *  - borderRadius: corner radius
 *  - icon: MaterialCommunityIcons name (optional)
 *  - code: Short code text e.g. "SICT", "IFT"
 *  - name: Full name displayed below code
 *  - selected: boolean to highlight selected state
 *  - onPress: callback
 *  - codeSize: font size for the code text
 *  - nameSize: font size for the name text
 *  - iconSize: size of the icon
 *  - accentColor: color used for selected highlight
 *  - theme: React Native Paper theme object
 */

import React, {useRef} from 'react';
import {
  Animated,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {Text, useTheme} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const SquareCard = ({
  width = 150,
  height = 150,
  borderRadius = 12,
  icon,
  iconSize = 40,
  code,
  name,
  selected = false,
  onPress,
  codeSize = 24,
  nameSize = 12,
  accentColor,
}) => {
  const theme = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const accent = accentColor || theme.colors.secondary;
  const cardBg = selected ? accent : theme.colors.cardBackground;
  const textColor = selected ? '#FFFFFF' : theme.colors.textPrimary;
  const nameColor = selected ? 'rgba(255,255,255,0.85)' : theme.colors.textSecondary;
  const iconColor = selected ? '#FFFFFF' : accent;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  };

  return (
    <TouchableWithoutFeedback
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}>
      <Animated.View
        style={[
          styles.card,
          {
            width,
            height,
            borderRadius,
            backgroundColor: cardBg,
            transform: [{scale: scaleAnim}],
            // Selected border highlight
            borderWidth: selected ? 2 : 1,
            borderColor: selected ? accent : theme.colors.outline,
          },
        ]}>
        {icon ? (
          <View style={styles.iconWrapper}>
            <Icon name={icon} size={iconSize} color={iconColor} />
          </View>
        ) : null}
        <Text
          style={[
            styles.codeText,
            {fontSize: codeSize, color: textColor},
          ]}>
          {code}
        </Text>
        {name ? (
          <Text
            style={[styles.nameText, {fontSize: nameSize, color: nameColor}]}
            numberOfLines={2}>
            {name}
          </Text>
        ) : null}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 10,
    // Elevation shadow
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconWrapper: {
    marginBottom: 6,
  },
  codeText: {
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  nameText: {
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
});

export default SquareCard;
