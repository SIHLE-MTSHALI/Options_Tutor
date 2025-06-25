import React, { useState, useEffect } from 'react';
import { StrategyType } from '../redux/types';
import InteractiveTutorialSystem from './InteractiveTutorialSystem';
import LearningProgressTracker from './LearningProgressTracker';
import './EducationalPanel.scss';

/**
 * Enhanced Educational Panel - Comprehensive learning center
 * Features:
 * - Interactive tutorial system
 * - Progress tracking with achievements
 * - Strategy guides and explanations
 * - Comprehensive glossary with search
 * - Context-aware learning recommendations
 */

interface EnhancedEducationalPanelProps {
  currentStrategy: StrategyType | null;
  selectedSymbol: string;
  compact?: boolean;
}

interface LessonModule {
  id: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedTime: string;
  topics: string[];
  completed: boolean;
}

interface StrategyGuide {
  strategy: StrategyType;
  title: string;
  overview: string;
  whenToUse: string[];
  risks: string[];
  example: {
    scenario: string;
    setup: string;
    outcome: string;
  };
  tips: string[];
}

const lessonModules: LessonModule[] = [
  {
    id: 'options-basics',
    title: 'Options Trading Fundamentals',
    description: 'Learn the basics of call and put options, how they work, and key terminology.',
    difficulty: 'Beginner',
    estimatedTime: '15 min',
    topics: ['Call Options', 'Put Options', 'Strike Price', 'Expiration', 'Premium'],
    completed: false
  },
  {
    id: 'greeks-intro',
    title: 'Understanding the Greeks',
    description: 'Master Delta, Gamma, Theta, and Vega to understand option price movements.',
    difficulty: 'Intermediate',
    estimatedTime: '25 min',
    topics: ['Delta', 'Gamma', 'Theta', 'Vega', 'Rho'],
    completed: false
  },
  {
    id: 'risk-management',
    title: 'Risk Management Essentials',
    description: 'Learn how to protect your portfolio and manage risk in options trading.',
    difficulty: 'Intermediate',
    estimatedTime: '20 min',
    topics: ['Position Sizing', 'Stop Losses', 'Portfolio Diversification', 'Risk Assessment'],
    completed: false
  },
  {
    id: 'advanced-strategies',
    title: 'Advanced Options Strategies',
    description: 'Explore complex multi-leg strategies for experienced traders.',
    difficulty: 'Advanced',
    estimatedTime: '35 min',
    topics: ['Iron Condors', 'Butterflies', 'Calendar Spreads', 'Ratio Spreads'],
    completed: false
  }
];

