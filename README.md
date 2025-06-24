# Options Tutor

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Electron](https://img.shields.io/badge/Electron-Latest-blue)](https://electronjs.org/)
[![React](https://img.shields.io/badge/React-19.1.0-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue)](https://www.typescriptlang.org/)

**Options Tutor** is a comprehensive desktop application for options trading education and simulation. Built with Electron, React, and TypeScript, it provides an interactive learning platform that combines real-time market simulation with gamified educational content to help users master options trading strategies.

![Options Tutor Dashboard](docs/images/dashboard-preview.png)

## 🌟 Key Features

### 📚 **Interactive Education System**
- **Structured Learning Paths**: Beginner to Advanced progression with 100+ interactive lessons
- **Gamification**: XP system, achievement badges, and progress tracking
- **Real-time Simulations**: Practice strategies with live market data simulation
- **Interactive Tutorials**: Step-by-step guided learning with quizzes and exercises

### 📈 **Advanced Trading Simulation**
- **Strategy Builder**: Visual construction of complex multi-leg options strategies
- **Real-time P&L Tracking**: Live profit/loss monitoring with portfolio analytics
- **Risk Management**: Comprehensive risk analysis with Greeks monitoring
- **Market Data Integration**: Real-time quotes, option chains, and technical analysis

### 🛠️ **Professional Tools**
- **Advanced Charting**: Technical indicators, drawing tools, and market analysis
- **Options Chain Analysis**: Complete option chains with Greeks and volatility data
- **Portfolio Management**: Position tracking, performance analytics, and reporting
- **Backtesting Engine**: Historical strategy testing and optimization

### 🎯 **Supported Strategies**
- **Basic**: Long calls/puts, covered calls, cash-secured puts
- **Intermediate**: Spreads, collars, straddles, strangles
- **Advanced**: Iron condors, butterflies, ratio spreads, custom strategies
- **ETF Strategies**: Specialized strategies for ETF trading

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher
- **Git** for cloning the repository

### Installation

```bash
# Clone the repository
git clone https://github.com/SIHLE-MTSHALI/Options_Tutor.git
cd Options_Tutor

# Install dependencies
npm install

# Build the application
npm run build

# Start the application
npm start
```

### First Launch
1. Complete the initial setup wizard
2. Choose your experience level (Beginner/Intermediate/Advanced)
3. Start with the "Options Fundamentals" tutorial
4. Practice your first covered call strategy

## 📖 Documentation

### User Documentation
- **[User Guide](docs/USER_GUIDE.md)** - Comprehensive user manual
- **[Quick Start Guide](docs/QUICK_START_GUIDE.md)** - Get started in 10 minutes
- **[Installation Guide](docs/INSTALLATION_GUIDE.md)** - Detailed installation instructions
- **[Tutorial System](docs/TUTORIAL_GUIDE.md)** - Complete learning path documentation

### Developer Documentation
- **[Developer Guide](docs/DEVELOPER_GUIDE.md)** - Development setup and guidelines
- **[API Reference](docs/API_REFERENCE.md)** - Complete API documentation
- **[Architecture Overview](#-architecture)** - Technical architecture details
- **[Contributing Guidelines](#-contributing)** - How to contribute to the project

## 🏗️ Architecture

Options Tutor is built using modern web technologies in an Electron desktop application:

### Technology Stack
- **Frontend**: React 19.1.0 with TypeScript
- **State Management**: Redux Toolkit with RTK Query
- **Desktop Framework**: Electron (latest)
- **Styling**: SCSS with custom design system
- **Charts**: Chart.js and D3.js for advanced visualizations
- **UI Components**: Material-UI (MUI) components
- **Testing**: Jest with React Testing Library

### Project Structure
```
Options_Tutor/
├── src/                          # Source code
│   ├── components/               # React components
│   │   ├── TradingDashboard.tsx  # Main dashboard
│   │   ├── StrategyBuilder.tsx   # Strategy construction
│   │   ├── EducationalPanel.tsx  # Learning interface
│   │   └── __tests__/           # Component tests
│   ├── redux/                   # State management
│   │   ├── store.ts             # Redux store configuration
│   │   ├── portfolioSlice.ts    # Portfolio state
│   │   ├── tradingSlice.ts      # Trading state
│   │   └── types.ts             # TypeScript definitions
│   ├── services/                # Business logic
│   │   ├── TradeService.ts      # Trade execution
│   │   ├── RiskService.ts       # Risk calculations
│   │   └── MarketDataService.ts # Market data handling
│   └── styles/                  # Global styles
├── docs/                        # Documentation
├── public/                      # Static assets
├── main.js                      # Electron main process
├── preload.js                   # Electron preload script
└── webpack.*.config.js          # Build configuration
```

### Key Components

#### Trading Dashboard
The main interface providing:
- Real-time market charts with technical analysis
- Strategy builder for options construction
- Portfolio monitoring and P&L tracking
- Risk management dashboard

#### Educational System
Interactive learning platform featuring:
- Structured learning paths with 100+ lessons
- Gamification with XP and achievement systems
- Real-time simulations and practice exercises
- Progress tracking and personalized recommendations

#### Strategy Builder
Visual tool for creating options strategies:
- Drag-and-drop strategy construction
- Real-time payoff diagram generation
- Greeks analysis and risk assessment
- Backtesting and optimization tools

## 🎓 Educational Content

### Learning Paths

#### 🟢 Beginner Path (4-6 weeks)
- **Options Fundamentals**: Basic concepts and terminology
- **Simple Strategies**: Long calls/puts, covered calls
- **Market Analysis**: Reading option chains and basic TA
- **Risk Management**: Position sizing and stop losses

#### 🟡 Intermediate Path (6-8 weeks)
- **Advanced Strategies**: Spreads, straddles, collars
- **The Greeks**: Delta, gamma, theta, vega analysis
- **Volatility Trading**: IV analysis and vol strategies
- **Portfolio Management**: Multi-position management

#### 🔴 Advanced Path (8-10 weeks)
- **Complex Strategies**: Iron condors, butterflies, ratios
- **Quantitative Analysis**: Black-Scholes, backtesting
- **Risk Management**: VaR, stress testing, hedging
- **Professional Trading**: Market making, institutional strategies

### Interactive Features
- **Real-time Quizzes**: Test knowledge with immediate feedback
- **Strategy Simulations**: Practice with live market conditions
- **Achievement System**: Unlock badges and track progress
- **Adaptive Learning**: Personalized content recommendations

## 🛠️ Development

### Development Setup

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build for production
npm run build:production
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start the Electron application |
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build both main and renderer processes |
| `npm run build:main` | Build Electron main process only |
| `npm run build:renderer` | Build React renderer process only |
| `npm run build:production` | Production build with optimizations |
| `npm test` | Run test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |

### Development Guidelines

#### Code Style
- **TypeScript**: Strict mode enabled with explicit types
- **ESLint**: Configured for React and TypeScript
- **Prettier**: Automatic code formatting
- **SCSS**: Component-scoped styling with global variables

#### Testing Standards
- **Unit Tests**: Jest with React Testing Library
- **Integration Tests**: Service layer testing
- **Coverage Target**: >80% code coverage
- **Test Location**: Co-located with components in `__tests__/` directories

#### Component Structure
```typescript
// Standard component pattern
import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import './ComponentName.scss';

interface ComponentProps {
  // TypeScript interface for props
}

const ComponentName: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  const stateValue = useSelector((state: RootState) => state.slice.value);
  
  return (
    <div className="component-name">
      {/* Component JSX */}
    </div>
  );
};

export default ComponentName;
```

## 🧪 Testing

### Test Coverage
- **Components**: React component testing with RTL
- **Services**: Business logic and API integration tests
- **Redux**: State management and thunk testing
- **E2E**: End-to-end workflow testing (planned)

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage report
npm run test:coverage

# Run specific test file
npm test -- PortfolioSummary.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="should render"
```

### Test Structure
```
src/
├── components/
│   ├── ComponentName.tsx
│   └── __tests__/
│       └── ComponentName.test.tsx
├── services/
│   ├── ServiceName.ts
│   └── __tests__/
│       └── ServiceName.test.ts
└── redux/
    ├── sliceName.ts
    └── __tests__/
        └── sliceName.test.ts
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```bash
# Development environment
NODE_ENV=development
ELECTRON_IS_DEV=true

# API Configuration
API_BASE_URL=https://api.optionstutor.com
API_KEY=your_api_key_here

# Feature Flags
ENABLE_REAL_TIME_DATA=true
ENABLE_BACKTESTING=true
ENABLE_ADVANCED_FEATURES=true

# Debug Settings
DEBUG=options-tutor:*
LOG_LEVEL=debug
```

### Build Configuration
- **Webpack**: Separate configs for main and renderer processes
- **TypeScript**: Strict mode with path aliases
- **SCSS**: Global variables and component-scoped styles
- **Electron Builder**: Cross-platform packaging configuration

## 📦 Deployment

### Building for Distribution

```bash
# Build for current platform
npm run build:production

# Build for Windows
npm run electron:build

# Build for all platforms (requires platform-specific setup)
npm run build:all
```

### Distribution Packages
- **Windows**: `.exe` installer with auto-updater
- **macOS**: `.dmg` disk image with code signing
- **Linux**: `.deb`, `.rpm`, and `.AppImage` packages

### Release Process
1. Update version in `package.json`
2. Run full test suite
3. Build production packages
4. Create GitHub release with binaries
5. Update documentation and changelog

## 🤝 Contributing

We welcome contributions from the community! Here's how to get started:

### Getting Started
1. **Fork** the repository
2. **Clone** your fork locally
3. **Create** a feature branch
4. **Make** your changes
5. **Test** thoroughly
6. **Submit** a pull request

### Development Workflow
```bash
# Fork and clone the repository
git clone https://github.com/your-username/Options_Tutor.git
cd Options_Tutor

# Create a feature branch
git checkout -b feature/your-feature-name

# Install dependencies
npm install

# Start development server
npm run dev

# Make your changes and test
npm test

# Commit your changes
git commit -m "Add your feature description"

# Push to your fork
git push origin feature/your-feature-name

# Create a pull request
```

### Contribution Guidelines
- **Code Quality**: Follow TypeScript and React best practices
- **Testing**: Include tests for new features and bug fixes
- **Documentation**: Update relevant documentation
- **Commit Messages**: Use conventional commit format
- **Pull Requests**: Provide clear description and context

### Areas for Contribution
- 🐛 **Bug Fixes**: Report and fix issues
- ✨ **New Features**: Implement new functionality
- 📚 **Documentation**: Improve guides and tutorials
- 🎨 **UI/UX**: Enhance user interface and experience
- 🧪 **Testing**: Increase test coverage
- 🌐 **Localization**: Add support for new languages

## 📊 Performance

### Optimization Features
- **Lazy Loading**: Components loaded on demand
- **Memoization**: React.memo and useMemo for performance
- **Virtual Scrolling**: Efficient rendering of large datasets
- **Web Workers**: Background processing for calculations
- **Caching**: Intelligent caching of market data and calculations

### Performance Monitoring
- **Real-time Metrics**: Monitor application performance
- **Memory Usage**: Track and optimize memory consumption
- **Render Performance**: Optimize React component rendering
- **Network Efficiency**: Minimize API calls and data transfer

## 🔒 Security

### Security Features
- **Context Isolation**: Electron security best practices
- **CSP Headers**: Content Security Policy implementation
- **Input Validation**: Comprehensive input sanitization
- **Secure Storage**: Encrypted local data storage
- **No Node Integration**: Renderer process security

### Data Privacy
- **Local Storage**: All data stored locally on user's machine
- **No Personal Data**: No collection of personal information
- **Simulation Only**: No real financial data or transactions
- **Open Source**: Transparent and auditable codebase

## 🐛 Troubleshooting

### Common Issues

#### Installation Problems
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version  # Should be 18.0.0 or higher
```

#### Build Issues
```bash
# Clean build artifacts
npm run clean

# Rebuild from scratch
npm run build:clean

# Check TypeScript errors
npx tsc --noEmit
```

#### Runtime Issues
- **Check Console**: Open DevTools (F12) for error messages
- **Clear Cache**: Delete application data folder
- **Update Dependencies**: Ensure all packages are up to date
- **Check Logs**: Review application logs for detailed errors

### Getting Help
- **Documentation**: Check the comprehensive guides in `/docs`
- **Issues**: Search existing GitHub issues or create a new one
- **Discussions**: Join community discussions for questions
- **Support**: Contact support for critical issues

## 📈 Roadmap

### Upcoming Features
- 🌐 **Web Version**: Browser-based version of the application
- 📱 **Mobile App**: iOS and Android companion apps
- 🤖 **AI Assistant**: Intelligent trading strategy recommendations
- 🔗 **Broker Integration**: Connect to real trading accounts
- 📊 **Advanced Analytics**: Enhanced performance analytics
- 🌍 **Multi-language**: Support for multiple languages

### Long-term Vision
- **Community Platform**: Social features and strategy sharing
- **Certification Program**: Official options trading certification
- **Institutional Version**: Enterprise features for schools and firms
- **API Platform**: Third-party integrations and extensions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024 Options Tutor

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 🙏 Acknowledgments

### Technologies Used
- **[Electron](https://electronjs.org/)** - Cross-platform desktop apps
- **[React](https://reactjs.org/)** - User interface library
- **[Redux Toolkit](https://redux-toolkit.js.org/)** - State management
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Chart.js](https://www.chartjs.org/)** - Interactive charts
- **[Material-UI](https://mui.com/)** - React component library
- **[Jest](https://jestjs.io/)** - Testing framework

### Inspiration
- **Real Trading Platforms**: Inspired by professional trading interfaces
- **Educational Platforms**: Learning from successful educational apps
- **Open Source Community**: Built with and for the open source community

### Contributors
Special thanks to all contributors who have helped make Options Tutor better:
- [Contributor List](https://github.com/SIHLE-MTSHALI/Options_Tutor/graphs/contributors)

## 📞 Contact

### Project Maintainer
- **GitHub**: [@SIHLE-MTSHALI](https://github.com/SIHLE-MTSHALI)
- **Project URL**: [https://github.com/SIHLE-MTSHALI/Options_Tutor](https://github.com/SIHLE-MTSHALI/Options_Tutor)

### Community
- **Issues**: [GitHub Issues](https://github.com/SIHLE-MTSHALI/Options_Tutor/issues)
- **Discussions**: [GitHub Discussions](https://github.com/SIHLE-MTSHALI/Options_Tutor/discussions)
- **Wiki**: [Project Wiki](https://github.com/SIHLE-MTSHALI/Options_Tutor/wiki)

### Support
For support, bug reports, or feature requests, please use the GitHub issue tracker or contact the maintainers directly.

---

<div align="center">

**⭐ Star this repository if you find it helpful!**

**📚 Happy Learning and Trading! 📈**

*Built with ❤️ for the options trading community*

</div>