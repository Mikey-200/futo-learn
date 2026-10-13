# 🎓 FUTO Learn — How It Works

Complete documentation: user guide, architecture, data flow, and every moving part of the app.

---

## 📌 What the App Is

**FUTO Learn** is a React Native mobile app (Android-first) for university students. It lets students upload their course materials (PDF or DOCX), then uses AI to generate structured, personalised lessons from that content. Students can describe their own knowledge level, receive a tailored lesson, quiz themselves on it, track their progress, and regenerate lessons with a specific focus.

---

## 👤 User Guide — How to Use Every Feature

### 1. Uploading a Course Material

1. Open the app → tap the **Materials** tab (book icon)
2. Tap the green **+** FAB button (bottom right)
3. The file picker opens — select a **PDF** or **DOCX** file
4. The app extracts text from the file automatically:
   - **DOCX**: unzipped and XML-stripped immediately on device
   - **Digital PDF**: text extracted client-side from PDF streams
   - **Scanned PDF**: uploaded to Google Gemini for OCR (requires internet)
5. A material card appears with the file's name as the title
6. Long-press any material card → **Delete** (with confirmation)

---

### 2. Generating a Lesson

1. From **Materials** or **Home**, tap any material card
2. The **Knowledge Level** screen appears with three options:

   **Option A — Quick select:**
   - "I have some understanding" → lesson builds on basics, uses proper terminology
   - "I have no prior knowledge" → starts from scratch, simple language & analogies

   **Option B — Describe it yourself (custom):**
   - Tap "Describe my own knowledge level" → panel slides open
   - Fill in **"What do you already know?"** (optional) e.g. *"I know what arrays are but never studied trees"*
   - Fill in **"What do you want to learn/understand?"** (optional) e.g. *"Understand how AVL trees self-balance"*
   - Tap **Generate Custom Lesson** → AI uses your description to personalise the lesson

3. If a lesson already exists for the chosen level, the app goes straight to the lesson viewer (no generation needed)
4. AI generates the lesson (15–30 seconds) → lesson appears

---

### 3. Reading a Lesson (Learning Screen)

The lesson screen has three zones:

**Top bar:**
- ☰ **Hamburger menu** (left) → opens the Instances drawer
- **Material title** (centre)
- 🔄 **Regenerate** (right) → creates a new version of the lesson

**Level badge (below top bar):**
- Shows the knowledge level and which instance you're on (e.g. "Instance 2 of 3")

**Body:**
- Formatted markdown lesson with sections: Introduction, Key Concepts, Detailed Explanation, Real-World Applications, Summary

---

### 4. Instances (Multiple Lesson Versions)

Every time the AI generates a lesson for a material + level, it creates a new **instance**. You can have as many versions as you want.

- **Switch instances**: tap ☰ → tap any instance in the drawer
- **Rename an instance**: long-press it in the drawer → Rename
- **Delete an instance**: long-press → Delete (you must always keep at least 1)
- **Minimum**: 1 instance must remain per level

---

### 5. Regenerating with a Focus

Tapping 🔄 opens the **Regenerate Lesson** modal:

- **Leave blank** → AI generates a completely fresh take on the material
- **Type a focus** (e.g. *"Use more diagrams and step-by-step examples"* or *"Simplify the maths"*) → AI specifically addresses your request in the new version
- Tap **Regenerate ⚡** → new instance is created and becomes active
- The old instances are all still available in the drawer

---

### 6. Taking a Quiz

1. Tap the **Quiz** tab (pencil icon)
2. Materials that **don't have a generated lesson yet** show a 🔒 lock — generate a lesson first
3. Materials with at least one lesson show a **Start** button
4. Tap **Start** → AI generates 7 multiple-choice questions from your lesson content (~10 seconds)
5. **Quiz flow:**
   - One question per screen
   - Tap an answer (A / B / C / D)
   - Immediate feedback: ✅ green = correct, ❌ red = wrong
   - 1-sentence explanation shown after each answer
   - Progress bar at the top
   - Tap **Next Question** to continue
6. **Final Score Card:**
   - Score percentage shown in a colour-coded circle (green ≥70%, red <70%)
   - Emoji + motivational message based on score
   - **Retake Quiz** → generates fresh questions from the same lesson
   - **Done** → returns to the Quiz tab
7. Scores are saved automatically and shown on the Home screen and per-material in the Quiz tab

---

### 7. Home Screen (Progress Dashboard)

The Home tab is your study overview:

