/**
 * FUTO Learn — Redux Store
 * Configures the central Redux store for the entire app.
 */

import {configureStore} from '@reduxjs/toolkit';
import materialsReducer from './slices/materialsSlice';

const store = configureStore({
  reducer: {
    materials: materialsReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;