const strategyGuides: StrategyGuide[] = [
  {
    strategy: 'covered-call',
    title: 'Covered Call Strategy',
    overview: 'A covered call involves owning 100 shares of stock and selling a call option against those shares to generate income.',
    whenToUse: [
      'You own 100+ shares of a stock',
      'You have a neutral to slightly bullish outlook',
      'You want to generate additional income',
      'The stock has been trading sideways'
    ],
    risks: [
      'Limited upside potential (capped at strike price)',
      'Still exposed to downside risk of the stock',
      'May be assigned and forced to sell shares',
      'Opportunity cost if stock rallies significantly'
    ],
    example: {
      scenario: 'You own 100 shares of MSTY at $45/share',
      setup: 'Sell 1 MSTY $47 call expiring in 30 days for $1.50 premium',
      outcome: 'Collect $150 premium. If MSTY stays below $47, keep premium and shares. If above $47, sell shares at $47 for additional $200 profit.'
    },
    tips: [
      'Choose strike prices 5-10% above current stock price',
      'Target 30-45 days to expiration for optimal time decay',
      'Consider rolling the option if threatened with assignment',
      'Monitor earnings dates and dividend dates'
    ]
  },
  {
    strategy: 'cash-secured-put',
    title: 'Cash-Secured Put Strategy',
    overview: 'Sell a put option while holding enough cash to buy 100 shares if assigned. Generate income while potentially acquiring stock at a discount.',
    whenToUse: [
      'You want to own a stock but at a lower price',
      'You have cash available for stock purchase',
      'You have a neutral to bullish outlook',
      'You want to generate income on cash'
    ],
    risks: [
      'May be assigned and forced to buy stock',
      'Stock could decline significantly below strike price',
      'Opportunity cost if stock rallies without you',
      'Cash is tied up as collateral'
    ],
    example: {
      scenario: 'PLTY is trading at $30, you want to buy at $28',
      setup: 'Sell 1 PLTY $28 put expiring in 30 days for $1.20 premium',
      outcome: 'Collect $120 premium. If PLTY stays above $28, keep premium. If below $28, buy 100 shares at $28 (effective cost $26.80 after premium).'
    },
    tips: [
      'Choose strike prices where you would be happy to own the stock',
      'Ensure you have sufficient cash for assignment',
      'Target high-quality stocks you want to own',
      'Consider the stock support levels when selecting strikes'
    ]
  },
  {
    strategy: 'collar',
    title: 'Collar Strategy',
    overview: 'Own stock, sell a call option, and buy a put option to limit both upside and downside. Provides downside protection at the cost of limited upside.',
    whenToUse: [
      'You own stock and want downside protection',
      'You have a neutral outlook short-term',
      'You want to reduce portfolio volatility',
      'You are concerned about market uncertainty'
    ],
    risks: [
      'Limited upside potential due to short call',
      'Cost of protective put reduces income',
      'May be assigned on either option',
      'Complex strategy with multiple moving parts'
    ],
    example: {
      scenario: 'You own 100 shares of TSLY at $35',
      setup: 'Sell 1 TSLY $37 call for $1.50, buy 1 TSLY $32 put for $1.00',
      outcome: 'Net credit of $50. Upside capped at $37, downside protected below $32. Profit range: $32-$37.'
    },
    tips: [
      'Choose put strikes based on your risk tolerance',
      'Try to create the collar for a net credit',
      'Monitor both options as expiration approaches',
      'Consider adjusting if the stock moves significantly'
    ]
  }
];

