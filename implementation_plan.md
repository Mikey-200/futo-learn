# 🎓 FUTO Learn — AI Materials & Learning System
## Feasibility Discussion & Proposed Architecture

---

## Overview

You want to transform the app from a faculty/department selector into a **personal AI tutor**. Students upload course materials (PDF/DOCX), the AI analyzes them and generates tailored lessons, and those lessons are stored locally and can be regenerated. This is absolutely buildable — let me break down every piece and its feasibility.

---

## ✅ What Is Fully Feasible

Every part of what you described can be built. Here's the honest breakdown piece by piece.

---

## 🔬 Part 1 — File Upload (PDF & DOCX)

### How it works:
We use **`@react-native-documents/picker`** (the modern replacement for the old `react-native-document-picker`) to open the Android file picker and restrict it to PDF and DOCX only.

```
User taps "Upload Course Content"
  → File picker opens (filtered to .pdf and .docx)
  → User picks a file
  → App copies the file into its private storage (DocumentDirectoryPath)
  → App reads the text content from the file
  → User is prompted to title it
  → Card appears on the Materials screen
```

### PDF Text Extraction:
We'll use **`react-native-pdf-text`** or a lightweight JS-based PDF parser. For standard digital PDFs (text is selectable), this works perfectly. If someone uploads a scanned PDF (an image of a page), the text layer won't exist — we'll show a friendly warning.

### DOCX Text Extraction:
We use **`mammoth.js`** — a well-known JavaScript library that converts DOCX to raw text. It does NOT need Node.js filesystem access; we just read the file into a buffer and pass it to mammoth. This is battle-tested in React Native environments.

> [!IMPORTANT]
> **Limitation to discuss:** If a student uploads a scanned/image PDF (like a scanned past question paper), we won't be able to extract text from it without an OCR engine. We should show the user a clear message: "This looks like a scanned document. Please use a text-based PDF." We can add OCR later.

---

## 🔬 Part 2 — AI Integration (Google Gemini)

### Recommended Model: **Gemini 2.0 Flash**
- Fast, cheap per token, supports long context (up to 1M tokens)
- Has **Google Search Grounding** built-in — this is the "web-based research" you asked for

### How the teaching content is generated:

```
Extracted text from file
  + User's knowledge level ("some understanding" OR "no knowledge")
  + Grounding with Google Search (for supplemental research)
  ─────────────────────────────────────────────────────────
  → Gemini generates a structured lesson in plain English
```

The prompt we send to Gemini will look like this (simplified):
```
You are an expert tutor. The following is a student's course material:

[EXTRACTED TEXT FROM FILE]

The student has indicated: [some understanding / no knowledge].

Using this content as your primary source, and supplementing with 
web research where needed, generate a comprehensive, beginner-friendly 
lesson that teaches this topic in plain language. 
Structure it with: Introduction, Key Concepts, Explanations, Examples, Summary.
Make it easy to understand regardless of the student's background.
```

### Grounding with Google Search:
Gemini 2.0 Flash has a native `google_search` tool. When enabled, the model:
1. Identifies what extra information would help
2. Searches Google in real-time
3. Weaves the results into the teaching content

This solves the "even with very little data from the uploaded material" requirement you mentioned — if the file is thin, Gemini fills in the gaps with real web research.

> [!IMPORTANT]
> **API Key:** You will need a Google AI Studio API key (free tier available). We store it securely using `react-native-config` (environment variables). **Never hardcoded in source.**

> [!NOTE]
> **Cost consideration:** Gemini 2.0 Flash is very affordable. At ~$0.075 per 1M input tokens and ~$0.30 per 1M output tokens, a typical course material (5,000 words) + generated lesson (~2,000 words) costs less than **$0.002 per generation**. For a student app, this is practically free.

---

## 🔬 Part 3 — Local Storage Architecture

### The Strategy:
We use **two layers** of storage (this is best practice):

| What | Where | Why |
|---|---|---|
| File metadata (title, ID, filePath, date) | AsyncStorage | Small, fast, easy |
| Extracted text content | react-native-fs (file system) | Too large for AsyncStorage |
| Generated lesson instances | react-native-fs (file system) | Can be 3,000–8,000 words |
| Instance metadata (name, date, level) | AsyncStorage | Small reference data |

### The Data Models:

**A Material (uploaded course content):**
```json
{
  "id": "mat_1716000000",
  "title": "Thermodynamics Notes",
  "fileName": "thermo.pdf",
  "fileType": "pdf",
  "filePath": "/data/user/0/com.futolearn/files/materials/mat_1716000000.pdf",
  "extractedTextPath": "/data/user/.../files/extracted/mat_1716000000.txt",
  "createdAt": "2024-05-18T10:00:00Z"
}
```

**A Learning Instance (one AI-generated lesson):**
```json
{
  "id": "inst_1716000001",
  "materialId": "mat_1716000000",
  "name": "Instance 1",
  "knowledgeLevel": "no_knowledge",
  "contentPath": "/data/user/.../files/instances/inst_1716000001.txt",
  "createdAt": "2024-05-18T10:05:00Z"
}
```

### How instances work (clarifying your spec):
- Each material has **two "buckets"** of instances — one for `some_understanding` and one for `no_knowledge`
- When a user clicks a card, they pick a level → they are shown the **most recently generated instance** for that level
- The hamburger menu shows **all instances for the current material+level** listed as "Instance 1", "Instance 2", etc.
- Regenerate creates a new instance in that bucket (does NOT overwrite old ones)
- **At least 1 instance must always exist** — the delete check enforces this

