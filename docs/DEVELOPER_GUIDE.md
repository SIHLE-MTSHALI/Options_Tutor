# Options Tutor - Developer Guide

This guide provides comprehensive information for developers working on or extending the Options Tutor application.

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Architecture Overview](#architecture-overview)
3. [Code Organization](#code-organization)
4. [Development Workflow](#development-workflow)
5. [Testing Guidelines](#testing-guidelines)
6. [Performance Optimization](#performance-optimization)
7. [Deployment Process](#deployment-process)
8. [Contributing Guidelines](#contributing-guidelines)
9. [API Documentation](#api-documentation)
10. [Troubleshooting](#troubleshooting)

## Development Environment Setup

### Prerequisites

**Required Software:**
- Node.js 18.x or higher
- npm 9.x or higher
- Git 2.30 or higher
- Visual Studio Code (recommended)

**Recommended Extensions:**
- TypeScript and JavaScript Language Features
- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- ESLint
- GitLens

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/options-tutor/options-tutor-app.git
   cd options-tutor-app
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

### Development Scripts

```bash
# Development
npm run dev              # Start development server with hot reload
npm run dev:main         # Start main process in development mode
npm run dev:renderer     # Start renderer process in development mode

# Building
npm run build            # Build for production
npm run build:main       # Build main process only
npm run build:renderer   # Build renderer process only
npm run build:production # Full production build with optimization

# Testing
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
npm run test:performance # Run performance tests

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues automatically
npm run format           # Format code with Prettier
npm run type-check       # TypeScript type checking

# Packaging
npm run package          # Package application for current platform
npm run package:win      # Package for Windows
npm run package:mac      # Package for macOS
npm run package:linux    # Package for Linux

# Analysis
npm run analyze          # Analyze bundle size
npm run performance      # Run performance analysis
```

## Architecture Overview

### Technology Stack

**Frontend Framework:**
- React 19.1.0 with TypeScript
- Redux Toolkit for state management
- SCSS for styling with CSS modules
- Chart.js and D3.js for data visualization

**Desktop Framework:**
- Electron 36.4.0
- Node.js integration for system access
- IPC communication between processes

**Build Tools:**
- Webpack 5.x for bundling
- TypeScript compiler
- Babel for JavaScript transpilation
- Electron Builder for packaging

**Testing Framework:**
- Jest for unit and integration testing
- React Testing Library for component testing
- Performance testing suite

### Application Structure

```
src/
├── components/           # React UI components
│   ├── __tests__/       # Component tests
│   ├── *.tsx            # Component files
│   └── *.scss           # Component styles
├── redux/               # State management
│   ├── __tests__/       # Redux tests
│   ├── slices/          # Redux slices
│   ├── thunks/          # Async actions
│   ├── store.ts         # Store configuration
│   ├── hooks.ts         # Typed hooks
│   └── types.ts         # Type definitions
├── services/            # Business logic
│   ├── __tests__/       # Service tests
│   ├── errors/          # Custom error classes
│   ├── pricingModels/   # Financial models
│   └── *.ts             # Service implementations
├── styles/              # Global styles
│   ├── variables.scss   # SCSS variables
│   └── *.scss           # Global stylesheets
├── testing/             # Testing utilities
│   ├── __tests__/       # Test files
│   └── *.ts             # Test utilities
├── App.tsx              # Main application component
└── index.tsx            # Application entry point
```

### Process Architecture

**Main Process (main.js):**
- Electron application lifecycle
- Window management
- System integration
- Security policies

**Renderer Process (React App):**
- User interface
- Business logic
- State management
- Real-time updates

**Preload Script (preload.js):**
- Secure IPC communication
- Context isolation
- API exposure to renderer

## Code Organization

### Component Structure

```typescript
// Component template
import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../redux/hooks';
import './ComponentName.scss';

interface ComponentNameProps {
  // Define props with TypeScript
  prop1: string;
  prop2?: number;
}

const ComponentName: React.FC<ComponentNameProps> = ({ 
  prop1, 
  prop2 = 0 
}) => {
  const dispatch = useAppDispatch();
  const stateValue = useAppSelector(state => state.slice.value);
  
  const [localState, setLocalState] = useState<string>('');
  
  useEffect(() => {
    // Side effects
  }, []);
  
  const handleAction = () => {
    // Event handlers
  };
  
  return (
    <div className="component-name">
      {/* JSX content */}
    </div>
  );
};

export default ComponentName;
```

### Redux Slice Structure

```typescript
// Redux slice template
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SliceState {
  // Define state shape
  data: any[];
  loading: boolean;
  error: string | null;
}

const initialState: SliceState = {
  data: [],
  loading: false,
  error: null
};

const sliceName = createSlice({
  name: 'sliceName',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setData: (state, action: PayloadAction<any[]>) => {
      state.data = action.payload;
      state.loading = false;
      state.error = null;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    }
  }
});

export const { setLoading, setData, setError } = sliceName.actions;
export default sliceName.reducer;
```

### Service Class Structure

```typescript
// Service class template
export class ServiceName {
  private static instance: ServiceName;
  
  private constructor() {
    // Private constructor for singleton
  }
  
  public static getInstance(): ServiceName {
    if (!ServiceName.instance) {
      ServiceName.instance = new ServiceName();
    }
    return ServiceName.instance;
  }
  
  public async methodName(params: ParamType): Promise<ReturnType> {
    try {
      // Implementation
      return result;
    } catch (error) {
      throw new CustomError('Operation failed', error);
    }
  }
  
  private helperMethod(): void {
    // Private helper methods
  }
}
```

### Styling Guidelines

**SCSS Structure:**
```scss
// Component styles template
@import '../styles/variables.scss';

.component-name {
  // Base styles
  background: $panel-bg;
  border-radius: 8px;
  padding: 16px;
  
  // Nested elements
  .element-class {
    color: $light-text;
    font-size: 1rem;
    
    &:hover {
      color: $positive-color;
    }
  }
  
  // Modifiers
  &.compact {
    padding: 8px;
  }
  
  // Responsive design
  @media (max-width: 768px) {
    padding: 12px;
  }
}
```

**CSS Variables:**
```scss
// Global variables
$dark-bg: #121826;
$panel-bg: #1c2333;
$light-text: #e0e0e0;
$positive-color: #4ade80;
$negative-color: #f87171;
$warning-color: #fbbf24;
```

## Development Workflow

### Git Workflow

**Branch Strategy:**
- `main`: Production-ready code
- `develop`: Integration branch
- `feature/*`: Feature development
- `bugfix/*`: Bug fixes
- `hotfix/*`: Critical production fixes

**Commit Convention:**
```
type(scope): description

feat(trading): add covered call strategy builder
fix(charts): resolve real-time update lag
docs(readme): update installation instructions
test(services): add unit tests for trade service
refactor(components): optimize portfolio summary rendering
```

**Pull Request Process:**
1. Create feature branch from `develop`
2. Implement changes with tests
3. Update documentation if needed
4. Submit pull request with description
5. Code review and approval
6. Merge to `develop`

### Code Review Guidelines

**Review Checklist:**
- [ ] Code follows TypeScript best practices
- [ ] Components are properly typed
- [ ] Tests cover new functionality
- [ ] Performance impact considered
- [ ] Documentation updated
- [ ] No console.log statements in production code
- [ ] Error handling implemented
- [ ] Accessibility considerations addressed

**Review Focus Areas:**
- **Functionality**: Does the code work as intended?
- **Performance**: Are there any performance implications?
- **Security**: Are there any security vulnerabilities?
- **Maintainability**: Is the code easy to understand and modify?
- **Testing**: Is the code adequately tested?

### Development Best Practices

**TypeScript Guidelines:**
- Use strict mode configuration
- Define explicit return types for functions
- Avoid `any` type unless absolutely necessary
- Use interfaces for object shapes
- Implement proper error handling

**React Guidelines:**
- Use functional components with hooks
- Implement proper dependency arrays in useEffect
- Memoize expensive calculations with useMemo
- Use useCallback for event handlers
- Follow component composition patterns

**Performance Guidelines:**
- Implement code splitting for large components
- Use React.memo for expensive components
- Optimize re-renders with proper state structure
- Implement virtual scrolling for large lists
- Use debouncing for frequent updates

## Testing Guidelines

### Testing Strategy

**Unit Tests:**
- Test individual functions and components
- Mock external dependencies
- Focus on business logic
- Aim for 80%+ code coverage

**Integration Tests:**
- Test component interactions
- Test service integrations
- Test Redux state management
- Test real-time data flow

**Performance Tests:**
- Load testing with multiple positions
- Memory leak detection
- Render performance testing
- Real-time update performance

### Testing Patterns

**Component Testing:**
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from '../redux/store';
import ComponentName from './ComponentName';

describe('ComponentName', () => {
  const renderComponent = (props = {}) => {
    return render(
      <Provider store={store}>
        <ComponentName {...props} />
      </Provider>
    );
  };
  
  it('should render correctly', () => {
    renderComponent();
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
  
  it('should handle user interaction', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Updated Text')).toBeInTheDocument();
  });
});
```

**Service Testing:**
```typescript
import { ServiceName } from './ServiceName';

describe('ServiceName', () => {
  let service: ServiceName;
  
  beforeEach(() => {
    service = ServiceName.getInstance();
  });
  
  it('should process data correctly', async () => {
    const result = await service.methodName(testData);
    expect(result).toEqual(expectedResult);
  });
  
  it('should handle errors gracefully', async () => {
    await expect(service.methodName(invalidData))
      .rejects.toThrow('Expected error message');
  });
});
```

### Mock Strategies

**API Mocking:**
```typescript
// Mock external APIs
jest.mock('../services/ApiService', () => ({
  ApiService: {
    fetchData: jest.fn().mockResolvedValue(mockData),
    postData: jest.fn().mockResolvedValue({ success: true })
  }
}));
```

**Redux Store Mocking:**
```typescript
// Mock Redux store
const mockStore = configureStore({
  reducer: {
    slice: sliceReducer
  },
  preloadedState: {
    slice: mockState
  }
});
```

## Performance Optimization

### Optimization Strategies

**Bundle Optimization:**
- Code splitting by route and feature
- Tree shaking to remove unused code
- Dynamic imports for large dependencies
- Webpack bundle analysis

**Runtime Optimization:**
- React.memo for expensive components
- useMemo for expensive calculations
- useCallback for stable references
- Virtual scrolling for large lists

**Memory Optimization:**
- Proper cleanup in useEffect
- Avoid memory leaks in subscriptions
- Efficient data structures
- Garbage collection considerations

### Performance Monitoring

**Metrics to Track:**
- Initial load time
- Component render time
- Memory usage
- Bundle size
- Real-time update frequency

**Monitoring Tools:**
- React DevTools Profiler
- Chrome DevTools Performance
- Webpack Bundle Analyzer
- Custom performance testing suite

### Performance Testing

**Load Testing:**
```typescript
// Performance test example
describe('Performance Tests', () => {
  it('should handle 1000 positions efficiently', async () => {
    const startTime = performance.now();
    
    // Create 1000 test positions
    const positions = generateTestPositions(1000);
    
    // Measure rendering time
    render(<PortfolioComponent positions={positions} />);
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    expect(renderTime).toBeLessThan(500); // Under 500ms
  });
});
```

## Deployment Process

### Build Process

**Development Build:**
```bash
npm run build:dev
```

**Production Build:**
```bash
npm run build:production
```

**Build Optimization:**
- TypeScript compilation with strict settings
- Webpack optimization for production
- Asset compression and minification
- Bundle splitting and code splitting

### Packaging

**Cross-Platform Packaging:**
```bash
# Package for all platforms
npm run package:all

# Platform-specific packaging
npm run package:win    # Windows
npm run package:mac    # macOS
npm run package:linux  # Linux
```

**Package Configuration:**
- Electron Builder configuration
- Code signing for distribution
- Auto-updater setup
- Installer creation

### Deployment Pipeline

**CI/CD Workflow:**
1. Code commit triggers build
2. Automated testing suite runs
3. Performance tests execute
4. Security scanning
5. Build artifacts created
6. Deployment to staging
7. Manual testing and approval
8. Production deployment

### Release Process

**Version Management:**
- Semantic versioning (MAJOR.MINOR.PATCH)
- Automated changelog generation
- Release notes creation
- Tag creation and GitHub releases

**Release Checklist:**
- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Security scan completed
- [ ] Documentation updated
- [ ] Release notes prepared
- [ ] Stakeholder approval obtained

## Contributing Guidelines

### Getting Started

1. **Fork the Repository**
2. **Create Feature Branch**
3. **Make Changes**
4. **Add Tests**
5. **Update Documentation**
6. **Submit Pull Request**

### Code Standards

**TypeScript Standards:**
- Use strict TypeScript configuration
- Define explicit types for all functions
- Implement proper error handling
- Follow naming conventions

**React Standards:**
- Use functional components
- Implement proper prop types
- Follow component composition patterns
- Use hooks appropriately

**Testing Standards:**
- Write tests for all new features
- Maintain test coverage above 80%
- Use descriptive test names
- Mock external dependencies

### Documentation Standards

**Code Documentation:**
- JSDoc comments for public APIs
- Inline comments for complex logic
- README files for modules
- Architecture decision records

**User Documentation:**
- User guide updates for new features
- API documentation for integrations
- Tutorial updates for new functionality
- FAQ updates for common issues

## API Documentation

### Internal APIs

**Redux Store API:**
```typescript
// Portfolio slice
interface PortfolioState {
  positions: Position[];
  cashBalance: number;
  unrealizedPL: number;
  realizedPL: number;
}

// Actions
addPosition(position: Position): void
removePosition(positionId: string): void
updatePosition(positionId: string, updates: Partial<Position>): void
```

**Service APIs:**
```typescript
// Trading Service
class TradeService {
  static executeTrade(trade: TradeRequest): Promise<TradeResult>
  static validateTrade(trade: TradeRequest): ValidationResult
  static calculateMargin(trade: TradeRequest): number
}

// Market Data Service
class MarketDataService {
  getStockQuote(symbol: string): Promise<Quote>
  getOptionChain(symbol: string, expiry: string): Promise<OptionChain>
  subscribeToUpdates(symbols: string[], callback: Function): Subscription
}
```

### External APIs

**Alpha Vantage Integration:**
- Real-time stock quotes
- Historical price data
- Options data (simulated)
- Rate limiting and error handling

**IPC Communication:**
```typescript
// Main to Renderer
interface MainToRenderer {
  'market-data-update': (data: MarketData) => void;
  'app-update-available': (version: string) => void;
}

// Renderer to Main
interface RendererToMain {
  'get-app-version': () => Promise<string>;
  'open-external-link': (url: string) => void;
}
```

## Troubleshooting

### Common Development Issues

**Build Errors:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear TypeScript cache
rm -rf .tsbuildinfo

# Clear Webpack cache
rm -rf .webpack
```

**TypeScript Errors:**
- Check tsconfig.json configuration
- Verify type definitions are installed
- Update @types packages
- Check for conflicting type declarations

**Performance Issues:**
- Use React DevTools Profiler
- Check for unnecessary re-renders
- Optimize component memoization
- Review bundle size and imports

**Testing Issues:**
- Update Jest configuration
- Check for async/await issues
- Verify mock implementations
- Review test environment setup

### Debug Configuration

**VS Code Debug Configuration:**
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Main Process",
  "program": "${workspaceFolder}/main.js",
  "env": {
    "NODE_ENV": "development"
  }
}
```

**Chrome DevTools:**
- Enable Node.js debugging
- Use React Developer Tools
- Profile performance with DevTools
- Monitor network requests

### Logging and Monitoring

**Development Logging:**
```typescript
// Use debug levels
console.debug('[DEBUG] Detailed information');
console.info('[INFO] General information');
console.warn('[WARN] Warning message');
console.error('[ERROR] Error occurred');
```

**Production Monitoring:**
- Error tracking with Sentry
- Performance monitoring
- User analytics
- Crash reporting

---

## Additional Resources

### Documentation Links
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Electron Documentation](https://www.electronjs.org/docs)
- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)

### Development Tools
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [Redux DevTools](https://github.com/reduxjs/redux-devtools)
- [TypeScript Playground](https://www.typescriptlang.org/play)
- [Webpack Bundle Analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer)

### Community Resources
- [GitHub Discussions](https://github.com/options-tutor/discussions)
- [Developer Discord](https://discord.gg/options-tutor-dev)
- [Stack Overflow Tag](https://stackoverflow.com/questions/tagged/options-tutor)

---

*This developer guide is maintained by the Options Tutor development team. For questions or suggestions, please open an issue on GitHub.*