- **Greeting** — "Good morning/afternoon/evening, Scholar 👋" based on time
- **Stats row** — Materials uploaded | Lessons generated | Average quiz score
- **Quick Actions** — "Upload Material" (→ Materials tab) | "Take a Quiz" (→ Quiz tab)
- **Recent Materials** — last 4 uploaded, tap to go straight to Knowledge Level
- **Recent Quiz Scores** — last 3 quiz results with material name + score
- **Study Tip of the Day** — rotates daily from a curated list of evidence-based study tips
- Pull down to refresh stats

---

### 8. Settings

- **Appearance**: toggle Light / Dark mode (saved immediately)
- **About**: app version
- Reset data (clears all stored materials and preferences)

---

## 🏗️ Tech Stack

| Layer | Tool |
|---|---|
| Framework | React Native CLI (v0.84.1) |
| UI Library | React Native Paper (MD3 theming) |
| State Management | Redux Toolkit |
| Navigation | React Navigation (native stack + bottom tabs) |
| Local Persistence | AsyncStorage + React Native FS |
| File Picking | react-native-document-picker |
| File Transfer | react-native-blob-util (Gemini Files API uploads) |
| AI — Lesson & Quiz Gen | **Groq API** — `openai/gpt-oss-20b` (free, no billing required) |
| AI — Scanned PDF OCR | **Google Gemini Files API** — `GOOGLE_API_KEY` |
| Markdown Rendering | react-native-markdown-display |
| Icons | react-native-vector-icons (MaterialCommunityIcons) |
| Animations | React Native `Animated` API |
| Gradients | react-native-linear-gradient |
| Safe Areas | react-native-safe-area-context |
| Env Variables | react-native-config → `BuildConfig` in Android |

---

## 🧠 State Architecture

### Redux Slices

**`materialsSlice`** (`src/store/slices/materialsSlice.js`)
```js
{
  materials: [
    {
      id: "mat_1234567890",
      title: "Data Structures & Algorithms",
      fileType: "DOCX",
      filePath: "/.../files/mat_1234.docx",
      extractedTextPath: "/.../extracted/mat_1234.txt",
      createdAt: "2026-10-01T20:00:00.000Z",
      instances: {
        some_understanding: [ LearningInstance, ... ],
        no_knowledge:       [ LearningInstance, ... ],
        custom:             [ LearningInstance, ... ],  // dynamic key
      }
    }
  ],
  activeMaterialId: null,
  preferences: { theme: 'light' | 'dark' },
  hydrated: false,
}
```

**`LearningInstance` shape:**
```js
{
  id: "inst_9876543210",
  name: "Instance 1",
  knowledgeLevel: "some_understanding" | "no_knowledge" | "custom",
  contentPath: "/.../instances/inst_9876.txt",
  createdAt: "2026-10-01T21:00:00.000Z"
}
```

**Key actions:**
| Action | Effect |
|---|---|
| `addMaterial` | Adds material with empty `some_understanding` + `no_knowledge` buckets |
| `addInstance` | Appends instance to level bucket (auto-initialises new keys like `'custom'`) |
| `renameInstance` | Updates instance name by ID |
| `deleteInstance` | Removes instance (minimum 1 enforced) |
| `deleteMaterial` | Removes material + clears `activeMaterialId` |
| `setTheme` | Toggles light/dark |
| `hydrateState` | Bulk-loads materials + preferences from AsyncStorage on launch |

---

## 🚀 App Launch Sequence

```
index.js
  └── App.js
        └── Redux Provider
              └── InnerApp
                    ├── [useEffect] loadMaterialsMeta() from AsyncStorage
                    │     └── dispatches setMaterials() + hydrateState()
                    ├── [!hydrated] → spinner
                    └── [hydrated]
                          ├── PaperProvider (applies theme)
                          └── NavigationContainer → AppNavigator
```

---

## 🗺️ Navigation Structure

```
AppNavigator (Root Native Stack)
├── MainTabs              ← BottomPillNavigator (4 tabs)
│   ├── Home              ← HomeScreen
│   ├── Materials         ← MaterialsScreen
│   ├── Assessment        ← AssessmentScreen  (Quiz tab)
│   └── Settings          ← SettingsScreen
├── KnowledgeLevel        ← KnowledgeLevelScreen  (slides up from bottom)
├── Learning              ← LearningScreen         (slides from right)
└── Quiz                  ← QuizScreen             (slides up from bottom)
```

---

## 📱 Screen-by-Screen

