import React from 'react';
import './App.scss';

const App: React.FC = () => {
  return (
    <div className="app-layout">
      <div className="left-pane">
        {/* Portfolio summary will go here */}
        <h2>Portfolio Summary</h2>
      </div>
      <div className="center-pane">
        {/* Live price chart will go here */}
        <h2>Market Charts</h2>
      </div>
      <div className="right-pane">
        {/* Order builder will go here */}
        <h2>Order Builder</h2>
      </div>
    </div>
  );
}

export default App;
