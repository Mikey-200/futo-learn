/**
 * FUTO Learn — Settings Screen
 * Appearance theme toggle and Quick Links section
 * Uses React Native Paper's List components
 */

import React, {useState} from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Divider,
  List,
  RadioButton,
  Text,
  useTheme,
} from 'react-native-paper';
import {useDispatch, useSelector} from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  selectTheme,
  setTheme,
} from '../store/slices/materialsSlice';
import {savePreferences, clearAllStorage} from '../utils/storageService';

const SettingsScreen = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const currentTheme = useSelector(selectTheme);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);


  const handleThemeChange = async newTheme => {
    dispatch(setTheme(newTheme));
    await savePreferences({theme: newTheme});
    setThemeDropdownOpen(false);
  };

  const handleOpenPortal = async () => {
    const url = 'https://portal.futo.edu.ng';
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Cannot Open Link', 'Unable to open the FUTO portal.');
    }
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset All Data',
      'This will delete ALL uploaded materials and generated lessons. This cannot be undone. Continue?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await clearAllStorage();
            Alert.alert('Done', 'All data has been cleared. Please restart the app.');
          },
        },
      ],
    );
  };

  const themeLabel =
    currentTheme === 'dark' ? 'Dark Mode' : 'Light Mode';
  const themeIcon =
    currentTheme === 'dark' ? 'weather-night' : 'white-balance-sunny';

  return (
    <View
      style={[styles.safeArea, {backgroundColor: theme.colors.background}]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.colors.headerBackground}
        translucent={false}
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
        <Icon name="cog" size={24} color="#FFFFFF" />
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* === APPEARANCE SECTION === */}
        <Text
          variant="labelLarge"
          style={[styles.sectionLabel, {color: theme.colors.textSecondary}]}>
          APPEARANCE
        </Text>

        <View
          style={[
            styles.sectionCard,
            {backgroundColor: theme.colors.cardBackground},
          ]}>
          {/* Theme row */}
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => setThemeDropdownOpen(!themeDropdownOpen)}
            activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <Icon
                name={themeIcon}
                size={22}
                color={theme.colors.primary}
                style={styles.rowIcon}
              />
              <View>
                <Text
                  style={[
                    styles.rowTitle,
                    {color: theme.colors.textPrimary},
                  ]}>
                  Select Theme
                </Text>
                <Text
                  style={[
                    styles.rowSubtitle,
                    {color: theme.colors.textSecondary},
                  ]}>
                  {themeLabel}
                </Text>
              </View>
            </View>
            <Icon
              name={themeDropdownOpen ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>

          {/* Theme dropdown */}
          {themeDropdownOpen && (
            <>
              <Divider />
              <TouchableOpacity
                style={styles.dropdownOption}
                onPress={() => handleThemeChange('light')}>
                <Icon
                  name="white-balance-sunny"
                  size={20}
                  color={
                    currentTheme === 'light'
                      ? theme.colors.primary
                      : theme.colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.dropdownOptionText,
                    {
                      color:
                        currentTheme === 'light'
                          ? theme.colors.primary
                          : theme.colors.textPrimary,
                      fontWeight: currentTheme === 'light' ? '700' : '400',
                    },
                  ]}>
                  {'  '}Light Mode
                </Text>
                {currentTheme === 'light' && (
                  <Icon
                    name="check"
                    size={18}
                    color={theme.colors.primary}
                    style={styles.checkIcon}
                  />
                )}
              </TouchableOpacity>

              <Divider />

              <TouchableOpacity
                style={styles.dropdownOption}
                onPress={() => handleThemeChange('dark')}>
                <Icon
                  name="weather-night"
                  size={20}
                  color={
                    currentTheme === 'dark'
                      ? theme.colors.primary
                      : theme.colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.dropdownOptionText,
                    {
                      color:
                        currentTheme === 'dark'
                          ? theme.colors.primary
                          : theme.colors.textPrimary,
                      fontWeight: currentTheme === 'dark' ? '700' : '400',
                    },
                  ]}>
                  {'  '}Dark Mode
                </Text>
                {currentTheme === 'dark' && (
                  <Icon
                    name="check"
                    size={18}
                    color={theme.colors.primary}
                    style={styles.checkIcon}
                  />
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* === QUICK LINKS SECTION === */}
        <Text
          variant="labelLarge"
          style={[styles.sectionLabel, {color: theme.colors.textSecondary}]}>
          QUICK LINKS
        </Text>

        <View
          style={[
            styles.sectionCard,
            {backgroundColor: theme.colors.cardBackground},
          ]}>
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={handleOpenPortal}
            activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <Icon
                name="web"
                size={22}
                color={theme.colors.secondary}
                style={styles.rowIcon}
              />
              <View>
                <Text
                  style={[
                    styles.rowTitle,
                    {color: theme.colors.textPrimary},
                  ]}>
                  FUTO Portal
                </Text>
                <Text
                  style={[
                    styles.rowSubtitle,
                    {color: theme.colors.textSecondary, fontSize: 12},
                  ]}>
                  portal.futo.edu.ng
                </Text>
              </View>
            </View>
            <Icon
              name="arrow-top-right"
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* === DATA SECTION === */}
        <Text
          variant="labelLarge"
          style={[styles.sectionLabel, {color: theme.colors.textSecondary}]}>
          DATA
        </Text>

        <View
          style={[
            styles.sectionCard,
            {backgroundColor: theme.colors.cardBackground},
          ]}>
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={handleResetData}
            activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <Icon
                name="delete-sweep"
                size={22}
                color="#E74C3C"
                style={styles.rowIcon}
              />
              <View>
                <Text style={[styles.rowTitle, {color: '#E74C3C'}]}>
                  Reset All Data
                </Text>
                <Text
                  style={[
                    styles.rowSubtitle,
                    {color: theme.colors.textSecondary},
                  ]}>
                  Delete all materials and generated lessons
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* App info */}
        <View style={styles.appInfo}>
          <Icon name="school" size={28} color={theme.colors.primary} />
          <Text
            style={[styles.appInfoTitle, {color: theme.colors.textPrimary}]}>
            FUTO Learn
          </Text>
          <Text
            style={[
              styles.appInfoVersion,
              {color: theme.colors.textSecondary},
            ]}>
            Version 1.0.0
          </Text>
          <Text
            style={[styles.appInfoSub, {color: theme.colors.textSecondary}]}>
            For FUTO Students
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 120,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 20,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowIcon: {
    marginRight: 14,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  rowSubtitle: {
    fontSize: 13,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  dropdownOptionText: {
    fontSize: 14,
    flex: 1,
  },
  checkIcon: {
    marginLeft: 8,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 40,
    paddingVertical: 20,
  },
  appInfoTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  appInfoVersion: {
    fontSize: 13,
    marginTop: 4,
  },
  appInfoSub: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default SettingsScreen;
