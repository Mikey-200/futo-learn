/**
 * FUTO Learn — Storage Service
 * Handles all file-system persistence for materials metadata and preferences.
 * Large content (extracted text, AI lessons) is stored as files via react-native-fs.
 * Small metadata is stored in AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';

const STORAGE_KEYS = {
  MATERIALS: '@futolearn_materials',
  PREFERENCES: '@futolearn_preferences',
  QUIZ_RESULTS: '@futolearn_quiz_results',
};

// ─── Directory paths ──────────────────────────────────────────────────────────

const BASE_DIR = RNFS.DocumentDirectoryPath + '/futolearn';
const EXTRACTED_DIR = BASE_DIR + '/extracted';
const INSTANCES_DIR = BASE_DIR + '/instances';
const FILES_DIR = BASE_DIR + '/files';

/** Ensure all required directories exist */
export const ensureDirectories = async () => {
  const dirs = [BASE_DIR, EXTRACTED_DIR, INSTANCES_DIR, FILES_DIR];
  for (const dir of dirs) {
    const exists = await RNFS.exists(dir);
    if (!exists) {
      await RNFS.mkdir(dir);
    }
  }
};

// ─── Material metadata (AsyncStorage) ────────────────────────────────────────

export const saveMaterialsMeta = async materials => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(materials));
  } catch (error) {
    console.warn('[StorageService] Failed to save materials meta:', error);
  }
};

export const loadMaterialsMeta = async () => {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.MATERIALS);
    return json ? JSON.parse(json) : [];
  } catch (error) {
    console.warn('[StorageService] Failed to load materials meta:', error);
    return [];
  }
};

// ─── Preferences (AsyncStorage) ───────────────────────────────────────────────

export const savePreferences = async preferences => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(preferences));
  } catch (error) {
    console.warn('[StorageService] Failed to save preferences:', error);
  }
};

export const loadPreferences = async () => {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.PREFERENCES);
    return json ? JSON.parse(json) : null;
  } catch (error) {
    console.warn('[StorageService] Failed to load preferences:', error);
    return null;
  }
};

// ─── Extracted text files (RNFS) ─────────────────────────────────────────────

/** Save extracted text for a material. Returns the file path. */
export const saveExtractedText = async (materialId, text) => {
  await ensureDirectories();
  const path = `${EXTRACTED_DIR}/${materialId}.txt`;
  await RNFS.writeFile(path, text, 'utf8');
  return path;
};

/** Load extracted text for a material */
export const loadExtractedText = async path => {
  try {
    return await RNFS.readFile(path, 'utf8');
  } catch (error) {
    console.warn('[StorageService] Failed to load extracted text:', error);
    return null;
  }
};

// ─── Source file copy (RNFS) ─────────────────────────────────────────────────

/** Copy picked file into app's private storage. Returns the new path. */
export const copyFileToAppStorage = async (sourceUri, materialId, ext) => {
  await ensureDirectories();
  const destPath = `${FILES_DIR}/${materialId}.${ext}`;
  await RNFS.copyFile(sourceUri, destPath);
  return destPath;
};

// ─── AI Instance content files (RNFS) ────────────────────────────────────────

/** Save an AI-generated lesson. Returns the file path. */
export const saveInstanceContent = async (instanceId, content) => {
  await ensureDirectories();
  const path = `${INSTANCES_DIR}/${instanceId}.txt`;
  await RNFS.writeFile(path, content, 'utf8');
  return path;
};

/** Load a saved AI-generated lesson */
export const loadInstanceContent = async path => {
  try {
    return await RNFS.readFile(path, 'utf8');
  } catch (error) {
    console.warn('[StorageService] Failed to load instance content:', error);
    return null;
  }
};

// ─── Deletion ─────────────────────────────────────────────────────────────────

/** Delete all files related to a material (extracted text, source file, all instances) */
export const deleteMaterialFiles = async material => {
  const filesToDelete = [];

  if (material.filePath) {filesToDelete.push(material.filePath);}
  if (material.extractedTextPath) {filesToDelete.push(material.extractedTextPath);}

  // Collect all instance content paths
  const levels = ['some_understanding', 'no_knowledge'];
  for (const level of levels) {
    const instances = material.instances?.[level] || [];
    for (const inst of instances) {
      if (inst.contentPath) {filesToDelete.push(inst.contentPath);}
    }
  }

  for (const path of filesToDelete) {
    try {
      const exists = await RNFS.exists(path);
      if (exists) {await RNFS.unlink(path);}
    } catch (err) {
      console.warn('[StorageService] Failed to delete file:', path, err);
    }
  }
};

/** Delete a single instance content file */
export const deleteInstanceFile = async contentPath => {
  try {
    const exists = await RNFS.exists(contentPath);
    if (exists) {await RNFS.unlink(contentPath);}
  } catch (err) {
    console.warn('[StorageService] Failed to delete instance file:', contentPath, err);
  }
};

// ─── Quiz Results (AsyncStorage) ──────────────────────────────────────────────

/**
 * Save a completed quiz result.
 * @param {{ id, materialId, materialTitle, score, total, percentage, completedAt }} result
 */
export const saveQuizResult = async result => {
  try {
    const existing = await loadQuizResults();
    const updated = [result, ...existing].slice(0, 100); // keep last 100
    await AsyncStorage.setItem(STORAGE_KEYS.QUIZ_RESULTS, JSON.stringify(updated));
  } catch (error) {
    console.warn('[StorageService] Failed to save quiz result:', error);
  }
};

export const loadQuizResults = async () => {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.QUIZ_RESULTS);
    return json ? JSON.parse(json) : [];
  } catch (error) {
    console.warn('[StorageService] Failed to load quiz results:', error);
    return [];
  }
};

export const clearQuizResults = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.QUIZ_RESULTS);
  } catch (error) {
    console.warn('[StorageService] Failed to clear quiz results:', error);
  }
};

// ─── Full clear ───────────────────────────────────────────────────────────────

export const clearAllStorage = async () => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.MATERIALS,
      STORAGE_KEYS.PREFERENCES,
      STORAGE_KEYS.QUIZ_RESULTS,
    ]);
    const exists = await RNFS.exists(BASE_DIR);
    if (exists) {await RNFS.unlink(BASE_DIR);}
  } catch (error) {
    console.warn('[StorageService] Failed to clear all storage:', error);
  }
};
