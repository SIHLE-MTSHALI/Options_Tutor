# Contributing to Options Tutor

Thank you for your interest in contributing to Options Tutor! We welcome contributions from the community and are excited to work with you to make this educational platform even better.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [Contribution Guidelines](#contribution-guidelines)
5. [Pull Request Process](#pull-request-process)
6. [Issue Guidelines](#issue-guidelines)
7. [Coding Standards](#coding-standards)
8. [Testing Requirements](#testing-requirements)
9. [Documentation](#documentation)
10. [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

### Our Pledge
- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Prioritize the community's learning goals

## Getting Started

### Ways to Contribute

#### 🐛 Bug Reports
- Report bugs through GitHub Issues
- Include detailed reproduction steps
- Provide system information and logs
- Check for existing reports before creating new ones

#### ✨ Feature Requests
- Suggest new educational content
- Propose UI/UX improvements
- Request new trading strategies
- Suggest performance enhancements

#### 📝 Documentation
- Improve existing documentation
- Add new tutorials and guides
- Translate content to other languages
- Create video tutorials and examples

#### 💻 Code Contributions
- Fix bugs and implement features
- Improve performance and optimization
- Add new trading strategies
- Enhance educational content

#### 🎨 Design Contributions
- UI/UX design improvements
- Icon and graphic design
- User experience enhancements
- Accessibility improvements

## Development Setup

### Prerequisites
- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher
- **Git** for version control
- **VS Code** (recommended) with suggested extensions

### Initial Setup

1. **Fork the Repository**
   ```bash
   # Fork the repo on GitHub, then clone your fork
   git clone https://github.com/your-username/Options_Tutor.git
   cd Options_Tutor
   ```

2. **Add Upstream Remote**
   ```bash
   git remote add upstream https://github.com/SIHLE-MTSHALI/Options_Tutor.git
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Set Up Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Verify Setup**
   ```bash
   npm run build
   npm test
   npm start
   ```

### Development Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write code following our standards
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Your Changes**
   ```bash
   npm test
   npm run test:coverage
   npm run build
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create pull request on GitHub
   ```

## Contribution Guidelines

### Types of Contributions

#### Bug Fixes
- **Priority**: High
- **Requirements**: 
  - Reproduction steps
  - Test cases
  - Documentation updates if needed

#### New Features
- **Priority**: Medium
- **Requirements**:
  - Feature proposal discussion
  - Design documentation
  - Comprehensive tests
  - User documentation

#### Educational Content
- **Priority**: High
- **Requirements**:
  - Pedagogically sound content
  - Interactive elements
  - Assessment components
  - Accessibility compliance

#### Performance Improvements
- **Priority**: Medium
- **Requirements**:
  - Benchmarking data
  - Performance tests
  - Backward compatibility

### Contribution Process

1. **Discussion**: Start with an issue or discussion
2. **Planning**: Outline your approach
3. **Implementation**: Write code following standards
4. **Testing**: Ensure comprehensive test coverage
5. **Documentation**: Update relevant documentation
6. **Review**: Submit PR for review
7. **Iteration**: Address feedback and improve
8. **Merge**: Final approval and merge

## Pull Request Process

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] Self-review of code changes completed
- [ ] Tests added for new functionality
- [ ] All tests pass locally
- [ ] Documentation updated as needed
- [ ] No merge conflicts with main branch

### PR Template

```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to change)
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] All tests pass

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No merge conflicts
```

### Review Process

1. **Automated Checks**: CI/CD pipeline runs tests
2. **Code Review**: Maintainers review code quality
3. **Testing**: Functionality and regression testing
4. **Documentation**: Review of documentation changes
5. **Approval**: Final approval from maintainers
6. **Merge**: Integration into main branch

### Review Criteria

- **Functionality**: Does it work as intended?
- **Code Quality**: Is it well-written and maintainable?
- **Testing**: Is it adequately tested?
- **Documentation**: Is it properly documented?
- **Performance**: Does it impact performance?
- **Security**: Are there any security concerns?

## Issue Guidelines

### Bug Reports

Use the bug report template:

```markdown
**Bug Description**
Clear description of the bug.

**Steps to Reproduce**
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment**
- OS: [e.g. Windows 10, macOS 11.0]
- Version: [e.g. 1.0.0]
- Browser: [if applicable]

**Additional Context**
Any other context about the problem.
```

### Feature Requests

Use the feature request template:

```markdown
**Feature Description**
Clear description of the feature.

**Problem Statement**
What problem does this solve?

**Proposed Solution**
Describe your proposed solution.

**Alternatives Considered**
Other solutions you've considered.

**Additional Context**
Any other context or screenshots.
```

### Issue Labels

- **bug**: Something isn't working
- **enhancement**: New feature or request
- **documentation**: Improvements or additions to docs
- **good first issue**: Good for newcomers
- **help wanted**: Extra attention is needed
- **question**: Further information is requested
- **wontfix**: This will not be worked on

## Coding Standards

### TypeScript Guidelines

```typescript
// Use explicit types
interface ComponentProps {
  title: string;
  onClose: () => void;
  isVisible?: boolean;
}

// Use proper naming conventions
const ComponentName: React.FC<ComponentProps> = ({ title, onClose, isVisible = false }) => {
  // Component implementation
};

// Export default at the end
export default ComponentName;
```

### React Guidelines

```typescript
// Use functional components with hooks
const MyComponent: React.FC<Props> = ({ prop1, prop2 }) => {
  const [state, setState] = useState<StateType>(initialState);
  
  useEffect(() => {
    // Effect logic
  }, [dependencies]);
  
  return (
    <div className="my-component">
      {/* JSX content */}
    </div>
  );
};

// Use proper prop types
interface Props {
  required: string;
  optional?: number;
  callback: (value: string) => void;
}
```

### SCSS Guidelines

```scss
// Use BEM methodology
.component-name {
  // Component styles
  
  &__element {
    // Element styles
  }
  
  &--modifier {
    // Modifier styles
  }
}

// Use variables for consistency
.component {
  color: $primary-color;
  background: $background-color;
  padding: $spacing-medium;
}
```

### File Organization

```
src/
├── components/
│   ├── ComponentName/
│   │   ├── ComponentName.tsx
│   │   ├── ComponentName.scss
│   │   └── __tests__/
│   │       └── ComponentName.test.tsx
│   └── index.ts
├── services/
│   ├── ServiceName.ts
│   └── __tests__/
│       └── ServiceName.test.ts
└── types/
    └── index.ts
```

### Naming Conventions

- **Files**: PascalCase for components, camelCase for utilities
- **Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Types/Interfaces**: PascalCase
- **CSS Classes**: kebab-case with BEM

### Code Style

- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings
- **Semicolons**: Always use semicolons
- **Trailing Commas**: Use in multiline structures
- **Line Length**: Maximum 100 characters

## Testing Requirements

### Test Coverage
- **Minimum**: 80% code coverage
- **Components**: Test rendering and user interactions
- **Services**: Test all public methods and error cases
- **Redux**: Test actions, reducers, and selectors

### Testing Patterns

```typescript
// Component testing
describe('ComponentName', () => {
  it('should render correctly', () => {
    render(<ComponentName {...defaultProps} />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
  
  it('should handle user interactions', () => {
    const mockCallback = jest.fn();
    render(<ComponentName onAction={mockCallback} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(mockCallback).toHaveBeenCalled();
  });
});

// Service testing
describe('ServiceName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should perform expected operation', async () => {
    const result = await service.method(input);
    expect(result).toEqual(expectedOutput);
  });
});
```

### Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- ComponentName.test.tsx
```

## Documentation

### Documentation Standards

- **Code Comments**: Explain complex logic and business rules
- **JSDoc**: Document all public APIs
- **README Updates**: Update for new features
- **User Guides**: Update for user-facing changes

### Documentation Types

#### Code Documentation
```typescript
/**
 * Calculates option Greeks for a given position
 * @param position - The option position to analyze
 * @param marketData - Current market data
 * @returns Object containing all Greeks values
 */
export const calculateGreeks = (
  position: Position,
  marketData: MarketData
): Greeks => {
  // Implementation
};
```

#### User Documentation
- Step-by-step tutorials
- Feature explanations
- Troubleshooting guides
- FAQ sections

#### API Documentation
- Endpoint descriptions
- Parameter specifications
- Response examples
- Error codes

### Documentation Updates

When contributing, update:
- [ ] Code comments for complex logic
- [ ] JSDoc for new public APIs
- [ ] User guide for new features
- [ ] API reference for new endpoints
- [ ] README for significant changes

## Community

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Pull Requests**: Code review and collaboration
- **Email**: Direct contact for sensitive issues

### Getting Help

- **Documentation**: Check existing docs first
- **Search Issues**: Look for existing solutions
- **Ask Questions**: Use GitHub Discussions
- **Join Community**: Participate in project discussions

### Recognition

Contributors are recognized through:
- **Contributors List**: GitHub contributors page
- **Release Notes**: Acknowledgment in releases
- **Special Recognition**: Outstanding contributions highlighted
- **Maintainer Invitation**: Active contributors may be invited as maintainers

## Development Resources

### Useful Links
- **React Documentation**: https://reactjs.org/docs
- **TypeScript Handbook**: https://www.typescriptlang.org/docs
- **Electron Documentation**: https://electronjs.org/docs
- **Jest Testing**: https://jestjs.io/docs
- **Material-UI**: https://mui.com/

### Development Tools
- **VS Code Extensions**: TypeScript, React, ESLint, Prettier
- **Browser DevTools**: React DevTools, Redux DevTools
- **Testing Tools**: Jest, React Testing Library
- **Build Tools**: Webpack, Electron Builder

### Learning Resources
- **Options Trading**: Educational materials for domain knowledge
- **React Patterns**: Best practices for React development
- **TypeScript Patterns**: Advanced TypeScript techniques
- **Testing Strategies**: Effective testing approaches

---

## Thank You!

Thank you for contributing to Options Tutor! Your contributions help make options trading education more accessible and effective for learners worldwide.

For questions about contributing, please:
- Open a GitHub Discussion for general questions
- Create an issue for specific problems
- Contact maintainers for sensitive matters

**Happy Contributing!** 🚀📈