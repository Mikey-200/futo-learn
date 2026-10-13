/**
 * FUTO Learn — Bottom Pill Navigator
 * 4 tabs: Home | Materials | Assessment (Quiz) | Settings
 * Uses custom pill-shaped tab bar renderer.
 */

import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import PillTabBar from '../components/PillTabBar';
import HomeScreen from '../screens/HomeScreen';
import MaterialsScreen from '../screens/MaterialsScreen';
import AssessmentScreen from '../screens/AssessmentScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const BottomPillNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={props => <PillTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: false,
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{title: 'Home'}}
      />
      <Tab.Screen
        name="Materials"
        component={MaterialsScreen}
        options={{title: 'Materials'}}
      />
      <Tab.Screen
        name="Assessment"
        component={AssessmentScreen}
        options={{title: 'Quiz'}}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{title: 'Settings'}}
      />
    </Tab.Navigator>
  );
};

export default BottomPillNavigator;
