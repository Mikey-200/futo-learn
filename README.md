# FUTO Learn 📚

A cross-platform academic resource app for **Federal University of Technology, Owerri (FUTO)** students.

Built with React Native CLI — supports Android (and iOS when built on macOS).

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the React Native development environment set up on your machine.

Follow the **official React Native CLI guide** for your OS:  
👉 https://reactnative.dev/docs/set-up-your-environment

**Required tools:**
- Node.js 18+
- Java JDK 17
- Android Studio + Android SDK (for Android)
- A physical Android phone **or** an Android Virtual Device (emulator)

---

### Installation

1. **Clone / open the project folder**
   ```sh
   cd "c:\Users\Mikeey\Documents\DEV\Futo Learn"
   ```

2. **Install JavaScript dependencies**
   ```sh
   npm install
   ```

3. **For Android — no extra steps needed** (autolinking handles it)

4. **For iOS (macOS only)**
   ```sh
   cd ios && pod install && cd ..
   ```

---

### Running the App

**Step 1:** Start the Metro bundler (JavaScript build server)
```sh
npm start
```

**Step 2:** In a NEW terminal window, run on Android:
```sh
npm run android
```

Or on iOS (macOS only):
```sh
npm run ios
```

---

## 📁 Project Structure

```
src/
├── navigation/
│   ├── AppNavigator.js         ← Root navigation (stack + tabs)
│   └── BottomPillNavigator.js  ← Custom pill-shaped bottom tabs
├── screens/
│   ├── FacultySelectionScreen.js   ← Screen 1: Choose SICT faculty
│   ├── DepartmentSelectionScreen.js ← Screen 2: Choose department
│   ├── LevelSelectionScreen.js     ← Screen 3: Choose level (100-500)
│   ├── SemesterSelectionScreen.js  ← Screen 4: Choose Harmattan/Rain
│   ├── ContentScreen.js            ← Screen 5: Coming Soon (reused for all 3 tabs)
│   └── SettingsScreen.js           ← Settings (theme + portal link)
├── components/
│   ├── SquareCard.js           ← Reusable animated selection card
│   ├── PillTabBar.js           ← Custom pill-shaped bottom tab bar
│   ├── HeaderWithBack.js       ← Custom header with back button
│   └── BreadcrumbBanner.js     ← Selection path banner
├── store/
│   ├── index.js                ← Redux store
│   └── slices/
│       └── selectionSlice.js   ← All app state (selections + theme)
├── utils/
│   ├── constants.js            ← FUTO data (faculties, departments, etc.)
│   └── storage.js              ← AsyncStorage helpers
└── theme/
    └── index.js                ← Light/Dark theme objects
```

---

## ✨ Features

| Feature | Status |
|---|---|
| Faculty → Department → Level → Semester flow | ✅ |
| Pill-shaped floating bottom navigation | ✅ |
| Selections persist across tab switches | ✅ |
| Selections saved to device (AsyncStorage) | ✅ |
| Light/Dark theme toggle | ✅ |
| FUTO Portal quick link | ✅ |
| "Coming Soon" content placeholder | ✅ |
| Exit app confirmation on back | ✅ |

---

## 🎨 Design Tokens

| Token | Light | Dark |
|---|---|---|
| Primary (FUTO Green) | `#008000` | `#4CAF50` |
| Accent (Blue) | `#0066CC` | `#64B5F6` |
| Background | `#FFFFFF` | `#121212` |
| Surface | `#F5F5F5` | `#1E1E1E` |
| Text | `#212121` | `#FFFFFF` |

---

## 🔧 Troubleshooting

**"Unable to load script" error:**  
Make sure Metro bundler is running first (`npm start`), then run `npm run android`.

**Android device not detected:**  
Enable USB debugging on your phone: Settings → Developer Options → USB Debugging.

**Build fails:**  
Try cleaning the Android build:
```sh
cd android && ./gradlew clean && cd ..
npm run android
```

---

## 📞 Support

App developed for FUTO SICT students. For content updates or bugs, contact the development team.