### HomeScreen
- Dashboard landing screen
- Reads materials from Redux + quiz results from AsyncStorage
- `useFocusEffect` reloads quiz results every time you switch back to this tab
- Pull-to-refresh supported

### MaterialsScreen
- Lists all uploaded materials as cards
- FAB → document picker → `fileService.processFile()` → adds to Redux + saves to disk
- Long-press card → delete material (deletes all files + instances)

### KnowledgeLevelScreen
- Two quick-select cards + animated expandable custom input panel
- `handleLevelSelect` → checks existing instances → navigates directly if found, otherwise generates
- `handleCustomGenerate` → validates at least one field filled → calls `doGenerate('custom', options)`
- `doGenerate` → loads text → calls `generateLesson(title, text, level, options)` → saves instance → navigates

### LearningScreen
- Top bar: hamburger drawer | title | regenerate
- Drawer: animated `Animated.spring` slide-in panel listing all instances
- Long-press instance → Alert with Rename / Delete options
- `handleRegenerate` → opens **Regeneration Focus Modal** (TextInput + Regenerate button)
- `doRegenerate(focusPrompt)` → calls `generateLesson(..., {focusPrompt})` → new instance created

### AssessmentScreen
- Lists all materials
- `findLatestInstance(material)` → finds most recent lesson across all levels
- Materials without a lesson → locked (🔒 icon + warning)
- Start → `loadInstanceContent(latestInstance.contentPath)` → `generateQuiz(title, lessonContent)` → navigates to QuizScreen

### QuizScreen
- 7 MCQ questions, one per screen
- `handleOptionSelect` → marks answered, increments score if correct
- `handleNext` → `Animated.sequence` fade transition to next question
- On last question → `saveQuizResult(...)` → shows ScoreCard
- ScoreCard: percentage circle, emoji, message, Retake / Done buttons

### SettingsScreen
- Theme toggle → `dispatch(setTheme(...))` → `savePreferences(...)`

---

## 📂 File Processing (`src/utils/fileService.js`)

### DOCX Files
1. Copy `.docx` to app temp dir via `react-native-blob-util`
2. Read as base64 → unzip (DOCX is a ZIP)
3. Extract `word/document.xml`
4. Strip all XML tags → plain text
5. Return extracted text

### Digital PDF Files
1. Read PDF binary as base64
2. Locate `BT` / `ET` markers (Begin/End Text)
3. Extract `Tj` and `TJ` operator content between markers
4. Decode and concatenate → plain text
5. Return extracted text

### Scanned PDF Files (image-based)
When digital extraction yields < 100 characters:
1. Upload PDF binary to **Gemini Files API** via `react-native-blob-util`
2. Poll Files API until file status = `ACTIVE`
3. Call `gemini-2.0-flash` with file URI + OCR prompt
4. Return transcribed text

> **Note:** Scanned PDF OCR uses `GOOGLE_API_KEY`. Lesson/quiz generation uses `GROQ_API_KEY`. Both are separate quotas.

---

## 🤖 AI Service (`src/utils/aiService.js`)

**Provider:** Groq API  
**Model:** `openai/gpt-oss-20b` (Groq free tier — current as of Oct 2026)  
**Endpoint:** `https://api.groq.com/openai/v1/chat/completions`

### `generateLesson(title, text, level, options?)`

Builds a structured markdown prompt with:
- Material title + truncated extracted text (≤8,000 chars)
- Knowledge level context (or custom `priorKnowledge` + `learningGoal` description)
- Optional `focusPrompt` for regeneration with a specific direction

Returns `{ success: boolean, content?: string, error?: string }`

### `generateQuiz(title, lessonContent)`

Generates 7 MCQs from the **AI lesson content** (not raw extracted text) as a JSON array:
```json
[
  {
    "question": "What is the time complexity of binary search?",
    "options": ["O(1)", "O(log n)", "O(n)", "O(n²)"],
    "correct": 1,
    "explanation": "Binary search halves the search space each iteration, giving O(log n)."
  }
]
```
Includes robust JSON extraction — strips markdown code blocks, finds array boundaries, validates structure. Requires ≥3 valid questions to succeed.

### Retry Logic (`withRetry`)
- Wraps every API call
- On `429` (rate limited): waits 5s → 15s → 30s between up to 3 retries
- On `503` (overloaded): same backoff
- After 3 retries: returns human-readable error

---

## 💾 Storage (`src/utils/storageService.js`)