---

## 🔬 Part 4 — The Full User Flow (Detailed)

```
MATERIALS SCREEN
├── Upload button → file picker → title prompt → card created
├── Each card shows: Title, file type badge, delete button (corner)
│   └── Delete → confirmation popup → card removed + files deleted
└── Tap a card → KNOWLEDGE LEVEL SCREEN

KNOWLEDGE LEVEL SCREEN
├── Title: "Before we begin..."
├── Two large options:
│   ├── "I have some understanding of this"
│   └── "I have no knowledge of this"
└── Tap either → check if instance already exists for this level
    ├── If YES → go to LEARNING SCREEN (load most recent instance)
    └── If NO  → generate new content via Gemini → save → go to LEARNING SCREEN

LEARNING SCREEN
├── Top Left:  Hamburger menu (list of all instances for this material+level)
│   ├── Each instance listed as "Instance 1", "Instance 2", ...
│   ├── Tap → switch to that instance's content
│   └── Long-press → popup: "Rename" or "Delete" (can't delete last one)
├── Top Center: Material title (the name the user saved)
├── Top Right:  Regenerate button (🔄)
│   └── Tap → generates new instance → adds to list → shows new content
└── Content area: Rendered lesson (scrollable, formatted text)
```

---

## 🔬 Part 5 — What We Strip from the Current App

The **faculty → department → level → semester flow** is completely removed.

**What gets removed:**
- `FacultySelectionScreen.js` — deleted
- `DepartmentSelectionScreen.js` — deleted
- `LevelSelectionScreen.js` — deleted
- `SemesterSelectionScreen.js` — deleted
- `selectionSlice.js` — stripped of faculty/dept/level/semester, replaced with materials/instances state
- `constants.js` — FACULTIES, DEPARTMENTS, LEVELS, SEMESTERS removed

**What stays:**
- The app shell (App.js, navigation structure)
- PillTabBar (custom bottom navigation)
- Theme system (light/dark)
- AsyncStorage helpers (repurposed)
- ContentScreen → becomes the real MaterialsScreen

**What gets added:**
- `MaterialsScreen.js` (new, replaces placeholder)
- `KnowledgeLevelScreen.js` (new)
- `LearningScreen.js` (new)
- `materialsSlice.js` (new Redux slice)
- `aiService.js` (Gemini API calls)
- `fileService.js` (file picking, text extraction)
- `storageService.js` (react-native-fs file operations)

---

## 🔬 Part 6 — New Packages to Install

| Package | Purpose |
|---|---|
| `@react-native-documents/picker` | File picking (PDF/DOCX) |
| `react-native-fs` | File system read/write for storing content |
| `mammoth` | DOCX → raw text extraction |
| `react-native-pdf-text` OR `pdfjs-dist` | PDF → raw text extraction |
| `@google/generative-ai` | Gemini API SDK |
| `react-native-config` | Environment variables (API key) |
| `react-native-markdown-display` | Render AI-generated markdown content beautifully |

---

## ⚠️ Open Questions & Design Decisions

> [!IMPORTANT]
> **Q1 — PDF extraction method:** PDF text extraction in React Native is the trickiest piece. The most reliable approach for a React Native CLI project (not Expo) is using a native module. Would you be open to a server-side extraction fallback if the on-device parser fails? Or do we keep it fully offline?

> [!IMPORTANT]
> **Q2 — Knowledge level + instance separation:** Right now I'm planning that "some understanding" and "no knowledge" are separate instance buckets. So Instance 1 in "no knowledge" is different from Instance 1 in "some understanding". Does that match your expectation? Or should all instances regardless of level be in the same list?

> [!IMPORTANT]
> **Q3 — Gemini API key distribution:** For a student app, the API key needs to live somewhere. Options:
> - **Option A:** Each user provides their own Gemini API key (free tier, no cost to you)
> - **Option B:** You host a tiny backend (Node.js) that proxies Gemini calls (you pay for API usage)
> - **Option C:** Hardcode yours for now during development only
> 
> For a student project / MVP, **Option C during dev, Option A for release** is most practical.

> [!NOTE]
> **Q4 — What happens during AI generation?** Gemini can take 5–15 seconds. We'll show a nice loading animation on the Learning screen while it generates. User should NOT be able to tap regenerate during an ongoing generation.

> [!NOTE]
> **Q5 — Assessment tab:** You mentioned the assessment part will use "something similar." Do you want us to fully spec that out now, or build the materials/learning system first and come back to it?

---

## 🗺️ Proposed Build Order

Once you approve the plan, here's the order I'd build things:

1. **Strip** the selection flow + remove old screens/state
2. **Install** new packages
3. **Build** `materialsSlice.js` (Redux state for materials + instances)
4. **Build** `fileService.js` (file picking + text extraction for PDF + DOCX)
5. **Build** `storageService.js` (react-native-fs helpers)
6. **Build** `aiService.js` (Gemini integration with grounding)
7. **Build** `MaterialsScreen.js` (upload button + card grid + delete)
8. **Build** `KnowledgeLevelScreen.js` (the "before we begin" picker)
9. **Build** `LearningScreen.js` (hamburger menu + content + regenerate)
10. **Wire up** navigation between all new screens
11. **Polish** UI and test the full flow end to end
