// DEBUG: App component rendering
console.log("[DEBUG] Rendering App component");
import React from 'react';
import './App.scss';
import PortfolioSummary from './components/PortfolioSummary';
import MarketChart from './components/MarketChart';
import OrderBuilder from './components/OrderBuilder';

const App: React.FC = () => {
  return (
    <div className="app-layout">
      <div className="left-pane">
        <PortfolioSummary />
      </div>
      <div className="center-pane">
        <MarketChart />
      </div>
      <div className="right-pane">
        <OrderBuilder />
      </div>
    </div>
  );
}

export default App;
