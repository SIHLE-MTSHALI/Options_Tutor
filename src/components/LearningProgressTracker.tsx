import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../redux/hooks';
import { setRiskProfile, addJournalEntry } from '../redux/learningSlice';
import './LearningProgressTracker.scss';

/**
 * Learning Progress Tracker - Comprehensive progress monitoring
 * Features:
 * - XP and level system
 * - Achievement badges
 * - Learning path visualization
 * - Performance analytics
 * - Personalized recommendations
 */

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'tutorial' | 'trading' | 'strategy' | 'risk' | 'milestone';
  xpRequired: number;
  unlocked: boolean;
  unlockedAt?: Date;
}

interface LearningPath {
  id: string;
  name: string;
  description: string;
  totalSteps: number;
  completedSteps: number;
  estimatedTime: number; // minutes
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  category: string;
}

interface LearningProgressTrackerProps {
  compactMode?: boolean;
  showRecommendations?: boolean;
}

const LearningProgressTracker: React.FC<LearningProgressTrackerProps> = ({
  compactMode = false,
  showRecommendations = true
}) => {
  const dispatch = useAppDispatch();
  const learningState = useAppSelector(state => state.learning);
  const portfolioState = useAppSelector(state => state.portfolio);
  
  const [selectedTab, setSelectedTab] = useState<'overview' | 'achievements' | 'paths' | 'analytics'>('overview');
  const [showRiskProfileModal, setShowRiskProfileModal] = useState(false);

  // Calculate user level based on XP
  const calculateLevel = (xp: number): { level: number; xpForNext: number; progress: number } => {
    // XP required for each level: 100, 300, 600, 1000, 1500, etc.
    let level = 1;
    let totalXpRequired = 0;
    let xpForCurrentLevel = 100;
    
    while (totalXpRequired + xpForCurrentLevel <= xp) {
      totalXpRequired += xpForCurrentLevel;
      level++;
      xpForCurrentLevel = level * 100 + (level - 1) * 50; // Increasing XP requirements
    }
    
    const xpInCurrentLevel = xp - totalXpRequired;
    const progress = (xpInCurrentLevel / xpForCurrentLevel) * 100;
    const xpForNext = xpForCurrentLevel - xpInCurrentLevel;
    
    return { level, xpForNext, progress };
  };

  const userLevel = calculateLevel(learningState.xp);

  // Define achievements
  const achievements: Achievement[] = [
    {
      id: 'first-tutorial',
      title: 'First Steps',
      description: 'Complete your first tutorial',
      icon: '🎓',
      category: 'tutorial',
      xpRequired: 100,
      unlocked: learningState.xp >= 100
    },
    {
      id: 'options-master',
      title: 'Options Master',
      description: 'Complete all basic options tutorials',
      icon: '📚',
      category: 'tutorial',
      xpRequired: 500,
      unlocked: learningState.xp >= 500
    },
    {
      id: 'strategy-explorer',
      title: 'Strategy Explorer',
      description: 'Try 3 different options strategies',
      icon: '🧭',
      category: 'strategy',
      xpRequired: 300,
      unlocked: portfolioState.positions.length >= 3
    },
    {
      id: 'risk-manager',
      title: 'Risk Manager',
      description: 'Complete risk management tutorials',
      icon: '🛡️',
      category: 'risk',
      xpRequired: 400,
      unlocked: learningState.xp >= 400
    },
    {
      id: 'profitable-trader',
      title: 'Profitable Trader',
      description: 'Achieve positive P&L across all positions',
      icon: '💰',
      category: 'trading',
      xpRequired: 0,
      unlocked: portfolioState.unrealizedPL > 0 && portfolioState.positions.length > 0
    },
    {
      id: 'level-5',
      title: 'Expert Trader',
      description: 'Reach level 5',
      icon: '⭐',
      category: 'milestone',
      xpRequired: 1500,
      unlocked: userLevel.level >= 5
    },
    {
      id: 'diversified-portfolio',
      title: 'Diversified Portfolio',
      description: 'Hold positions in 5 different symbols',
      icon: '📊',
      category: 'trading',
      xpRequired: 0,
      unlocked: new Set(portfolioState.positions.map(p => p.symbol)).size >= 5
    },
    {
      id: 'journal-keeper',
      title: 'Journal Keeper',
      description: 'Make 10 journal entries',
      icon: '📝',
      category: 'milestone',
      xpRequired: 0,
      unlocked: learningState.journalEntries.length >= 10
    }
  ];

  // Define learning paths
  const learningPaths: LearningPath[] = [
    {
      id: 'beginner-path',
      name: 'Options Trading Fundamentals',
      description: 'Start your journey with the basics of options trading',
      totalSteps: 8,
      completedSteps: Math.min(8, Math.floor(learningState.xp / 100)),
      estimatedTime: 120,
      difficulty: 'Beginner',
      category: 'Fundamentals'
    },
    {
      id: 'strategy-path',
      name: 'Strategy Mastery',
      description: 'Learn and master different options strategies',
      totalSteps: 12,
      completedSteps: Math.min(12, Math.floor(learningState.xp / 150)),
      estimatedTime: 180,
      difficulty: 'Intermediate',
      category: 'Strategies'
    },
    {
      id: 'risk-path',
      name: 'Risk Management',
      description: 'Master the art of managing risk in options trading',
      totalSteps: 6,
      completedSteps: Math.min(6, Math.floor(learningState.xp / 200)),
      estimatedTime: 90,
      difficulty: 'Intermediate',
      category: 'Risk Management'
    },
    {
      id: 'advanced-path',
      name: 'Advanced Techniques',
      description: 'Complex strategies and professional techniques',
      totalSteps: 10,
      completedSteps: Math.min(10, Math.max(0, Math.floor((learningState.xp - 1000) / 200))),
      estimatedTime: 240,
      difficulty: 'Advanced',
      category: 'Advanced'
    }
  ];

  // Calculate overall progress
  const totalSteps = learningPaths.reduce((sum, path) => sum + path.totalSteps, 0);
  const completedSteps = learningPaths.reduce((sum, path) => sum + path.completedSteps, 0);
  const overallProgress = (completedSteps / totalSteps) * 100;

  // Generate recommendations
  const getRecommendations = () => {
    const recommendations = [];

    if (learningState.xp < 200) {
      recommendations.push({
        type: 'tutorial',
        title: 'Complete Basic Tutorials',
        description: 'Finish the options fundamentals to build a strong foundation',
        priority: 'high'
      });
    }

    if (portfolioState.positions.length === 0) {
      recommendations.push({
        type: 'practice',
        title: 'Start Trading Simulation',
        description: 'Try your first options strategy in the simulator',
        priority: 'medium'
      });
    }

    if (portfolioState.unrealizedPL < 0 && portfolioState.positions.length > 0) {
      recommendations.push({
        type: 'risk',
        title: 'Review Risk Management',
        description: 'Learn how to protect your portfolio from losses',
        priority: 'high'
      });
    }

    if (learningState.journalEntries.length < 5) {
      recommendations.push({
        type: 'journal',
        title: 'Keep a Trading Journal',
        description: 'Document your trades and learning progress',
        priority: 'low'
      });
    }

    return recommendations;
  };

  const recommendations = getRecommendations();

  const handleRiskProfileChange = (profile: 'conservative' | 'balanced' | 'aggressive') => {
    dispatch(setRiskProfile(profile));
    dispatch(addJournalEntry(`Updated risk profile to ${profile}`));
    setShowRiskProfileModal(false);
  };

  const renderOverview = () => (
    <div className="overview-tab">
      <div className="level-section">
        <div className="level-display">
          <div className="level-badge">
            <span className="level-number">{userLevel.level}</span>
            <span className="level-label">Level</span>
          </div>
          <div className="level-info">
            <h3>Options Trader Level {userLevel.level}</h3>
            <div className="xp-bar">
              <div 
                className="xp-fill" 
                style={{ width: `${userLevel.progress}%` }}
              />
            </div>
            <p>{userLevel.xpForNext} XP to next level</p>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-info">
            <span className="stat-value">{learningState.xp}</span>
            <span className="stat-label">Total XP</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-info">
            <span className="stat-value">{completedSteps}/{totalSteps}</span>
            <span className="stat-label">Lessons Completed</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-info">
            <span className="stat-value">{portfolioState.positions.length}</span>
            <span className="stat-label">Active Positions</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <span className={`stat-value ${portfolioState.unrealizedPL >= 0 ? 'positive' : 'negative'}`}>
              ${portfolioState.unrealizedPL.toFixed(2)}
            </span>
            <span className="stat-label">Unrealized P&L</span>
          </div>
        </div>
      </div>

      <div className="overall-progress">
        <h4>Overall Learning Progress</h4>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <span className="progress-text">{overallProgress.toFixed(1)}% Complete</span>
      </div>

      <div className="risk-profile-section">
        <h4>Risk Profile</h4>
        <div className="risk-profile-display">
          <span className={`risk-badge ${learningState.riskProfile}`}>
            {learningState.riskProfile.charAt(0).toUpperCase() + learningState.riskProfile.slice(1)}
          </span>
          <button 
            onClick={() => setShowRiskProfileModal(true)}
            className="change-profile-btn"
          >
            Change
          </button>
        </div>
      </div>
    </div>
  );

  const renderAchievements = () => (
    <div className="achievements-tab">
      <div className="achievements-grid">
        {achievements.map(achievement => (
          <div 
            key={achievement.id}
            className={`achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}`}
          >
            <div className="achievement-icon">{achievement.icon}</div>
            <div className="achievement-info">
              <h4>{achievement.title}</h4>
              <p>{achievement.description}</p>
              <span className={`category ${achievement.category}`}>
                {achievement.category}
              </span>
            </div>
            {achievement.unlocked && (
              <div className="unlocked-badge">✓</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderLearningPaths = () => (
    <div className="paths-tab">
      <div className="paths-list">
        {learningPaths.map(path => (
          <div key={path.id} className="path-card">
            <div className="path-header">
              <h4>{path.name}</h4>
              <span className={`difficulty ${path.difficulty.toLowerCase()}`}>
                {path.difficulty}
              </span>
            </div>
            <p className="path-description">{path.description}</p>
            <div className="path-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${(path.completedSteps / path.totalSteps) * 100}%` }}
                />
              </div>
              <span className="progress-text">
                {path.completedSteps}/{path.totalSteps} completed
              </span>
            </div>
            <div className="path-meta">
              <span className="time">⏱️ {path.estimatedTime} min</span>
              <span className="category">{path.category}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="analytics-tab">
      <div className="analytics-grid">
        <div className="analytics-card">
          <h4>Learning Velocity</h4>
          <div className="metric-display">
            <span className="metric-value">{Math.round(learningState.xp / 7)}</span>
            <span className="metric-label">XP per day (avg)</span>
          </div>
        </div>
        
        <div className="analytics-card">
          <h4>Trading Performance</h4>
          <div className="metric-display">
            <span className={`metric-value ${portfolioState.unrealizedPL >= 0 ? 'positive' : 'negative'}`}>
              {portfolioState.unrealizedPL >= 0 ? '+' : ''}
              {((portfolioState.unrealizedPL / portfolioState.cashBalance) * 100).toFixed(1)}%
            </span>
            <span className="metric-label">Portfolio Return</span>
          </div>
        </div>
        
        <div className="analytics-card">
          <h4>Strategy Diversity</h4>
          <div className="metric-display">
            <span className="metric-value">
              {new Set(portfolioState.positions.map(p => p.type)).size}
            </span>
            <span className="metric-label">Different Strategies</span>
          </div>
        </div>
      </div>

      {showRecommendations && recommendations.length > 0 && (
        <div className="recommendations-section">
          <h4>Personalized Recommendations</h4>
          <div className="recommendations-list">
            {recommendations.map((rec, index) => (
              <div key={index} className={`recommendation-card ${rec.priority}`}>
                <div className="rec-header">
                  <h5>{rec.title}</h5>
                  <span className={`priority ${rec.priority}`}>
                    {rec.priority} priority
                  </span>
                </div>
                <p>{rec.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={`learning-progress-tracker ${compactMode ? 'compact' : ''}`}>
      <div className="tracker-header">
        <h2>Learning Progress</h2>
        <div className="tab-navigation">
          {['overview', 'achievements', 'paths', 'analytics'].map(tab => (
            <button
              key={tab}
              className={`tab-btn ${selectedTab === tab ? 'active' : ''}`}
              onClick={() => setSelectedTab(tab as any)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="tracker-content">
        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'achievements' && renderAchievements()}
        {selectedTab === 'paths' && renderLearningPaths()}
        {selectedTab === 'analytics' && renderAnalytics()}
      </div>

      {/* Risk Profile Modal */}
      {showRiskProfileModal && (
        <div className="modal-overlay" onClick={() => setShowRiskProfileModal(false)}>
          <div className="risk-profile-modal" onClick={e => e.stopPropagation()}>
            <h3>Select Your Risk Profile</h3>
            <div className="risk-options">
              {(['conservative', 'balanced', 'aggressive'] as const).map(profile => (
                <button
                  key={profile}
                  className={`risk-option ${learningState.riskProfile === profile ? 'selected' : ''}`}
                  onClick={() => handleRiskProfileChange(profile)}
                >
                  <span className="profile-name">
                    {profile.charAt(0).toUpperCase() + profile.slice(1)}
                  </span>
                  <span className="profile-description">
                    {profile === 'conservative' && 'Low risk, steady returns'}
                    {profile === 'balanced' && 'Moderate risk, balanced approach'}
                    {profile === 'aggressive' && 'Higher risk, potential for higher returns'}
                  </span>
                </button>
              ))}
            </div>
            <button 
              className="close-modal-btn"
              onClick={() => setShowRiskProfileModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningProgressTracker;