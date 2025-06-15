// DEBUG: Store initialization
console.log("[DEBUG] Initializing Redux store");
import { configureStore } from '@reduxjs/toolkit';
import portfolioReducer from './portfolioSlice';
import marketDataReducer from './marketDataSlice';
import tradingReducer from './tradingSlice';
import learningReducer from './learningSlice';

export const store = configureStore({
  reducer: {
    portfolio: portfolioReducer,
    marketData: marketDataReducer,
    trading: tradingReducer,
    learning: learningReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: false
    })
});

export type RootState = ReturnType<typeof store.getState>;
