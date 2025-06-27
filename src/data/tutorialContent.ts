/**
 * Comprehensive Tutorial Content Database
 * Contains all educational content for the Options Tutor application
 */

export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  type: 'explanation' | 'interaction' | 'quiz' | 'simulation' | 'video' | 'exercise';
  component?: string; // Component name to render
  validation?: {
    type: 'multiple-choice' | 'input' | 'simulation' | 'drag-drop';
    correctAnswer?: any;
    feedback: {
      correct: string;
      incorrect: string;
      hint?: string;
    };
  };
  hints?: string[];
  xpReward?: number;
  estimatedTime?: number; // minutes
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  category: 'basics' | 'strategies' | 'greeks' | 'risk-management' | 'advanced' | 'etf-strategies';
  estimatedTime: number; // minutes
  prerequisites: string[];
  steps: TutorialStep[];
  completionReward: number; // XP
  tags: string[];
  learningObjectives: string[];
}

export interface LearningPath {
  id: string;
  name: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedTime: number; // total minutes
  tutorials: string[]; // tutorial IDs in order
  prerequisites: string[];
  completionReward: number;
  badge?: {
    name: string;
    icon: string;
    description: string;
  };
}

// Tutorial Content Database
export const tutorialDatabase: Tutorial[] = [
  {
    id: 'options-fundamentals',
    title: 'Options Fundamentals',
    description: 'Learn the basic concepts of options trading including calls, puts, and key terminology.',
    difficulty: 'Beginner',
    category: 'basics',
    estimatedTime: 15,
    prerequisites: [],
    completionReward: 100,
    tags: ['options', 'basics', 'terminology'],
    learningObjectives: [
      'Understand what options are and how they work',
      'Distinguish between calls and puts',
      'Learn key options terminology',
      'Understand the concept of strike price and expiration'
    ],
    steps: [
      {
        id: 'what-are-options',
        title: 'What Are Options?',
        content: `Options are financial contracts that give you the RIGHT (but not the obligation) to buy or sell a stock at a specific price within a certain time period.

Think of options like a reservation at a restaurant:
- You pay a small fee (premium) to reserve a table
- You have the right to use that table at the agreed time
- But you don't HAVE to show up - you can choose not to use your reservation

Key Points:
• Options are contracts, not ownership of the actual stock
• You pay a premium for the right to buy/sell
• You can choose whether or not to exercise this right
• Options have expiration dates`,
        type: 'explanation',
        xpReward: 10,
        estimatedTime: 3
      },
      {
        id: 'calls-vs-puts',
        title: 'Calls vs Puts',
        content: `There are two main types of options:

**CALL OPTIONS** 📈
- Give you the RIGHT to BUY a stock at a specific price
- You profit when the stock price goes UP
- Think: "I'm CALLING the stock to come to me"

**PUT OPTIONS** 📉
- Give you the RIGHT to SELL a stock at a specific price  
- You profit when the stock price goes DOWN
- Think: "I'm PUTTING the stock away from me"

Example:
- AAPL stock is trading at $150
- You buy a $155 call option (betting price will go up)
- You buy a $145 put option (betting price will go down)`,
        type: 'explanation',
        xpReward: 15,
        estimatedTime: 4
      },
      {
        id: 'options-quiz-1',
        title: 'Quick Check: Calls vs Puts',
        content: 'Test your understanding of calls and puts',
        type: 'quiz',
        validation: {
          type: 'multiple-choice',
          correctAnswer: 'call',
          feedback: {
            correct: 'Correct! A call option gives you the right to BUY the stock, so you profit when the price goes up.',
            incorrect: 'Not quite. Remember: CALL = right to BUY = profit when price goes UP. PUT = right to SELL = profit when price goes DOWN.',
            hint: 'Think about what you want the stock price to do if you have the right to BUY it at a fixed price.'
          }
        },
        xpReward: 20,
        estimatedTime: 2
      },
      {
        id: 'key-terminology',
        title: 'Key Options Terminology',
        content: `Essential terms every options trader must know:

**PREMIUM** 💰
- The price you pay to buy an option
- Like paying for insurance - you pay upfront for protection/opportunity

**STRIKE PRICE** 🎯
- The price at which you can buy/sell the stock
- This is "locked in" when you buy the option

**EXPIRATION DATE** ⏰
- When your option contract expires
- After this date, your option becomes worthless

**IN-THE-MONEY (ITM)** ✅
- Your option has value if exercised right now
- Call: Stock price > Strike price
- Put: Stock price < Strike price

**OUT-OF-THE-MONEY (OTM)** ❌
- Your option has no intrinsic value right now
- Call: Stock price < Strike price  
- Put: Stock price > Strike price`,
        type: 'explanation',
        xpReward: 15,
        estimatedTime: 5
      },
      {
        id: 'terminology-exercise',
        title: 'Terminology Practice',
        content: 'Practice identifying key options terms in real scenarios',
        type: 'exercise',
        validation: {
          type: 'multiple-choice',
          correctAnswer: 'out-of-the-money',
          feedback: {
            correct: 'Excellent! Since the stock is at $145 and your call strike is $150, you\'re out-of-the-money. You wouldn\'t want to buy at $150 when you can buy in the market for $145.',
            incorrect: 'Think about it: would you want to buy a stock for $150 when it\'s trading at $145 in the market?',
            hint: 'Compare the current stock price to your strike price. For calls, you want the stock price to be ABOVE your strike.'
          }
        },
        xpReward: 25,
        estimatedTime: 3
      }
    ]
  },
  {
    id: 'covered-calls-strategy',
    title: 'Covered Calls Strategy',
    description: 'Learn how to generate income from your stock holdings using covered calls.',
    difficulty: 'Intermediate',
    category: 'etf-strategies',
    estimatedTime: 20,
    prerequisites: ['options-fundamentals'],
    completionReward: 150,
    tags: ['covered-calls', 'income', 'etf', 'conservative'],
    learningObjectives: [
      'Understand the covered call strategy mechanics',
      'Learn when and why to use covered calls',
      'Calculate potential profits and risks',
      'Practice setting up covered call trades'
    ],
    steps: [
      {
        id: 'covered-call-basics',
        title: 'What is a Covered Call?',
        content: `A covered call is a popular income-generating strategy where you:

1. **OWN 100 shares** of a stock (or ETF)
2. **SELL a call option** on those shares

Why "covered"? Because you own the underlying shares to "cover" your obligation if the option is exercised.

**The Setup:**
• You own 100 shares of MSTY at $45/share
• You sell 1 call option with $50 strike for $2.00 premium
• You collect $200 immediately (100 shares × $2.00)

**What happens:**
• If MSTY stays below $50: You keep the $200 premium + your shares
• If MSTY goes above $50: You sell your shares at $50 + keep the $200 premium

This strategy is perfect for ETFs that pay high dividends like MSTY, TSLY, and PLTY!`,
        type: 'explanation',
        xpReward: 15,
        estimatedTime: 4
      },
      {
        id: 'covered-call-example',
        title: 'Real Example: MSTY Covered Call',
        content: `Let's walk through a real MSTY covered call trade:

**Current Situation:**
• MSTY trading at $45.00
• You own 100 shares (cost: $4,500)
• Monthly dividend: ~$0.45/share ($45)

**The Trade:**
• Sell 1 MSTY $50 call expiring in 30 days
• Collect $2.00 premium = $200 income

**Possible Outcomes:**

**Scenario 1: MSTY stays at $45 (or below $50)**
• Keep your 100 shares
• Keep the $200 premium
• Collect $45 dividend
• Total income: $245 for the month (5.4% return!)

**Scenario 2: MSTY rises to $52**
• Your shares get "called away" at $50
• You sell 100 shares for $5,000
• Keep the $200 premium
• Total profit: $500 (shares) + $200 (premium) = $700
• Plus any dividends received

**Maximum Risk:** Stock price drops significantly`,
        type: 'explanation',
        xpReward: 20,
        estimatedTime: 6
      },
      {
        id: 'covered-call-simulation',
        title: 'Interactive Simulation',
        content: 'Practice setting up a covered call trade with real market conditions',
        type: 'simulation',
        component: 'CoveredCallSimulation',
        validation: {
          type: 'simulation',
          feedback: {
            correct: 'Great job! You successfully set up a covered call that generates income while limiting upside.',
            incorrect: 'Review the strike price selection. Remember: higher strikes = more upside potential but lower premium.',
            hint: 'Consider the balance between premium income and upside potential when selecting your strike price.'
          }
        },
        xpReward: 30,
        estimatedTime: 8
      }
    ]
  },
  {
    id: 'cash-secured-puts',
    title: 'Cash-Secured Puts Strategy',
    description: 'Learn how to potentially acquire stocks at a discount using cash-secured puts.',
    difficulty: 'Intermediate',
    category: 'etf-strategies',
    estimatedTime: 18,
    prerequisites: ['options-fundamentals'],
    completionReward: 140,
    tags: ['cash-secured-puts', 'acquisition', 'etf', 'value'],
    learningObjectives: [
      'Understand cash-secured put mechanics',
      'Learn when to use this strategy',
      'Calculate cash requirements and returns',
      'Practice identifying good opportunities'
    ],
    steps: [
      {
        id: 'csp-basics',
        title: 'Cash-Secured Puts Explained',
        content: `A cash-secured put is a strategy where you:

1. **SELL a put option** on a stock you'd like to own
2. **HOLD CASH** equal to 100 shares × strike price

This strategy lets you potentially buy stocks at a discount while earning premium income.

**The Setup:**
• PLTY trading at $30
• You sell 1 put option with $28 strike for $1.50 premium
• You hold $2,800 cash (100 × $28) to secure the put
• You collect $150 immediately

**What happens:**
• If PLTY stays above $28: You keep the $150 premium
• If PLTY drops below $28: You buy 100 shares at $28 (but you wanted to own it anyway!)

**Why use this strategy:**
• Get paid while waiting to buy a stock
• Potentially acquire stocks at a discount
• Generate income from cash positions`,
        type: 'explanation',
        xpReward: 15,
        estimatedTime: 4
      },
      {
        id: 'csp-example',
        title: 'Real Example: PLTY Cash-Secured Put',
        content: `Let's see how this works with PLTY:

**Current Situation:**
• PLTY trading at $30.00
• You want to own PLTY but think it might drop
• You have $2,800 cash available

**The Trade:**
• Sell 1 PLTY $28 put expiring in 30 days
• Collect $1.50 premium = $150 income
• Set aside $2,800 cash to secure the put

**Possible Outcomes:**

**Scenario 1: PLTY stays above $28**
• Put expires worthless
• You keep the $150 premium
• Your cash is freed up for another trade
• Return: 5.4% on the cash in 30 days!

**Scenario 2: PLTY drops to $26**
• You're assigned and buy 100 shares at $28
• Your effective cost: $28 - $1.50 = $26.50 per share
• You own PLTY at a discount to today's price!

**Key Insight:** Only sell puts on stocks you actually want to own!`,
        type: 'explanation',
        xpReward: 20,
        estimatedTime: 6
      }
    ]
  },
  {
    id: 'options-greeks',
    title: 'Understanding the Greeks',
    description: 'Master Delta, Gamma, Theta, and Vega to better understand options pricing.',
    difficulty: 'Advanced',
    category: 'greeks',
    estimatedTime: 25,
    prerequisites: ['options-fundamentals', 'covered-calls-strategy'],
    completionReward: 200,
    tags: ['greeks', 'delta', 'theta', 'gamma', 'vega', 'advanced'],
    learningObjectives: [
      'Understand what each Greek measures',
      'Learn how Greeks affect options pricing',
      'Use Greeks to make better trading decisions',
      'Recognize how Greeks change over time'
    ],
    steps: [
      {
        id: 'delta-explained',
        title: 'Delta: Price Sensitivity',
        content: `Delta measures how much an option's price changes when the stock price moves $1.

**Key Points:**
• Call options: Delta between 0 and 1.0
• Put options: Delta between -1.0 and 0
• At-the-money options: Delta around 0.5 (calls) or -0.5 (puts)

**Examples:**
• Call with 0.7 delta: If stock goes up $1, option goes up $0.70
• Put with -0.3 delta: If stock goes up $1, option goes down $0.30

**Practical Use:**
• Higher delta = more sensitive to stock price moves
• Delta also represents approximate probability of finishing in-the-money
• Use delta to estimate how much you'll make/lose on stock moves`,
        type: 'explanation',
        xpReward: 20,
        estimatedTime: 5
      },
      {
        id: 'theta-explained',
        title: 'Theta: Time Decay',
        content: `Theta measures how much an option loses value each day due to time passing.

**Key Points:**
• Theta is always negative for long options (you lose money over time)
• Theta is positive for short options (you make money over time)
• Time decay accelerates as expiration approaches

**Examples:**
• Option with -0.05 theta: Loses $5 per day (100 shares × $0.05)
• Time decay is fastest in the last 30 days before expiration

**Practical Use:**
• Selling options = collecting theta (time decay works for you)
• Buying options = fighting theta (time decay works against you)
• This is why covered calls and cash-secured puts can be profitable!`,
        type: 'explanation',
        xpReward: 20,
        estimatedTime: 5
      }
    ]
  }
];

