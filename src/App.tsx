import React from 'react';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import TradingDashboard from './components/TradingDashboard';
import './App.scss';

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <TradingDashboard />
    </Provider>
  );
}

export default App;
