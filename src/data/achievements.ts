/**
 * Achievement System for Options Tutor
 * Defines all available achievements and badges
 */

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'tutorial' | 'trading' | 'strategy' | 'risk' | 'milestone' | 'streak';
  xpReward: number;
  requirements: {
    type: 'tutorial_complete' | 'tutorials_complete' | 'xp_earned' | 'streak' | 'trades_executed' | 'profit_earned';
    value: number | string | string[];
  };
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  hidden?: boolean; // Hidden until unlocked
}

export const achievements: Achievement[] = [
  // Tutorial Achievements
  {
    id: 'first-tutorial',
    title: 'First Steps',
    description: 'Complete your first tutorial',
    icon: '🎯',
    category: 'tutorial',
    xpReward: 50,
    requirements: {
      type: 'tutorial_complete',
      value: 1
    },
    rarity: 'common'
  },
  {
    id: 'options-basics-master',
    title: 'Options Explorer',
    description: 'Master the fundamentals of options trading',
    icon: '🔍',
    category: 'tutorial',
    xpReward: 100,
    requirements: {
      type: 'tutorial_complete',
      value: 'options-fundamentals'
    },
    rarity: 'common'
  },
  {
    id: 'covered-calls-expert',
    title: 'Income Generator',
    description: 'Master the covered calls strategy',
    icon: '💰',
    category: 'strategy',
    xpReward: 150,
    requirements: {
      type: 'tutorial_complete',
      value: 'covered-calls-strategy'
    },
    rarity: 'rare'
  },
  {
    id: 'cash-secured-puts-expert',
    title: 'Value Hunter',
    description: 'Master cash-secured puts strategy',
    icon: '🎣',
    category: 'strategy',
    xpReward: 150,
    requirements: {
      type: 'tutorial_complete',
      value: 'cash-secured-puts'
    },
    rarity: 'rare'
  },
  {
    id: 'greeks-master',
    title: 'Greeks Guru',
    description: 'Understand the mysteries of the Greeks',
    icon: '🏛️',
    category: 'tutorial',
    xpReward: 200,
    requirements: {
      type: 'tutorial_complete',
      value: 'options-greeks'
    },
    rarity: 'epic'
  },

  // Learning Path Achievements
  {
    id: 'beginner-graduate',
    title: 'Beginner Graduate',
    description: 'Complete the beginner learning path',
    icon: '🎓',
    category: 'milestone',
    xpReward: 250,
    requirements: {
      type: 'tutorials_complete',
      value: ['options-fundamentals']
    },
    rarity: 'rare'
  },
  {
    id: 'etf-strategist',
    title: 'ETF Strategist',
    description: 'Complete the ETF income strategies path',
    icon: '📈',
    category: 'milestone',
    xpReward: 500,
    requirements: {
      type: 'tutorials_complete',
      value: ['options-fundamentals', 'covered-calls-strategy', 'cash-secured-puts']
    },
    rarity: 'epic'
  },
  {
    id: 'options-master',
    title: 'Options Master',
    description: 'Complete the advanced options path',
    icon: '🏆',
    category: 'milestone',
    xpReward: 750,
    requirements: {
      type: 'tutorials_complete',
      value: ['options-fundamentals', 'covered-calls-strategy', 'cash-secured-puts', 'options-greeks']
    },
    rarity: 'legendary'
  },

  // XP Milestones
  {
    id: 'xp-500',
    title: 'Knowledge Seeker',
    description: 'Earn 500 XP',
    icon: '⭐',
    category: 'milestone',
    xpReward: 100,
    requirements: {
      type: 'xp_earned',
      value: 500
    },
    rarity: 'common'
  },
  {
    id: 'xp-1000',
    title: 'Dedicated Learner',
    description: 'Earn 1,000 XP',
    icon: '🌟',
    category: 'milestone',
    xpReward: 200,
    requirements: {
      type: 'xp_earned',
      value: 1000
    },
    rarity: 'rare'
  },
  {
    id: 'xp-2500',
    title: 'Knowledge Enthusiast',
    description: 'Earn 2,500 XP',
    icon: '💫',
    category: 'milestone',
    xpReward: 500,
    requirements: {
      type: 'xp_earned',
      value: 2500
    },
    rarity: 'epic'
  },
  {
    id: 'xp-5000',
    title: 'Learning Legend',
    description: 'Earn 5,000 XP',
    icon: '🏅',
    category: 'milestone',
    xpReward: 1000,
    requirements: {
      type: 'xp_earned',
      value: 5000
    },
    rarity: 'legendary'
  },

  // Streak Achievements
  {
    id: 'streak-3',
    title: 'Consistent Learner',
    description: 'Learn for 3 days in a row',
    icon: '🔥',
    category: 'streak',
    xpReward: 150,
    requirements: {
      type: 'streak',
      value: 3
    },
    rarity: 'common'
  },
  {
    id: 'streak-7',
    title: 'Week Warrior',
    description: 'Learn for 7 days in a row',
    icon: '🔥🔥',
    category: 'streak',
    xpReward: 300,
    requirements: {
      type: 'streak',
      value: 7
    },
    rarity: 'rare'
  },
  {
    id: 'streak-30',
    title: 'Monthly Master',
    description: 'Learn for 30 days in a row',
    icon: '🔥🔥🔥',
    category: 'streak',
    xpReward: 1000,
    requirements: {
      type: 'streak',
      value: 30
    },
    rarity: 'legendary'
  },

  // Hidden/Special Achievements
  {
    id: 'early-bird',
    title: 'Early Bird',
    description: 'Complete a tutorial before 8 AM',
    icon: '🌅',
    category: 'milestone',
    xpReward: 100,
    requirements: {
      type: 'tutorial_complete',
      value: 1
    },
    rarity: 'rare',
    hidden: true
  },
  {
    id: 'night-owl',
    title: 'Night Owl',
    description: 'Complete a tutorial after 10 PM',
    icon: '🦉',
    category: 'milestone',
    xpReward: 100,
    requirements: {
      type: 'tutorial_complete',
      value: 1
    },
    rarity: 'rare',
    hidden: true
  },
  {
    id: 'speed-learner',
    title: 'Speed Learner',
    description: 'Complete 3 tutorials in one day',
    icon: '⚡',
    category: 'milestone',
    xpReward: 300,
    requirements: {
      type: 'tutorial_complete',
      value: 3
    },
    rarity: 'epic',
    hidden: true
  }
];