// Learning Paths Database
export const learningPaths: LearningPath[] = [
  {
    id: 'beginner-path',
    name: 'Options Trading Fundamentals',
    description: 'Start your options journey with the essential concepts and terminology.',
    difficulty: 'Beginner',
    estimatedTime: 45,
    tutorials: ['options-fundamentals'],
    prerequisites: [],
    completionReward: 200,
    badge: {
      name: 'Options Explorer',
      icon: '🎯',
      description: 'Completed the fundamentals of options trading'
    }
  },
  {
    id: 'etf-income-path',
    name: 'ETF Income Strategies',
    description: 'Learn to generate consistent income using covered calls and cash-secured puts on ETFs.',
    difficulty: 'Intermediate',
    estimatedTime: 90,
    tutorials: ['options-fundamentals', 'covered-calls-strategy', 'cash-secured-puts'],
    prerequisites: ['beginner-path'],
    completionReward: 500,
    badge: {
      name: 'Income Generator',
      icon: '💰',
      description: 'Mastered ETF income strategies'
    }
  },
  {
    id: 'advanced-path',
    name: 'Advanced Options Concepts',
    description: 'Deep dive into the Greeks and advanced options strategies.',
    difficulty: 'Advanced',
    estimatedTime: 120,
    tutorials: ['options-fundamentals', 'covered-calls-strategy', 'cash-secured-puts', 'options-greeks'],
    prerequisites: ['etf-income-path'],
    completionReward: 750,
    badge: {
      name: 'Options Master',
      icon: '🏆',
      description: 'Achieved mastery of advanced options concepts'
    }
  }
];

// Contextual Help Content
export interface ContextualHelp {
  id: string;
  trigger: string; // CSS selector or component name
  title: string;
  content: string;
  type: 'tooltip' | 'popover' | 'modal';
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const contextualHelp: ContextualHelp[] = [
  {
    id: 'strike-price-help',
    trigger: '.strike-price-input',
    title: 'Strike Price',
    content: 'The price at which you can buy (call) or sell (put) the underlying stock. Choose strikes based on your market outlook and risk tolerance.',
    type: 'tooltip',
    position: 'top'
  },
  {
    id: 'expiration-help',
    trigger: '.expiration-select',
    title: 'Expiration Date',
    content: 'When your option contract expires. Longer expirations cost more but give you more time to be right. Shorter expirations are cheaper but riskier.',
    type: 'tooltip',
    position: 'top'
  },
  {
    id: 'premium-help',
    trigger: '.premium-display',
    title: 'Option Premium',
    content: 'The price you pay (or receive) for the option. Premium is affected by stock price, time to expiration, volatility, and interest rates.',
    type: 'popover',
    position: 'right'
  }
];