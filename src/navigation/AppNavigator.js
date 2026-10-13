/**
 * FUTO Learn — App Navigator
 * Root navigation structure:
 *
 * NavigationContainer
 * └── Root Stack
 *     ├── MainTabs       ← BottomPillNavigator (Home | Materials | Assessment | Settings)
 *     ├── KnowledgeLevel ← Knowledge level picker + custom input before learning
 *     ├── Learning       ← AI lesson viewer with instances
 *     └── Quiz           ← MCQ quiz screen (from AssessmentScreen)
 */

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import BottomPillNavigator from './BottomPillNavigator';
import KnowledgeLevelScreen from '../screens/KnowledgeLevelScreen';
import LearningScreen from '../screens/LearningScreen';
import QuizScreen from '../screens/QuizScreen';

const RootStack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <RootStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}>
      {/* Main bottom tab app */}
      <RootStack.Screen name="MainTabs" component={BottomPillNavigator} />
      {/* Knowledge level picker (slides up before lesson generation) */}
      <RootStack.Screen
        name="KnowledgeLevel"
        component={KnowledgeLevelScreen}
        options={{animation: 'slide_from_bottom'}}
      />
      {/* AI lesson viewer */}
      <RootStack.Screen name="Learning" component={LearningScreen} />
      {/* AI-generated MCQ quiz */}
      <RootStack.Screen
        name="Quiz"
        component={QuizScreen}
        options={{animation: 'slide_from_bottom'}}
      />
    </RootStack.Navigator>
  );
};

export default AppNavigator;
