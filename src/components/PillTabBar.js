/**
 * FUTO Learn — PillTabBar Component
 * Custom pill/capsule shaped floating bottom navigation bar
 *
 * This replaces React Navigation's default tab bar.
 * It renders as a floating pill at the bottom of the screen.
 */

import React from 'react';
import {
  Animated,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {Text, useTheme} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {TAB_ICONS, TAB_LABELS} from '../utils/constants';

const TAB_ORDER = ['Home', 'Materials', 'Assessment', 'Settings'];

const PillTabItem = ({tabName, isActive, onPress}) => {
  const theme = useTheme();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const iconConfig = TAB_ICONS[tabName];
  const iconName = isActive ? iconConfig.active : iconConfig.inactive;
  const label = TAB_LABELS[tabName];

  const activeColor = theme.colors.pillActive;
  const inactiveColor = theme.colors.pillInactive;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  return (
    <TouchableWithoutFeedback
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={label}>
      <Animated.View
        style={[
          styles.tabItem,
          isActive && [
            styles.tabItemActive,
            {backgroundColor: activeColor},
          ],
          {transform: [{scale: scaleAnim}]},
        ]}>
        <Icon
          name={iconName}
          size={22}
          color={isActive ? '#FFFFFF' : inactiveColor}
        />
        <Text
          style={[
            styles.tabLabel,
            {color: isActive ? '#FFFFFF' : inactiveColor},
            isActive && styles.tabLabelActive,
          ]}
          numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const PillTabBar = ({state, descriptors, navigation}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          bottom: Math.max(insets.bottom, 16),
          backgroundColor: theme.colors.cardBackground,
        },
      ]}
      pointerEvents="box-none">
      {TAB_ORDER.map((tabName, index) => {
        // Map tab name to navigation route index
        const routeIndex = state.routes.findIndex(r => r.name === tabName);
        if (routeIndex === -1) {return null;}
        const isActive = state.index === routeIndex;
        const route = state.routes[routeIndex];
        const {options} = descriptors[route.key];

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isActive && !event.defaultPrevented) {
            navigation.navigate({name: route.name, merge: true});
          }
        };

        return (
          <PillTabItem
            key={tabName}
            tabName={tabName}
            isActive={isActive}
            onPress={onPress}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 70,
    borderRadius: 35,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    // Shadow
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.12,
    shadowRadius: 12,
    // Ensure it's always on top
    zIndex: 999,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 26,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  tabItemActive: {
    // Background color applied inline from theme
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    fontWeight: '700',
  },
});

export default PillTabBar;
