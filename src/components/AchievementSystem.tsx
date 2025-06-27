import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  LinearProgress,
  Tabs,
  Tab,
  Badge,
  Tooltip,
  Zoom,
  Fade
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  Star as StarIcon,
  Lock as LockIcon,
  CheckCircle as CompletedIcon,
  Timeline as ProgressIcon
} from '@mui/icons-material';
import { useAppSelector } from '../redux/hooks';
import { 
  achievements, 
  achievementCategories, 
  rarityDefinitions,
  getAchievementsByCategory,
  getUnlockedAchievements,
  getAvailableAchievements,
  checkAchievementRequirements,
  Achievement
} from '../data/achievements';
import './AchievementSystem.scss';

interface AchievementSystemProps {
  open: boolean;
  onClose: () => void;
  showCelebration?: boolean;
  newAchievement?: Achievement;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} className="tab-panel">
    {value === index && <Box>{children}</Box>}
  </div>
);

const AchievementSystem: React.FC<AchievementSystemProps> = ({
  open,
  onClose,
  showCelebration = false,
  newAchievement
}) => {
  const learningState = useAppSelector(state => state.learning);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Calculate user stats for achievement checking
  const userStats = {
    completedTutorials: learningState.completedTutorials || [],
    xp: learningState.xp,
    learningStreak: learningState.learningStreak || 0,
    tradesExecuted: 0, // This would come from trading state
    totalProfit: 0 // This would come from portfolio state
  };

  // Get achievements by status
  const unlockedAchievements = learningState.achievements || [];
  const unlockedIds = unlockedAchievements.map(a => a.id);
  const availableAchievements = getAvailableAchievements(unlockedIds);
  const lockedAchievements = achievements.filter(a => 
    !unlockedIds.includes(a.id) && a.hidden
  );

  // Calculate progress for available achievements
  const getAchievementProgress = (achievement: Achievement): number => {
    const { requirements } = achievement;
    
    switch (requirements.type) {
      case 'tutorial_complete':
        if (typeof requirements.value === 'string') {
          return userStats.completedTutorials.includes(requirements.value as string) ? 100 : 0;
        }
        return Math.min(100, (userStats.completedTutorials.length / (requirements.value as number)) * 100);
        
      case 'tutorials_complete':
        const requiredTutorials = requirements.value as string[];
        const completed = requiredTutorials.filter(tutorial => 
          userStats.completedTutorials.includes(tutorial)
        ).length;
        return (completed / requiredTutorials.length) * 100;
        
      case 'xp_earned':
        return Math.min(100, (userStats.xp / (requirements.value as number)) * 100);
        
      case 'streak':
        return Math.min(100, (userStats.learningStreak / (requirements.value as number)) * 100);
        
      default:
        return 0;
    }
  };

  // Render achievement card
  const renderAchievementCard = (achievement: Achievement, isUnlocked: boolean, progress?: number) => {
    const rarity = rarityDefinitions[achievement.rarity];
    const isCompleted = isUnlocked;
    const showProgress = !isCompleted && progress !== undefined && progress > 0;

    return (
      <Card 
        key={achievement.id}
        className={`achievement-card ${achievement.rarity} ${isCompleted ? 'completed' : ''}`}
        onClick={() => {
          setSelectedAchievement(achievement);
          setShowDetails(true);
        }}
      >
        <CardContent>
          <Box className="achievement-header">
            <Box className="achievement-icon">
              <Typography variant="h4" component="span">
                {achievement.icon}
              </Typography>
              {isCompleted && (
                <Box className="completed-overlay">
                  <CompletedIcon color="success" />
                </Box>
              )}
            </Box>
            
            <Box className="achievement-info">
              <Typography variant="h6" className="achievement-title">
                {achievement.title}
              </Typography>
              <Typography variant="body2" color="textSecondary" className="achievement-description">
                {achievement.description}
              </Typography>
            </Box>
          </Box>

          <Box className="achievement-meta">
            <Chip 
              label={rarity.name} 
              size="small" 
              className={`rarity-chip ${achievement.rarity}`}
            />
            <Chip 
              label={`${achievement.xpReward} XP`} 
              size="small" 
              icon={<StarIcon />}
              className="xp-chip"
            />
            <Chip 
              label={achievementCategories[achievement.category].name} 
              size="small" 
              className="category-chip"
            />
          </Box>

          {showProgress && (
            <Box className="achievement-progress">
              <LinearProgress 
                variant="determinate" 
                value={progress} 
                className={`progress-bar ${achievement.rarity}`}
              />
              <Typography variant="caption" className="progress-text">
                {Math.round(progress)}% Complete
              </Typography>
            </Box>
          )}

          {!isCompleted && progress === 0 && (
            <Box className="locked-indicator">
              <LockIcon fontSize="small" />
              <Typography variant="caption">
                Locked
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  // Render category tab
  const renderCategoryTab = (categoryKey: string) => {
    const category = achievementCategories[categoryKey];
    const categoryAchievements = getAchievementsByCategory(categoryKey);
    const unlockedInCategory = categoryAchievements.filter(a => unlockedIds.includes(a.id));
    
    return (
      <Grid container spacing={2}>
        {categoryAchievements.map(achievement => {
          const isUnlocked = unlockedIds.includes(achievement.id);
          const progress = isUnlocked ? 100 : getAchievementProgress(achievement);
          
          return (
            <Grid item xs={12} sm={6} md={4} key={achievement.id}>
              {renderAchievementCard(achievement, isUnlocked, progress)}
            </Grid>
          );
        })}
      </Grid>
    );
  };

  // Render overview tab
  const renderOverviewTab = () => {
    const totalAchievements = achievements.filter(a => !a.hidden).length;
    const unlockedCount = unlockedAchievements.length;
    const completionRate = (unlockedCount / totalAchievements) * 100;

    return (
      <Box className="overview-tab">
        <Grid container spacing={3}>
          {/* Stats Overview */}
          <Grid item xs={12}>
            <Card className="stats-card">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Achievement Progress
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Box className="stat-item">
                      <Typography variant="h4" color="primary">
                        {unlockedCount}
                      </Typography>
                      <Typography variant="caption">
                        Unlocked
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box className="stat-item">
                      <Typography variant="h4">
                        {totalAchievements}
                      </Typography>
                      <Typography variant="caption">
                        Total
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box className="stat-item">
                      <Typography variant="h4" color="secondary">
                        {Math.round(completionRate)}%
                      </Typography>
                      <Typography variant="caption">
                        Complete
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box className="stat-item">
                      <Typography variant="h4" className="streak-text">
                        {userStats.learningStreak}
                      </Typography>
                      <Typography variant="caption">
                        Day Streak
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
                <LinearProgress 
                  variant="determinate" 
                  value={completionRate} 
                  sx={{ mt: 2 }}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Achievements */}
          <Grid item xs={12} md={6}>
            <Card className="recent-achievements">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Achievements
                </Typography>
                {unlockedAchievements.slice(-3).map(achievement => (
                  <Box key={achievement.id} className="recent-achievement-item">
                    <Typography variant="h6" component="span">
                      {achievement.icon}
                    </Typography>
                    <Box>
                      <Typography variant="subtitle2">
                        {achievement.title}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {achievement.description}
                      </Typography>
                    </Box>
                  </Box>
                ))}
                {unlockedAchievements.length === 0 && (
                  <Typography variant="body2" color="textSecondary">
                    Complete your first tutorial to earn achievements!
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Progress Towards Next */}
          <Grid item xs={12} md={6}>
            <Card className="next-achievements">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Almost There
                </Typography>
                {availableAchievements
                  .map(achievement => ({
                    achievement,
                    progress: getAchievementProgress(achievement)
                  }))
                  .filter(({ progress }) => progress > 0)
                  .sort((a, b) => b.progress - a.progress)
                  .slice(0, 3)
                  .map(({ achievement, progress }) => (
                    <Box key={achievement.id} className="next-achievement-item">
                      <Box className="achievement-info">
                        <Typography variant="h6" component="span">
                          {achievement.icon}
                        </Typography>
                        <Box>
                          <Typography variant="subtitle2">
                            {achievement.title}
                          </Typography>
                          <LinearProgress 
                            variant="determinate" 
                            value={progress} 
                            size="small"
                          />
                          <Typography variant="caption" color="textSecondary">
                            {Math.round(progress)}% complete
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  ))}
                {availableAchievements.every(a => getAchievementProgress(a) === 0) && (
                  <Typography variant="body2" color="textSecondary">
                    Keep learning to make progress on achievements!
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  };

  return (
    <>
      {/* Main Achievement Dialog */}
      <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth="lg" 
        fullWidth
        className="achievement-system-dialog"
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <TrophyIcon color="primary" />
            <Typography variant="h5">
              Achievements
            </Typography>
            <Badge badgeContent={unlockedAchievements.length} color="primary">
              <StarIcon />
            </Badge>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Tabs 
            value={activeTab} 
            onChange={(_, newValue) => setActiveTab(newValue)}
            className="achievement-tabs"
          >
            <Tab label="Overview" />
            {Object.entries(achievementCategories).map(([key, category]) => (
              <Tab key={key} label={category.name} />
            ))}
          </Tabs>

          <TabPanel value={activeTab} index={0}>
            {renderOverviewTab()}
          </TabPanel>
          
          {Object.keys(achievementCategories).map((categoryKey, index) => (
            <TabPanel key={categoryKey} value={activeTab} index={index + 1}>
              {renderCategoryTab(categoryKey)}
            </TabPanel>
          ))}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Achievement Details Dialog */}
      <Dialog
        open={showDetails}
        onClose={() => setShowDetails(false)}
        maxWidth="sm"
        fullWidth
        className="achievement-details-dialog"
      >
        {selectedAchievement && (
          <>
            <DialogTitle>
              <Box className="achievement-details-header">
                <Typography variant="h4" component="span">
                  {selectedAchievement.icon}
                </Typography>
                <Box>
                  <Typography variant="h6">
                    {selectedAchievement.title}
                  </Typography>
                  <Chip 
                    label={rarityDefinitions[selectedAchievement.rarity].name}
                    className={`rarity-chip ${selectedAchievement.rarity}`}
                    size="small"
                  />
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" paragraph>
                {selectedAchievement.description}
              </Typography>
              
              <Box className="achievement-details-meta">
                <Typography variant="subtitle2" gutterBottom>
                  Reward: {selectedAchievement.xpReward} XP
                </Typography>
                <Typography variant="subtitle2" gutterBottom>
                  Category: {achievementCategories[selectedAchievement.category].name}
                </Typography>
                
                {!unlockedIds.includes(selectedAchievement.id) && (
                  <Box className="progress-section">
                    <Typography variant="subtitle2" gutterBottom>
                      Progress
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={getAchievementProgress(selectedAchievement)}
                      className={`progress-bar ${selectedAchievement.rarity}`}
                    />
                    <Typography variant="caption">
                      {Math.round(getAchievementProgress(selectedAchievement))}% Complete
                    </Typography>
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowDetails(false)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* New Achievement Celebration */}
      {showCelebration && newAchievement && (
        <Dialog
          open={showCelebration}
          className="achievement-celebration-dialog"
          maxWidth="sm"
          fullWidth
        >
          <DialogContent>
            <Box className="celebration-content">
              <Zoom in={showCelebration}>
                <Box className="celebration-icon">
                  <TrophyIcon sx={{ fontSize: 80 }} color="primary" />
                </Box>
              </Zoom>
              
              <Typography variant="h4" align="center" gutterBottom>
                Achievement Unlocked!
              </Typography>
              
              <Box className="new-achievement-display">
                <Typography variant="h2" component="span">
                  {newAchievement.icon}
                </Typography>
                <Typography variant="h5" gutterBottom>
                  {newAchievement.title}
                </Typography>
                <Typography variant="body1" color="textSecondary" paragraph>
                  {newAchievement.description}
                </Typography>
                <Chip 
                  label={`+${newAchievement.xpReward} XP`}
                  color="primary"
                  size="large"
                />
              </Box>
            </Box>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default AchievementSystem;