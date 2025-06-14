// DEBUG: Store initialization
console.log("[DEBUG] Initializing Redux store");
import { configureStore } from '@reduxjs/toolkit';
import portfolioReducer from './portfolioSlice';
import marketDataReducer from '@redux/marketDataSlice';
import tradingReducer from '@redux/tradingSlice';
import learningReducer from '@redux/learningSlice';

export const store = configureStore({
  reducer: {
    portfolio: portfolioReducer,
    marketData: marketDataReducer,
    trading: tradingReducer,
    learning: learningReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
