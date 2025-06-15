import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.scss';
import App from './App';
import { store } from '@redux/store';
import { Provider } from 'react-redux';
import { initRealTimeService, realTimeService } from './services/realTimeService'; // Initialize WebSocket

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// Initialize WebSocket connection for real-time data
// Initialize realTimeService with store reference
initRealTimeService(store);
realTimeService.connect('ws://localhost:3001');

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);