const EnhancedEducationalPanel: React.FC<EnhancedEducationalPanelProps> = ({ 
  currentStrategy, 
  selectedSymbol, 
  compact = false 
}) => {
  const [activeTab, setActiveTab] = useState<'tutorials' | 'progress' | 'lessons' | 'strategies' | 'glossary'>('tutorials');
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [selectedGuide, setSelectedGuide] = useState<StrategyType | null>(currentStrategy);
  const [selectedTutorial, setSelectedTutorial] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [progress, setProgress] = useState<Record<string, boolean>>({});

  // Load progress from localStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem('options-tutor-progress');
    if (savedProgress) {
      setProgress(JSON.parse(savedProgress));
    }
  }, []);

  // Save progress to localStorage
  const updateProgress = (lessonId: string, completed: boolean) => {
    const newProgress = { ...progress, [lessonId]: completed };
    setProgress(newProgress);
    localStorage.setItem('options-tutor-progress', JSON.stringify(newProgress));
  };

  // Auto-select strategy guide when strategy changes
  useEffect(() => {
    if (currentStrategy) {
      setSelectedGuide(currentStrategy);
      setActiveTab('strategies');
    }
  }, [currentStrategy]);

  const filteredLessons = lessonModules.filter(lesson =>
    lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lesson.topics.some(topic => topic.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getCompletedLessonsCount = () => {
    return lessonModules.filter(lesson => progress[lesson.id]).length;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return '#4ade80';
      case 'Intermediate': return '#fbbf24';
      case 'Advanced': return '#f87171';
      default: return '#e0e0e0';
    }
  };

  const renderTutorials = () => (
    <div className="tutorials-content">
      <InteractiveTutorialSystem 
        selectedTutorial={selectedTutorial || undefined}
        onTutorialComplete={(tutorialId) => {
          console.log(`Tutorial completed: ${tutorialId}`);
          setSelectedTutorial(null);
        }}
        compactMode={compact}
      />
    </div>
  );

  const renderProgress = () => (
    <div className="progress-content">
      <LearningProgressTracker 
        compactMode={compact}
        showRecommendations={!compact}
      />
    </div>
  );

  const renderLessons = () => (
    <div className="lessons-content">
      <div className="lessons-header">
        <div className="progress-overview">
          <h3>Learning Progress</h3>
          <div className="progress-stats">
            <div className="stat">
              <span className="stat-value">{getCompletedLessonsCount()}</span>
              <span className="stat-label">Completed</span>
            </div>
            <div className="stat">
              <span className="stat-value">{lessonModules.length}</span>
              <span className="stat-label">Total Lessons</span>
            </div>
            <div className="stat">
              <span className="stat-value">
                {Math.round((getCompletedLessonsCount() / lessonModules.length) * 100)}%
              </span>
              <span className="stat-label">Progress</span>
            </div>
          </div>
        </div>

        {!compact && (
          <div className="search-box">
            <input
              type="text"
              placeholder="Search lessons..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="lessons-list">
        {filteredLessons.map(lesson => (
          <div
            key={lesson.id}
            className={`lesson-card ${selectedLesson === lesson.id ? 'selected' : ''} ${progress[lesson.id] ? 'completed' : ''}`}
            onClick={() => setSelectedLesson(selectedLesson === lesson.id ? null : lesson.id)}
          >
            <div className="lesson-header">
              <div className="lesson-info">
                <h4>{lesson.title}</h4>
                <div className="lesson-meta">
                  <span 
                    className="difficulty-badge"
                    style={{ backgroundColor: getDifficultyColor(lesson.difficulty) }}
                  >
                    {lesson.difficulty}
                  </span>
                  <span className="time-estimate">{lesson.estimatedTime}</span>
                </div>
              </div>
              <div className="lesson-status">
                {progress[lesson.id] ? (
                  <span className="completed-icon">✓</span>
                ) : (
                  <span className="expand-icon">
                    {selectedLesson === lesson.id ? '−' : '+'}
                  </span>
                )}
              </div>
            </div>

            {selectedLesson === lesson.id && (
              <div className="lesson-details">
                <p className="lesson-description">{lesson.description}</p>
                <div className="lesson-topics">
                  <h5>Topics Covered:</h5>
                  <ul>
                    {lesson.topics.map(topic => (
                      <li key={topic}>{topic}</li>
                    ))}
                  </ul>
                </div>
                <div className="lesson-actions">
                  <button className="start-lesson-btn">
                    {progress[lesson.id] ? 'Review Lesson' : 'Start Lesson'}
                  </button>
                  {!progress[lesson.id] && (
                    <button 
                      className="mark-complete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateProgress(lesson.id, true);
                      }}
                    >
                      Mark Complete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderStrategies = () => {
    const currentGuide = strategyGuides.find(guide => guide.strategy === selectedGuide);

    return (
      <div className="strategies-content">
        <div className="strategy-selector">
          <h3>Strategy Guides</h3>
          <div className="strategy-tabs">
            {strategyGuides.map(guide => (
              <button
                key={guide.strategy}
                className={`strategy-tab ${selectedGuide === guide.strategy ? 'active' : ''}`}
                onClick={() => setSelectedGuide(guide.strategy)}
              >
                {guide.title}
              </button>
            ))}
          </div>
        </div>

        {currentGuide && (
          <div className="strategy-guide">
            <div className="guide-header">
              <h4>{currentGuide.title}</h4>
              <p className="guide-overview">{currentGuide.overview}</p>
            </div>

            <div className="guide-section">
              <h5>When to Use</h5>
              <ul className="guide-list positive">
                {currentGuide.whenToUse.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="guide-section">
              <h5>Risks to Consider</h5>
              <ul className="guide-list negative">
                {currentGuide.risks.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="guide-section">
              <h5>Example Trade</h5>
              <div className="example-trade">
                <div className="example-item">
                  <strong>Scenario:</strong> {currentGuide.example.scenario}
                </div>
                <div className="example-item">
                  <strong>Setup:</strong> {currentGuide.example.setup}
                </div>
                <div className="example-item">
                  <strong>Outcome:</strong> {currentGuide.example.outcome}
                </div>
              </div>
            </div>

            <div className="guide-section">
              <h5>Pro Tips</h5>
              <ul className="guide-list tips">
                {currentGuide.tips.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderGlossary = () => {
    const glossaryTerms = [
      { term: 'Call Option', definition: 'A contract giving the right to buy 100 shares at a specific price.' },
      { term: 'Put Option', definition: 'A contract giving the right to sell 100 shares at a specific price.' },
      { term: 'Strike Price', definition: 'The price at which an option can be exercised.' },
      { term: 'Premium', definition: 'The price paid to buy an option.' },
      { term: 'Expiration', definition: 'The date when an option contract expires.' },
      { term: 'Assignment', definition: 'When an option seller is required to fulfill the contract.' },
      { term: 'ITM (In The Money)', definition: 'An option with intrinsic value.' },
      { term: 'OTM (Out of The Money)', definition: 'An option with no intrinsic value.' },
      { term: 'ATM (At The Money)', definition: 'An option with a strike price equal to the current stock price.' },
      { term: 'Delta', definition: 'Measures how much an option\'s price changes for a $1 move in the underlying stock.' },
      { term: 'Gamma', definition: 'Measures the rate of change of delta.' },
      { term: 'Theta', definition: 'Measures how much an option loses value each day due to time decay.' },
      { term: 'Vega', definition: 'Measures how much an option\'s price changes with volatility changes.' },
      { term: 'Implied Volatility', definition: 'The market\'s expectation of future volatility.' },
      { term: 'Time Decay', definition: 'The erosion of an option\'s value as expiration approaches.' },
      { term: 'Intrinsic Value', definition: 'The amount an option is in-the-money.' },
      { term: 'Extrinsic Value', definition: 'The portion of an option\'s price above intrinsic value.' },
      { term: 'Exercise', definition: 'Using the right granted by an option contract.' },
      { term: 'Covered Call', definition: 'Owning stock and selling call options against it.' },
      { term: 'Cash-Secured Put', definition: 'Selling put options while holding cash to buy the stock if assigned.' },
      { term: 'Collar', definition: 'Owning stock, selling calls, and buying puts for protection.' },
      { term: 'Spread', definition: 'A strategy involving multiple options positions.' },
      { term: 'Iron Condor', definition: 'A neutral strategy using four options at different strikes.' },
      { term: 'Straddle', definition: 'Buying both a call and put at the same strike price.' },
      { term: 'Strangle', definition: 'Buying a call and put at different strike prices.' }
    ];

    const filteredTerms = glossaryTerms.filter(item => 
      searchTerm === '' || 
      item.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.definition.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="glossary-content">
        <h3>Options Trading Glossary</h3>
        <div className="glossary-search">
          <input
            type="text"
            placeholder="Search terms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="glossary-search-input"
          />
        </div>
        <div className="glossary-terms">
          {filteredTerms.map(item => (
            <div key={item.term} className="term">
              <strong>{item.term}:</strong> {item.definition}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`educational-panel enhanced ${compact ? 'compact' : ''}`}>
      <div className="panel-header">
        <h2>Learning Center</h2>
        {selectedSymbol && (
          <div className="context-info">
            <span>Context: {selectedSymbol}</span>
          </div>
        )}
      </div>

      <div className="panel-tabs">
        <button
          className={`tab-button ${activeTab === 'tutorials' ? 'active' : ''}`}
          onClick={() => setActiveTab('tutorials')}
        >
          Interactive Tutorials
        </button>
        <button
          className={`tab-button ${activeTab === 'progress' ? 'active' : ''}`}
          onClick={() => setActiveTab('progress')}
        >
          Progress
        </button>
        <button
          className={`tab-button ${activeTab === 'lessons' ? 'active' : ''}`}
          onClick={() => setActiveTab('lessons')}
        >
          Lessons
        </button>
        <button
          className={`tab-button ${activeTab === 'strategies' ? 'active' : ''}`}
          onClick={() => setActiveTab('strategies')}
        >
          Strategies
        </button>
        <button
          className={`tab-button ${activeTab === 'glossary' ? 'active' : ''}`}
          onClick={() => setActiveTab('glossary')}
        >
          Glossary
        </button>
      </div>

      <div className="panel-content">
        {activeTab === 'tutorials' && renderTutorials()}
        {activeTab === 'progress' && renderProgress()}
        {activeTab === 'lessons' && renderLessons()}
        {activeTab === 'strategies' && renderStrategies()}
        {activeTab === 'glossary' && renderGlossary()}
      </div>
    </div>
  );
};

export default EnhancedEducationalPanel;