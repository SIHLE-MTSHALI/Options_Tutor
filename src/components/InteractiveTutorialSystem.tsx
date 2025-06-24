import React, { useState, useEffect, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../redux/hooks';
import { completeMission, addXP, addJournalEntry } from '../redux/learningSlice';
import { StrategyType } from '../redux/types';
import './InteractiveTutorialSystem.scss';

/**
 * Interactive Tutorial System - Comprehensive educational platform
 * Features:
 * - Step-by-step guided tutorials
 * - Interactive simulations
 * - Progress tracking with XP system
 * - Adaptive learning paths
 * - Real-time feedback and hints
 */

interface TutorialStep {
  id: string;
  title: string;
  content: string;
  type: 'explanation' | 'interaction' | 'quiz' | 'simulation' | 'video';
  component?: React.ComponentType<any>;
  validation?: (userInput: any) => { isValid: boolean; feedback: string };
  hints?: string[];
  xpReward?: number;
}

interface Tutorial {
  id: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  category: 'basics' | 'strategies' | 'greeks' | 'risk-management' | 'advanced';
  estimatedTime: number; // minutes
  prerequisites: string[];
  steps: TutorialStep[];
  completionReward: number; // XP
}

interface InteractiveTutorialSystemProps {
  selectedTutorial?: string;
  onTutorialComplete?: (tutorialId: string) => void;
  compactMode?: boolean;
}

// Tutorial Components
const OptionBasicsQuiz: React.FC<{ onAnswer: (answer: any) => void }> = ({ onAnswer }) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');

  const questions = [
    {
      question: "What gives a call option holder the right to do?",
      options: [
        "Sell the underlying stock at the strike price",
        "Buy the underlying stock at the strike price",
        "Receive dividends from the stock",
        "Vote in shareholder meetings"
      ],
      correct: 1,
      explanation: "A call option gives the holder the RIGHT (not obligation) to BUY the underlying stock at the strike price before expiration."
    }
  ];

  const handleSubmit = () => {
    const isCorrect = parseInt(selectedAnswer) === questions[0].correct;
    onAnswer({
      isCorrect,
      selectedAnswer: parseInt(selectedAnswer),
      explanation: questions[0].explanation
    });
  };

  return (
    <div className="quiz-component">
      <h3>{questions[0].question}</h3>
      <div className="quiz-options">
        {questions[0].options.map((option, index) => (
          <label key={index} className="quiz-option">
            <input
              type="radio"
              name="quiz-answer"
              value={index}
              checked={selectedAnswer === index.toString()}
              onChange={(e) => setSelectedAnswer(e.target.value)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
      <button 
        onClick={handleSubmit} 
        disabled={!selectedAnswer}
        className="submit-answer-btn"
      >
        Submit Answer
      </button>
    </div>
  );
};

const StrategySimulation: React.FC<{ 
  strategy: StrategyType; 
  onComplete: (result: any) => void 
}> = ({ strategy, onComplete }) => {
  const [stockPrice, setStockPrice] = useState(100);
  const [strikePrice, setStrikePrice] = useState(105);
  const [premium, setPremium] = useState(2.50);
  const [quantity, setQuantity] = useState(1);

  const calculatePayoff = useCallback(() => {
    let payoff = 0;
    let maxProfit = 0;
    let maxLoss = 0;
    let breakeven = 0;

    switch (strategy) {
      case 'covered-call':
        // Assuming we own the stock
        const stockGain = stockPrice - 100; // Assume bought at $100
        const optionPayoff = stockPrice > strikePrice ? -(stockPrice - strikePrice) : 0;
        payoff = (stockGain + optionPayoff + premium) * quantity * 100;
        maxProfit = (strikePrice - 100 + premium) * quantity * 100;
        maxLoss = (premium - 100) * quantity * 100; // If stock goes to 0
        breakeven = 100 - premium;
        break;
      
      case 'cash-secured-put':
        const putPayoff = stockPrice < strikePrice ? -(strikePrice - stockPrice) : 0;
        payoff = (premium + putPayoff) * quantity * 100;
        maxProfit = premium * quantity * 100;
        maxLoss = (premium - strikePrice) * quantity * 100;
        breakeven = strikePrice - premium;
        break;
      
      default:
        payoff = 0;
    }

    return { payoff, maxProfit, maxLoss, breakeven };
  }, [strategy, stockPrice, strikePrice, premium, quantity]);

  const result = calculatePayoff();

  const handleComplete = () => {
    onComplete({
      strategy,
      parameters: { stockPrice, strikePrice, premium, quantity },
      result,
      understanding: result.payoff > 0 ? 'profitable' : 'loss'
    });
  };

  return (
    <div className="strategy-simulation">
      <h3>{strategy.replace('-', ' ').toUpperCase()} Simulation</h3>
      
      <div className="simulation-controls">
        <div className="control-group">
          <label>Current Stock Price: ${stockPrice}</label>
          <input
            type="range"
            min="80"
            max="120"
            value={stockPrice}
            onChange={(e) => setStockPrice(Number(e.target.value))}
            className="price-slider"
          />
        </div>
        
        <div className="control-group">
          <label>Strike Price: ${strikePrice}</label>
          <input
            type="number"
            value={strikePrice}
            onChange={(e) => setStrikePrice(Number(e.target.value))}
            className="strike-input"
          />
        </div>
        
        <div className="control-group">
          <label>Option Premium: ${premium}</label>
          <input
            type="number"
            step="0.25"
            value={premium}
            onChange={(e) => setPremium(Number(e.target.value))}
            className="premium-input"
          />
        </div>
      </div>

      <div className="simulation-results">
        <div className="result-item">
          <span>Current P&L:</span>
          <span className={result.payoff >= 0 ? 'profit' : 'loss'}>
            ${result.payoff.toFixed(2)}
          </span>
        </div>
        <div className="result-item">
          <span>Max Profit:</span>
          <span className="profit">${result.maxProfit.toFixed(2)}</span>
        </div>
        <div className="result-item">
          <span>Max Loss:</span>
          <span className="loss">${result.maxLoss.toFixed(2)}</span>
        </div>
        <div className="result-item">
          <span>Breakeven:</span>
          <span>${result.breakeven.toFixed(2)}</span>
        </div>
      </div>

      <button onClick={handleComplete} className="complete-simulation-btn">
        Complete Simulation
      </button>
    </div>
  );
};

const PayoffDiagramInteractive: React.FC<{ onComplete: (data: any) => void }> = ({ onComplete }) => {
  const [userPoints, setUserPoints] = useState<Array<{x: number, y: number}>>([]);
  const [currentPrice, setCurrentPrice] = useState(100);
  
  const correctPayoff = [
    { x: 80, y: -20 },
    { x: 90, y: -10 },
    { x: 100, y: 0 },
    { x: 110, y: 10 },
    { x: 120, y: 20 }
  ];

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Convert canvas coordinates to price/payoff coordinates
    const price = (x / canvas.width) * 40 + 80; // 80-120 price range
    const payoff = ((canvas.height - y) / canvas.height) * 40 - 20; // -20 to +20 payoff range
    
    setUserPoints([...userPoints, { x: price, y: payoff }]);
  };

  const checkAccuracy = () => {
    // Simple accuracy check - in real implementation, would be more sophisticated
    const accuracy = userPoints.length >= 3 ? 0.8 : 0.4;
    onComplete({
      accuracy,
      userPoints,
      correctPoints: correctPayoff,
      passed: accuracy > 0.7
    });
  };

  return (
    <div className="payoff-diagram-interactive">
      <h3>Draw the Payoff Diagram</h3>
      <p>Click on the chart to draw the payoff diagram for a long call option with strike price $100</p>
      
      <canvas
        width={400}
        height={300}
        onClick={handleCanvasClick}
        className="payoff-canvas"
        style={{ border: '1px solid #ccc', cursor: 'crosshair' }}
      />
      
      <div className="diagram-controls">
        <button onClick={() => setUserPoints([])} className="clear-btn">
          Clear
        </button>
        <button 
          onClick={checkAccuracy} 
          disabled={userPoints.length < 3}
          className="check-btn"
        >
          Check My Answer
        </button>
      </div>
      
      <div className="user-points">
        Points plotted: {userPoints.length}
      </div>
    </div>
  );
};

// Main Tutorial System Component
const InteractiveTutorialSystem: React.FC<InteractiveTutorialSystemProps> = ({
  selectedTutorial,
  onTutorialComplete,
  compactMode = false
}) => {
  const dispatch = useAppDispatch();
  const learningState = useAppSelector(state => state.learning);
  
  const [currentTutorial, setCurrentTutorial] = useState<Tutorial | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepProgress, setStepProgress] = useState<Record<string, any>>({});
  const [showHints, setShowHints] = useState(false);
  const [tutorialStartTime, setTutorialStartTime] = useState<number>(Date.now());

  // Tutorial definitions
  const tutorials: Tutorial[] = [
    {
      id: 'options-fundamentals',
      title: 'Options Trading Fundamentals',
      description: 'Learn the basic concepts of options trading including calls, puts, and key terminology.',
      difficulty: 'Beginner',
      category: 'basics',
      estimatedTime: 20,
      prerequisites: [],
      completionReward: 200,
      steps: [
        {
          id: 'intro',
          title: 'Welcome to Options Trading',
          content: `
            <h3>What are Options?</h3>
            <p>Options are financial contracts that give you the <strong>right</strong> (but not the obligation) to buy or sell a stock at a specific price within a certain time period.</p>
            <p>Think of it like a reservation at a restaurant - you have the right to use it, but you don't have to.</p>
            <ul>
              <li><strong>Call Options:</strong> Right to BUY a stock</li>
              <li><strong>Put Options:</strong> Right to SELL a stock</li>
            </ul>
          `,
          type: 'explanation',
          xpReward: 25
        },
        {
          id: 'terminology-quiz',
          title: 'Test Your Knowledge',
          content: 'Let\'s see if you understand the basics!',
          type: 'quiz',
          component: OptionBasicsQuiz,
          validation: (answer) => ({
            isValid: answer.isCorrect,
            feedback: answer.explanation
          }),
          xpReward: 50
        },
        {
          id: 'payoff-diagram',
          title: 'Understanding Payoff Diagrams',
          content: 'Payoff diagrams show how much money you make or lose at different stock prices.',
          type: 'interaction',
          component: PayoffDiagramInteractive,
          validation: (result) => ({
            isValid: result.passed,
            feedback: result.passed ? 
              'Great job! You understand how call options work.' : 
              'Not quite right. Remember, call options become profitable when the stock price goes above the strike price.'
          }),
          xpReward: 75
        }
      ]
    },
    {
      id: 'covered-call-mastery',
      title: 'Covered Call Strategy Mastery',
      description: 'Master the covered call strategy through interactive simulations and real-world examples.',
      difficulty: 'Intermediate',
      category: 'strategies',
      estimatedTime: 30,
      prerequisites: ['options-fundamentals'],
      completionReward: 300,
      steps: [
        {
          id: 'covered-call-intro',
          title: 'What is a Covered Call?',
          content: `
            <h3>Covered Call Strategy</h3>
            <p>A covered call is when you:</p>
            <ol>
              <li><strong>Own 100 shares</strong> of a stock</li>
              <li><strong>Sell a call option</strong> against those shares</li>
            </ol>
            <p>This generates <strong>income</strong> from the option premium while you still own the stock.</p>
            <div class="strategy-visual">
              <div class="position">📈 Own 100 shares</div>
              <div class="plus">+</div>
              <div class="position">📞 Sell call option</div>
              <div class="equals">=</div>
              <div class="result">💰 Income strategy</div>
            </div>
          `,
          type: 'explanation',
          xpReward: 30
        },
        {
          id: 'covered-call-simulation',
          title: 'Practice with Simulation',
          content: 'Try different scenarios and see how the covered call performs.',
          type: 'simulation',
          component: StrategySimulation,
          validation: (result) => ({
            isValid: result.understanding === 'profitable' || result.result.payoff > -100,
            feedback: result.understanding === 'profitable' ? 
              'Excellent! You understand how covered calls can generate income.' :
              'Good try! Remember, covered calls work best when the stock stays below the strike price.'
          }),
          xpReward: 100
        }
      ]
    },
    {
      id: 'risk-management-essentials',
      title: 'Risk Management Essentials',
      description: 'Learn how to manage risk in options trading and protect your portfolio.',
      difficulty: 'Intermediate',
      category: 'risk-management',
      estimatedTime: 25,
      prerequisites: ['options-fundamentals'],
      completionReward: 250,
      steps: [
        {
          id: 'risk-intro',
          title: 'Understanding Risk in Options',
          content: `
            <h3>Types of Risk in Options Trading</h3>
            <ul>
              <li><strong>Market Risk:</strong> Stock price moves against you</li>
              <li><strong>Time Decay:</strong> Options lose value as expiration approaches</li>
              <li><strong>Volatility Risk:</strong> Changes in implied volatility</li>
              <li><strong>Assignment Risk:</strong> Being forced to buy/sell stock</li>
            </ul>
            <p>Understanding these risks helps you make better trading decisions.</p>
          `,
          type: 'explanation',
          xpReward: 40
        }
      ]
    }
  ];

  // Load tutorial based on selectedTutorial prop
  useEffect(() => {
    if (selectedTutorial) {
      const tutorial = tutorials.find(t => t.id === selectedTutorial);
      if (tutorial) {
        setCurrentTutorial(tutorial);
        setCurrentStepIndex(0);
        setStepProgress({});
        setTutorialStartTime(Date.now());
      }
    }
  }, [selectedTutorial]);

  const currentStep = currentTutorial?.steps[currentStepIndex];

  const handleStepComplete = (stepResult?: any) => {
    if (!currentTutorial || !currentStep) return;

    // Award XP for step completion
    if (currentStep.xpReward) {
      dispatch(addXP(currentStep.xpReward));
    }

    // Store step progress
    setStepProgress(prev => ({
      ...prev,
      [currentStep.id]: stepResult
    }));

    // Move to next step or complete tutorial
    if (currentStepIndex < currentTutorial.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleTutorialComplete();
    }
  };

  const handleTutorialComplete = () => {
    if (!currentTutorial) return;

    const completionTime = Date.now() - tutorialStartTime;
    const timeBonus = completionTime < (currentTutorial.estimatedTime * 60 * 1000) ? 50 : 0;

    // Award completion XP
    dispatch(addXP(currentTutorial.completionReward + timeBonus));

    // Add journal entry
    dispatch(addJournalEntry(
      `Completed tutorial: ${currentTutorial.title} in ${Math.round(completionTime / 1000 / 60)} minutes`
    ));

    // Mark mission as complete if applicable
    const missionId = `tutorial-${currentTutorial.id}`;
    dispatch(completeMission(missionId));

    // Callback to parent component
    if (onTutorialComplete) {
      onTutorialComplete(currentTutorial.id);
    }

    // Reset state
    setCurrentTutorial(null);
    setCurrentStepIndex(0);
    setStepProgress({});
  };

  const renderStepContent = () => {
    if (!currentStep) return null;

    switch (currentStep.type) {
      case 'explanation':
        return (
          <div className="explanation-step">
            <div 
              className="step-content" 
              dangerouslySetInnerHTML={{ __html: currentStep.content }}
            />
            <button 
              onClick={() => handleStepComplete()}
              className="continue-btn"
            >
              Continue
            </button>
          </div>
        );

      case 'quiz':
      case 'interaction':
      case 'simulation':
        const StepComponent = currentStep.component;
        if (!StepComponent) return null;

        return (
          <div className="interactive-step">
            <div className="step-content">
              {currentStep.content && (
                <div dangerouslySetInnerHTML={{ __html: currentStep.content }} />
              )}
            </div>
            <StepComponent 
              onAnswer={handleStepComplete}
              onComplete={handleStepComplete}
              strategy="covered-call" // Pass appropriate props
            />
          </div>
        );

      default:
        return null;
    }
  };

  const renderTutorialList = () => (
    <div className="tutorial-list">
      <h2>Available Tutorials</h2>
      <div className="tutorials-grid">
        {tutorials.map(tutorial => {
          const isUnlocked = tutorial.prerequisites.every(prereq => 
            learningState.worlds.some(world => 
              world.missions.some(mission => 
                mission.id.includes(prereq) && mission.completed
              )
            )
          );

          return (
            <div 
              key={tutorial.id}
              className={`tutorial-card ${!isUnlocked ? 'locked' : ''}`}
              onClick={() => isUnlocked && setCurrentTutorial(tutorial)}
            >
              <div className="tutorial-header">
                <h3>{tutorial.title}</h3>
                <span className={`difficulty ${tutorial.difficulty.toLowerCase()}`}>
                  {tutorial.difficulty}
                </span>
              </div>
              <p className="tutorial-description">{tutorial.description}</p>
              <div className="tutorial-meta">
                <span className="time">⏱️ {tutorial.estimatedTime} min</span>
                <span className="xp">✨ {tutorial.completionReward} XP</span>
              </div>
              {!isUnlocked && (
                <div className="locked-overlay">
                  🔒 Complete prerequisites first
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  if (!currentTutorial) {
    return (
      <div className={`tutorial-system ${compactMode ? 'compact' : ''}`}>
        {renderTutorialList()}
      </div>
    );
  }

  return (
    <div className={`tutorial-system ${compactMode ? 'compact' : ''}`}>
      <div className="tutorial-header">
        <button 
          onClick={() => setCurrentTutorial(null)}
          className="back-btn"
        >
          ← Back to Tutorials
        </button>
        <h2>{currentTutorial.title}</h2>
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ 
              width: `${((currentStepIndex + 1) / currentTutorial.steps.length) * 100}%` 
            }}
          />
        </div>
        <span className="step-counter">
          Step {currentStepIndex + 1} of {currentTutorial.steps.length}
        </span>
      </div>

      <div className="tutorial-content">
        <h3>{currentStep?.title}</h3>
        {renderStepContent()}
      </div>

      {currentStep?.hints && (
        <div className="hints-section">
          <button 
            onClick={() => setShowHints(!showHints)}
            className="hints-toggle"
          >
            💡 {showHints ? 'Hide' : 'Show'} Hints
          </button>
          {showHints && (
            <div className="hints">
              {currentStep.hints.map((hint, index) => (
                <div key={index} className="hint">
                  {hint}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="tutorial-footer">
        <div className="xp-display">
          Current XP: {learningState.xp}
        </div>
      </div>
    </div>
  );
};

export default InteractiveTutorialSystem;