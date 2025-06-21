# Options Trading Simulator - Project Specifications

## 1. Audience & Learning Objectives
### Target Users
- True beginners with no derivatives background
- Self-taught retail traders refining advanced strategies
- Advanced traders seeking portfolio-level risk metrics

### Cognitive Goals
- **Knowledge**: Define calls, puts, strike, expiry, intrinsic vs. extrinsic value
- **Comprehension**: Interpret payoff diagrams; explain Greeks (Δ, Γ, Θ, ᵥ)
- **Application**: Build/analyze single-leg and multi-leg spreads
- **Analysis**: Compare risk/reward of strategies in volatility regimes
- **Evaluation**: Critique trade outcomes (P/L, probability of profit, margin)
- **Creation**: Design income strategies with covered calls, cash-secured puts, ETF overlays

### Behavioral Goals
- Disciplined risk management (position sizing based on max drawdown)
- Pattern recognition (spotting rich vs. skewed implied volatility)
- Journaling habits (post-mission reflections)

## 2. World-by-World Learning Arc
| World | Theme | Key Components |
|-------|-------|----------------|
| 1 | Foundations | Terminology drills, payoff-diagram puzzles |
| 2 | Greeks Deep Dive | Interactive sliders for Δ, Γ, Θ, ᵥ visualization |
| 3 | Single-Leg Strategies | Long calls/puts, cash-secured puts with margin effects |
| 4 | Spread Strategies | Verticals, calendars, diagonals with edge cases |
| 5 | Combination Strategies | Butterflies, iron condors, ratio spreads |
| 6 | Income & ETF Overlays | MSTY covered calls, PLTY put-selling, TSLY collars (Implemented) |
| 7 | Portfolio Management | Position sizing, volatility arbitrage, tail-risk hedging |

## 3. Core Gameplay
- **Scenario Missions**: Bullish Breakout, Income Target, Volatility Spike
- **Interactive Puzzles**: Drag-and-drop strategy builders
- **Dynamic Feedback**: Real-time margin meter, risk zone visualizations
- **Journaling**: Mandatory post-mission reflections

## 4. UI/UX Specifications
- **Layout**: Three-pane dashboard (Portfolio, Market Charts, Order Builder)
- **Visual Design**: Dark-mode with navy spectrum, amber alerts, custom icons
- **Responsive**: Desktop and tablet compatible
- **Onboarding**: Contextual tooltips, hint token system

## 5. Analytics & Personalization
- Performance tracking (accuracy, P/L per strategy, time spent)
- Adaptive difficulty based on proficiency
- Risk-profile personalization (Conservative, Balanced, Aggressive)
- Weekly progress reports

## 6. Technical Architecture
- **Market Data**: Historical options chains with realistic spreads
- **Volatility Modeling**: Adjustable skew/term structure for Greeks
- **Strategy Math**: P/L, Greeks, probability calculations
- **WebSocket Stability**: Implemented
  - ✅ Exponential backoff with jitter for reconnections
  - ✅ Heartbeat mechanism to maintain connection
  - ✅ Message queuing during disconnections
  - ✅ Redux store integration for connection status
  - ✅ Development/production environment handling
- **Persistence**: Secure cloud-synced user profiles
### API Credentials Setup
- **AlphaVantage API Key**:
  1. Register for a free API key at [AlphaVantage](https://www.alphavantage.co/support/#api-key)
  2. Create `.env` file in project root with:
     ```
     REACT_APP_ALPHA_VANTAGE_API_KEY=your_api_key_here
     ```
  3. Restart development server after adding/changing keys
- **Environment Management**:
  - Never commit `.env` files to version control
  - Use `process.env.REACT_APP_ALPHA_VANTAGE_API_KEY` in code
  - Add `.env` to `.gitignore` for security
- **Plugin Architecture**: Future expansion capability

### Windows Build Requirements

1. **Pre-build Step**: Always run `node scripts/fix-winCodeSign.js` before building for Windows
2. **Environment Variable**: `ELECTRON_BUILDER_ALLOW_SYMLINKS=false` must be set
3. **Icon File**: Place application icon at `public/icon.ico`
4. **Build Command**: `npm run electron:build`

### Application Icon Specifications

- **Dimensions**: 256x256 pixels
- **Color Scheme**:
  - Primary: Dark blue (#0d47a1)
  - Secondary: Gold (#ffd600)
- **Design Elements**:
  - "OT" monogram (Options Tutor)
  - Subtle options chain visualization motif in background
  - Clean, modern typography
- **Implementation**:
  - File path: `public/icon.ico`
  - Used in Windows taskbar, application window title bar, and installer branding

*ETF Overlays implementation completed: 2025-06-21*