| Data | Storage | Key / Path |
|---|---|---|
| All materials metadata | AsyncStorage | `@futolearn_materials` |
| Quiz results (last 100) | AsyncStorage | `@futolearn_quiz_results` |
| Theme + preferences | AsyncStorage | `@futolearn_preferences` |
| Raw extracted text | RNFS DocumentDir | `/futolearn/extracted/{id}.txt` |
| Lesson instance content | RNFS DocumentDir | `/futolearn/instances/{id}.txt` |
| Source file copy | RNFS DocumentDir | `/futolearn/files/{id}.{ext}` |

**Quiz result shape:**
```js
{
  id: "quiz_1728000000000",
  materialId: "mat_123",
  materialTitle: "Data Structures",
  score: 6,
  total: 7,
  percentage: 86,
  completedAt: "2026-10-06T21:00:00.000Z"
}
```

---

## 🎨 Theming

React Native Paper (MD3) with custom tokens:

| Token | Light | Dark |
|---|---|---|
| `primary` | `#008000` (FUTO Green) | `#4CAF50` |
| `secondary` | `#0066CC` | `#64B5F6` |
| `background` | `#FFFFFF` | `#121212` |
| `cardBackground` | `#FFFFFF` | `#2C2C2C` |
| `headerBackground` | `#008000` | `#1A3A1A` |
| `breadcrumbBackground` | `#008000` | `#1A3A1A` |
| `textPrimary` | `#1A1A1A` | `#F5F5F5` |
| `textSecondary` | `#666666` | `#AAAAAA` |
| `pillActive` | `#0066CC` | `#64B5F6` |

---

## 🔑 API Keys (`.env`)

```env
GROQ_API_KEY=gsk_...    # Lesson generation + Quiz generation (Groq, free tier)
GOOGLE_API_KEY=AQ....   # Scanned PDF OCR only (Gemini Files API)
```

> **Important:** Keys are baked into the APK via `react-native-config` → `BuildConfig`.  
> A full Gradle rebuild (`assembleDebug`) is required any time `.env` changes.  
> **Never commit `.env` to git** — it contains private API keys.

---

## 🔁 Complete User Journey

```
App opens
  → AsyncStorage loads (materials + theme)
  → Home screen: stats = 0, empty recent materials

[Upload a material]
  → Materials tab → tap + → pick DOCX/PDF
  → Text extracted → material card appears
  → Home screen now shows: 1 Material

[Generate a lesson]
  → Tap material card
  → Knowledge Level screen:
      Option A: tap "Some Understanding" → AI generates lesson (15-30s)
      Option B: expand custom panel → describe knowledge → Generate Custom Lesson
  → LearningScreen: lesson displayed as markdown

[Read and navigate instances]
  → Tap ☰ → see all instances
  → Tap "Instance 1" to switch
  → Long-press → Rename it "First Read"
  → Tap 🔄 → type focus: "explain with Nigerian examples" → Regenerate
  → Instance 2 created, now showing a focused version

[Quiz yourself]
  → Quiz tab → material shows "Start" (lesson exists)
  → Tap Start → 10s wait → 7 questions about your lesson
  → Answer Q1 → ✅ correct → tap Next
  → Answer Q3 → ❌ wrong → see explanation → tap Next
  → Score card: 5/7 (71%) 🎉 "Great work!"
  → Home screen now shows Avg Score: 71%

[Settings]
  → Toggle Dark Mode → entire app goes dark instantly
```

---

## ⚠️ Known Gaps & Upcoming Features

| Feature | Status |
|---|---|
| Flashcard mode (spaced repetition cards from lesson) | Planned |
| Key Terms glossary (extracted + defined from lesson) | Planned |
| Export lesson as PDF / share with classmates | Planned |
| Scanned PDF quota limits | Gemini free tier may hit limits with heavy OCR usage |
| Groq model deprecation | Model roster changes frequently — check `aiService.js` `MODEL` const if 404 errors return |

---

## 🛠️ Developer Notes

### Building & Deploying
```powershell
# JS bundle
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res/

# APK build
cd android; .\gradlew assembleDebug

# Install on device
adb install -r android\app\build\outputs\apk\debug\app-debug.apk
adb shell am start -n com.futolearn/.MainActivity
```

### If AI returns 404 after a future Groq model deprecation
1. Go to `src/utils/aiService.js` line ~15
2. Update the `MODEL` constant to the current Groq model ID
3. Check available models at: https://console.groq.com/docs/models
4. Rebuild and reinstall

### Adding new knowledge level keys
The `addInstance` reducer in `materialsSlice.js` auto-initialises any new bucket key — no constants file update needed. New level names propagate through the entire app automatically.