// Achievement categories with metadata
export const achievementCategories = {
  tutorial: {
    name: 'Tutorial Achievements',
    description: 'Earned by completing educational content',
    color: '#4ade80',
    icon: '📚'
  },
  strategy: {
    name: 'Strategy Mastery',
    description: 'Earned by mastering trading strategies',
    color: '#06b6d4',
    icon: '🎯'
  },
  milestone: {
    name: 'Milestones',
    description: 'Major learning and progress milestones',
    color: '#f59e0b',
    icon: '🏆'
  },
  streak: {
    name: 'Learning Streaks',
    description: 'Consistency and dedication rewards',
    color: '#ef4444',
    icon: '🔥'
  },
  trading: {
    name: 'Trading Achievements',
    description: 'Earned through trading activities',
    color: '#8b5cf6',
    icon: '💼'
  },
  risk: {
    name: 'Risk Management',
    description: 'Understanding and managing risk',
    color: '#f97316',
    icon: '⚠️'
  }
};

// Rarity definitions
export const rarityDefinitions = {
  common: {
    name: 'Common',
    color: '#9ca3af',
    glow: 'rgba(156, 163, 175, 0.3)'
  },
  rare: {
    name: 'Rare',
    color: '#3b82f6',
    glow: 'rgba(59, 130, 246, 0.3)'
  },
  epic: {
    name: 'Epic',
    color: '#8b5cf6',
    glow: 'rgba(139, 92, 246, 0.3)'
  },
  legendary: {
    name: 'Legendary',
    color: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.3)'
  }
};

// Helper functions
export const getAchievementsByCategory = (category: string) => {
  return achievements.filter(achievement => achievement.category === category);
};

export const getUnlockedAchievements = (userAchievements: string[]) => {
  return achievements.filter(achievement => userAchievements.includes(achievement.id));
};

export const getAvailableAchievements = (userAchievements: string[]) => {
  return achievements.filter(achievement => 
    !userAchievements.includes(achievement.id) && !achievement.hidden
  );
};

export const checkAchievementRequirements = (
  achievement: Achievement,
  userStats: {
    completedTutorials: string[];
    xp: number;
    learningStreak: number;
    tradesExecuted?: number;
    totalProfit?: number;
  }
): boolean => {
  const { requirements } = achievement;
  
  switch (requirements.type) {
    case 'tutorial_complete':
      if (typeof requirements.value === 'string') {
        return userStats.completedTutorials.includes(requirements.value);
      }
      return userStats.completedTutorials.length >= (requirements.value as number);
      
    case 'tutorials_complete':
      const requiredTutorials = requirements.value as string[];
      return requiredTutorials.every(tutorial => 
        userStats.completedTutorials.includes(tutorial)
      );
      
    case 'xp_earned':
      return userStats.xp >= (requirements.value as number);
      
    case 'streak':
      return userStats.learningStreak >= (requirements.value as number);
      
    case 'trades_executed':
      return (userStats.tradesExecuted || 0) >= (requirements.value as number);
      
    case 'profit_earned':
      return (userStats.totalProfit || 0) >= (requirements.value as number);
      
    default:
      return false;
  }
};