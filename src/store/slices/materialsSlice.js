/**
 * FUTO Learn — Materials Slice
 * Manages all uploaded course materials and their AI-generated learning instances.
 *
 * State shape:
 * {
 *   materials: Material[],           // list of uploaded course materials
 *   activeMaterialId: string | null, // which material is open
 *   preferences: { theme: 'light' | 'dark' },
 *   hydrated: boolean,
 * }
 *
 * Material shape:
 * {
 *   id: string,
 *   title: string,
 *   fileName: string,
 *   fileType: 'pdf' | 'docx',
 *   filePath: string,           // path on device filesystem
 *   extractedTextPath: string,  // path to extracted text file
 *   createdAt: string,          // ISO date string
 *   instances: {
 *     some_understanding: LearningInstance[],
 *     no_knowledge: LearningInstance[],
 *   }
 * }
 *
 * LearningInstance shape:
 * {
 *   id: string,
 *   name: string,              // 'Instance 1', 'Instance 2', etc.
 *   knowledgeLevel: 'some_understanding' | 'no_knowledge',
 *   contentPath: string,       // path to generated lesson text file
 *   createdAt: string,
 * }
 */

import {createSlice} from '@reduxjs/toolkit';

const initialState = {
  materials: [],
  activeMaterialId: null,
  preferences: {
    theme: 'light',
  },
  hydrated: false,
};

const materialsSlice = createSlice({
  name: 'materials',
  initialState,
  reducers: {
    /** Add a newly uploaded material */
    addMaterial(state, action) {
      state.materials.push({
        ...action.payload,
        instances: {
          some_understanding: [],
          no_knowledge: [],
        },
      });
    },

    /** Remove a material and all its instances */
    deleteMaterial(state, action) {
      state.materials = state.materials.filter(m => m.id !== action.payload);
      if (state.activeMaterialId === action.payload) {
        state.activeMaterialId = null;
      }
    },

    /** Set which material is currently being viewed */
    setActiveMaterial(state, action) {
      state.activeMaterialId = action.payload;
    },

    /** Add a new AI-generated learning instance to a material */
    addInstance(state, action) {
      const {materialId, knowledgeLevel, instance} = action.payload;
      const material = state.materials.find(m => m.id === materialId);
      if (material) {
        // Initialise bucket for any level key (including 'custom') if not present
        if (!material.instances[knowledgeLevel]) {
          material.instances[knowledgeLevel] = [];
        }
        material.instances[knowledgeLevel].push(instance);
      }
    },

    /** Rename an instance (e.g. from long-press menu) */
    renameInstance(state, action) {
      const {materialId, knowledgeLevel, instanceId, newName} = action.payload;
      const material = state.materials.find(m => m.id === materialId);
      if (material) {
        const instance = material.instances[knowledgeLevel].find(
          i => i.id === instanceId,
        );
        if (instance) {
          instance.name = newName;
        }
      }
    },

    /** Delete an instance — enforces minimum of 1 */
    deleteInstance(state, action) {
      const {materialId, knowledgeLevel, instanceId} = action.payload;
      const material = state.materials.find(m => m.id === materialId);
      if (material) {
        const bucket = material.instances[knowledgeLevel];
        if (bucket.length > 1) {
          material.instances[knowledgeLevel] = bucket.filter(
            i => i.id !== instanceId,
          );
        }
      }
    },

    /** Toggle or set the app theme */
    setTheme(state, action) {
      state.preferences.theme = action.payload;
    },

    /** Restore full state from device storage after app launch */
    hydrateState(state, action) {
      const {materials, preferences} = action.payload;
      if (materials) {
        state.materials = materials;
      }
      if (preferences) {
        state.preferences = preferences;
      }
      state.hydrated = true;
    },

    /** Mark state as hydrated even if no saved data found */
    setHydrated(state) {
      state.hydrated = true;
    },
  },
});

export const {
  addMaterial,
  deleteMaterial,
  setActiveMaterial,
  addInstance,
  renameInstance,
  deleteInstance,
  setTheme,
  hydrateState,
  setHydrated,
} = materialsSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectMaterials = state => state.materials.materials;
export const selectActiveMaterialId = state => state.materials.activeMaterialId;
export const selectActiveMaterial = state =>
  state.materials.materials.find(m => m.id === state.materials.activeMaterialId) || null;
export const selectTheme = state => state.materials.preferences.theme;
export const selectHydrated = state => state.materials.hydrated;

/** Get instances for a material + level */
export const selectInstances = (state, materialId, knowledgeLevel) => {
  const material = state.materials.materials.find(m => m.id === materialId);
  return material ? material.instances[knowledgeLevel] : [];
};

/** Get the most recent instance for a material + level */
export const selectLatestInstance = (state, materialId, knowledgeLevel) => {
  const material = state.materials.materials.find(m => m.id === materialId);
  if (!material) {return null;}
  const bucket = material.instances[knowledgeLevel];
  return bucket.length > 0 ? bucket[bucket.length - 1] : null;
};

export default materialsSlice.reducer;
