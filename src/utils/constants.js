/**
 * FUTO Learn — Constants
 * App-wide static configuration: tab definitions, icons, labels.
 * Faculty/Department/Level/Semester data has been removed in favor of
 * the AI-powered materials system.
 */

// ─── Bottom Tab Configuration ────────────────────────────────────────────────

export const TABS = {
  HOME: 'Home',
  MATERIALS: 'Materials',
  ASSESSMENT: 'Assessment',
  SETTINGS: 'Settings',
};

export const TAB_ICONS = {
  Home: {active: 'view-dashboard', inactive: 'view-dashboard-outline'},
  Materials: {active: 'book', inactive: 'book-outline'},
  Assessment: {active: 'pencil-box', inactive: 'pencil-box-outline'},
  Settings: {active: 'cog', inactive: 'cog-outline'},
};

export const TAB_LABELS = {
  Home: 'Home',
  Materials: 'Materials',
  Assessment: 'Quiz',
  Settings: 'Settings',
};

// ─── Knowledge Levels ────────────────────────────────────────────────────────

export const KNOWLEDGE_LEVELS = {
  SOME: 'some_understanding',
  NONE: 'no_knowledge',
};

export const KNOWLEDGE_LEVEL_LABELS = {
  some_understanding: 'I have some understanding of this',
  no_knowledge: 'I have no knowledge of this',
};

// ─── Supported file types ────────────────────────────────────────────────────

export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const FILE_TYPE_LABELS = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
};
