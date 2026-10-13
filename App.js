/**
 * FUTO Learn — Root Application Component
 *
 * Entry point. Wraps everything in:
 *  1. Redux <Provider>           — global state (materials + instances)
 *  2. React Native Paper <PaperProvider> — light/dark theming
 *  3. <NavigationContainer>      — React Navigation root
 *  4. <SafeAreaProvider>         — safe area insets
 *
 * On launch, loads saved materials metadata and preferences from storage
 * and hydrates the Redux store before rendering the main UI.
 */

import React, {useEffect} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {PaperProvider} from 'react-native-paper';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {Provider, useDispatch, useSelector} from 'react-redux';

import store from './src/store';
import {LightTheme, DarkTheme} from './src/theme';
import AppNavigator from './src/navigation/AppNavigator';
import {
  hydrateState,
  setHydrated,
  selectTheme,
  selectHydrated,
} from './src/store/slices/materialsSlice';
import {loadMaterialsMeta, loadPreferences} from './src/utils/storageService';

const InnerApp = () => {
  const dispatch = useDispatch();
  const currentTheme = useSelector(selectTheme);
  const isHydrated = useSelector(selectHydrated);

  useEffect(() => {
    const hydrate = async () => {
      try {
        const [savedMaterials, savedPreferences] = await Promise.all([
          loadMaterialsMeta(),
          loadPreferences(),
        ]);

        if (
          (savedMaterials && savedMaterials.length > 0) ||
          savedPreferences
        ) {
          dispatch(
            hydrateState({
              materials: savedMaterials || [],
              preferences: savedPreferences,
            }),
          );
        } else {
          dispatch(setHydrated());
        }
      } catch (error) {
        console.warn('[FUTO Learn] Hydration error:', error);
        dispatch(setHydrated());
      }
    };

    hydrate();
  }, [dispatch]);

  const paperTheme = currentTheme === 'dark' ? DarkTheme : LightTheme;

  if (!isHydrated) {
    return (
      <View
        style={[
          styles.loadingContainer,
          {backgroundColor: paperTheme.colors.background},
        ]}>
        <ActivityIndicator size="large" color={paperTheme.colors.primary} />
      </View>
    );
  }

  return (
    <PaperProvider theme={paperTheme}>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </PaperProvider>
  );
};

const App = () => {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <Provider store={store}>
          <InnerApp />
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1},
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default App;
