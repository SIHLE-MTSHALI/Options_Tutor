const { configureStore } = require('@reduxjs/toolkit');
const portfolioReducer = require('./src/redux/portfolioSlice').default;
const tradingReducer = require('./src/redux/tradingSlice').default;

const store = configureStore({
  reducer: {
    portfolio: portfolioReducer,
    trading: tradingReducer
  }
});

const { executeTradeThunk } = require('./src/redux/tradingSlice');

const testTrade = async () => {
  const legs = [{
    symbol: 'AAPL',
    contractId: 'AAPL-20231020-C-150',
    optionType: 'call',
    action: 'buy',
    quantity: 5,
    strike: 150,
    expiry: '2023-10-20',
    premium: 2.5
  }];

  await store.dispatch(executeTradeThunk(legs));
  
  const positions = store.getState().portfolio.positions;
  console.log('Positions after trade:');
  console.log(positions);
  
  if (positions.length === 0) {
    console.error('Test failed: No positions created');
    process.exit(1);
  }
  
  const position = positions[0];
  const expectedUnrealizedPL = (position.currentPrice - position.purchasePrice) * position.quantity;
  
  console.log(`Position Unrealized P/L: ${expectedUnrealizedPL.toFixed(2)}`);
  console.log('Test passed!');
};

testTrade().catch(console.error);